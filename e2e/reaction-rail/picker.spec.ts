/**
 * ReactionButton — the single reaction control: hover / press-and-hold opens the
 * Happy · Hopeful · Sad picker, a plain click or tap toggles Happy, and the
 * keyboard has a complete path. Driven on the isolated harness (no server).
 */
import { test, expect, type Browser, type Page } from '@playwright/test';
import { openBrowser } from '../support/browser';

const PATH = '/en/dev-harness/reaction-rail/isolated';
let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser.close();
});

async function open(opts: { touch?: boolean; mobile?: boolean; viewport?: { width: number; height: number } } = {}) {
    const context = await browser.newContext({
        baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${process.env.E2E_PORT ?? 3111}`,
        viewport: opts.viewport ?? { width: 1100, height: 800 },
        hasTouch: opts.touch ?? false,
        isMobile: opts.mobile ?? false,
    });
    const page = await context.newPage();
    await page.goto(PATH);
    await expect(page.locator('main[data-hydrated="yes"]')).toBeVisible({ timeout: 60_000 });
    return { context, page };
}

const card = (page: Page, i = 0) => page.getByTestId(`card-${i}`);
const trigger = (page: Page, i = 0) => card(page, i).getByTestId('reaction-button');
const picker = (page: Page) => page.getByTestId('reaction-picker');
const writes = (page: Page, i = 0) => page.getByTestId(`log-${i}`);

async function touchHold(page: Page, ms = 600) {
    const box = (await trigger(page).boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const init = { pointerType: 'touch', pointerId: 7, isPrimary: true, clientX: x, clientY: y, bubbles: true };
    await trigger(page).dispatchEvent('pointerdown', init);
    await page.waitForTimeout(ms);
    return { x, y, init };
}

test('neutral state reads "React"; no Like anywhere', async () => {
    const { context, page } = await open();
    await expect(trigger(page)).toHaveAttribute('data-reaction', 'NONE');
    await expect(trigger(page)).toHaveAccessibleName('React');
    await expect(trigger(page)).toHaveAttribute('aria-haspopup', 'true');
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('button', { name: /^Like$/ })).toHaveCount(0);
    await context.close();
});

test('desktop: hover opens the picker after a short delay, choosing Hopeful sets it', async () => {
    const { context, page } = await open();
    await trigger(page).hover();
    await expect(picker(page)).toBeVisible();
    await expect(picker(page).getByRole('button')).toHaveCount(3);
    await picker(page).getByRole('button', { name: 'Hopeful' }).click();
    await expect(page.getByTestId('selected-0')).toHaveText('selected: HOPEFUL');
    await expect(trigger(page)).toHaveAttribute('data-reaction', 'HOPEFUL');
    await expect(trigger(page)).toContainText('Hopeful');
    await expect(picker(page)).toHaveCount(0);
    await context.close();
});

test('desktop: the pointer can travel into the popup; leaving closes it', async () => {
    const { context, page } = await open();
    await trigger(page).hover();
    await expect(picker(page)).toBeVisible();
    const p = (await picker(page).boundingBox())!;
    await page.mouse.move(p.x + p.width / 2, p.y + p.height / 2, { steps: 8 });
    await page.waitForTimeout(500);
    await expect(picker(page)).toBeVisible();
    await page.mouse.move(5, 5, { steps: 5 });
    await expect(picker(page)).toHaveCount(0);
    await context.close();
});

test('desktop: quick click toggles Happy on and off; a different reaction is removed by a click', async () => {
    const { context, page } = await open();
    await trigger(page).click();
    await expect(trigger(page)).toHaveAttribute('data-reaction', 'HAPPY');
    await trigger(page).click();
    await expect(trigger(page)).toHaveAttribute('data-reaction', 'NONE');
    // A click closes the picker and the resting pointer does not re-open it; re-enter to hover.
    await page.mouse.move(5, 5);
    await trigger(page).hover();
    await picker(page).getByRole('button', { name: 'Sad' }).click();
    await expect(trigger(page)).toHaveAttribute('data-reaction', 'SAD');
    await trigger(page).click();
    await expect(trigger(page)).toHaveAttribute('data-reaction', 'NONE');
    await expect(writes(page)).toHaveText('writes: HAPPY,none,SAD,none');
    await context.close();
});

test('switching reactions and re-picking the current one removes it', async () => {
    const { context, page } = await open();
    for (const [name, kind] of [['Hopeful', 'HOPEFUL'], ['Sad', 'SAD'], ['Happy', 'HAPPY']] as const) {
        await trigger(page).hover();
        await picker(page).getByRole('button', { name }).click();
        await expect(trigger(page)).toHaveAttribute('data-reaction', kind);
        await page.mouse.move(5, 5);
        await expect(picker(page)).toHaveCount(0);
    }
    await trigger(page).hover();
    await expect(picker(page).getByRole('button', { name: 'Happy' })).toHaveAttribute('aria-pressed', 'true');
    await picker(page).getByRole('button', { name: 'Happy' }).click();
    await expect(trigger(page)).toHaveAttribute('data-reaction', 'NONE');
    await context.close();
});

test('there is no separate "more reactions" control — one React button only', async () => {
    const { context, page } = await open();
    await expect(card(page).getByTestId('reaction-more')).toHaveCount(0);
    await context.close();
});

test('keyboard: Enter toggles Happy; ArrowUp opens; arrows move; Enter chooses; focus returns; Escape closes', async () => {
    const { context, page } = await open();
    await trigger(page).focus();
    await page.keyboard.press('Enter');
    await expect(trigger(page)).toHaveAttribute('data-reaction', 'HAPPY');
    await page.keyboard.press('Space');
    await expect(trigger(page)).toHaveAttribute('data-reaction', 'NONE');

    await page.keyboard.press('ArrowUp');
    await expect(picker(page)).toBeVisible();
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(picker(page).getByRole('button', { name: 'Happy' })).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(picker(page).getByRole('button', { name: 'Hopeful' })).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(picker(page).getByRole('button', { name: 'Sad' })).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(picker(page).getByRole('button', { name: 'Happy' })).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(picker(page).getByRole('button', { name: 'Sad' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(trigger(page)).toHaveAttribute('data-reaction', 'SAD');
    await expect(picker(page)).toHaveCount(0);
    await expect(trigger(page)).toBeFocused();

    await page.keyboard.press('ArrowUp');
    await expect(picker(page).getByRole('button', { name: 'Sad' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(picker(page)).toHaveCount(0);
    await expect(trigger(page)).toBeFocused();
    await expect(trigger(page)).toHaveAttribute('data-reaction', 'SAD');
    await context.close();
});

test('touch: a quick tap toggles Happy; the picker does not open', async () => {
    const { context, page } = await open({ touch: true, mobile: true, viewport: { width: 390, height: 844 } });
    await trigger(page).tap();
    await expect(trigger(page)).toHaveAttribute('data-reaction', 'HAPPY');
    await page.waitForTimeout(700);
    await expect(picker(page)).toHaveCount(0);
    await trigger(page).tap();
    await expect(trigger(page)).toHaveAttribute('data-reaction', 'NONE');
    await context.close();
});

test('touch: press-and-hold opens the picker; lifting then tapping an option chooses it', async () => {
    const { context, page } = await open({ touch: true, mobile: true, viewport: { width: 390, height: 844 } });
    const { init } = await touchHold(page);
    await expect(picker(page)).toBeVisible();
    await trigger(page).dispatchEvent('pointerup', init);
    // The tail click of the hold must not toggle Happy.
    await expect(trigger(page)).toHaveAttribute('data-reaction', 'NONE');
    await expect(picker(page)).toBeVisible();
    await picker(page).getByRole('button', { name: 'Hopeful' }).tap();
    await expect(trigger(page)).toHaveAttribute('data-reaction', 'HOPEFUL');
    await expect(picker(page)).toHaveCount(0);
    await context.close();
});

test('touch: hold, slide onto an option and release chooses it', async () => {
    const { context, page } = await open({ touch: true, mobile: true, viewport: { width: 390, height: 844 } });
    const { init } = await touchHold(page);
    await expect(picker(page)).toBeVisible();
    const o = (await picker(page).getByRole('button', { name: 'Sad' }).boundingBox())!;
    const at = { ...init, clientX: o.x + o.width / 2, clientY: o.y + o.height / 2 };
    await trigger(page).dispatchEvent('pointermove', at);
    await trigger(page).dispatchEvent('pointerup', at);
    await expect(trigger(page)).toHaveAttribute('data-reaction', 'SAD');
    await expect(picker(page)).toHaveCount(0);
    await context.close();
});

test('touch: moving before the hold fires (a scroll) cancels it; pointercancel never chooses', async () => {
    const { context, page } = await open({ touch: true, mobile: true, viewport: { width: 390, height: 844 } });
    const box = (await trigger(page).boundingBox())!;
    const x = box.x + 10;
    const y = box.y + 5;
    const init = { pointerType: 'touch', pointerId: 8, isPrimary: true, clientX: x, clientY: y, bubbles: true };
    await trigger(page).dispatchEvent('pointerdown', init);
    await trigger(page).dispatchEvent('pointermove', { ...init, clientY: y - 40 });
    await page.waitForTimeout(700);
    await expect(picker(page)).toHaveCount(0);
    await trigger(page).dispatchEvent('pointercancel', init);

    // Hold fires, then the browser cancels: the picker stays for a tap, nothing is chosen.
    const h = await touchHold(page);
    await expect(picker(page)).toBeVisible();
    await trigger(page).dispatchEvent('pointercancel', h.init);
    await expect(picker(page)).toBeVisible();
    await expect(trigger(page)).toHaveAttribute('data-reaction', 'NONE');
    await context.close();
});

test('the page still scrolls vertically when a swipe starts on the button', async () => {
    const { context, page } = await open({ touch: true, mobile: true, viewport: { width: 390, height: 600 } });
    const css = await trigger(page).evaluate((el) => getComputedStyle(el).touchAction);
    expect(css).toBe('manipulation');
    const before = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => window.scrollBy(0, 300));
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
    await context.close();
});

test('reduced motion: the picker still opens, without animation', async () => {
    const context = await browser.newContext({
        baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${process.env.E2E_PORT ?? 3111}`,
        viewport: { width: 1100, height: 800 },
        reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await page.goto(PATH);
    await expect(page.locator('main[data-hydrated="yes"]')).toBeVisible({ timeout: 60_000 });
    await trigger(page).hover();
    await expect(picker(page)).toBeVisible();
    expect(await picker(page).evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    await context.close();
});
