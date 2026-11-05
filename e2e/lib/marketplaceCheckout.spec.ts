/**
 * Checkout rules without a browser: the total equals what is sent, carts become
 * the right mutations, and a failure part-way charges nothing twice, loses nothing
 * paid and never claims success.
 */
import { test, expect } from '@playwright/test';
import {
    buildCheckoutPlan,
    cartNeedsShipping,
    cartTotalMinor,
    isPaidIntentStatus,
    isShippingComplete,
    lineAmountMinor,
    resolvePaymentIntentId,
    runCheckout,
    settlePaidLines,
    type CheckoutDeps,
    type ConfirmAnswer,
    type OrderAttempt,
    type PlannedOrder,
} from '../../src/lib/marketplaceCheckout';
import type { CartItem } from '../../src/app/[locale]/(protected)/(main)/marketplace/_components/types';

const VENDOR_A = 'vendor-a';
const VENDOR_B = 'vendor-b';

const product = (id: string, price: number, quantity = 1, seller = VENDOR_A, currency = 'GHS'): CartItem => ({
    id,
    name: `Product ${id}`,
    price,
    currency,
    image: '',
    seller,
    category: 'products',
    isService: false,
    quantity,
});
const service = (id: string, price: number, quantity = 1, seller = VENDOR_B, currency = 'GHS'): CartItem => ({
    ...product(id, price, quantity, seller, currency),
    name: `Service ${id}`,
    isService: true,
    lineId: `line-${id}`,
    selectedPackage: 'basic',
});
const ADDRESS = { name: 'Ama', address: '1 High Street', city: 'Accra', country: 'GH', phoneNumber: '0240000000' };
const plannedTotal = (orders: PlannedOrder[]) => orders.reduce((sum, order) => sum + order.amountMinor, 0);

test.describe('totals', () => {
    test('are price x quantity in integer minor units, with no fee of any kind', () => {
        expect(lineAmountMinor(product('p', 123.45, 2))).toBe(24690);
        expect(cartTotalMinor([product('p', 123.45, 2), service('s', 250)])).toBe(49690);
        expect(cartTotalMinor([])).toBe(0);
    });
    test('do not drift the way a float sum does', () => {
        expect(0.1 + 0.2).not.toBe(0.3);
        expect(cartTotalMinor([product('a', 0.1), product('b', 0.2)])).toBe(30);
    });
    test('leave out extras, which neither order input can carry', () => {
        expect(lineAmountMinor({ ...service('s', 100), extrasTotal: 125, extras: ['x'] })).toBe(10000);
    });
});

test.describe('the shipping address', () => {
    test('is needed only when the cart holds a product', () => {
        expect(cartNeedsShipping([product('p', 1)])).toBe(true);
        expect(cartNeedsShipping([product('p', 1), service('s', 1)])).toBe(true);
        expect(cartNeedsShipping([service('s', 1)])).toBe(false);
    });
    test('is complete only with everything marketplace-service requires', () => {
        const good = { name: 'Ama', address: '1 High Street', city: 'Accra', country: 'GH', phoneNumber: '0240000000' };
        expect(isShippingComplete(good)).toBe(true);
        for (const empty of [{ name: ' ' }, { address: 'abc' }, { city: 'A' }, { country: '' }, { phoneNumber: '  ' }]) {
            expect(isShippingComplete({ ...good, ...empty })).toBe(false);
        }
    });
});

