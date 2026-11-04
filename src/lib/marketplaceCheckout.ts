/**
 * Marketplace checkout: what a cart costs, which order mutations it becomes, and
 * what happens when one of those orders fails. No React and no Apollo here, so
 * every rule below can be tested without a browser.
 *
 * The screen total and the amounts sent both come from this file, so they cannot
 * disagree.
 *
 * Money: `CartItem.price` is major units (the API's integer minor units, divided
 * by 100 once when the listing was mapped). `toMinorUnits` here is the single
 * multiplication at the send boundary. Everything in this file that ends in
 * `Minor` is an integer.
 */
import { isMobileMoneySupported, toMinorUnits, usesPaystackCard } from '../types/money';
import type {
    CartItem,
    PaymentMethod,
    ShippingAddress,
} from '../app/[locale]/(protected)/(main)/marketplace/_components/types';
import type {
    CreateProductOrderInput,
    CreateServiceOrderInput,
} from '../services/gql/types/marketplace';

/** Services get their own cart line id; products are one line per product. */
export const lineKey = (item: CartItem): string => item.lineId ?? item.id;

/** What one cart line costs: unit price x quantity, nothing else. */
export const lineAmountMinor = (item: CartItem): number => toMinorUnits(item.price) * item.quantity;

export const cartTotalMinor = (cart: CartItem[]): number =>
    cart.reduce((sum, item) => sum + lineAmountMinor(item), 0);

/** Service orders take no shipping address, so a cart of only services needs none. */
export const cartNeedsShipping = (cart: CartItem[]): boolean => cart.some((item) => !item.isService);

/** Mirrors what marketplace-service's ShippingAddress refuses, plus the phone the form asks for. */
export function isShippingComplete(address: ShippingAddress): boolean {
    return (
        address.name.trim().length >= 2 &&
        address.address.trim().length >= 5 &&
        address.city.trim().length >= 2 &&
        address.country.trim().length > 0 &&
        address.phoneNumber.trim().length > 0
    );
}

export const formatShippingAddress = (a: ShippingAddress): string =>
    `${a.name}, ${a.address}, ${a.city}, ${a.country}, ${a.phoneNumber}`;

/** Why a checkout stopped. Each one has its own message for the customer. */
export type CheckoutFailure =
    | 'mixed_currency'
    | 'order_refused'
    | 'payment_cancelled'
    | 'payment_refused'
    | 'payment_unavailable'
    | 'payment_unconfirmed'
    | 'no_saved_card';

export interface PaidLine {
    item: CartItem;
    quantity: number;
}

interface PlannedOrderBase {
    /** Identifies this order across retries, so a retry resumes it rather than creating another. */
    key: string;
    currency: string;
    amountMinor: number;
    lines: PaidLine[];
}

export type PlannedOrder =
    | (PlannedOrderBase & { kind: 'product'; input: CreateProductOrderInput })
    | (PlannedOrderBase & { kind: 'service'; input: CreateServiceOrderInput });

export type CheckoutPlan =
    | { ok: true; currency: string; orders: PlannedOrder[] }
    | { ok: false; failure: CheckoutFailure };

/**
 * Products: one order per vendor, as before.
 * Services: createServiceOrder takes exactly one service and no quantity, and the
 * backend makes every service line quantity 1, so a line of 3 is 3 orders. That is
 * what makes "3 x price" on the screen equal what is charged.
 *
 * No package_id is sent. Listings have one price (base_price), and the "basic" the
 * cart carries is not a real package id: marketplace-service would refuse it.
 */
export function buildCheckoutPlan(
    cart: CartItem[],
    { method, shippingAddress }: { method: PaymentMethod; shippingAddress?: string },
): CheckoutPlan {
    const currencies = Array.from(new Set(cart.map((item) => (item.currency ?? 'GHS').toUpperCase())));
    if (currencies.length > 1) return { ok: false, failure: 'mixed_currency' };
    const currency = currencies[0] ?? 'GHS';
    if (method === 'mobile' && !isMobileMoneySupported(currency)) {
        return { ok: false, failure: 'payment_unavailable' };
    }

    const notes = `payment_method:${method}`;
    const byVendor = new Map<string, CartItem[]>();
    for (const item of cart) {
        if (item.isService) continue;
        byVendor.set(item.seller, [...(byVendor.get(item.seller) ?? []), item]);
    }

    const orders: PlannedOrder[] = [];
    for (const [vendorId, items] of byVendor) {
        const quantities = items.map((item) => `${lineKey(item)}:${item.quantity}`).join(',');
        orders.push({
            kind: 'product',
            // The address is part of the key: an order already created keeps the address
            // it was created with, so a corrected address has to be a new order.
            key: `product|${vendorId}|${quantities}|${shippingAddress ?? ''}`,
            currency,
            amountMinor: cartTotalMinor(items),
            lines: items.map((item) => ({ item, quantity: item.quantity })),
            input: {
                vendor_id: vendorId,
                items: items.map((item) => ({
                    product_id: item.id,
                    quantity: item.quantity,
                    price: toMinorUnits(item.price),
                    currency,
                })),
                shipping_address: shippingAddress,
                notes,
            },
        });
    }

    for (const item of cart) {
        if (!item.isService) continue;
        for (let unit = 0; unit < item.quantity; unit += 1) {
            orders.push({
                kind: 'service',
                key: `service|${lineKey(item)}|${unit}`,
                currency,
                amountMinor: toMinorUnits(item.price),
                lines: [{ item, quantity: 1 }],
                input: { vendor_id: item.seller, service_id: item.id, notes },
            });
        }
    }

    return { ok: true, currency, orders };
}

