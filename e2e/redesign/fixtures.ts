/** In-memory GraphQL answers for the Home / Discover / Community specs. */
import type { Browser } from '@playwright/test';
import { openPage, type Overrides } from '../support/eventFixtures';
import { COMMUNITY_OVERRIDES, ME, SHELL_OVERRIDES } from '../support/fakeSession';

export const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export const POST_ID = '00000000-0000-4000-8000-0000000b0001';

export function post(id: string, text: string, over: Record<string, unknown> = {}) {
    return {
        __typename: 'Post',
        id,
        text,
        content: text,
        visibility: 'EVERYONE',
        status: 'PUBLISHED',
        authorType: 'USER',
        authorId: '00000000-0000-4000-8000-0000000a0b01',
        author: { __typename: 'PostAuthor', id: '00000000-0000-4000-8000-0000000a0b01', authorType: 'USER', displayName: 'Kofi Mensah', avatarUrl: null, trustScore: null },
        authorProfile: {
            __typename: 'AuthorProfile',
            authorType: 'USER',
            userProfile: { __typename: 'PostUserProfile', id: '00000000-0000-4000-8000-0000000a0b01', name: 'Kofi Mensah', displayName: 'Kofi Mensah', avatarUrl: null, bio: null, isVip: false, verificationTier: 'NONE', trustScore: null },
            organizationProfile: null,
        },
        attachments: [],
        mentions: [],
        hashtags: [],
        engagementCounts: { __typename: 'EngagementCounts', likes: 12, comments: 3, shares: 1, saves: 0, happy: 10, hopeful: 2, sad: 0 },
        userEngagement: { __typename: 'UserEngagement', hasLiked: false, hasShared: false, hasSaved: false, myReaction: null },
        recentComments: [],
        score: null,
        reason: null,
        isSponsored: false,
        postUrl: null,
        categories: [],
        aiTopics: [],
        createdAt: '2026-10-09T08:00:00.000Z',
        updatedAt: '2026-10-09T08:00:00.000Z',
        ...over,
    };
}

export const POSTS = [post(POST_ID, 'Looking for reliable suppliers of organic cocoa beans in Ghana.'), post('00000000-0000-4000-8000-0000000b0002', 'Free legal consultation for the next three days.'), post('00000000-0000-4000-8000-0000000b0003', 'A third post for the feed.')];

const rankedItems = POSTS.map((p) => ({ __typename: 'RankedItem', itemId: p.id, itemType: 'POST', score: 1, authorId: p.authorId, topics: [], source: 'e2e', createdAt: p.createdAt }));

export const FEED_OVERRIDES: Overrides = {
    RecommendedPosts: { recommendedPosts: { __typename: 'RankedFeedPage', items: rankedItems, nextCursor: null, rankingStrategy: 'e2e', explorationRatio: 0 } },
    JoinedCommunityFeed: { joinedCommunityFeed: { __typename: 'RankedFeedPage', items: rankedItems, nextCursor: null, rankingStrategy: 'e2e', explorationRatio: 0 } },
    GetPostsByIds: (v: Record<string, unknown>) => ({ postsByIds: POSTS.filter((p) => ((v.ids as string[]) ?? []).includes(p.id)) }),
};

export const event = (id: string, title: string, startAt: string, over: Record<string, unknown> = {}) => ({
    __typename: 'EventGQL',
    id,
    title,
    status: 'published',
    visibility: 'public',
    startAt,
    endAt: startAt,
    eventCategory: 'Business',
    locationType: 'physical',
    locationDetails: { __typename: 'EventLocationGQL', type: 'physical', venueName: 'Berlin Congress Centre', address: null, city: 'Berlin', country: 'Germany', virtualLink: null, platform: null },
    isRegistered: false,
    canRegister: true,
    isPaid: false,
    coverImageUrl: null,
    tickets: [],
    ...over,
});

const opp = (id: string, title: string, type: string, over: Record<string, unknown> = {}) => ({ __typename: 'Opportunity', id, title, type, category: 'EMPLOYMENT_CAREER', location: 'Accra, Ghana', deliveryMode: 'IN_PERSON', deadline: null, createdAt: '2026-10-08T08:00:00.000Z', owner: null, ...over });

export const OPPS = (v: Record<string, unknown>) => {
    const input = (v.input ?? {}) as { type?: string; category?: string };
    const all = [opp('opp-job-1', 'IT Support Specialist', 'EMPLOYMENT'), opp('opp-job-2', 'Project Manager', 'EMPLOYMENT'), opp('opp-inv-1', 'Agriculture Project', 'INVESTMENT', { category: 'AGRICULTURE_SUSTAINABILITY', location: 'Northern Region' }), opp('opp-re-1', 'Affordable housing build', 'INITIATIVE', { category: 'REAL_ESTATE_INFRASTRUCTURE' })];
    const rows = all.filter((o) => (!input.type || o.type === input.type) && (!input.category || o.category === input.category));
    return { listOpportunities: { __typename: 'OpportunityList', total: rows.length, opportunities: rows } };
};

export const FUTURE = '2030-11-20T09:00:00.000Z';
export const PAST = '2020-01-01T09:00:00.000Z';

export const CONTENT_OVERRIDES: Overrides = {
    ListOpportunities: OPPS,
    RedesignFeaturedServices: { getFeaturedMarketplaceServices: { __typename: 'ServiceList', services: [{ __typename: 'Service', id: 'svc-1', title: 'Legal Consultation', base_price: 10000, currency: 'GHS' }] } },
    RedesignFeaturedProducts: { getFeaturedProducts: { __typename: 'ProductList', products: [{ __typename: 'Product', id: 'prd-1', title: 'Shea butter set', price: 4500, currency: 'GHS', images: [] }] } },
    ListEvents: { listEvents: { __typename: 'EventList', total: 2, hasMore: false, events: [event('evt-1', 'Diaspora Business Summit', FUTURE), event('evt-old', 'An event that already happened', PAST)] } },
};

export const ALL: Overrides = { ...SHELL_OVERRIDES, ...COMMUNITY_OVERRIDES, ...FEED_OVERRIDES, ...CONTENT_OVERRIDES } as Overrides;

export async function open(browser: Browser, path: string, over: Overrides = {}, viewport?: { width: number; height: number }) {
    return openPage(browser, path, { ...ALL, ...over }, viewport);
}

export { ME };
