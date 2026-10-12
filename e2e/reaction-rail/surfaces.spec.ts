/**
 * The same ReactionButton on the real post surfaces: the Home feed card and the
 * Home community-post preview rows. Writes are asserted against the fake GraphQL
 * log; a refused write must roll the button back.
 */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { open } from '../redesign/fixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const OK = { AddEngagement: { addEngagement: { __typename: 'EngagementResult', success: true } }, RemoveEngagement: { removeEngagement: { __typename: 'EngagementResult', success: true } } };
const REFUSE = { AddEngagement: { __errors: [{ message: 'Not allowed', code: 'BAD_USER_INPUT' }] }, RemoveEngagement: { __errors: [{ message: 'Not allowed', code: 'BAD_USER_INPUT' }] } };

test('feed card: one React button next to Comment and Share; picks send the typed reaction', async () => {
    const { page, graphql } = await open(browser, '/home', OK);
    const card = page.locator('[id^="feed-post-"]').first();
    await expect(card).toBeVisible({ timeout: 90_000 });
    const btn = card.getByTestId('reaction-button');
    await expect(btn).toBeVisible();
    await expect(card.getByRole('button', { name: /^Like$/ })).toHaveCount(0);
    await expect(card.getByRole('button', { name: /Comment/ }).first()).toBeVisible();
    await btn.hover();
    await page.getByTestId('reaction-picker').getByRole('button', { name: 'Hopeful' }).click();
    await expect(btn).toHaveAttribute('data-reaction', 'HOPEFUL');
    await expect.poll(() => graphql.calls.filter((c) => c.name === 'AddEngagement').length).toBeGreaterThan(0);
    const input = graphql.calls.find((c) => c.name === 'AddEngagement')!.variables.input as Record<string, unknown>;
    expect(input.reactionType).toBe('HOPEFUL');
    await page.mouse.move(5, 5);
    await btn.click();
    await expect(btn).toHaveAttribute('data-reaction', 'NONE');
    await expect.poll(() => graphql.calls.filter((c) => c.name === 'RemoveEngagement').length).toBeGreaterThan(0);
    await page.context().close();
});

test('feed card: a refused reaction rolls the button back', async () => {
    const { page } = await open(browser, '/home', REFUSE);
    const btn = page.locator('[id^="feed-post-"]').first().getByTestId('reaction-button');
    await expect(btn).toBeVisible({ timeout: 90_000 });
    await btn.click();
    await expect(btn).toHaveAttribute('data-reaction', 'NONE', { timeout: 15_000 });
    await page.context().close();
});

test('home community-post preview: same button; click toggles Happy, picker chooses Sad, refusal rolls back', async () => {
    const { page, graphql } = await open(browser, '/home', OK);
    const row = page.getByTestId('home-community-posts').getByTestId('post-reaction-row').first();
    await expect(row).toBeVisible({ timeout: 90_000 });
    const btn = row.getByTestId('reaction-button');
    await expect(btn).toHaveAttribute('data-reaction', 'NONE');
    await btn.click();
    await expect(btn).toHaveAttribute('data-reaction', 'HAPPY');
    await page.mouse.move(5, 5);
    await btn.hover();
    await page.getByTestId('reaction-picker').getByRole('button', { name: 'Sad' }).click();
    await expect(btn).toHaveAttribute('data-reaction', 'SAD');
    await expect.poll(() => graphql.calls.some((c) => c.name === 'AddEngagement' && (c.variables.input as { reactionType?: string }).reactionType === 'SAD')).toBe(true);
    await page.context().close();

    const refused = await open(browser, '/home', REFUSE);
    const rbtn = refused.page.getByTestId('home-community-posts').getByTestId('post-reaction-row').first().getByTestId('reaction-button');
    await expect(rbtn).toBeVisible({ timeout: 90_000 });
    await rbtn.click();
    await expect(rbtn).toHaveAttribute('data-reaction', 'NONE', { timeout: 15_000 });
    await refused.page.context().close();
});
