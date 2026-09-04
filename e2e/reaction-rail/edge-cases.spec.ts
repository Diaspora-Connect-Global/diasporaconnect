/**
 * ReactionRail — the awkward cases, on the isolated harness.
 *
 * Each of these is a way a previous version of this component died silently.
 * They are cheap to keep and expensive to rediscover: none of them produces an
 * error, they all just leave the rail sitting where it was.
 */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import {
    HARNESS,
    centreOf,
    mouseDrag,
    openHarness,
    rail,
    railEvents,
    straight,
    touchGesture,
    transformOf,
} from '../support/rail';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser.close();
});

test('two drags in a row both move the rail', async () => {
    // The drag state is a ref that survives re-renders. A gesture that ends
    // without clearing it leaves the rail permanently unresponsive, and the
    // first drag looks perfect.
    const { context, page } = await openHarness(browser, HARNESS.isolated);
    const r = rail(page);

    await mouseDrag(page, await centreOf(r), -60, -36, 6);
    const afterFirst = await transformOf(r);

    await mouseDrag(page, await centreOf(r), -36, 48, 6);
    const afterSecond = await transformOf(r);

    console.log(`    consecutive: ${afterFirst} -> ${afterSecond}`);
    expect(afterSecond, 'the second drag did nothing — the gesture state deadlocked').not.toBe(
        afterFirst,
    );
    await context.close();
});

test('a fast flick that leaves the 44px pill in one step still drags', async () => {
    // Move and end are bound to `window`, not to the pill. Bound to the pill,
    // any drag faster than a crawl escapes it between two frames and the rest of
    // the gesture is lost.
    const { context, page } = await openHarness(browser, HARNESS.isolated);
    const r = rail(page);
    const before = await transformOf(r);
    const c = await centreOf(r);

    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.mouse.move(c.x - 200, c.y - 150);
    await page.mouse.up();
    await page.waitForTimeout(150);

    console.log(`    flick: ${before} -> ${await transformOf(r)}`);
    expect(await transformOf(r)).not.toBe(before);
    await context.close();
});

test('a drag started on the pill padding, not on a button, still works', async () => {
    // The whole pill is the handle — there is deliberately no visible grip — so
    // the gap between the glyphs has to drag too.
    const { context, page } = await openHarness(browser, HARNESS.isolated);
    const r = rail(page);
    const b = (await r.boundingBox())!;
    const before = await transformOf(r);

    await mouseDrag(page, { x: b.x + 4, y: b.y + b.height / 2 }, -96, -48, 8);

    console.log(`    padding grab: ${before} -> ${await transformOf(r)}`);
    expect(await transformOf(r)).not.toBe(before);
    await context.close();
});

test('touch: jitter during the hold, then a drag, still moves the rail', async () => {
    const { context, page } = await openHarness(browser, HARNESS.isolated, { touch: true });
    const r = rail(page);
    const before = await transformOf(r);
    const wobble = [1, -2, 2, -1, 3, -3, 1];

    await touchGesture(page, await centreOf(r), [
        ...wobble.map((w, i) => ({ dx: w, dy: wobble[(i + 3) % wobble.length], waitMs: 55 })),
        { dx: 0, dy: 0, waitMs: 200 },
        ...straight(-112, -64, 8),
    ]);

    console.log(`    hold-jitter: ${before} -> ${await transformOf(r)} | events ${JSON.stringify(await railEvents(page))}`);
    expect(await transformOf(r)).not.toBe(before);
    await context.close();
});

test('touch: a long press with no movement still selects, it does not drag', async () => {
    // Arming must not punish a reader for pressing a beat too long: a hold that
    // never moved is still a tap.
    const { context, page } = await openHarness(browser, HARNESS.isolated, { touch: true });
    const btn = page.locator('[data-testid="card-0"] button[aria-label="Hopeful"]');

    await touchGesture(page, await centreOf(btn), [], { holdMs: 700, settleMs: 300 });

    await expect(page.getByTestId('selected-0')).toHaveText('selected: HOPEFUL');
    await context.close();
});
