/**
 * The shared feed composer: the same "Share an update…" box on Home and Community opens the
 * create-post modal. GraphQL is the in-memory double.
 */
import { test, expect, type Browser, type Page } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { open, post } from './fixtures';
import { draftMetaKey, draftOwnerKey } from '../../src/lib/postDraftKeys';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const NEW_ID = '00000000-0000-4000-8000-0000000b0099';
const NEW_TEXT = 'Hello from the composer modal';
const created = post(NEW_ID, NEW_TEXT);

const OK = {
    CreatePost: { createPost: { __typename: 'Post', id: NEW_ID, text: NEW_TEXT, authorType: 'USER' } },
    GetPost: { post: created },
};

const modal = (page: Page) => page.getByTestId('post-composer-modal');
const promptBox = (page: Page) => page.getByRole('button', { name: /Share an update/ });

test('Home shows the composer above the feed tabs, and it opens the modal', async () => {
    const { page } = await open(browser, '/home', OK);
    const composer = page.getByTestId('feed-composer');
    await expect(composer).toBeVisible({ timeout: 90_000 });
    const tabs = page.getByRole('tablist', { name: 'Feed' });
    await expect(tabs).toBeVisible();
    const c = await composer.boundingBox();
    const t = await tabs.boundingBox();
    expect(c!.y + c!.height).toBeLessThanOrEqual(t!.y);
    // Owner 2026-10-27: no Post / Add photo / Group buttons under the box — the box is the only control.
    await expect(composer.getByRole('button')).toHaveCount(1);
    await expect(modal(page)).toHaveCount(0);
    await promptBox(page).click();
    await expect(modal(page)).toBeVisible();
    await expect(modal(page).getByRole('heading', { name: 'Create post' })).toBeVisible();
    await page.context().close();
});

test('posting sends the typed text, closes the modal and puts the post at the top of the feed', async () => {
    const { page, graphql } = await open(browser, '/home', OK);
    await promptBox(page).click({ timeout: 90_000 });
    const box = modal(page).locator('textarea');
    await box.fill(NEW_TEXT);
    await modal(page).getByRole('button', { name: 'Post', exact: true }).click();
    await expect(modal(page)).toHaveCount(0);
    const call = graphql.calls.find((c) => c.name === 'CreatePost');
    expect((call?.variables.input as { text: string }).text).toBe(NEW_TEXT);
    const first = page.locator('[id^="feed-post-"]').first();
    await expect(first).toHaveAttribute('id', `feed-post-${NEW_ID}`);
    await expect(first).toContainText(NEW_TEXT);
    await page.context().close();
});

test('a refused post keeps the modal open with an error and reports no success', async () => {
    const { page } = await open(browser, '/home', { CreatePost: { __errors: [{ message: 'Not allowed', code: 'BAD_USER_INPUT' }] } });
    await promptBox(page).click({ timeout: 90_000 });
    await modal(page).locator('textarea').fill('This will be refused');
    await modal(page).getByRole('button', { name: 'Post', exact: true }).click();
    await expect(modal(page).getByRole('alert')).toContainText('Failed to create post');
    await expect(modal(page)).toBeVisible();
    await expect(page.getByText('Post published successfully!')).toHaveCount(0);
    await expect(page.locator(`#feed-post-${NEW_ID}`)).toHaveCount(0);
    await page.context().close();
});

