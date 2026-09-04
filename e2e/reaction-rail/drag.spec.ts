/**
 * ReactionRail — the core contract, on the isolated harness.
 *
 * The rail is a floating pill inside every feed card. It must be draggable
 * anywhere within its card on both mouse and touch, it must still work as three
 * ordinary reaction buttons, and it must never take a touch the reader meant as
 * a scroll. Those four things are one another's counterweights — every previous
 * attempt at this component fixed one by breaking another — so they are asserted
 * together, and none of them may be relaxed to make another pass.
 */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import {
    HARNESS,
    IDENTITY,
    centreOf,
    mouseDrag,
    openHarness,
    rail,
    railEvents,
    railGeometry,
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

test('a mouse drag moves the rail', async () => {
    const { context, page } = await openHarness(browser, HARNESS.isolated);
    const r = rail(page);
    const before = (await r.boundingBox())!;
    const c = await centreOf(r);

    await mouseDrag(page, c, -140, -60);

    const after = (await r.boundingBox())!;
    console.log(`    geometry: ${JSON.stringify(await railGeometry(r))}`);
    console.log(`    mouse: (${before.x},${before.y}) -> (${after.x},${after.y})`);
    expect(Math.abs(after.x - before.x) + Math.abs(after.y - before.y)).toBeGreaterThan(50);
    await context.close();
});

test('a touch drag after the press-and-hold moves the rail', async () => {
    const { context, page } = await openHarness(browser, HARNESS.isolated, { touch: true });
    const r = rail(page);
    const before = (await r.boundingBox())!;
    const c = await centreOf(r);

    await touchGesture(page, c, straight(-120, -70, 8), { holdMs: 550 });

    const after = (await r.boundingBox())!;
    console.log(`    touch: (${before.x},${before.y}) -> (${after.x},${after.y})`);
    expect(Math.abs(after.x - before.x) + Math.abs(after.y - before.y)).toBeGreaterThan(50);
    await context.close();
});

test('a plain click selects a reaction, and clicking it again clears it', async () => {
    // Dragging must not swallow ordinary taps: the pill is three buttons first
    // and a draggable object second.
    const { context, page } = await openHarness(browser, HARNESS.isolated);
    const happy = page.locator('[data-testid="card-0"] button[aria-label="Happy"]');

    await happy.click();
    await expect(page.getByTestId('selected-0')).toHaveText('selected: HAPPY');
    await happy.click();
    await expect(page.getByTestId('selected-0')).toHaveText('selected: none');

    await context.close();
});

test('a touch that moves straight away scrolls the page instead of dragging', async () => {
    // `touch-action` stays `manipulation`, never `none` — a thumb resting on the
    // rail must still be able to scroll the feed.
    const { context, page } = await openHarness(browser, HARNESS.isolated, { touch: true });
    const r = rail(page);
    const before = await transformOf(r);
    const scrollBefore = await page.evaluate(() => window.scrollY);
    const c = await centreOf(r);

    await touchGesture(page, c, straight(0, -300, 12), { holdMs: 0, settleMs: 500 });

    const scrollAfter = await page.evaluate(() => window.scrollY);
    console.log(`    scroll ${scrollBefore} -> ${scrollAfter} | events ${JSON.stringify(await railEvents(page))}`);
    expect(scrollAfter).toBeGreaterThan(scrollBefore + 50);
    expect(await transformOf(r)).toBe(before);
    expect(before).toBe(IDENTITY);
    await context.close();
});