test.describe('the plan', () => {
    test('a product cart is one createProductOrder per vendor, with price in minor units', () => {
        const cart = [product('p1', 123.45, 2), product('p2', 10), product('p3', 5, 1, VENDOR_B)];
        const plan = buildCheckoutPlan(cart, { method: 'credit', shippingAddress: ADDRESS });
        if (!plan.ok) throw new Error('expected a plan');
        expect(plan.orders.map((o) => o.kind)).toEqual(['product', 'product']);
        expect(plan.orders[0].input).toEqual({
            vendor_id: VENDOR_A,
            items: [
                { product_id: 'p1', quantity: 2, price: 12345, currency: 'GHS' },
                { product_id: 'p2', quantity: 1, price: 1000, currency: 'GHS' },
            ],
            shipping_details: { recipient_name: 'Ama', street: '1 High Street', city: 'Accra', country: 'GH', phone: '0240000000' },
            notes: 'payment_method:credit',
        });
        expect(plannedTotal(plan.orders)).toBe(cartTotalMinor(cart));
    });
    test('a service becomes createServiceOrder: no product_id, no price, no address, no fake "basic" package', () => {
        const plan = buildCheckoutPlan([service('s1', 250)], { method: 'credit' });
        if (!plan.ok) throw new Error('expected a plan');
        expect(plan.orders).toHaveLength(1);
        expect(plan.orders[0].kind).toBe('service');
        expect(plan.orders[0].input).toEqual({ vendor_id: VENDOR_B, service_id: 's1', notes: 'payment_method:credit' });
        expect(plan.orders[0].amountMinor).toBe(25000);
    });
    test('a service line of 3 is 3 orders, because the backend makes every service line quantity 1', () => {
        const cart = [service('s1', 250, 3)];
        const plan = buildCheckoutPlan(cart, { method: 'credit' });
        if (!plan.ok) throw new Error('expected a plan');
        expect(plan.orders.map((o) => o.amountMinor)).toEqual([25000, 25000, 25000]);
        expect(new Set(plan.orders.map((o) => o.key)).size).toBe(3);
        expect(plannedTotal(plan.orders)).toBe(cartTotalMinor(cart));
    });
    test('a mixed cart splits by kind and the orders add up to the total', () => {
        const cart = [product('p1', 123.45), service('s1', 250), product('p2', 45)];
        const plan = buildCheckoutPlan(cart, { method: 'mobile', shippingAddress: ADDRESS });
        if (!plan.ok) throw new Error('expected a plan');
        expect(plan.orders.map((o) => o.kind)).toEqual(['product', 'service']);
        expect(plannedTotal(plan.orders)).toBe(cartTotalMinor(cart));
    });
    test('refuses a mixed-currency cart, and mobile money where it is not offered', () => {
        expect(buildCheckoutPlan([product('p', 1), product('q', 1, 1, VENDOR_A, 'USD')], { method: 'credit' })).toEqual({ ok: false, failure: 'mixed_currency' });
        expect(buildCheckoutPlan([product('p', 1, 1, VENDOR_A, 'USD')], { method: 'mobile' })).toEqual({ ok: false, failure: 'payment_unavailable' });
    });
    test('a corrected address is a new order, never the one created with the old address', () => {
        const before = buildCheckoutPlan([product('p', 1)], { method: 'credit', shippingAddress: ADDRESS });
        const after = buildCheckoutPlan([product('p', 1)], { method: 'credit', shippingAddress: { ...ADDRESS, address: '2 Other Road' } });
        if (!before.ok || !after.ok) throw new Error('expected plans');
        expect(before.orders[0].key).not.toBe(after.orders[0].key);
    });
});

test.describe('settlePaidLines', () => {
    test('takes paid lines out of the cart and lists them', () => {
        const a = product('a', 1);
        const b = product('b', 2);
        const { remaining, paidLines } = settlePaidLines([a, b], [{ item: a, quantity: 1 }]);
        expect(remaining.map((i) => i.id)).toEqual(['b']);
        expect(paidLines.map((i) => i.id)).toEqual(['a']);
    });
    test('a service line partly paid keeps only the unpaid units, and paid units add up over retries', () => {
        const s = service('s', 100, 3);
        const first = settlePaidLines([s], [{ item: s, quantity: 2 }]);
        expect(first.remaining[0].quantity).toBe(1);
        expect(first.paidLines[0].quantity).toBe(2);
        const second = settlePaidLines(first.remaining, [{ item: first.remaining[0], quantity: 1 }], first.paidLines);
        expect(second.remaining).toEqual([]);
        expect(second.paidLines[0].quantity).toBe(3);
    });
});

test('the payment intent id is read off the reply, and only CONFIRMED counts as paid', () => {
    expect(resolvePaymentIntentId({ success: true, order: { id: 'o', payment_intent_id: 'pi' } })).toBe('pi');
    expect(resolvePaymentIntentId({ success: true, order: { id: 'o' } })).toBeUndefined();
    expect(resolvePaymentIntentId(null)).toBeUndefined();
    expect(isPaidIntentStatus('CONFIRMED')).toBe(true);
    for (const status of ['CREATED', 'FAILED', 'CANCELLED', '', null, undefined]) {
        expect(isPaidIntentStatus(status)).toBe(false);
    }
});

/** A fake backend that records every call, so a test can count charges. */
function fakeBackend(over: Partial<CheckoutDeps> = {}) {
    const created: PlannedOrder[] = [];
    const popups: { amountMinor: number; currency: string; paymentIntentId: string }[] = [];
    const confirms: { payment_intent_id: string; payment_method_id: string; provider: string }[] = [];
    let next = 0;
    const deps: CheckoutDeps = {
        hasEmail: true,
        createOrder: async (order) => {
            created.push(order);
            next += 1;
            return { orderId: `order-${next}`, paymentIntentId: `pi-${next}` };
        },
        isIntentPaid: async () => false,
        takePaystackPayment: async (args) => {
            popups.push(args);
            return `ref-${popups.length}`;
        },
        confirm: async (input) => {
            confirms.push(input);
            return 'confirmed';
        },
        ...over,
    };
    return { deps, created, popups, confirms };
}

