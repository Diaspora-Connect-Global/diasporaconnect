/**
 * The circle shell (redesign): one header and one navigation shared by every
 * screen inside a circle, a hero on its home, and the chat card when chat is on.
 */
import { test, expect, type Browser, type Page, type WebSocketRoute } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { open } from './fixtures';
import { memberScreens } from './circleFixtures';
import { ME } from '../support/fakeSession';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const PHONE = { width: 360, height: 800 };
const LAPTOP = { width: 1280, height: 900 };
const SECTIONS = ['members', 'leaderboard', 'history', 'governance', 'plan', 'settings'];

const NOW = Date.UTC(2026, 9, 20, 12, 0, 0);
const message = (i: number, senderId: string) => ({
    __typename: 'Message',
    id: `msg-${i}`,
    conversationId: 'conv-1',
    senderId,
    type: 'TEXT',
    content: `Message number ${i} in the circle conversation`,
    mentions: [],
    replyToId: null,
    attachments: [],
    isEdited: false,
    editedAt: null,
    isDeleted: false,
    createdAt: new Date(NOW + i * 60_000).toISOString(),
});

/** Circle data with chat switched ON and a long conversation, so the list has to scroll. */
function chatOn(count = 40) {
    return {
        ...memberScreens('MEMBER'),
        CircleChat: { circleChat: { __typename: 'CircleChat', circleId: 'cir-1', conversationId: 'conv-1', available: true, historyDays: null, historyLimited: false } },
        GetMessages: { getMessages: { __typename: 'MessageList', messages: Array.from({ length: count }, (_, i) => message(i + 1, i % 3 === 0 ? ME : 'usr-2')), total: count, hasMore: false } },
    };
}

const frame = (page: Page) => page.getByTestId('circle-frame');

