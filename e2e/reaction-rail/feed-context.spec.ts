/**
 * ReactionRail — the same drag, in the surroundings it actually ships in.
 *
 * Two things about the real feed change the rail's behaviour and neither is
 * visible from the component:
 *
 *  - the feed does not scroll the window, it scrolls a height-constrained
 *    `overflow-y-auto` flex column, so that is what a touch drag competes with;
 *  - the real card supplies the real measurements. On a text post the rail has
 *    about 75px of upward travel and 8px of rightward travel, where a mock card
 *    can hand it ten times that and hide a clamping bug entirely.
 *
 * `feed-chrome` isolates the first, `feed-card` adds the second by mounting the
 * real FeedCard2. A failure here that does not also fail in `drag.spec.ts` is a
 * failure of the surroundings, not of the rail.
 */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import {
    HARNESS,
    centreOf,
    firstRail,
    mouseDrag,
    openHarness,
    railGeometry,
    straight,
    touchGesture,
} from '../support/rail';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser.close();
});

const CASES = [
    ['real feed chrome', HARNESS.feedChrome],
    ['real FeedCard2', HARNESS.feedCard],
] as const;

for (const [label, path] of CASES) {
    test(`${label}: a mouse drag moves the rail`, async () => {
        const { context, page } = await openHarness(browser, path, {
            viewport: { width: 1280, height: 900 },
        });
        const r = firstRail(page);
        await r.waitFor({ state: 'visible', timeout: 30_000 });
        console.log(`    [${label}] ${JSON.stringify(await railGeometry(r))}`);

        const before = (await r.boundingBox())!;
        await mouseDrag(page, await centreOf(r), -140, -60);

        const after = (await r.boundingBox())!;
        console.log(`    [${label}] mouse: (${before.x},${before.y}) -> (${after.x},${after.y})`);
        expect(Math.abs(after.x - before.x) + Math.abs(after.y - before.y)).toBeGreaterThan(50);
        await context.close();
    });

    test(`${label}: a touch drag after the hold moves the rail`, async () => {
        const { context, page } = await openHarness(browser, path, {
            touch: true,
            viewport: { width: 1280, height: 900 },
        });
        const r = firstRail(page);
        await r.waitFor({ state: 'visible', timeout: 30_000 });

        const before = (await r.boundingBox())!;
        await touchGesture(page, await centreOf(r), straight(-112, -64, 8), { holdMs: 550 });

        const after = (await r.boundingBox())!;
        console.log(`    [${label}] touch: (${before.x},${before.y}) -> (${after.x},${after.y})`);
        expect(Math.abs(after.x - before.x) + Math.abs(after.y - before.y)).toBeGreaterThan(50);
        await context.close();
    });
}
