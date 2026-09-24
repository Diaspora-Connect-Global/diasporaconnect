/**
 * Pure unit tests (no browser) for the username helpers. They run under the
 * Playwright runner because it is the only test runner in the repo:
 *   npx playwright test e2e/username/rules.spec.ts
 * (`E2E_BASE_URL` set to anything skips starting the dev server.)
 */
import { test, expect } from '@playwright/test';
import { normalizeUsername, validateUsername } from '../../src/lib/username';
import { profileUrl, absoluteProfileUrl } from '../../src/lib/profileUrl';
import { matchHandlePath } from '../../src/lib/handlePath';

test.describe('normalizeUsername', () => {
    test('trims, strips one leading @ and lowercases', () => {
        expect(normalizeUsername('  @Steven.Doe ')).toBe('steven.doe');
        expect(normalizeUsername('@@steven')).toBe('@steven');
        expect(normalizeUsername(null)).toBe('');
    });
});

test.describe('validateUsername', () => {
    const ok = ['steven', 'abc', 'a_b.c9', 'john.doe', 'x'.repeat(30), 'a__b', '@Steven'];
    for (const name of ok) {
        test(`accepts "${name}"`, () => {
            expect(validateUsername(name).valid).toBe(true);
        });
    }

    const bad: Array<[string, string]> = [
        ['', 'EMPTY'],
        ['   ', 'EMPTY'],
        ['ab', 'TOO_SHORT'],
        ['x'.repeat(31), 'TOO_LONG'],
        ['1steven', 'MUST_START_WITH_LETTER'],
        ['_steven', 'MUST_START_WITH_LETTER'],
        ['.steven', 'MUST_START_WITH_LETTER'],
        ['steven.', 'PERIOD_PLACEMENT'],
        ['john..doe', 'PERIOD_PLACEMENT'],
        ['steven_', 'TRAILING_UNDERSCORE'],
        ['john doe', 'INVALID_CHARS'],
        ['john-doe', 'INVALID_CHARS'],
        ['stéven', 'INVALID_CHARS'], // non-ASCII is rejected, never transliterated
        ['stеven', 'INVALID_CHARS'], // Cyrillic "е" lookalike
        ['steven😀', 'INVALID_CHARS'],
        ['😀', 'INVALID_CHARS'], // charset reported before length
    ];
    for (const [name, error] of bad) {
        test(`rejects ${JSON.stringify(name)} with ${error}`, () => {
            const r = validateUsername(name);
            expect(r.valid).toBe(false);
            if (!r.valid) expect(r.error).toBe(error);
        });
    }

    test('returns the normalized form it validated', () => {
        expect(validateUsername(' @John.Doe ').username).toBe('john.doe');
    });
});

test.describe('profileUrl', () => {
    test('prefers /@username', () => {
        expect(profileUrl({ username: 'steven', userId: 'u-1' })).toBe('/@steven');
        expect(profileUrl({ username: '@Steven', userId: 'u-1' })).toBe('/@steven');
    });
    test('falls back to the id route', () => {
        expect(profileUrl({ username: null, userId: 'u-1' })).toBe('/u-1');
        expect(profileUrl({ username: '  ', userId: 'u-1' })).toBe('/u-1');
    });
    test('absolute URL has an origin outside the browser', () => {
        expect(absoluteProfileUrl({ username: 'steven' })).toMatch(/^https?:\/\/[^/]+\/@steven$/);
    });
});

test.describe('matchHandlePath (proxy rewrite)', () => {
    test('matches locale-less and locale-prefixed handles', () => {
        expect(matchHandlePath('/@steven')).toEqual({ locale: null, handle: 'steven' });
        expect(matchHandlePath('/@Steven/')).toEqual({ locale: null, handle: 'steven' });
        expect(matchHandlePath('/de/@john.doe')).toEqual({ locale: 'de', handle: 'john.doe' });
        expect(matchHandlePath('/%40steven')).toEqual({ locale: null, handle: 'steven' });
    });
    test('leaves everything else alone', () => {
        for (const p of ['/', '/en', '/en/profile', '/en/u/steven', '/@steven/posts', '/xx/@steven', '/@', '/en/@']) {
            expect(matchHandlePath(p)).toBeNull();
        }
    });
});
