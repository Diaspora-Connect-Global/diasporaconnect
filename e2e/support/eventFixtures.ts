/**
 * Fixtures for the event-page specs: one event, its content, its organiser, and a
 * helper that opens a page against the in-memory GraphQL double. Nothing here
 * talks to a backend.
 */
import type { Browser, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { fakeGraphql, seedSession, SHELL_OVERRIDES, wireNetwork } from './fakeSession';

export const EVENT_ID = '3f9a2b1c-4d5e-4f60-8a7b-9c3d1e2f5a6b';
export const OWNER_ID = '00000000-0000-4000-8000-0000000c0e01';
export const ORGANISER_NAME = 'Ghana Union Berlin';

export function eventFixture(over: Record<string, unknown> = {}) {
    return {
        __typename: 'EventGQL',
        id: EVENT_ID,
        title: 'Diaspora Business Summit',
        description: 'A day of talks and introductions for founders and investors.',
        status: 'published',
        visibility: 'public',
        startAt: '2030-11-20T09:00:00.000Z',
        endAt: '2030-11-20T17:00:00.000Z',
        eventCategory: 'Business',
        locationType: 'physical',
        locationDetails: { __typename: 'EventLocationGQL', type: 'physical', venueName: 'Berlin Congress Centre', address: 'Alexanderstrasse 11', city: 'Berlin', country: 'Germany', virtualLink: null, platform: null },
        capacity: 200,
        availableSpots: 120,
        isPaid: false,
        currency: null,
        registrationCount: 80,
        isRegistered: false,
        canRegister: true,
        coverImageUrl: null,
        registrationLink: null,
        tags: ['founders'],
        timezone: 'Europe/Berlin',
        ownerType: 'community',
        ownerId: OWNER_ID,
        tickets: [],
        registrationFormFields: [],
        myRegistrationId: null,
        myRegistrationStatus: null,
        phase: 'REGISTRATION_OPEN',
        requiresApproval: false,
        registrationOpensAt: null,
        registrationClosesAt: null,
        isFull: false,
        createdAt: '2026-09-01T10:00:00.000Z',
        updatedAt: '2026-09-02T10:00:00.000Z',
        ...over,
    };
}

export function organiserFixture(over: Record<string, unknown> = {}) {
    return {
        __typename: 'Community',
        id: OWNER_ID,
        name: ORGANISER_NAME,
        avatarUrl: null,
        joinPolicy: 'OPEN',
        paymentType: 'NONE',
        priceAmount: null,
        priceCurrency: null,
        membershipStatus: 'NONE',
        enabledServices: null,
        ...over,
    };
}

/** The viewer administers the organiser community (so they are a manager of its events). */
export const ADMIN_OF_ORGANISER = {
    GetMyCommunities: {
        getMyCommunities: {
            __typename: 'MyCommunities',
            total: 1,
            communities: [
                { __typename: 'Community', id: OWNER_ID, name: ORGANISER_NAME, avatarUrl: null, memberCount: 9, defaultGroupId: null, myMembership: { __typename: 'Membership', status: 'ACTIVE', role: 'COMMUNITY_ADMIN', joinedAt: '2026-01-01T00:00:00.000Z' } },
            ],
        },
    },
};

/** The viewer is only an ordinary member somewhere. */
export const MEMBER_ONLY = {
    GetMyCommunities: {
        getMyCommunities: {
            __typename: 'MyCommunities',
            total: 1,
            communities: [
                { __typename: 'Community', id: OWNER_ID, name: ORGANISER_NAME, avatarUrl: null, memberCount: 9, defaultGroupId: null, myMembership: { __typename: 'Membership', status: 'ACTIVE', role: 'MEMBER', joinedAt: '2026-01-01T00:00:00.000Z' } },
            ],
        },
    },
};

export const SESSIONS = [
    { __typename: 'EventProgrammeSession', id: 's1', title: 'Opening keynote', description: null, startAt: '2030-11-20T09:30:00.000Z', endAt: '2030-11-20T10:15:00.000Z', timezone: 'Europe/Berlin', room: 'Hall A', sessionType: 'KEYNOTE', speakerIds: ['sp1'], sortOrder: 0 },
    { __typename: 'EventProgrammeSession', id: 's2', title: 'Funding panel', description: 'Angels and funds.', startAt: '2030-11-20T11:00:00.000Z', endAt: '2030-11-20T12:00:00.000Z', timezone: 'Europe/Berlin', room: null, sessionType: 'PANEL', speakerIds: [], sortOrder: 1 },
];
export const SPEAKERS = [
    { __typename: 'EventSpeaker', id: 'sp1', name: 'Abena Owusu', title: 'Founder', organization: 'Kente Labs', bio: 'Builds payment rails.', photoUrl: null, roleLabel: 'KEYNOTE', hasProfile: true, profileUsername: 'abena', sortOrder: 0 },
];
export const UPDATES = {
    __typename: 'EventUpdatePostPage',
    nextCursor: null,
    updates: [{ __typename: 'EventUpdatePost', id: 'u1', title: 'Doors open at 8:30', body: 'Come early for coffee.', publishedAt: '2030-11-01T10:00:00.000Z' }],
};
export const VENUE = {
    __typename: 'EventVenueInfo',
    halls: [{ __typename: 'EventVenueHall', name: 'Hall A', description: 'Main stage' }],
    directions: 'Five minutes from Alexanderplatz.',
    accessibilityNotes: 'Step-free entrance.',
    parking: null,
    contactEmail: null,
    contactPhone: null,
    contactPublic: false,
};

export type Overrides = Record<string, unknown | ((variables: Record<string, unknown>) => unknown)>;

/** Base answers for the event page's own queries. Specs add or replace entries. */
export function eventPageOverrides(event = eventFixture(), more: Overrides = {}): Overrides {
    return {
        ...SHELL_OVERRIDES,
        GetEventPage: { getEvent: event },
        EventProgramme: { eventProgramme: [] },
        EventSpeakers: { eventSpeakers: [] },
        EventUpdates: { eventUpdates: { __typename: 'EventUpdatePostPage', updates: [], nextCursor: null } },
        EventVenueInfo: { eventVenueInfo: null },
        IsEventSaved: { isEventSaved: false },
        GetEventOrganiserCommunity: { getCommunity: organiserFixture() },
        GetMyCommunities: { getMyCommunities: { __typename: 'MyCommunities', total: 0, communities: [] } },
        GetMyAssociations: { getMyAssociations: { __typename: 'MyAssociations', total: 0, associations: [] } },
        SimilarEvents: { searchEvents: { __typename: 'EventListResponse', events: [] } },
        ...more,
    };
}

export async function openPage(
    browser: Browser,
    path: string,
    overrides: Overrides,
    viewport = { width: 1280, height: 900 },
): Promise<{ page: Page; graphql: ReturnType<typeof fakeGraphql>; errors: string[] }> {
    const context = await browser.newContext({ baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${process.env.E2E_PORT ?? 3111}`, viewport });
    await seedSession(context);
    const graphql = fakeGraphql(overrides as never);
    await wireNetwork(context, graphql);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`/en${path}`, { waitUntil: 'load' });
    await expect(page.locator('header.h-app-top-down')).toBeVisible({ timeout: 90_000 });
    return { page, graphql, errors };
}