test('one row of section tabs at 1280, with short labels', async () => {
    const { page } = await open(browser, '/circles/cir-1', memberScreens('MEMBER') as never, LAPTOP);
    const nav = page.getByRole('navigation', { name: 'Circle' });
    await expect(nav).toBeVisible({ timeout: 90_000 });
    const boxes = [];
    for (const path of SECTIONS) boxes.push(await nav.locator(`a[href$="/circles/cir-1/${path}"]`).boundingBox());
    const tops = boxes.map((b) => Math.round(b?.y ?? -1));
    expect(new Set(tops).size, `tabs are on ${new Set(tops).size} rows`).toBe(1);
    expect((await nav.boundingBox())?.height ?? 999).toBeLessThan(60);
    // Chat is off, so the home tab says what the page is.
    await expect(nav.getByRole('link', { name: 'Activity' })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', { name: 'Chat' })).toHaveCount(0);
    await page.context().close();
});

test('every long label still sits on one row at 1280 in every language', async () => {
    const { page } = await open(browser, '/circles/cir-1', memberScreens('MEMBER') as never, LAPTOP);
    await expect(page.getByRole('navigation', { name: 'Circle' })).toBeVisible({ timeout: 90_000 });
    for (const locale of ['de', 'fr', 'it', 'nl']) {
        await page.goto(`/${locale}/circles/cir-1`, { waitUntil: 'load', timeout: 120_000 });
        const nav = page.locator('nav').filter({ has: page.locator('a[href$="/circles/cir-1/settings"]') }).first();
        await expect(nav).toBeVisible({ timeout: 90_000 });
        const tops = new Set<number>();
        for (const path of SECTIONS) tops.add(Math.round((await nav.locator(`a[href$="/circles/cir-1/${path}"]`).boundingBox())?.y ?? -1));
        expect(tops.size, `${locale}: tabs wrap onto ${tops.size} rows`).toBe(1);
    }
    await page.context().close();
});

test('on a phone the strip scrolls, shows a scrollbar a mouse can use, and every tab can be reached', async () => {
    const { page } = await open(browser, '/circles/cir-1', memberScreens('MEMBER') as never, PHONE);
    const nav = page.getByRole('navigation', { name: 'Circle' });
    await expect(nav).toBeVisible({ timeout: 90_000 });
    const strip = nav.locator('ul');
    const m = await strip.evaluate((e) => ({ over: e.scrollWidth > e.clientWidth, sb: getComputedStyle(e).scrollbarWidth, ox: getComputedStyle(e).overflowX }));
    expect(m.over, 'strip overflows on a phone').toBe(true);
    expect(m.ox).toBe('auto');
    expect(m.sb, 'scrollbar must not be hidden').not.toBe('none');
    // The last tab can be scrolled to and focused with the keyboard.
    const last = nav.locator('a[href$="/circles/cir-1/settings"]');
    await last.focus();
    await expect(last).toBeInViewport();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.context().close();
});

const SCREENS: Array<[string, string]> = [
    ['/circles/cir-1', 'home'],
    ['/circles/cir-1/members', 'members'],
    ['/circles/cir-1/leaderboard', 'leaderboard'],
    ['/circles/cir-1/history', 'history'],
    ['/circles/cir-1/governance', 'governance'],
    ['/circles/cir-1/plan', 'plan'],
    ['/circles/cir-1/settings', 'settings'],
    ['/circles/cir-1/report', 'report'],
    ['/circles/cir-1/motions/new', 'new motion'],
    ['/circles/cir-1/motions/mot-1', 'motion'],
    ['/circles/cir-1/projects/new', 'new project'],
    ['/circles/cir-1/projects/prj-1', 'project'],
    ['/circles/cir-1/challenges/new', 'new challenge'],
    ['/circles/cir-1/challenges/chl-1', 'challenge'],
];

for (const [path, label] of SCREENS) {
    test(`${label}: shared navigation, exactly one h1 and one aria-current`, async () => {
        const { page } = await open(browser, path, memberScreens('LEAD') as never, LAPTOP);
        await expect(frame(page).getByRole('heading', { level: 1 })).toHaveCount(1, { timeout: 90_000 });
        const nav = frame(page).getByRole('navigation', { name: 'Circle' });
        await expect(nav).toBeVisible();
        for (const section of SECTIONS) await expect(nav.locator(`a[href$="/circles/cir-1/${section}"]`)).toHaveCount(1);
        await expect(frame(page).locator('[aria-current]')).toHaveCount(1);
        await page.context().close();
    });
}

// A real file: the banner removes itself when its picture fails to load, so a made-up address would never show.
const BANNER = '/COMMUNITY.png';

test('home: the hero shows the circle banner when it has one, and a plain gradient (no photo) when it does not', async () => {
    const screens = memberScreens('MEMBER');
    const withBanner = { ...screens, Circle: { circle: { ...screens.Circle.circle, bannerUrl: BANNER, tagline: 'Builders, together' } } };
    const a = await open(browser, '/circles/cir-1', withBanner as never, LAPTOP);
    const hero = a.page.getByTestId('circle-header');
    await expect(hero).toBeVisible({ timeout: 90_000 });
    await expect(hero.locator(`img[src="${BANNER}"]`)).toHaveCount(1);
    await expect(hero.getByText('Builders, together')).toBeVisible();
    await a.page.context().close();

    const b = await open(browser, '/circles/cir-1', memberScreens('MEMBER') as never, LAPTOP);
    const plain = b.page.getByTestId('circle-header');
    await expect(plain).toBeVisible({ timeout: 90_000 });
    await expect(plain.locator('img')).toHaveCount(0);
    await expect(plain.getByRole('heading', { level: 1, name: 'Accra Tech Hub' })).toBeVisible();
    // The avatar overlaps the strip and must sit on top of it, not be cut off by it.
    const avatarOnTop = await plain.locator('span.rounded-full', { hasText: /^A$/ }).evaluate((el) => {
        const box = el.getBoundingClientRect();
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + 8);
        return !!hit && (el === hit || el.contains(hit));
    });
    expect(avatarOnTop, 'the top of the avatar is not covered by the strip').toBe(true);
    await b.page.context().close();
});

