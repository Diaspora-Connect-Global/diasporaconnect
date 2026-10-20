/**
 * /profile must render the person's posts even when a post comes back WITHOUT the viewer's
 * engagement (`userEngagement: null`) or without counts — the chronological `userPosts` path does
 * not fill per-viewer engagement. FilteredPosts read `post.userEngagement.hasSaved` unguarded and
 * the whole profile route fell into its error boundary (owner report, 2026-10-18).
 */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { fakeGraphql, ME_PROFILE, seedSession, SHELL_OVERRIDES, wireNetwork } from '../support/fakeSession';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

const post = (id: string, text: string, extra: Record<string, unknown>) => ({
    __typename: 'Post',
    id,
    text,
    authorId: ME_PROFILE.userId,
    authorType: 'USER',
    authorProfile: {
        __typename: 'AuthorProfile',
        organizationProfile: null,
        userProfile: { __typename: 'UserProfile', name: 'Ama Mensah', avatar: null, isVip: false, verificationTier: null, trustScore: null },
    },
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    attachments: [],
    mentions: [],
    categories: [],
    aiTopics: [],
    ...extra,
});

test.describe('profile posts', () => {
    test.describe.configure({ timeout: 600_000 });

    test('posts with no viewer engagement and no counts still render (no error page)', async () => {
        const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 1280, height: 900 } });
        await seedSession(context);
        const graphql = fakeGraphql({
            ...SHELL_OVERRIDES,
            GetMyProfile: { getProfile: { __typename: 'ProfileResponse', success: true, message: 'ok', profile: { ...ME_PROFILE } } },
            GetUserPosts: {
                userPosts: [
                    post('p-null-engagement', 'Hello from the chronological path', {
                        engagementCounts: { __typename: 'EngagementCounts', likes: 2, comments: 1, shares: 0, saves: 0, happy: 2, hopeful: 0, sad: 0 },
                        userEngagement: null,
                    }),
                    post('p-null-counts', 'A post with no counts at all', { engagementCounts: null, userEngagement: null }),
                ],
            },
        });
        await wireNetwork(context, graphql);
        const page = await context.newPage();
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));

        await page.goto('/en/profile', { waitUntil: 'load' });
        // The profile renders the post list in two layouts (phone / desktop); one visible copy is enough.
        await expect(page.getByText('Hello from the chronological path').filter({ visible: true }).first()).toBeVisible({ timeout: 400_000 });
        await expect(page.getByText('A post with no counts at all').filter({ visible: true }).first()).toBeVisible();
        expect(errors.filter((m) => /hasSaved|hasShared|reading 'comments'|reading 'shares'/.test(m))).toEqual([]);
        await context.close();
    });
});
