/**
 * Pure unit tests (no browser) for the private-reply helpers — above all the
 * rule that a person is a name, "you" or "a former member", never an id. Run
 * under the Playwright runner, the only test runner in the repo:
 *   E2E_BASE_URL=http://x npx playwright test e2e/chat/private-reply-helpers.spec.ts
 * (`E2E_BASE_URL` set to anything skips starting the dev server.)
 */
import { test, expect } from '@playwright/test';
import { IntlMessageFormat } from 'intl-messageformat';
import en from '../../messages/en.json';
import {
    audienceText,
    describeSystemEvent,
    groupByAnchor,
    personLabel,
    privateReplyErrorKey,
    remainingSlots,
    totalUnread,
    type NameOf,
} from '../../src/lib/privateReplies';
import type { PrivateReply } from '../../src/services/gql/privateReplies';

const ME = '3f9a2b1c-4d5e-4f60-8a7b-9c3d1e2f5a6b';
const AMA = '7c1d2e3f-4a5b-4c6d-9e7f-0a1b2c3d4e5f';
const ESI = '8d2e3f4a-5b6c-4d7e-8f9a-1b2c3d4e5f6a';
const LEFT = '9e3f4a5b-6c7d-4e8f-9a0b-2c3d4e5f6a7b'; // no longer in the group
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const names: Record<string, string> = { [AMA]: 'Ama Mensah', [ESI]: 'Esi Owusu' };
const nameOf: NameOf = (id) => names[id] ?? null;
const labels = { you: 'you', formerMember: 'a former member', unknown: 'a member' };

const pr = en.chat.group.privateReply as Record<string, unknown>;
function t(key: string, values?: Record<string, string | number>): string {
    const message = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], pr);
    return new IntlMessageFormat(String(message), 'en').format(values) as string;
}

test.describe('personLabel / audienceText', () => {
    test('a name, "you", or "a former member" — never an id', () => {
        expect(personLabel(AMA, ME, nameOf, labels)).toBe('Ama Mensah');
        expect(personLabel(ME, ME, nameOf, labels)).toBe('you');
        expect(personLabel(LEFT, ME, nameOf, labels)).toBe('a member'); // not among the loaded members
        expect(personLabel('', ME, nameOf, labels)).toBe('a former member'); // GDPR-erased
        expect(personLabel(null, ME, nameOf, labels)).toBe('a former member');
    });

    test('lists the others first and "you" last, in the locale\'s own list style', () => {
        expect(audienceText([ME, AMA, ESI], ME, nameOf, labels, 'en')).toBe('Ama Mensah, Esi Owusu, and you');
        expect(audienceText([AMA, ME], ME, nameOf, labels, 'en')).toBe('Ama Mensah and you');
        // A group admin's management view: the admin is not a member.
        expect(audienceText([AMA, LEFT], ME, nameOf, labels, 'en')).toBe('Ama Mensah and a member');
        expect(audienceText([AMA, ESI, LEFT], ME, nameOf, labels, 'de')).toBe('Ama Mensah, Esi Owusu und a member');
    });
});

