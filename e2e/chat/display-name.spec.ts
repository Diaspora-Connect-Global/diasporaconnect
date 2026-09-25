/**
 * Pure unit tests (no browser) for the "never show a user id" helpers. Run
 * under the Playwright runner, the only test runner in the repo:
 *   E2E_BASE_URL=http://x npx playwright test e2e/chat/display-name.spec.ts
 * (`E2E_BASE_URL` set to anything skips starting the dev server.)
 */
import { test, expect } from '@playwright/test';
import { containsId, displayName, looksLikeId, safeName, stripIds } from '../../src/lib/displayName';

const UUID = '3f9a2b1c-4d5e-4f60-8a7b-9c3d1e2f5a6b';
const UUID_UPPER = UUID.toUpperCase();
const COMPACT = UUID.replace(/-/g, '');
const FRAGMENT = '3f9a2b1c';
const TOMBSTONE = 'deleted-user:a1b2c3d4e5f6';

test.describe('looksLikeId', () => {
    for (const id of [UUID, UUID_UPPER, COMPACT, FRAGMENT, TOMBSTONE, `User ${FRAGMENT}`, `user:${UUID}`, `@${UUID}`, `  ${UUID}  `]) {
        test(`flags "${id}"`, () => expect(looksLikeId(id)).toBe(true));
    }
    for (const name of ['Kwame', 'Ama Owusu', 'deadbeef', 'facade', '12345678', '0244123456', '2026-09-24', '', '   ']) {
        test(`does not flag "${name}"`, () => expect(looksLikeId(name)).toBe(false));
    }
    test('null/undefined are not ids', () => {
        expect(looksLikeId(null)).toBe(false);
        expect(looksLikeId(undefined)).toBe(false);
    });
});

test.describe('containsId', () => {
    test('finds an id inside a sentence', () => {
        expect(containsId(`Thanks ${UUID} for the help`)).toBe(true);
        expect(containsId(`Kwame ${FRAGMENT}`)).toBe(true);
    });
    test('ignores ordinary words, numbers and dates', () => {
        expect(containsId('Meet at 10am on 2026-09-24, call 0244123456')).toBe(false);
        expect(containsId('The deadbeef café façade')).toBe(false);
    });
    test('does not match an id-like run inside a longer word', () => {
        expect(containsId('abc3f9a2b1cxyz')).toBe(false);
    });
});

