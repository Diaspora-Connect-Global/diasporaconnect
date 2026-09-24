/**
 * Username settings section on the isolated harness
 * (`/en/dev-harness/username-settings`) with a fake server — see the harness
 * page for the fake's rules. Drives the real component in a real browser.
 */
import { test, expect, type Browser, type Page } from '@playwright/test';
import { openBrowser } from '../support/browser';

const HARNESS = '/en/dev-harness/username-settings';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser.close();
});

async function open(query = ''): Promise<Page> {
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
    const page = await context.newPage();
    await page.goto(`${HARNESS}${query}`, { waitUntil: 'load' });
    await expect(page.getByTestId('username-section')).toBeVisible();
    return page;
}

const input = (p: Page) => p.getByTestId('username-input');
const status = (p: Page) => p.getByTestId('username-status');
const save = (p: Page) => p.getByTestId('username-save');
const harnessLog = (p: Page) =>
    p.evaluate(() => window.__usernameHarness ?? { checks: [], saves: [], toasts: [] });

test('shows the current handle and its /@ link', async () => {
    const page = await open();
    await expect(page.getByTestId('username-current')).toHaveText('@steven');
    await expect(page.getByTestId('username-profile-url')).toHaveText(/\/@steven$/);
    await page.context().close();
});

test('invalid input is rejected instantly and never checked with the server', async () => {
    const page = await open();
    await input(page).fill('john doe');
    await expect(status(page)).toHaveText('Only letters, numbers, underscores and periods');
    await input(page).fill('1abc');
    await expect(status(page)).toHaveText('Must start with a letter');
    await input(page).fill('abc_');
    await expect(status(page)).toHaveText("Can't end with an underscore");
    await page.waitForTimeout(700);
    expect((await harnessLog(page)).checks).toEqual([]);
    await expect(save(page)).toBeDisabled();
    await page.context().close();
});

test('save is enabled only after the debounced check says available — and it is debounced', async () => {
    const page = await open();
    await expect(save(page)).toBeDisabled();
    await input(page).pressSequentially('@New.Name', { delay: 30 });
    await expect(status(page)).toHaveText('@new.name is available');
    await expect(save(page)).toBeEnabled();
    // One check for the settled value, not one per keystroke.
    expect((await harnessLog(page)).checks).toEqual(['new.name']);

    await save(page).click();
    await expect(page.getByTestId('username-current')).toHaveText('@new.name');
    await expect(page.getByTestId('username-locked')).toContainText('You can change your username again on');
    await expect(input(page)).toBeDisabled();
    expect((await harnessLog(page)).saves).toEqual(['new.name']);
    await page.context().close();
});

test('taken and reserved names are refused with neutral copy', async () => {
    const page = await open();
    await input(page).fill('takenname');
    await expect(status(page)).toHaveText('This username is already taken');
    await expect(save(page)).toBeDisabled();
    await input(page).fill('superadminx');
    await expect(status(page)).toHaveText("This username isn't available");
    await expect(save(page)).toBeDisabled();
    await page.context().close();
});

test('losing a race on save (TAKEN) is reported and blocks a re-save', async () => {
    const page = await open();
    await input(page).fill('racer1');
    await expect(save(page)).toBeEnabled();
    await save(page).click();
    await expect(status(page)).toHaveText('This username is already taken');
    await expect(save(page)).toBeDisabled();
    await expect(page.getByTestId('username-current')).toHaveText('@steven');
    expect((await harnessLog(page)).toasts).toContain('err:This username is already taken');
    await page.context().close();
});

test('TOO_SOON on save locks the field and shows the date', async () => {
    const page = await open();
    await input(page).fill('soonname');
    await expect(save(page)).toBeEnabled();
    await save(page).click();
    await expect(page.getByTestId('username-locked')).toContainText('You can change your username again on');
    await expect(input(page)).toBeDisabled();
    await page.context().close();
});

test('an active 30-day window renders the field read-only', async () => {
    const page = await open('?locked=1');
    await expect(input(page)).toBeDisabled();
    await expect(page.getByTestId('username-locked')).toBeVisible();
    await expect(save(page)).toBeDisabled();
    await page.context().close();
});

test('German locale formats the unlock date in German', async () => {
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
    const page = await context.newPage();
    await page.goto('/de/dev-harness/username-settings?locked=1', { waitUntil: 'load' });
    await expect(page.getByTestId('username-locked')).toContainText('Du kannst deinen Benutzernamen am');
    await context.close();
});
