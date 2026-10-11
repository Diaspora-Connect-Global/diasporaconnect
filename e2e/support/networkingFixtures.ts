/**
 * Fixtures for the networking specs: the gateway's answers for one event, one
 * confirmed registrant, and a short deck. People are identified by handles only.
 */
import { EVENT_ID, eventFixture, eventPageOverrides, type Overrides } from './eventFixtures';

export { EVENT_ID };

export const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const tax = (kind: string, prefix: string, codes: string[]) =>
    codes.map((c, i) => ({ __typename: 'EventNetworkingTaxonomyItem', code: `${prefix}.${c}`, kind, labelKey: `networking.taxonomy.${prefix}.${c}`, needLabelKey: null, offerLabelKey: null, relatedCodes: [], sortOrder: (i + 1) * 10 }));

export const TAXONOMY = [
    ...tax('ROLE', 'role', ['founder', 'investor']),
    ...tax('INTEREST', 'interest', ['fintech', 'investment', 'govtech']),
    ...tax('CAPABILITY', 'capability', ['investment', 'funding', 'technology', 'market_access', 'expertise']),
    ...tax('INDUSTRY', 'industry', ['technology', 'financial_services']),
    ...tax('MARKET', 'market', ['europe', 'west_africa']),
    ...tax('LANGUAGE', 'language', ['en', 'de']),
];

export const FIELDS = {
    __typename: 'EventNetworkingProfileFields',
    headline: 'Founder', organization: 'Kente Labs', locationLabel: 'Berlin', intro: null,
    roles: ['role.founder'], interests: ['interest.fintech'], needs: ['capability.funding'], offers: ['capability.technology'],
    industries: ['industry.technology'], markets: ['market.west_africa'], languages: ['language.en'], needsNote: null, offersNote: null, attendanceFormat: 'EITHER',
};

export function mine(over: Record<string, unknown> = {}, participation: Record<string, unknown> | null = {}) {
    return {
        eventNetworkingMyParticipation: {
            __typename: 'EventNetworkingMyParticipation',
            participation: participation === null ? null : {
                __typename: 'EventNetworkingParticipation', status: 'ACTIVE', visibility: 'RECOMMENDED', acceptsInterests: true, openToMeetings: true, inCircleDiscovery: true,
                notificationLevel: 'ALL', consentAt: '2030-11-01T10:00:00.000Z', aiAssistConsent: false, handle: 'h-me', version: 3, hasProfile: true,
                fieldFlags: { __typename: 'EventNetworkingFieldFlags', organization: true, location: true, availability: true, needsNote: true, offersNote: true },
                snapshot: { __typename: 'EventNetworkingSnapshot', displayName: 'Ama Mensah', avatarUrl: null, username: 'ama' },
                profile: { __typename: 'EventNetworkingProfile', isDraft: false, completeness: 68, updatedAt: null, fields: FIELDS },
                availability: [],
                ...participation,
            },
            networkingEnabled: true, windowState: 'OPEN', effectiveClosesAt: null, allowedVisibilityModes: ['RECOMMENDED', 'OPEN', 'LIMITED', 'HIDDEN'], eligibility: 'CONFIRMED', featureAvailable: true,
            ...over,
        },
    };
}

export const status = (over: Record<string, unknown> = {}) => ({
    eventNetworkingStatus: { __typename: 'EventNetworkingStatus', networkingEnabled: true, featureAvailable: true, eligibility: 'CONFIRMED', participationStatus: 'ACTIVE', ...over },
});

export const card = (handle: string, name: string, over: Record<string, unknown> = {}) => ({
    __typename: 'EventNetworkingCard', handle, displayName: name, avatarUrl: null, username: null, headline: 'Investment Manager', organization: 'AfricInvest', locationLabel: 'Accra, Ghana',
    tier: 'DIRECT_OPPORTUNITY', mutualFit: false, reasons: ['OFFERS_WHAT_YOU_NEED', 'SHARED_INTEREST'], roles: ['role.investor'], interests: ['interest.fintech'], needs: ['capability.technology'],
    offers: ['capability.funding'], industries: ['industry.financial_services'], markets: ['market.west_africa'], languages: ['language.en'], attendanceFormat: 'EITHER', connectionStatus: null, decision: null, isSelf: false, ...over,
});

export const DECK = {
    eventNetworkingDeck: {
        __typename: 'EventNetworkingDeckPage', nextCursor: null, reviewingSkipped: false, refreshing: false,
        cards: [card('h-david-71c', 'David Owusu'), card('h-sarah-a02', 'Sarah Mensah', { tier: 'SHARED_INTERESTS', reasons: ['SHARED_INTEREST'] }), card('h-kwame-9d4', 'Kwame Asante', { tier: 'STRONG_FIT', reasons: ['NEEDS_WHAT_YOU_OFFER'] })],
    },
};

/** Overrides for a joined, eligible viewer. Specs add or replace entries. */
export function networkingOverrides(more: Overrides = {}): Overrides {
    return {
        ...eventPageOverrides(eventFixture({ timezone: 'Europe/Berlin' })),
        NetworkingStatus: status(),
        NetworkingMyParticipation: mine(),
        NetworkingTaxonomy: { eventNetworkingTaxonomy: TAXONOMY },
        NetworkingDeck: DECK,
        ...more,
    };
}
