/** Country values arrive as ISO codes (alpha-3 from password signup, alpha-2 from OAuth); pages show the name. */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { open } from './fixtures';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const person = (n: number, first: string, last: string, residenceCountry: string) => ({
    __typename: 'PeopleRecommendation', score: 1, sharedCommunityCount: 0, sharedCommunityNames: [], mutualConnectionCount: 0, mutualConnectionNames: [], matchReason: null,
    profile: {
        __typename: 'ProfileSummary', userId: `00000000-0000-4000-8000-0000000a0e${String(n).padStart(2, '0')}`, firstName: first, lastName: last, avatarUrl: null,
        headline: null, bio: null, sector: null, countryOfOrigin: 'GHA', residenceCountry, connectionStatus: 'none', connectionId: null, isVerified: false,
        verificationBadge: null, trustScore: null, trustTier: null,
    },
});

const MOCKS = {
    RecommendedPeople: {
        recommendedPeople: {
            __typename: 'PeopleRecommendationPage',
            rankingStrategy: 'e2e',
            items: [person(1, 'Kwame', 'Asante', 'GHA'), person(2, 'Esi', 'Mensah', 'de'), person(3, 'Ama', 'Boateng', 'DEU')],
        },
    },
};

for (const viewport of [{ width: 1280, height: 900 }, { width: 360, height: 740 }]) {
    test(`people rows show country names, never the ISO code (${viewport.width}px)`, async () => {
        const { page } = await open(browser, '/people', MOCKS as never, viewport);
        const list = page.getByTestId('people-list');
        await expect(list.locator('li')).toHaveCount(3, { timeout: 90_000 });
        await expect(list.locator('li').nth(0)).toContainText('Ghana');
        await expect(list.locator('li').nth(1)).toContainText('Germany');
        await expect(list.locator('li').nth(2)).toContainText('Germany');
        const text = await list.innerText();
        expect(text).not.toMatch(/\b(GHA|DEU|DE|GH)\b/);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
        await page.context().close();
    });
}