test('Esc closes an empty modal and returns focus to the composer; a draft asks first', async () => {
    const { page } = await open(browser, '/home', OK);
    const opener = promptBox(page);
    await opener.click({ timeout: 90_000 });
    await expect(modal(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal(page)).toHaveCount(0);
    await expect(opener).toBeFocused();

    await opener.click();
    await modal(page).locator('textarea').fill('half a thought');
    await page.keyboard.press('Escape');
    const confirm = page.getByRole('alertdialog');
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Keep editing' }).click();
    await expect(modal(page)).toBeVisible();
    await expect(modal(page).locator('textarea')).toHaveValue('half a thought');
    await page.keyboard.press('Escape');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Discard' }).click();
    await expect(modal(page)).toHaveCount(0);
    await expect(opener).toBeFocused();
    await page.context().close();
});

test('Save draft keeps the post: the prompt offers "Continue your draft", reopening restores it, posting clears it', async () => {
    const { page } = await open(browser, '/home', OK);
    await promptBox(page).click({ timeout: 90_000 });
    await modal(page).locator('textarea').fill(NEW_TEXT);
    await page.keyboard.press('Escape');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Save draft' }).click();
    await expect(modal(page)).toHaveCount(0);
    await expect(page.getByText(/Draft saved/)).toBeVisible();

    const resume = page.getByTestId('feed-composer').getByRole('button', { name: 'Continue your draft' });
    await expect(resume).toBeVisible();
    await resume.click();
    await expect(modal(page).locator('textarea')).toHaveValue(NEW_TEXT);
    await expect(modal(page).getByText(/Draft restored/)).toBeVisible();

    await modal(page).getByRole('button', { name: 'Post', exact: true }).click();
    await expect(modal(page)).toHaveCount(0);
    await expect(promptBox(page)).toBeVisible();
    expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('cpd:')))).toEqual([]);
    await page.context().close();
});

test("a draft belongs to the person who wrote it: someone else's draft in the same browser is never shown", async () => {
    const { page } = await open(browser, '/home', OK);
    await promptBox(page).click({ timeout: 90_000 });
    await expect(modal(page).getByRole('button', { name: 'Save draft' })).toBeDisabled();
    await modal(page).locator('textarea').fill('mine');
    await modal(page).getByRole('button', { name: 'Save draft' }).click();
    await expect(modal(page)).toHaveCount(0);
    const [mine] = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('cpd:')));
    expect(mine).toBeTruthy();
    expect(mine).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/i); // the user id is never in the key

    // Another account used this browser earlier and left a draft behind; the signed-in user discards their own.
    const theirs = draftMetaKey(draftOwnerKey('00000000-0000-4000-8000-00000000beef'));
    await page.evaluate((key) => {
        localStorage.setItem(key, JSON.stringify({ text: 'not yours', visibility: 'PRIVATE', hasMedia: false, savedAt: Date.now() }));
    }, theirs);
    await page.getByTestId('feed-composer').getByRole('button', { name: 'Continue your draft' }).click();
    await expect(modal(page).locator('textarea')).toHaveValue('mine');
    await modal(page).getByRole('button', { name: 'Discard' }).click();
    await page.keyboard.press('Escape');
    await expect(modal(page)).toHaveCount(0);

    await page.reload();
    await promptBox(page).click({ timeout: 90_000 });
    await expect(modal(page).locator('textarea')).toHaveValue('');
    await expect(modal(page).getByText(/Draft restored/)).toHaveCount(0);
    // Not shown — and not touched either: it is theirs to resume or discard.
    expect(await page.evaluate((key) => localStorage.getItem(key), theirs)).toContain('not yours');
    await page.context().close();
});

test('typing # suggests trending hashtags; arrows + Enter complete the tag', async () => {
    const { page } = await open(browser, '/home', {
        ...OK,
        GetTrendingHashtags: {
            trendingHashtags: [
                { __typename: 'TrendingHashtag', id: 't1', tag: '#Ghana', usageCount: 40 },
                { __typename: 'TrendingHashtag', id: 't2', tag: 'GhanaJobs', usageCount: 12 },
                { __typename: 'TrendingHashtag', id: 't3', tag: 'Diaspora', usageCount: 30 },
            ],
        },
    });
    await promptBox(page).click({ timeout: 90_000 });
    const box = modal(page).locator('textarea');
    await box.pressSequentially('Hello #gha');
    const list = page.getByRole('listbox', { name: 'Hashtag suggestions' });
    await expect(list).toBeVisible();
    await expect(list.getByRole('option')).toHaveText(['Ghana', 'GhanaJobs']);
    await page.keyboard.press('ArrowDown');
    await expect(list.getByRole('option', { name: 'GhanaJobs' })).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Enter');
    await expect(box).toHaveValue('Hello #GhanaJobs ');
    await expect(list).toHaveCount(0);

    // Esc closes the list without closing the composer; a tag nobody used yet is simply typed.
    await box.pressSequentially('#dia');
    await expect(list).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(list).toHaveCount(0);
    await expect(modal(page)).toBeVisible();
    await box.pressSequentially('sporaWeek');
    await expect(box).toHaveValue('Hello #GhanaJobs #diasporaWeek');
    await page.context().close();
});