/** Takes what was paid out of the cart and adds it to the list of paid lines. */
export function settlePaidLines(
    cart: CartItem[],
    paid: PaidLine[],
    alreadyPaid: CartItem[] = [],
): { remaining: CartItem[]; paidLines: CartItem[] } {
    const paidUnits = new Map<string, number>();
    for (const { item, quantity } of paid) {
        paidUnits.set(lineKey(item), (paidUnits.get(lineKey(item)) ?? 0) + quantity);
    }
    const remaining = cart.flatMap((item) => {
        const left = item.quantity - (paidUnits.get(lineKey(item)) ?? 0);
        return left > 0 ? [{ ...item, quantity: left }] : [];
    });
    const paidLines = [...alreadyPaid];
    for (const { item, quantity } of paid) {
        const at = paidLines.findIndex((line) => lineKey(line) === lineKey(item));
        if (at >= 0) paidLines[at] = { ...paidLines[at], quantity: paidLines[at].quantity + quantity };
        else paidLines.push({ ...item, quantity });
    }
    return { remaining, paidLines };
}

/** Reads the payment intent id off an order reply, wherever the reply carries it. */
export function resolvePaymentIntentId(payload: unknown): string | undefined {
    const root = payload as {
        payment_intent_id?: string;
        paymentIntentId?: string;
        payment_intent?: { id?: string };
        paymentIntent?: { id?: string };
        order?: {
            payment_intent_id?: string;
            paymentIntentId?: string;
            payment_intent?: { id?: string };
            paymentIntent?: { id?: string };
        };
    } | null | undefined;
    return (
        root?.payment_intent_id ||
        root?.paymentIntentId ||
        root?.payment_intent?.id ||
        root?.paymentIntent?.id ||
        root?.order?.payment_intent_id ||
        root?.order?.paymentIntentId ||
        root?.order?.payment_intent?.id ||
        root?.order?.paymentIntent?.id
    );
}

/** payment-service's intent statuses: CREATED, CONFIRMED, FAILED, CANCELLED. Only CONFIRMED is paid. */
export const isPaidIntentStatus = (status: string | null | undefined): boolean => status === 'CONFIRMED';

/** An order this checkout created. Kept across retries, dropped only once it is paid. */
export interface OrderAttempt {
    order: PlannedOrder;
    orderId: string;
    paymentIntentId?: string;
    /** Paystack took the money in the browser. Never open another popup for this order. */
    paystackReference?: string;
}

export type ConfirmAnswer = 'confirmed' | 'refused' | 'unknown';

export interface CheckoutDeps {
    hasEmail: boolean;
    /** Must not throw for a refusal: a refused order comes back with no orderId. */
    createOrder(order: PlannedOrder): Promise<{ orderId?: string; paymentIntentId?: string }>;
    isIntentPaid(paymentIntentId: string): Promise<boolean>;
    /** Opens the Paystack popup for exactly this amount. Rejects if it is cancelled or fails. */
    takePaystackPayment(args: {
        amountMinor: number;
        currency: string;
        method: PaymentMethod;
    }): Promise<string>;
    stripeCardId(): Promise<string | null>;
    confirm(input: {
        payment_intent_id: string;
        payment_method_id: string;
        provider: 'PAYSTACK' | 'STRIPE';
    }): Promise<ConfirmAnswer>;
}

export interface CheckoutOutcome {
    /** True only when every order in the cart is paid. */
    success: boolean;
    /** What IS paid, also when success is false. These lines must leave the cart. */
    paid: PaidLine[];
    orderIds: string[];
    failure?: CheckoutFailure;
}

type Settled = { paid: true; orderId: string } | { paid: false; failure: CheckoutFailure };

const usesPaystack = (method: PaymentMethod, currency: string): boolean =>
    method === 'mobile' || usesPaystackCard(currency);

/**
 * Takes one order from wherever it got to as far as paid. Safe to call again for
 * the same order: an order is created once, a popup that took money is never
 * reopened, and a confirm whose answer was lost is checked before it is retried.
 */
