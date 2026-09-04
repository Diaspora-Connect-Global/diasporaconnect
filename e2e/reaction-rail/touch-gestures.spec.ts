/**
 * ReactionRail — the phone gesture matrix, on the real FeedCard2.
 *
 * This file exists because of a specific, three-times-reported bug: on a phone
 * the rail could not be dragged at all. The cause was an axis the component
 * never distinguished.
 *
 * A VERTICAL drag genuinely is ambiguous — the feed scrolls on that axis — so it
 * is deferred behind a press-and-hold, and a finger that moves up or down before
 * the hold matures is handed back to the browser to scroll with. That part was
 * right. But the same rule was applied SIDEWAYS, where there is nothing to be
 * ambiguous with: the feed does not pan horizontally. Left to the browser, a
 * sideways drag became a pan with nowhere to go, the browser fired
 * `pointercancel`, and the gesture was destroyed — the rail did not move and
 * nothing scrolled. Grabbing a pill pinned to the right edge and pulling it
 * inward is exactly that gesture, which is why the rail read as simply broken.
 *
 * So the axes are asserted separately and in both directions of failure:
 * sideways must drag WITHOUT a hold, vertical must still scroll without one, and
 * the hold must still open every direction. `pointercancel` appearing in a
 * gesture that should have dragged is the regression signature.
 */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import {
    HARNESS,
    IDENTITY,
    PHONE,
    centreOf,
    columnScrollTop,
    firstRail,
    openHarness,
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

const phone = () =>
    openHarness(browser, HARNESS.feedCard, { touch: true, mobile: true, viewport: PHONE });

test('press and drag SIDEWAYS with no pause moves the rail', async () => {
    // The regression. Before the axis split this ended in `pointercancel` with
    // the rail untouched and nothing scrolled.
    const { context, page } = await phone();
    const r = firstRail(page);
    await r.waitFor({ state: 'visible', timeout: 30_000 });
    const before = await transformOf(r);

    await touchGesture(page, await centreOf(r), straight(-168, 0, 12));

    const after = await transformOf(r);
    const events = await railEvents(page);
    console.log(`    sideways: ${before} -> ${after} | events ${JSON.stringify(events)}`);
    expect(after, 'a sideways drag must move the rail without a hold').not.toBe(before);
    expect(events.pointercancel ?? 0, 'the browser must not claim a sideways drag').toBe(0);
    await context.close();
});

test('press and drag straight UP with no pause still scrolls the feed', async () => {
    // The counterweight. Vertical stays the browser's unless the reader holds.
    const { context, page } = await phone();
    const r = firstRail(page);
    await r.waitFor({ state: 'visible', timeout: 30_000 });
    const before = await transformOf(r);
    const scrollBefore = await columnScrollTop(page);

    await touchGesture(page, await centreOf(r), straight(0, -308, 14, 26));

    const scrollAfter = await columnScrollTop(page);
    console.log(`    vertical no-hold: column ${scrollBefore} -> ${scrollAfter} | rail ${before} -> ${await transformOf(r)}`);
    expect(scrollAfter, 'the feed must still scroll from a touch on the rail').toBeGreaterThan(
        scrollBefore + 50,
    );
    expect(await transformOf(r)).toBe(before);
    expect(before).toBe(IDENTITY);
    await context.close();
});

for (const [name, dx, dy] of [
    ['up', 0, -160],
    ['down', 0, 90],
    ['left', -180, 0],
    ['diagonally up-left', -120, -80],
] as const) {
    test(`hold, then drag ${name}, moves the rail and does not scroll the feed`, async () => {
        const { context, page } = await phone();
        const r = firstRail(page);
        await r.waitFor({ state: 'visible', timeout: 30_000 });
        const before = await transformOf(r);
        const scrollBefore = await columnScrollTop(page);

        await touchGesture(page, await centreOf(r), straight(dx, dy, 10), { holdMs: 550 });

        const scrollAfter = await columnScrollTop(page);
        console.log(`    hold+${name}: ${before} -> ${await transformOf(r)} | column ${scrollBefore} -> ${scrollAfter}`);
        expect(await transformOf(r), `${name}: the rail did not move`).not.toBe(before);
        expect(scrollAfter, `${name}: the feed scrolled during an armed drag`).toBe(scrollBefore);
        await context.close();
    });
}

test('a tap selects a reaction', async () => {
    const { context, page } = await phone();
    const btn = page.locator('button[aria-label="Happy"]').first();
    await touchGesture(page, await centreOf(btn), [], { holdMs: 90 });
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    await context.close();
});

test('a tap with a few px of wobble still selects a reaction', async () => {
    // A thumb is not a stylus. Small drift must not be read as a drag, or the
    // sideways arming threshold would cost the component its primary function.
    const { context, page } = await phone();
    const btn = page.locator('button[aria-label="Hopeful"]').first();
    await touchGesture(
        page,
        await centreOf(btn),
        [
            { dx: 2, dy: 1, waitMs: 30 },
            { dx: 3, dy: -1, waitMs: 30 },
            { dx: 1, dy: 2, waitMs: 30 },
        ],
        { holdMs: 40 },
    );
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    await context.close();
});

test('a vertical drift during the hold does not kill the drag', async () => {
    // A finger wanders while it waits. Drift below the cancel threshold must
    // leave the pending hold intact rather than quietly discarding the gesture.
    const { context, page } = await phone();
    const r = firstRail(page);
    await r.waitFor({ state: 'visible', timeout: 30_000 });
    const before = await transformOf(r);

    await touchGesture(
        page,
        await centreOf(r),
        [
            { dx: 0, dy: 3, waitMs: 80 },
            { dx: 0, dy: 6, waitMs: 80 },
            { dx: 0, dy: 9, waitMs: 200 },
            ...Array.from({ length: 10 }, (_, i) => ({ dx: -14 * (i + 1), dy: 9 - 6 * (i + 1) })),
        ],
    );

    console.log(`    drift-then-drag: ${before} -> ${await transformOf(r)} | events ${JSON.stringify(await railEvents(page))}`);
    expect(await transformOf(r)).not.toBe(before);
    await context.close();
});