const run = (cart: CartItem[], deps: CheckoutDeps, attempts = new Map<string, OrderAttempt>(), method: 'credit' | 'mobile' = 'credit') =>
    runCheckout({ cart, method, shippingAddress: ADDRESS, attempts, deps });

test.describe('runCheckout', () => {
    test('pays a mixed cart order by order, for the same total the screen showed', async () => {
        const cart = [product('p', 100), service('s', 250)];
        const backend = fakeBackend();
        const outcome = await run(cart, backend.deps, new Map(), 'mobile');
        expect(outcome.success).toBe(true);
        expect(outcome.failure).toBeUndefined();
        expect(backend.created.map((o) => o.kind)).toEqual(['product', 'service']);
        expect(backend.popups.map((p) => p.amountMinor)).toEqual([10000, 25000]);
        expect(backend.popups.reduce((sum, p) => sum + p.amountMinor, 0)).toBe(cartTotalMinor(cart));
        expect(backend.confirms.map((c) => c.provider)).toEqual(['PAYSTACK', 'PAYSTACK']);
    });

    test('a card in a currency Paystack takes opens Paystack, with the payment id on it', async () => {
        for (const currency of ['GHS', 'NGN', 'KES']) {
            const paystack = fakeBackend();
            await run([product('p', 1, 1, VENDOR_A, currency)], paystack.deps);
            expect(paystack.popups).toHaveLength(1);
            expect(paystack.popups[0]).toMatchObject({ paymentIntentId: 'pi-1' });
            expect(paystack.confirms[0]).toMatchObject({ payment_intent_id: 'pi-1', provider: 'PAYSTACK' });
        }
    });

    test('a price that moved since the cart was built stops before any money is taken', async () => {
        const backend = fakeBackend({ createOrder: async () => ({ orderId: 'o', paymentIntentId: 'pi', totalMinor: 99999 }) });
        const outcome = await run([product('p', 100)], backend.deps);
        expect(outcome.failure).toBe('price_changed');
        expect(backend.popups).toHaveLength(0);
        expect(backend.confirms).toHaveLength(0);
    });

    test('the order total matching the cart goes ahead', async () => {
        const backend = fakeBackend({ createOrder: async () => ({ orderId: 'o', paymentIntentId: 'pi', totalMinor: 10000 }) });
        expect((await run([product('p', 100)], backend.deps)).success).toBe(true);
        expect(backend.popups[0].amountMinor).toBe(10000);
    });

    test('a currency with no way to pay stops before any order reserves stock', async () => {
        const backend = fakeBackend();
        const outcome = await run([product('p', 1, 1, VENDOR_A, 'USD')], backend.deps);
        expect(outcome.failure).toBe('payment_unavailable');
        expect(backend.created).toHaveLength(0);
        expect(backend.popups).toHaveLength(0);
    });

    test('second order refused: first stays paid, nothing further is charged, and it does not claim success', async () => {
        const cart = [product('p', 100), service('s', 250), service('t', 30)];
        const backend = fakeBackend();
        const createOrder = backend.deps.createOrder;
        backend.deps.createOrder = async (order) => (order.kind === 'service' ? {} : createOrder(order));
        const attempts = new Map<string, OrderAttempt>();

        const outcome = await run(cart, backend.deps, attempts);

        expect(outcome.success).toBe(false);
        expect(outcome.failure).toBe('order_refused');
        expect(outcome.paid.map((line) => line.item.id)).toEqual(['p']);
        expect(backend.confirms).toHaveLength(1);

        // Retry with what is left, as the screen does: the paid product is not created or charged again.
        const { remaining } = settlePaidLines(cart, outcome.paid);
        backend.deps.createOrder = createOrder;
        const retry = await run(remaining, backend.deps, attempts);
        expect(retry.success).toBe(true);
        expect(backend.created.filter((o) => o.kind === 'product')).toHaveLength(1);
        expect(backend.confirms).toHaveLength(3);
    });

    test('a refused confirm resolving with data: null is not success', async () => {
        const backend = fakeBackend({ confirm: async (): Promise<ConfirmAnswer> => 'unknown' });
        const outcome = await run([product('p', 100)], backend.deps);
        expect(outcome.success).toBe(false);
        expect(outcome.paid).toEqual([]);
        expect(outcome.failure).toBe('payment_unconfirmed');
    });

    test('Paystack took the money and the confirm failed: the retry never opens a second popup', async () => {
        const answers: ConfirmAnswer[] = ['refused', 'confirmed'];
        const backend = fakeBackend({ confirm: async () => answers.shift() as ConfirmAnswer });
        const attempts = new Map<string, OrderAttempt>();
        const first = await run([product('p', 100)], backend.deps, attempts, 'mobile');
        // Not "refused": the money is gone, so telling them it failed would make them pay again.
        expect(first.failure).toBe('payment_unconfirmed');
        const second = await run([product('p', 100)], backend.deps, attempts, 'mobile');
        expect(second.success).toBe(true);
        expect(backend.popups).toHaveLength(1);
        expect(backend.created).toHaveLength(1);
    });

    test('the answer to a confirm was lost but it went through: the retry charges nothing', async () => {
        let confirmed = false;
        const confirmCalls: string[] = [];
        const backend = fakeBackend({
            isIntentPaid: async () => confirmed,
            confirm: async (input) => {
                confirmCalls.push(input.payment_intent_id);
                confirmed = true;
                throw new Error('network lost');
            },
        });
        const attempts = new Map<string, OrderAttempt>();
        const first = await run([product('p', 100)], backend.deps, attempts);
        expect(first.failure).toBe('payment_unconfirmed');
        const second = await run([product('p', 100)], backend.deps, attempts);
        expect(second.success).toBe(true);
        expect(second.paid.map((l) => l.item.id)).toEqual(['p']);
        expect(confirmCalls).toHaveLength(1);
        expect(backend.created).toHaveLength(1);
    });

    test('money taken, then the cart changed: that money is recorded first and only the rest is charged', async () => {
        const answers: ConfirmAnswer[] = ['refused', 'confirmed', 'confirmed'];
        const backend = fakeBackend({ confirm: async () => answers.shift() as ConfirmAnswer });
        const attempts = new Map<string, OrderAttempt>();
        const first = await run([product('p', 100, 2)], backend.deps, attempts, 'mobile');
        expect(first.failure).toBe('payment_unconfirmed');

        // The customer went back and changed it: p is now quantity 3, and q is new.
        const changed = [product('p', 100, 3), product('q', 7)];
        const second = await run(changed, backend.deps, attempts, 'mobile');
        expect(second.success).toBe(true);
        expect(backend.popups.map((p) => p.amountMinor)).toEqual([20000, 10000 + 700]);
        expect(second.paid.map((l) => [l.item.id, l.quantity])).toEqual([['p', 2], ['p', 1], ['q', 1]]);
    });

    test('a cancelled popup charges nothing, and paying later uses the same order', async () => {
        let cancel = true;
        const backend = fakeBackend();
        const pay = backend.deps.takePaystackPayment;
        backend.deps.takePaystackPayment = async (args) => {
            if (cancel) throw new Error('Payment cancelled.');
            return pay(args);
        };
        const attempts = new Map<string, OrderAttempt>();
        const first = await run([product('p', 100)], backend.deps, attempts, 'mobile');
        expect(first.failure).toBe('payment_cancelled');
        expect(backend.confirms).toHaveLength(0);
        cancel = false;
        const second = await run([product('p', 100)], backend.deps, attempts, 'mobile');
        expect(second.success).toBe(true);
        expect(backend.created).toHaveLength(1);
    });

    test('an order with no payment intent is reported, charges nothing, and pressing Pay again stacks up no more orders', async () => {
        const backend = fakeBackend();
        backend.deps.createOrder = async (order) => {
            backend.created.push(order);
            return { orderId: 'order-1' };
        };
        const attempts = new Map<string, OrderAttempt>();
        for (let press = 0; press < 3; press += 1) {
            const outcome = await run([product('p', 100)], backend.deps, attempts);
            expect(outcome.success).toBe(false);
            expect(outcome.failure).toBe('payment_unavailable');
        }
        expect(backend.created).toHaveLength(1);
        expect(backend.confirms).toHaveLength(0);
    });

    test('checks that can fail are made before any order exists', async () => {
        const noEmail = fakeBackend({ hasEmail: false });
        expect((await run([product('p', 100)], noEmail.deps, new Map(), 'mobile')).failure).toBe('payment_unavailable');
        expect(noEmail.created).toHaveLength(0);

        const mixed = fakeBackend();
        expect((await run([product('p', 1), service('s', 1, 1, VENDOR_B, 'USD')], mixed.deps)).failure).toBe('mixed_currency');
        expect(mixed.created).toHaveLength(0);
    });

    test('a thrown order call is a refusal, not a crash', async () => {
        const backend = fakeBackend({
            createOrder: async () => {
                throw new Error('network');
            },
        });
        const outcome = await run([product('p', 100)], backend.deps);
        expect(outcome).toEqual({ success: false, paid: [], orderIds: [], failure: 'order_refused' });
    });
});