async function settleOrder(
    order: PlannedOrder,
    method: PaymentMethod,
    attempts: Map<string, OrderAttempt>,
    deps: CheckoutDeps,
): Promise<Settled> {
    let attempt = attempts.get(order.key);

    if (attempt?.paymentIntentId) {
        const alreadyPaid = await deps.isIntentPaid(attempt.paymentIntentId).catch(() => false);
        if (alreadyPaid) {
            attempts.delete(order.key);
            return { paid: true, orderId: attempt.orderId };
        }
    }

    if (!attempt) {
        const created = await deps.createOrder(order).catch(() => ({ orderId: undefined, paymentIntentId: undefined }));
        if (!created.orderId) return { paid: false, failure: 'order_refused' };
        attempt = { order, orderId: created.orderId, paymentIntentId: created.paymentIntentId };
        attempts.set(order.key, attempt);
    }

    // Kept in `attempts` on purpose: pressing Pay again must not stack up more unpayable orders.
    if (!attempt.paymentIntentId) return { paid: false, failure: 'payment_unavailable' };

    let provider: 'PAYSTACK' | 'STRIPE';
    let paymentMethodId: string;
    if (attempt.paystackReference) {
        provider = 'PAYSTACK';
        paymentMethodId = attempt.paystackReference;
    } else if (usesPaystack(method, order.currency)) {
        try {
            attempt.paystackReference = await deps.takePaystackPayment({
                amountMinor: order.amountMinor,
                currency: order.currency,
                method,
            });
        } catch (error) {
            const cancelled = error instanceof Error && error.message === 'Payment cancelled.';
            return { paid: false, failure: cancelled ? 'payment_cancelled' : 'payment_refused' };
        }
        provider = 'PAYSTACK';
        paymentMethodId = attempt.paystackReference;
    } else {
        const cardId = await deps.stripeCardId().catch(() => null);
        if (!cardId) return { paid: false, failure: 'no_saved_card' };
        provider = 'STRIPE';
        paymentMethodId = cardId;
    }

    const answer = await deps
        .confirm({ payment_intent_id: attempt.paymentIntentId, payment_method_id: paymentMethodId, provider })
        .catch((): ConfirmAnswer => 'unknown');
    if (answer === 'confirmed') {
        attempts.delete(order.key);
        return { paid: true, orderId: attempt.orderId };
    }
    // Paystack already has the money, and "unknown" may mean it went through: neither
    // may be described as a failed payment, or the customer pays again some other way.
    if (attempt.paystackReference || answer === 'unknown') return { paid: false, failure: 'payment_unconfirmed' };
    return { paid: false, failure: 'payment_refused' };
}

/**
 * Pays a cart one order at a time and stops at the first failure, so nothing more
 * is charged after something went wrong. Never throws.
 *
 * `attempts` must live as long as the cart does. The caller must take `paid` out
 * of the cart: that is what stops a retry paying for it again.
 */
export async function runCheckout({
    cart,
    method,
    shippingAddress,
    attempts,
    deps,
}: {
    cart: CartItem[];
    method: PaymentMethod;
    shippingAddress?: string;
    attempts: Map<string, OrderAttempt>;
    deps: CheckoutDeps;
}): Promise<CheckoutOutcome> {
    const paid: PaidLine[] = [];
    const orderIds: string[] = [];
    const stop = (failure: CheckoutFailure): CheckoutOutcome => ({ success: false, paid, orderIds, failure });

    // Money Paystack already took gets recorded before anything new starts, even if
    // the customer changed the cart in between and this order is no longer in it.
    for (const attempt of Array.from(attempts.values())) {
        if (!attempt.paystackReference) continue;
        const settled = await settleOrder(attempt.order, method, attempts, deps);
        if (!settled.paid) return stop(settled.failure);
        orderIds.push(settled.orderId);
        paid.push(...attempt.order.lines);
    }

    const { remaining } = settlePaidLines(cart, paid);
    const plan = buildCheckoutPlan(remaining, { method, shippingAddress });
    if (!plan.ok) return stop(plan.failure);
    if (plan.orders.length === 0) return { success: paid.length > 0, paid, orderIds };

    // Catch what would fail anyway before any order exists, not after the first is paid.
    if (usesPaystack(method, plan.currency)) {
        if (!deps.hasEmail) return stop('payment_unavailable');
    } else {
        const cardId = await deps.stripeCardId().catch(() => null);
        if (!cardId) return stop('no_saved_card');
    }

    for (const order of plan.orders) {
        const settled = await settleOrder(order, method, attempts, deps);
        if (!settled.paid) return stop(settled.failure);
        orderIds.push(settled.orderId);
        paid.push(...order.lines);
    }
    return { success: true, paid, orderIds };
}