test('home: What is live and Members sit in the rail beside the feed at 1280', async () => {
    const { page } = await open(browser, '/circles/cir-1', memberScreens('MEMBER') as never, LAPTOP);
    const feed = page.getByTestId('circle-feed');
    await expect(feed).toBeVisible({ timeout: 90_000 });
    const live = page.getByRole('heading', { name: "What's live" });
    const members = page.getByRole('heading', { name: /^Members \(/ });
    await expect(live).toBeVisible();
    await expect(members).toBeVisible();
    const fb = await feed.boundingBox();
    const lb = await live.boundingBox();
    expect((lb?.x ?? 0) > (fb?.x ?? 0) + (fb?.width ?? 0) - 1, 'rail is to the right of the feed').toBe(true);
    await page.context().close();
});

test('chat on: the tab says Chat, the conversation scrolls inside its card and the composer stays pinned', async () => {
    const { page } = await open(browser, '/circles/cir-1', chatOn() as never, LAPTOP);
    const card = page.getByTestId('circle-chat');
    await expect(card).toBeVisible({ timeout: 90_000 });
    const nav = page.getByRole('navigation', { name: 'Circle' });
    await expect(nav.getByRole('link', { name: 'Chat' })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', { name: 'Activity' })).toHaveCount(0);
    await expect(page.getByText('Message number 40 in the circle conversation')).toBeVisible({ timeout: 30_000 });

    const list = card.locator('.overflow-y-auto').first();
    expect(await list.evaluate((e) => e.scrollHeight > e.clientHeight + 40), 'the conversation overflows its card').toBe(true);
    // Short deadline on purpose: it jumps to the end, it does not animate there.
    await expect
        .poll(() => list.evaluate((e) => Math.abs(e.scrollHeight - e.clientHeight - e.scrollTop) < 4), { message: 'opens at the latest message', timeout: 1_500 })
        .toBe(true);

    // The page itself did not get dragged to the foot of the card by the auto-scroll.
    expect(await frame(page).evaluate((e) => e.scrollTop)).toBe(0);

    // Scroll the conversation to the top: the composer does not move.
    const composer = page.getByTestId('circle-composer');
    const before = await composer.boundingBox();
    await list.evaluate((e) => { e.scrollTop = 0; });
    const after = await composer.boundingBox();
    expect(Math.round(after?.y ?? -1)).toBe(Math.round(before?.y ?? -2));
    await expect(composer.getByRole('textbox')).toBeVisible();
    // The card sits under the hero, so the box can start below the fold; one scroll
    // of the page brings it fully into view, and the card fits the window there.
    await composer.scrollIntoViewIfNeeded();
    const reached = await composer.boundingBox();
    expect((reached?.y ?? 0) + (reached?.height ?? 0), 'composer is inside the viewport').toBeLessThanOrEqual(LAPTOP.height);
    await page.context().close();
});

test('chat on at 360: the composer is reachable without scrolling the page past the card', async () => {
    const { page } = await open(browser, '/circles/cir-1', chatOn() as never, PHONE);
    const composer = page.getByTestId('circle-composer');
    await expect(composer).toBeVisible({ timeout: 90_000 });
    await composer.scrollIntoViewIfNeeded();
    const box = await composer.boundingBox();
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(PHONE.height);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.context().close();
});

test('chat on: the typing indicator shows above the composer', async () => {
    const { page } = await open(browser, '/circles/cir-1', chatOn(6) as never, LAPTOP);
    let socket: WebSocketRoute | null = null;
    await page.routeWebSocket(/socket\.io/, (ws) => {
        socket = ws;
        ws.send('0{"sid":"s1","upgrades":[],"pingInterval":25000,"pingTimeout":20000,"maxPayload":1000000}');
        ws.onMessage((m) => {
            if (typeof m === 'string' && m.startsWith('40')) ws.send('40{"sid":"c1"}');
            if (m === '2') ws.send('3');
        });
    });
    await page.reload({ waitUntil: 'load' });
    await expect(page.getByTestId('circle-composer')).toBeVisible({ timeout: 90_000 });
    await expect.poll(() => socket !== null, { timeout: 30_000 }).toBe(true);
    await page.waitForTimeout(500);
    (socket as WebSocketRoute | null)?.send('42["typing:start",{"conversationId":"conv-1","userId":"usr-2"}]');
    const typing = page.locator('[aria-live="polite"]').filter({ hasText: /typing/i });
    await expect(typing).toBeVisible({ timeout: 15_000 });
    const t = await typing.boundingBox();
    const c = await page.getByTestId('circle-composer').boundingBox();
    expect((t?.y ?? 0) + (t?.height ?? 0)).toBeLessThanOrEqual((c?.y ?? 0) + 1);
    await page.context().close();
});