test('@mentions still work next to hashtags: the list opens under the @ and picking a person inserts the tag', async () => {
    const kofi = {
        userId: '00000000-0000-4000-8000-000000000f10',
        username: 'kofi', firstName: 'Kofi', lastName: 'Boateng', sector: null, countryOfOrigin: null, residenceCountry: null,
        bio: null, headline: 'Engineer', connectionCount: 1, avatarUrl: null, connectionStatus: 'connected', connectionId: 'c-1',
        trustScore: null, trustTier: null,
    };
    const { page } = await open(browser, '/home', {
        ...OK,
        SearchUsers: { searchUsers: { success: true, message: 'ok', total: 1, hasMore: false, profiles: [kofi] } },
    });
    await promptBox(page).click({ timeout: 90_000 });
    const box = modal(page).locator('textarea');
    await box.pressSequentially('Thanks @Kof');
    const option = modal(page).getByRole('button', { name: /Kofi Boateng/ });
    await expect(option).toBeVisible();
    await option.click();
    await expect(box).toHaveValue(/^Thanks @KofiBoateng​ $/);
    await expect(page.getByRole('listbox', { name: 'Hashtag suggestions' })).toHaveCount(0);
    await page.context().close();
});

test('Community has no post-creation section: no composer box and no "Have something to share?" card', async () => {
    const { page } = await open(browser, '/community', OK);
    await expect(page.getByRole('tablist', { name: 'Feed' })).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('community-rail')).toBeAttached();
    await expect(page.getByTestId('feed-composer')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Share an update/ })).toHaveCount(0);
    await expect(page.getByText('Have something to share?')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Create post' })).toHaveCount(0);
    await page.context().close();
});

test('/create-post still works as a page', async () => {
    const { page } = await open(browser, '/create-post', OK);
    const box = page.getByPlaceholder(/What's on your mind/);
    await expect(box).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('post-composer-modal')).toHaveCount(0);
    await box.fill(NEW_TEXT);
    await page.getByRole('button', { name: 'Post', exact: true }).click();
    await expect(page.getByText('Post published successfully!')).toBeVisible();
    await page.context().close();
});

test('at 360 px the modal is full height with no horizontal scroll and a 16 px input', async () => {
    const { page } = await open(browser, '/home', OK, { width: 360, height: 740 });
    await page.getByTestId('feed-composer').getByRole('button', { name: /Share an update/ }).click({ timeout: 90_000 });
    await expect(modal(page)).toBeVisible();
    const box = await modal(page).boundingBox();
    expect(Math.round(box!.height)).toBe(740);
    expect(Math.round(box!.width)).toBe(360);
    const overflow = await page.evaluate(() => {
        const m = document.querySelector('[data-testid="post-composer-modal"]') as HTMLElement;
        return { doc: document.documentElement.scrollWidth - document.documentElement.clientWidth, modal: m.scrollWidth - m.clientWidth };
    });
    expect(overflow.doc).toBeLessThanOrEqual(0);
    expect(overflow.modal).toBeLessThanOrEqual(0);
    const size = await modal(page).locator('textarea').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(16);
    await page.context().close();
});