test.describe('stripIds', () => {
    test('replaces an id with the inline label, capitalised at a sentence start', () => {
        expect(stripIds(`${UUID} joined the group`, 'a member')).toBe('A member joined the group');
        expect(stripIds(`Welcome ${UUID}!`, 'a member')).toBe('Welcome a member!');
        expect(stripIds(`Done. ${UUID} left`, 'a member')).toBe('Done. A member left');
    });
    test('consumes a label glued to the id ("User 3f9a…", "user:…", "@…")', () => {
        expect(stripIds(`User ${FRAGMENT} said hi`, 'a member')).toBe('A member said hi');
        expect(stripIds(`ping @${UUID} please`, 'a member')).toBe('ping a member please');
        expect(stripIds(`by user:${UUID}`, 'a member')).toBe('by a member');
    });
    test('replaces the backend\'s "user_<hex>" / "User <hex>" labels stored in old digests', () => {
        // Verbatim from a stored digest the owner screenshotted.
        expect(stripIds("The group chat had a single message from user_07b4a12e who said 'Ok'.", 'a member')).toBe(
            "The group chat had a single message from a member who said 'Ok'.",
        );
        expect(stripIds('user_07b4a12e said Ok', 'a member')).toBe('A member said Ok');
        // With the explicit label, ANY 8+ hex run is an id — even all digits / all letters.
        expect(stripIds('User 12345678 asked about visas', 'a member')).toBe('A member asked about visas');
        expect(stripIds('thanks user_abcdefab!', 'a member')).toBe('thanks a member!');
        expect(stripIds('USER_07B4A12E3F9A left', 'a member')).toBe('A member left');
        expect(stripIds(`user ${UUID} left`, 'a member')).toBe('A member left');
        expect(looksLikeId('user_12345678')).toBe(true);
        // …but ordinary prose after the word "user" is untouched.
        expect(stripIds('The user accessed 20260924 data; user feedback deadbeef')).toBe(
            'The user accessed 20260924 data; user feedback deadbeef',
        );
    });
    test('scans pathological whitespace in linear time (no regex backtracking blow-up)', () => {
        // "user" + 100k spaces took ~30 s with unbounded `\s*` pairs in the label.
        const started = Date.now();
        const text = `user${' '.repeat(100_000)}z`;
        expect(stripIds(text, 'a member')).toBe(text);
        expect(Date.now() - started).toBeLessThan(500);
    });
    test('removes ids without a replacement and tidies what is left', () => {
        expect(stripIds(`Meeting (${FRAGMENT}) moved`)).toBe('Meeting moved');
        expect(stripIds(`${TOMBSTONE} left`)).toBe('left');
        expect(stripIds(`Hi ${UUID}.`)).toBe('Hi.');
    });
    test('removes every occurrence, upper-case and compact forms included', () => {
        const out = stripIds(`${UUID} and ${UUID_UPPER} and ${COMPACT}`, 'a member');
        expect(out).toBe('A member and a member and a member');
        expect(containsId(out)).toBe(false);
    });
    test('keeps multi-line structure and text without ids untouched', () => {
        const text = 'Daily summary · 2026-09-24\n- Kofi shared deadbeef plans\nAction items:\n- call 0244123456';
        expect(stripIds(text)).toBe(text);
        expect(stripIds(`line one\n- ${UUID} will bring drinks`, 'a member')).toBe('line one\n- a member will bring drinks');
    });
    test('empty and nullish input give an empty string', () => {
        expect(stripIds('')).toBe('');
        expect(stripIds(null)).toBe('');
        expect(stripIds(undefined, 'x')).toBe('');
    });
});

test.describe('displayName', () => {
    test('prefers an explicit display name, then first + last, then @username', () => {
        expect(displayName({ displayName: 'Ama O.', firstName: 'Ama', lastName: 'Owusu' }, 'X')).toBe('Ama O.');
        expect(displayName({ firstName: ' Ama ', lastName: 'Owusu' }, 'X')).toBe('Ama Owusu');
        expect(displayName({ firstName: 'Ama' }, 'X')).toBe('Ama');
        expect(displayName({ username: 'ama.o' }, 'X')).toBe('@ama.o');
        expect(displayName({ handle: '@ama.o' }, 'X')).toBe('@ama.o');
    });
    test('never returns an id: id-shaped fields are skipped, the fallback wins', () => {
        expect(displayName({ displayName: UUID }, 'Unknown user')).toBe('Unknown user');
        expect(displayName({ firstName: UUID }, 'Unknown user')).toBe('Unknown user');
        expect(displayName({ firstName: 'User', lastName: FRAGMENT }, 'Unknown user')).toBe('Unknown user');
        expect(displayName({ name: `Kwame ${FRAGMENT}` }, 'Unknown user')).toBe('Unknown user');
        expect(displayName({ username: TOMBSTONE }, 'Unknown user')).toBe('Unknown user');
    });
    test('an id-shaped explicit name falls through to a real first/last name', () => {
        expect(displayName({ displayName: UUID, firstName: 'Efua', lastName: 'Boateng' }, 'X')).toBe('Efua Boateng');
    });
    test('missing profile or all-empty fields give the fallback', () => {
        expect(displayName(null, 'Someone')).toBe('Someone');
        expect(displayName(undefined, 'Someone')).toBe('Someone');
        expect(displayName({ firstName: '  ', lastName: '' }, 'Someone')).toBe('Someone');
    });
});

test.describe('safeName', () => {
    test('passes a real name and rejects an id', () => {
        expect(safeName('Kofi Mensah', 'X')).toBe('Kofi Mensah');
        expect(safeName(UUID, 'X')).toBe('X');
        expect(safeName('', 'X')).toBe('X');
        expect(safeName(null, 'X')).toBe('X');
    });
});