test.describe('describeSystemEvent (real en.json copy)', () => {
    const say = (event: Parameters<typeof describeSystemEvent>[0], viewer = ME) =>
        describeSystemEvent(event, viewer, nameOf, labels, 'en', t);

    test('every kind, from both sides', () => {
        expect(say({ kind: 'STARTED', actorUserId: ME, targetUserIds: [AMA] })).toBe('You started this private reply');
        expect(say({ kind: 'STARTED', actorUserId: AMA, targetUserIds: [ME] })).toBe('Ama Mensah started this private reply');
        expect(say({ kind: 'MEMBERS_ADDED', actorUserId: ME, targetUserIds: [ESI] })).toBe('You added Esi Owusu');
        expect(say({ kind: 'MEMBERS_ADDED', actorUserId: AMA, targetUserIds: [ME] })).toBe('Ama Mensah added you');
        expect(say({ kind: 'MEMBERS_ADDED', actorUserId: AMA, targetUserIds: [ME, ESI] })).toBe('Ama Mensah added you and Esi Owusu');
        expect(say({ kind: 'MEMBER_REMOVED', actorUserId: AMA, targetUserIds: [ESI] })).toBe('Ama Mensah removed Esi Owusu');
        expect(say({ kind: 'MEMBER_LEFT', actorUserId: ESI, targetUserIds: [ESI] })).toBe('Esi Owusu left');
        expect(say({ kind: 'MEMBER_LEFT_GROUP', actorUserId: null, targetUserIds: [ESI] })).toBe('Esi Owusu is no longer in the group');
        expect(say({ kind: 'MANAGER_CHANGED', actorUserId: null, targetUserIds: [ME] })).toBe('You now manage who is in this private reply');
    });

    test('a deleted account (null/"") reads as "a former member"; someone we cannot name as "a member"', () => {
        expect(say({ kind: 'MEMBERS_ADDED', actorUserId: '', targetUserIds: ['', LEFT] })).toBe(
            'A former member added a former member and a member',
        );
    });

    test('an unknown kind renders nothing rather than an id or a raw code', () => {
        expect(say({ kind: 'SOMETHING_NEW', actorUserId: AMA, targetUserIds: [ESI] })).toBe('');
    });

    test('no output ever contains an id', () => {
        const kinds = ['STARTED', 'MEMBERS_ADDED', 'MEMBER_REMOVED', 'MEMBER_LEFT', 'MEMBER_LEFT_GROUP', 'MANAGER_CHANGED'];
        for (const kind of kinds) {
            for (const actor of [ME, AMA, LEFT, '', null]) {
                const text = say({ kind, actorUserId: actor, targetUserIds: [LEFT, AMA, ME, ''] });
                expect(text).not.toMatch(UUID_RE);
            }
        }
    });
});

test.describe('refusals and counts', () => {
    test('maps the gateway code to a translated message key, never the raw server text', () => {
        const refused = (code: string) => ({ errors: [{ message: 'raw server text', extensions: { code } }] });
        expect(privateReplyErrorKey(refused('PRIVATE_REPLY_LIMIT_REACHED'))).toBe('limitReached');
        expect(privateReplyErrorKey(refused('PRIVATE_REPLY_FORBIDDEN'))).toBe('forbidden');
        expect(privateReplyErrorKey(refused('PRIVATE_REPLY_MANAGEMENT_DISABLED'))).toBe('managementDisabled');
        expect(privateReplyErrorKey(refused('PRIVATE_REPLY_NOT_FOUND'))).toBe('notFound');
        expect(privateReplyErrorKey(refused('INTERNAL_SERVER_ERROR'))).toBe('generic');
        expect(privateReplyErrorKey(new Error('Failed to fetch'))).toBe('generic');
        expect(privateReplyErrorKey(undefined)).toBe('generic');
    });

    test('groups replies by their group message and totals unread for members only', () => {
        const reply = (id: string, anchor: string | null, unread: number, isMember = true): PrivateReply => ({
            id,
            groupConversationId: 'g',
            anchor: anchor ? { messageId: anchor, senderId: AMA, contentSnippet: 'hi' } : null,
            memberUserIds: [ME, AMA],
            isMember,
            canManage: false,
            unreadCount: unread,
        });
        const replies = [reply('a', 'm1', 2), reply('b', 'm1', 1), reply('c', null, 5), reply('d', 'm2', 4, false)];
        const byAnchor = groupByAnchor(replies);
        expect(byAnchor.get('m1')?.map((r) => r.id)).toEqual(['a', 'b']);
        expect(byAnchor.has('c')).toBe(false); // anchor deleted: listed, but no marker
        expect(totalUnread(replies)).toBe(8);
    });

    test('remaining slots count the starter and never go negative after the admin lowers the limit', () => {
        expect(remainingSlots(3, 10)).toBe(7);
        expect(remainingSlots(10, 10)).toBe(0);
        expect(remainingSlots(12, 10)).toBe(0);
    });
});
