import { expect, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test';

/** The three ReactionRail harness pages, by the shape of card they mount. */
export const HARNESS = {
    isolated: '/en/dev-harness/reaction-rail/isolated',
    feedChrome: '/en/dev-harness/reaction-rail/feed-chrome',
    feedCard: '/en/dev-harness/reaction-rail/feed-card',
} as const;

// `localhost`, NOT `127.0.0.1` — see the note in playwright.config.ts: the
// numeric loopback makes Next block its own dev assets and nothing hydrates.
export const BASE_URL =
    process.env.E2E_BASE_URL ?? `http://localhost:${process.env.E2E_PORT ?? 3111}`;

/** A phone. The rail's touch gestures behave differently here than at desktop size. */
export const PHONE = { width: 390, height: 844 } as const;

export interface Harness {
    context: BrowserContext;
    page: Page;
}

/**
 * Load a harness page and wait until React has taken over.
 *
 * The `data-hydrated` wait is not optional politeness: the rail is
 * server-rendered, so before hydration it is inert markup that looks exactly
 * like the real thing. A gesture sent too early "fails" for a reason that has
 * nothing to do with the component.
 *
 * Also clears the persisted rail offset on every navigation, so one test's
 * final position cannot become the next test's starting position.
 */
export async function openHarness(
    browser: Browser,
    path: string,
    opts: { touch?: boolean; mobile?: boolean; viewport?: { width: number; height: number } } = {},
): Promise<Harness> {
    const context = await browser.newContext({
        viewport: opts.viewport ?? { width: 520, height: 900 },
        hasTouch: opts.touch ?? false,
        isMobile: opts.mobile ?? false,
        ...(opts.mobile ? { deviceScaleFactor: 3 } : {}),
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => console.log('    PAGEERROR>', e.message.slice(0, 200)));
    await page.addInitScript(() => {
        try {
            window.localStorage.removeItem('diaspoplug:reaction-rail-offset');
        } catch {
            /* storage can be blocked; the rail copes and so does the test */
        }
        // A tap on the real event stream. `pointercancel` is the signal that
        // matters: it means the browser claimed the gesture for a pan, and it is
        // how the "rail is not draggable" bug showed itself.
        const w = window as unknown as { __railEvents?: string[] };
        w.__railEvents = [];
        for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'click']) {
            window.addEventListener(type, () => w.__railEvents!.push(type), true);
        }
    });
    await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-hydrated="yes"]').waitFor({ state: 'attached', timeout: 90_000 });
    await page.waitForTimeout(400);
    return { context, page };
}

export function rail(page: Page, card = 0): Locator {
    return page.locator(`[data-testid="card-${card}"] > [role="group"]`);
}

/** The rail on a page whose cards are real FeedCard2s and carry no test id. */
export function firstRail(page: Page): Locator {
    return page.locator('[role="group"][aria-label="Choose a reaction"]').first();
}

export const transformOf = (l: Locator) => l.evaluate((el) => getComputedStyle(el).transform);

export const IDENTITY = 'matrix(1, 0, 0, 1, 0, 0)';

/** The feed's scroll position. The feed column scrolls, NOT the window. */
export const columnScrollTop = (page: Page) =>
    page.locator('[data-testid="feed-column"]').evaluate((el) => el.scrollTop);

export async function railEvents(page: Page): Promise<Record<string, number>> {
    return page.evaluate(() => {
        const w = window as unknown as { __railEvents?: string[] };
        const counts: Record<string, number> = {};
        for (const e of w.__railEvents ?? []) counts[e] = (counts[e] ?? 0) + 1;
        return counts;
    });
}

export async function centreOf(l: Locator) {
    const b = await l.boundingBox();
    expect(b, 'element has no bounding box').not.toBeNull();
    return { x: b!.x + b!.width / 2, y: b!.y + b!.height / 2, box: b! };
}

/**
 * Everything the rail's own measurements are derived from, read straight off
 * the live element. When a drag does not move, this says whether the geometry
 * or the event plumbing is to blame — `clampToCard()` silently gives up when
 * any of these is zero or null.
 */
export async function railGeometry(r: Locator) {
    return r.evaluate((el) => {
        const railEl = el as HTMLElement;
        const card = railEl.offsetParent as HTMLElement | null;
        return {
            offsetParent: card ? `${card.tagName}.${card.className.slice(0, 46)}` : null,
            railW: railEl.offsetWidth,
            railH: railEl.offsetHeight,
            railTop: railEl.offsetTop,
            railLeft: railEl.offsetLeft,
            cardW: card?.clientWidth ?? null,
            cardH: card?.clientHeight ?? null,
            /** How far the rail may travel from its anchored position, per side. */
            maxUp: railEl.offsetTop,
            maxDown: card ? card.clientHeight - railEl.offsetTop - railEl.offsetHeight : null,
            maxLeft: railEl.offsetLeft,
            maxRight: card ? card.clientWidth - railEl.offsetLeft - railEl.offsetWidth : null,
            transform: getComputedStyle(railEl).transform,
            touchAction: getComputedStyle(railEl).touchAction,
        };
    });
}

export interface TouchStep {
    /** Offset from the gesture's start point. */
    dx: number;
    dy: number;
    waitMs?: number;
}

/**
 * A real touch gesture.
 *
 * `page.touchscreen` can only tap, so touch drags go through CDP
 * `Input.dispatchTouchEvent`, which enters Chrome's real input pipeline — the
 * browser's own pan/scroll decision included. That is the whole point: the bug
 * this suite covers was the browser taking the gesture, and a synthesised
 * `TouchEvent` would never have shown it.
 */
export async function touchGesture(
    page: Page,
    from: { x: number; y: number },
    steps: TouchStep[],
    opts: { holdMs?: number; settleMs?: number } = {},
) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: from.x, y: from.y, id: 1 }],
    });
    if (opts.holdMs) await page.waitForTimeout(opts.holdMs);
    for (const s of steps) {
        await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x: from.x + s.dx, y: from.y + s.dy, id: 1 }],
        });
        await page.waitForTimeout(s.waitMs ?? 28);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
    await page.waitForTimeout(opts.settleMs ?? 250);
}

/** A straight touch drag, expressed as its total displacement. */
export function straight(dx: number, dy: number, steps = 10, waitMs = 28): TouchStep[] {
    return Array.from({ length: steps }, (_, i) => ({
        dx: (dx * (i + 1)) / steps,
        dy: (dy * (i + 1)) / steps,
        waitMs,
    }));
}

/**
 * A mouse drag in several steps. One large jump is not a drag: it skips the
 * movement threshold logic entirely and would pass against a component that
 * only ever works for teleporting cursors.
 */
export async function mouseDrag(
    page: Page,
    from: { x: number; y: number },
    dx: number,
    dy: number,
    steps = 10,
) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    for (let i = 1; i <= steps; i++) {
        await page.mouse.move(from.x + (dx * i) / steps, from.y + (dy * i) / steps);
        await page.waitForTimeout(20);
    }
    await page.mouse.up();
    await page.waitForTimeout(150);
}
