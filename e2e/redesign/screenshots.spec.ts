/** Screenshots of Home / Discover / Community at 360 / 768 / 1280 into .artifacts/redesign-screenshots/. Evidence only: skipped unless REDESIGN_SCREENSHOTS=1. */
import { test, type Browser } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { openBrowser } from '../support/browser';
import { eventFixture } from '../support/eventFixtures';
import { FUTURE, open } from './fixtures';

test.skip(process.env.REDESIGN_SCREENSHOTS !== '1', 'set REDESIGN_SCREENSHOTS=1 to capture');
const OUT = path.join(process.cwd(), '.artifacts/redesign-screenshots');
const SIZES = [360, 768, 1280] as const;

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
    fs.mkdirSync(OUT, { recursive: true });
});
test.afterAll(async () => {
    await browser?.close();
});

const group = (id: string, name: string) => ({ __typename: 'Group', id, name, description: 'Connect, learn and grow together.', privacy: 'PUBLIC', memberCount: 87, avatarUrl: null });
const DATA = {
    userEvents: undefined,
    UserEvents: { userEvents: { __typename: 'UserEvents', attending: [eventFixture({ id: 'evt-reg', title: 'Networking Mixer', startAt: FUTURE, endAt: FUTURE, isRegistered: true })], saved: [] } },
    MyServiceRequests: { myServiceRequests: [{ __typename: 'ServiceRequest', id: 'sr-1', requestNumber: 'DP-2026-0042', requestTypeId: 't', category: 'Passport', status: 'UNDER_REVIEW', ownerType: 'COMMUNITY', ownerEntityId: 'c1', submittedAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-02T00:00:00Z' }] },
    GetMyKYCStatus: { getMyKYCStatus: { __typename: 'KYCStatus', status: 'APPROVED', kycLevel: 1, profileId: null } },
    MyCircles: { myCircles: ['Accra Tech Hub', 'Ghana Real Estate', 'Diaspora Investors'].map((name, i) => ({ __typename: 'Circle', id: `cir-${i}`, circleNumber: i, name, handle: `c${i}`, tagline: null, description: null, avatarUrl: null, bannerUrl: null, brandJson: null, discoverable: true, joinMode: 'REQUEST', status: 'ACTIVE', founderUserId: 'x', chatConversationId: null, memberCount: 12 + i, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', archivedAt: null })) },
    RedesignGroupsToJoin: { searchGroups: { __typename: 'GroupList', groups: ['Young Professionals', 'Entrepreneurs Hub', 'Real Estate Investors', 'Tech Diaspora'].map((n, i) => group(`g-${i}`, n)) } },
    RedesignMyGroupIds: { getMyGroups: { __typename: 'GroupList', groups: [] } },
    RecommendedPeople: { recommendedPeople: { __typename: 'PeopleRecommendationPage', rankingStrategy: 'e2e', items: ['Kwame Asante', 'Esi Mensah', 'Samuel Agyemang'].map((n, i) => ({ __typename: 'PeopleRecommendation', profile: { __typename: 'ProfileSummary', userId: `00000000-0000-4000-8000-0000000a0c0${i}`, firstName: n.split(' ')[0], lastName: n.split(' ')[1], avatarUrl: null, headline: ['Software Engineer', 'Entrepreneur', 'Real Estate Agent'][i], bio: null, sector: null, countryOfOrigin: 'GH', residenceCountry: 'DE', connectionStatus: 'NONE', connectionId: null, isVerified: false, verificationBadge: null, trustScore: null, trustTier: null }, score: 1, sharedCommunityCount: 0, sharedCommunityNames: [], mutualConnectionCount: 0, mutualConnectionNames: [], matchReason: null })) } },
    GetTrendingHashtags: { trendingHashtags: [{ __typename: 'Hashtag', id: 'h1', tag: 'diaspora', usageCount: 7 }, { __typename: 'Hashtag', id: 'h2', tag: 'investing', usageCount: 5 }] },
};

for (const [name, route] of [['home', '/home'], ['discover', '/discover'], ['community', '/community']] as const) {
    for (const width of SIZES) {
        test(`${name} @ ${width}`, async () => {
            const { page } = await open(browser, route, DATA as never, { width, height: width === 1280 ? 1000 : 900 });
            await page.waitForTimeout(6000);
            await page.screenshot({ path: path.join(OUT, `${name}-${width}.png`), fullPage: false });
            // Long pages scroll inside their own container: capture it expanded as well.
            await page.evaluate(() => document.querySelectorAll('.h-app-inner').forEach((el) => ((el as HTMLElement).style.height = 'auto')));
            await page.screenshot({ path: path.join(OUT, `${name}-${width}-full.png`), fullPage: true });
            await page.context().close();
        });
    }
}
