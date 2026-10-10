/**
 * A signed-in browser session against the REAL authenticated routes (`/en/home`,
 * `/en/more`, …) with no backend.
 *
 * - `seedSession` writes the persisted auth + user stores before any page
 *   script runs, so the `(main)` boot gate sees a valid session.
 * - `fakeGraphql` answers every GraphQL operation: the ones listed in
 *   `overrides` with the given data, the profile check with a real-looking
 *   profile, and EVERYTHING ELSE with `null` for each root field it asked for —
 *   so a page renders its empty state instead of waiting forever or erroring.
 * - Every request that leaves localhost (websockets, analytics, the CDN) is
 *   aborted: these specs never talk to a real service.
 */
import type { BrowserContext, Route } from '@playwright/test';
import { parse, type OperationDefinitionNode } from 'graphql';

export const ME = '00000000-0000-4000-8000-0000000000a1';

export const ME_PROFILE = {
    __typename: 'Profile',
    userId: ME,
    username: 'ama',
    usernameChangedAt: null,
    usernameNextChangeAt: null,
    email: 'ama@example.com',
    phone: null,
    firstName: 'Ama',
    lastName: 'Mensah',
    middleName: null,
    countryOfOrigin: 'GH',
    residenceCountry: 'DE',
    residenceSinceYear: null,
    residenceSinceMonth: null,
    city: 'Berlin',
    sector: null,
    industry: null,
    bio: null,
    avatarUrl: null,
    coverPhoto: null,
    gender: null,
    dateOfBirth: null,
    connectionCount: 0,
    trustScore: null,
    version: 1,
    verificationStatus: 'verified',
    createdAt: '2024-03-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    profileCompletion: { __typename: 'ProfileCompletion', percentage: 80, completedSections: [], missingSections: [] },
};

export async function seedSession(context: BrowserContext): Promise<void> {
    await context.addInitScript(
        ({ me }) => {
            const expiresAt = Date.now() + 24 * 3600 * 1000;
            localStorage.setItem(
                'auth-store',
                JSON.stringify({
                    state: {
                        tokens: { sessionToken: 'e2e-session', accessToken: 'e2e-session', sessionId: 'e2e', expiresIn: 86400, expiresAt, refreshTokenExpiresAt: expiresAt },
                        deviceMetadata: null,
                    },
                    version: 0,
                }),
            );
            localStorage.setItem(
                'user-store',
                JSON.stringify({ state: { user: { userId: me, firstName: 'Ama', lastName: 'Mensah', username: 'ama' }, rememberMe: false }, version: 0 }),
            );
            // The privacy-policy consent modal would cover every screenshot.
            localStorage.setItem('privacy_policy_accepted', 'true');
        },
        { me: ME },
    );
}

type Overrides = Record<string, unknown | ((variables: Record<string, unknown>) => unknown)>;

/** Root fields (aliases respected) the operation selects, and its name. */
function describe(query: string): { name: string; fields: string[]; isMutation: boolean } {
    try {
        const doc = parse(query);
        const op = doc.definitions.find((d): d is OperationDefinitionNode => d.kind === 'OperationDefinition');
        if (!op) return { name: 'anonymous', fields: [], isMutation: false };
        const fields = op.selectionSet.selections.flatMap((s) => (s.kind === 'Field' ? [s.alias?.value ?? s.name.value] : []));
        return { name: op.name?.value ?? 'anonymous', fields, isMutation: op.operation === 'mutation' };
    } catch {
        return { name: 'unparsable', fields: [], isMutation: false };
    }
}

export function fakeGraphql(overrides: Overrides = {}) {
    const ops: string[] = [];
    async function handle(route: Route) {
        const body = route.request().postDataJSON() as { query?: string; variables?: Record<string, unknown>; operationName?: string };
        const { name, fields } = describe(body?.query ?? '');
        ops.push(body?.operationName ?? name);
        let data: Record<string, unknown>;
        if (name in overrides) {
            const o = overrides[name];
            data = (typeof o === 'function' ? (o as (v: Record<string, unknown>) => unknown)(body?.variables ?? {}) : o) as Record<string, unknown>;
        } else if (fields.includes('getProfile') && !body?.variables?.userId) {
            data = { getProfile: { __typename: 'ProfileResponse', success: true, message: 'ok', profile: ME_PROFILE } };
        } else {
            data = Object.fromEntries(fields.map((f) => [f, null]));
        }
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data }) });
    }
    return { ops, handle };
}

/** Abort everything that is not the local dev server, then answer GraphQL. */
export async function wireNetwork(context: BrowserContext, graphql: ReturnType<typeof fakeGraphql>): Promise<void> {
    await context.route((url) => !['localhost', '127.0.0.1'].includes(url.hostname), (route) => route.abort());
    // Registered last, so it wins for GraphQL wherever it is hosted.
    await context.route('**/graphql', graphql.handle);
}

const conversation = (id: string, type: 'DIRECT' | 'GROUP', groupId: string | null, unreadCount: number) => ({
    __typename: 'Conversation',
    id,
    type,
    groupId,
    participantIds: [],
    participantCount: 2,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    lastMessageAt: '2026-09-01T00:00:00.000Z',
    lastMessage: null,
    unreadCount,
    isActive: true,
});

/** What the shell itself asks for: 5 unread notifications, 3 unread chat messages. */
export const SHELL_OVERRIDES = {
    GetUnreadCount: { getUnreadNotificationCount: { __typename: 'UnreadCount', count: 5 } },
    GetConversations: {
        getConversations: [
            conversation('00000000-0000-4000-8000-00000000c001', 'DIRECT', null, 1),
            conversation('00000000-0000-4000-8000-00000000c002', 'GROUP', '00000000-0000-4000-8000-00000000a001', 2),
        ],
    },
    GetMyKYCStatus: { getMyKYCStatus: { __typename: 'KYCStatus', status: 'NOT_STARTED', kycLevel: 0, profileId: null } },
} as const;

/** The viewer's memberships, for the Community page's "Your communities" column. */
export const COMMUNITY_OVERRIDES = {
    ListMyJoinedCommunities: {
        listUserCommunities: [
            { __typename: 'Community', id: '00000000-0000-4000-8000-0000000c0001', name: 'Ghana Union Berlin', avatarUrl: null, communityType: null },
            { __typename: 'Community', id: '00000000-0000-4000-8000-0000000c0002', name: 'Accra Tech Diaspora', avatarUrl: null, communityType: null },
            { __typename: 'Community', id: '00000000-0000-4000-8000-0000000c0003', name: 'Kumasi Alumni', avatarUrl: null, communityType: null },
        ],
    },
    GetMyPendingRequests: {
        getMyPendingRequests: [
            { __typename: 'PendingRequest', id: 'pr-1', entityId: '00000000-0000-4000-8000-0000000c0003', entityType: 'COMMUNITY', entityName: 'Kumasi Alumni', status: 'PENDING', requestedAt: '2026-10-01T00:00:00.000Z' },
        ],
    },
    GetUserAssociations: {
        getUserAssociations: [
            { __typename: 'Association', id: '00000000-0000-4000-8000-0000000a0001', name: 'Ghanaian Nurses in Germany', avatarUrl: null, memberCount: 40, defaultGroupId: null },
        ],
    },
} as const;
