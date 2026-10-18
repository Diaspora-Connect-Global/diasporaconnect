/** GraphQL doubles for the Community page's community-only feed. */
import { post } from './fixtures';

export const COMM_IDS = [
    '00000000-0000-4000-8000-0000000b0c01',
    '00000000-0000-4000-8000-0000000b0c02',
    '00000000-0000-4000-8000-0000000b0c03',
];
const ORG_ID = '00000000-0000-4000-8000-0000000a0c77';

const org = (authorType: 'COMMUNITY' | 'ASSOCIATION', name: string) => ({
    authorType,
    authorId: ORG_ID,
    author: { __typename: 'PostAuthor', id: ORG_ID, authorType, displayName: name, avatarUrl: null, trustScore: null },
    authorProfile: {
        __typename: 'AuthorProfile',
        authorType,
        userProfile: null,
        organizationProfile: { __typename: 'PostOrganizationProfile', id: ORG_ID, name, logoUrl: null, description: null, isVip: false, verificationTier: 'NONE' },
    },
});

export const COMMUNITY_POSTS = [
    post(COMM_IDS[0], 'Community post: general assembly next Saturday.', org('COMMUNITY', 'Ghana Union Berlin')),
    post(COMM_IDS[1], 'Association post: annual dues are open.', org('ASSOCIATION', 'Ghanaian Nurses Association')),
    post(COMM_IDS[2], 'Community post: new volunteers welcome.', org('COMMUNITY', 'Ghana Union Berlin')),
];
export const MEMBER_POST = post('00000000-0000-4000-8000-0000000b0d01', 'MEMBER POST: my holiday photos.');

/**
 * `feed` answers by type, like the backend: the community types return only
 * community/association posts; anything else (ALL, NETWORK, ...) would leak a member post.
 */
export function feedByType(asked: Array<Record<string, unknown>>, communityPosts = COMMUNITY_POSTS) {
    return (v: Record<string, unknown>) => {
        const input = (v.input ?? {}) as Record<string, unknown>;
        asked.push(input);
        const posts = input.type === 'COMMUNITIES_AND_ASSOCIATIONS' ? communityPosts : [...communityPosts, MEMBER_POST];
        return {
            feed: {
                __typename: 'Feed', posts, total: posts.length, limit: 12, offset: 0,
                hasMore: false, nextCursor: null, isExhausted: posts.length === 0, isSeenFallback: false, hasSeenFallbackOption: false,
            },
        };
    };
}
