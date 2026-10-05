/**
 * Pure unit tests (no browser) for notification deep links: the route list, the
 * "never navigate to a route that doesn't exist" guard, and getNotificationPath
 * against both the OLD (broken) actionUrls rows already stored carry and the NEW
 * (correct) ones. Run under the Playwright runner, the only runner in the repo:
 *   E2E_BASE_URL=http://localhost:3111 npx playwright test e2e/notifications
 * (`E2E_BASE_URL` set to anything skips starting a dev server; this spec never contacts it.)
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { APP_LOCALES, APP_ROUTE_PATTERNS, isKnownAppPath } from '../../src/lib/appRoutes';
import { getNotificationPath, normalizeLegacyAppPath } from '../../src/services/gql/notification';
import { routing } from '../../src/i18n/routing';

const ID = '3f9a2b1c-4d5e-4f60-8a7b-9c3d1e2f5a6b';
const ID2 = '7c1d2e3f-4a5b-4c6d-9e7f-0a1b2c3d4e5f';
const GID = '8d2e3f4a-5b6c-4d7e-8f9a-1b2c3d4e5f6a';

function pagePatterns(dir: string, prefix: string[] = []): string[] {
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (entry.name === 'dev-harness') continue;
            const isGroup = /^\(.*\)$/.test(entry.name);
            out.push(...pagePatterns(path.join(dir, entry.name), isGroup ? prefix : [...prefix, entry.name]));
        } else if (entry.name === 'page.tsx') {
            out.push('/' + prefix.join('/'));
        }
    }
    return out;
}

test.describe('route list contract', () => {
    test('APP_ROUTE_PATTERNS equals the real page.tsx tree (minus dev-harness)', () => {
        const actual = pagePatterns(path.join(process.cwd(), 'src/app/[locale]'));
        expect([...APP_ROUTE_PATTERNS].sort()).toEqual([...new Set(actual)].sort());
        expect(new Set(APP_ROUTE_PATTERNS).size).toBe(APP_ROUTE_PATTERNS.length);
    });

    test('APP_LOCALES equals the routing locales', () => {
        expect([...APP_LOCALES]).toEqual([...routing.locales]);
    });
});

test.describe('isKnownAppPath', () => {
    const valid = [
        '/', '/en', '/fr/', '/profile', '/profile?m=friends', '/profile?m=friends&t=2', '/profile?tab=about',
        `/${ID}`, `/en/${ID}`, '/@steven', '/de/@steven', '/%40steven', '/@john.doe',
        `/post/${ID}?commentId=${ID2}`, '/events', `/events/${ID}`, `/events/${ID}/manage`, `/events/${ID}/ticket`,
        '/opportunities', `/opportunities/${ID}`,
        `/community/${ID}`, `/association/${ID}?tab=support&case=${ID2}`, `/community/${ID}?tab=track-requests&request=${ID2}`,
        `/community/${ID}?tab=events&calendar=1`, `/association/${ID}?tab=events&event=${ID2}`,
        '/chat', `/chat?t=groups&ct=group&gid=${GID}`, `/chat?ct=group&gid=${GID}&pr=${ID2}`,
        '/wallet', '/vendors', '/vendors/payouts', `/vendors/orders/${ID}`, '/marketplace', '/verifykyc',
        '/settings', '/settings#privacy', '/notification', '/feed', '/help', `/circles/${ID}`,
        `/it/community/${ID}?tab=home#top`, '/nl/notification',
    ];
    for (const p of valid) test(`accepts ${p}`, () => expect(isKnownAppPath(p)).toBe(true));

    const invalid = [
        '', 'profile', '/orders', '/dashboard', '/connections', '/connections/requests', `/profile/${ID}`,
        '/messages', `/messages/${ID}`, `/messages/group/${GID}`, `/groups/${ID}/chat`, `/orders/${ID}`,
        '/payment-methods', '/vendor/payouts', '/vendor/dashboard', '/settings/verification', '/settings/privacy',
        `/cases/${ID}`, `/service-requests/${ID}`, `/communities/${ID}`, `/associations/${ID}`,
        `/communities/${ID}/calendar`, `/resources/${ID}`, '/calendar', '/discover', `/tickets/${ID}`,
        `/events/${ID}/stats`, `/events/${ID}/tickets`, `/events/${ID}/attendance`, `/events/${ID}/payment`,
        `/events/${ID}/register`, `/opportunities/${ID}/applications`, '/reset-password', '/forgot-password',
        '/confirm-login', '/help/faq', '/en/en/profile', `/post/`, '/@', '/@a/b',
        // same-origin guard
        '//evil.com', '//evil.com/profile', 'https://evil.com', '/\\evil.com', '/profile\n', '/ profile',
        'javascript:alert(1)', '/en//evil.com',
    ];
    for (const p of invalid) test(`rejects ${JSON.stringify(p)}`, () => expect(isKnownAppPath(p)).toBe(false));
});

test.describe('normalizeLegacyAppPath', () => {
    const cases: Array<[string, string]> = [
        [`/posts/${ID}?commentId=${ID2}`, `/post/${ID}?commentId=${ID2}`],
        [`/profile/${ID}`, `/${ID}`],
        ['/connections/requests', '/profile?m=friends&t=3'],
        ['/connections', '/profile?m=friends'],
        [`/messages/group/${GID}/extra`, `/chat?t=groups&ct=group&gid=${GID}`],
        [`/messages/${ID}`, '/chat?t=direct'],
        ['/vendor/payouts', '/vendors/payouts'],
        ['/vendor/dashboard', '/vendors'],
        [`/orders/${ID}`, '/wallet'],
        ['/payment-methods', '/wallet'],
        ['/settings/verification', '/verifykyc'],
        ['/settings/privacy', '/settings'],
        [`/communities/${ID}/calendar`, `/community/${ID}?tab=events&calendar=1`],
        [`/associations/${ID}/calendar`, `/association/${ID}?tab=events&calendar=1`],
        [`/communities/${ID}/resources/${ID2}`, `/community/${ID}`],
        [`/associations/${ID}/x`, `/association/${ID}`],
        [`/events/${ID}/stats`, `/events/${ID}/manage`],
        [`/events/${ID}/tickets`, `/events/${ID}/manage`],
        [`/events/${ID}/attendance`, `/events/${ID}/manage`],
        [`/events/${ID}/payment`, '/events'],
        [`/opportunities/${ID}/applications`, `/opportunities/${ID}`],
        [`/cases/${ID}`, '/notification'],
        [`/service-requests/${ID}`, '/notification'],
        [`/resources/${ID}`, '/feed'],
        ['/calendar', '/events'],
        ['/wallet', '/wallet'], // already valid: untouched
    ];
    for (const [from, to] of cases) test(`${from} -> ${to}`, () => expect(normalizeLegacyAppPath(from)).toBe(to));
});

type Fixture = {
    type: string;
    data?: Record<string, unknown>;
    oldUrl?: string;
    newUrl?: string;
    expected?: string;
};

const community = { ownerType: 'COMMUNITY', ownerEntityId: ID, caseId: ID2 };
const fixtures: Fixture[] = [
    { type: 'connection.requested', data: { requesterId: ID2, receiverId: ID }, oldUrl: '/connections/requests', newUrl: `/${ID2}`, expected: `/${ID2}` },
    { type: 'connection.accepted', data: { requesterId: ID, receiverId: ID2 }, oldUrl: `/profile/${ID2}`, newUrl: `/${ID2}` },
    { type: 'connection.rejected', data: {}, oldUrl: '/connections', newUrl: '/profile?m=friends' },
    { type: 'skill.endorsed', data: {}, oldUrl: '/profile#skills', newUrl: '/profile?tab=about', expected: '/profile?tab=about' },
    { type: 'follow.new', data: { followerId: ID2 }, oldUrl: `/profile/${ID2}`, newUrl: `/${ID2}`, expected: `/${ID2}` },
    { type: 'follow.new', data: {}, oldUrl: '/profile/x', newUrl: '/profile?m=friends', expected: '/profile?m=friends' },
    { type: 'post.liked', data: { postId: ID }, oldUrl: `/posts/${ID}`, newUrl: `/post/${ID}`, expected: `/post/${ID}` },
    { type: 'post.commented', data: { postId: ID, commentId: ID2 }, oldUrl: `/posts/${ID}`, newUrl: `/post/${ID}?commentId=${ID2}`, expected: `/post/${ID}?commentId=${ID2}` },
    { type: 'post.mentioned', data: { postId: ID }, oldUrl: `/posts/${ID}`, newUrl: `/post/${ID}` },
    { type: 'post.liked', data: {}, oldUrl: `/posts/${ID}?commentId=${ID2}`, newUrl: `/post/${ID}` }, // no data: legacy link is rewritten, query kept
    { type: 'group.message.received', data: { groupId: GID }, oldUrl: `/messages/group/${GID}`, newUrl: `/chat?t=groups&ct=group&gid=${GID}`, expected: `/chat?ct=group&gid=${GID}` },
    { type: 'message.received', data: { conversationId: ID }, oldUrl: `/messages/${ID}`, newUrl: '/chat?t=direct' },
    { type: 'payment.confirmed', data: { orderId: ID }, oldUrl: `/orders/${ID}`, newUrl: '/wallet', expected: '/wallet' },
    { type: 'payment.failed', data: {}, oldUrl: '/payment-methods', newUrl: '/wallet' },
    { type: 'escrow.released', data: {}, oldUrl: '/vendor/payouts', newUrl: '/vendors/payouts', expected: '/vendors/payouts' },
    { type: 'vendor.verified', data: {}, oldUrl: '/vendor/dashboard', newUrl: '/vendors', expected: '/vendors' },
    { type: 'vendor.suspended', data: {}, oldUrl: '/vendor/dashboard', newUrl: '/vendors' },
    { type: 'kyc.approved', data: {}, oldUrl: '/profile', newUrl: '/profile' },
    { type: 'kyc.rejected', data: {}, oldUrl: '/settings/verification', newUrl: '/verifykyc', expected: '/verifykyc' },
    { type: 'case.resolved', data: community, oldUrl: `/cases/${ID2}`, newUrl: `/community/${ID}?tab=support&case=${ID2}`, expected: `/community/${ID}?tab=support&case=${ID2}` },
    { type: 'case.assigned', data: { ...community, ownerType: 'association' }, oldUrl: `/cases/${ID2}`, newUrl: `/association/${ID}?tab=support&case=${ID2}`, expected: `/association/${ID}?tab=support&case=${ID2}` },
    { type: 'case.created', data: { ownerType: 'SYSTEM', caseId: ID2 }, oldUrl: `/cases/${ID2}`, newUrl: '/notification', expected: '/notification' },
    { type: 'servicerequest.approved', data: { ownerType: 'COMMUNITY', ownerEntityId: ID, requestId: ID2 }, oldUrl: `/service-requests/${ID2}`, newUrl: `/community/${ID}?tab=track-requests&request=${ID2}`, expected: `/community/${ID}?tab=track-requests&request=${ID2}` },
    { type: 'servicerequest.approved', data: { ownerType: 'ASSOCIATION', ownerEntityId: ID, requestId: ID2 }, oldUrl: `/service-requests/${ID2}`, newUrl: `/association/${ID}?tab=track-requests&request=${ID2}`, expected: `/association/${ID}?tab=track-requests&request=${ID2}` },
    { type: 'servicerequest.approved', data: { requestId: ID2 }, oldUrl: `/service-requests/${ID2}`, newUrl: '/notification', expected: '/notification' },
    { type: 'servicerequest.approved', data: { ownerType: 'MARKETPLACE', ownerEntityId: ID, requestId: ID2 }, oldUrl: `/service-requests/${ID2}`, newUrl: '/notification', expected: '/notification' },
    { type: 'servicerequest.submitted', data: { ownerEntityId: ID, requestId: ID2 }, oldUrl: `/service-requests/${ID2}`, newUrl: `/community/${ID}?tab=track-requests&request=${ID2}`, expected: `/community/${ID}?tab=track-requests&request=${ID2}` },
    { type: 'resource.published', data: { ownerType: 'COMMUNITY', ownerEntityId: ID }, oldUrl: `/communities/${ID}/resources/${ID2}`, newUrl: `/community/${ID}`, expected: `/community/${ID}` },
    { type: 'resource.published', data: {}, oldUrl: `/communities/${ID}/resources/${ID2}`, newUrl: '/feed' },
    { type: 'calendar.reminder', data: { ownerType: 'community', ownerId: ID }, oldUrl: `/communities/${ID}/calendar`, newUrl: `/community/${ID}?tab=events&calendar=1`, expected: `/community/${ID}?tab=events&calendar=1` },
    { type: 'calendar.reminder', data: { ownerType: 'association', ownerId: ID }, oldUrl: `/associations/${ID}/calendar`, newUrl: `/association/${ID}?tab=events&calendar=1`, expected: `/association/${ID}?tab=events&calendar=1` },
    { type: 'calendar.reminder', data: { ownerType: 'user', ownerId: ID }, oldUrl: '/calendar', newUrl: '/events', expected: '/events' },
    { type: 'event.completed', data: { eventId: ID }, oldUrl: `/events/${ID}/stats`, newUrl: `/events/${ID}/manage`, expected: `/events/${ID}/manage` },
    { type: 'event.ticket.sold_out', data: { eventId: ID }, oldUrl: `/events/${ID}/tickets`, newUrl: `/events/${ID}/manage` },
    { type: 'event.check_in', data: { eventId: ID }, oldUrl: `/events/${ID}/attendance`, newUrl: `/events/${ID}/manage` },
    { type: 'event.payment.confirmed', data: { eventId: ID, registrationId: ID2 }, oldUrl: `/events/${ID2}`, newUrl: `/events/${ID}` },
    { type: 'event.payment.failed', data: { registrationId: ID2 }, oldUrl: `/events/${ID2}/payment`, newUrl: '/events' },
    { type: 'opportunity.application.received', data: { opportunityId: ID }, oldUrl: `/opportunities/${ID}/applications`, newUrl: `/opportunities/${ID}` },
    { type: 'opportunity.application.received', data: {}, oldUrl: `/opportunities/${ID}/applications`, newUrl: `/opportunities/${ID}` },
    { type: 'membership.approved', data: { entityId: ID }, oldUrl: `/community/${ID}`, newUrl: `/community/${ID}` },
    { type: 'friend.suggestion', data: {}, oldUrl: '/connections', newUrl: '/profile?m=friends&t=2', expected: '/profile?m=friends&t=2' },
    { type: 'digest.whats_new', data: {}, oldUrl: '/', newUrl: '/' },
    { type: 'system.announcement', data: {} },
];

test.describe('getNotificationPath', () => {
    fixtures.forEach((f, i) => {
        for (const [label, url] of [['old', f.oldUrl], ['new', f.newUrl]] as const) {
            test(`#${i} ${f.type} (${label} actionUrl ${url ?? 'none'}) resolves to an existing route`, () => {
                const got = getNotificationPath({ type: f.type, data: f.data, link: undefined, actionUrl: url });
                expect(isKnownAppPath(got), got).toBe(true);
                if (f.expected !== undefined) expect(got).toBe(f.expected);
            });
        }
    });

    test('connection.requested falls back to the actor / current-user peer', () => {
        const n = { type: 'connection.requested', data: { requesterId: ID2, receiverId: ID }, actionUrl: '/connections/requests' };
        expect(getNotificationPath(n, { currentUserId: ID })).toBe(`/${ID2}`);
        expect(getNotificationPath(n, { currentUserId: ID2 })).toBe(`/${ID}`);
    });

    test('group.message.received with a private reply keeps the pr param', () => {
        expect(getNotificationPath({ type: 'group.message.received', data: { groupId: GID, privateReplyId: ID2 } })).toBe(
            `/chat?ct=group&gid=${GID}&pr=${ID2}`,
        );
    });

    test('a non-id follower value is never navigated to (guard falls back)', () => {
        const got = getNotificationPath({ type: 'follow.new', data: { followerId: 'a b/c' } });
        expect(got).toBe('/notification'); // encoded to /a%20b%2Fc, not a UUID, so the guard rejects it
    });

    test('ids are percent-encoded into query values', () => {
        const got = getNotificationPath({ type: 'case.created', data: { ownerType: 'COMMUNITY', ownerEntityId: ID, caseId: 'a&b=c' } });
        expect(got).toBe(`/community/${ID}?tab=support&case=a%26b%3Dc`);
    });

    test('a hostile server link can never become a navigation target', () => {
        for (const link of ['//evil.com', 'https://evil.com/x', '/\\evil.com', 'javascript:alert(1)', '/%0d%0a', '/connections\r\n']) {
            for (const key of ['link', 'actionUrl'] as const) {
                const got = getNotificationPath({ type: 'mystery.type', data: {}, [key]: link });
                expect(got.startsWith('/') && !got.startsWith('//'), `${link} -> ${got}`).toBe(true);
                expect(isKnownAppPath(got), `${link} -> ${got}`).toBe(true);
            }
        }
    });

    test('an unknown type with an unknown legacy link lands on /notification', () => {
        expect(getNotificationPath({ type: 'mystery.type', data: {}, actionUrl: '/dashboard' })).toBe('/notification');
    });
});
