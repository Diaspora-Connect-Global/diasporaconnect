/** Pure unit checks for the composer's #hashtag suggestions and per-user draft keys (no browser). */
import { test, expect } from '@playwright/test';
import { filterHashtagSuggestions, findHashtagTrigger, normaliseHashtagPool } from '../../src/lib/hashtagSuggestions';
import { draftFileKey, draftFileRange, draftMetaKey, draftOwnerKey } from '../../src/lib/postDraftKeys';

test('the pool drops the leading #, invalid tags and case-insensitive duplicates, keeping order', () => {
    expect(normaliseHashtagPool(['#Diaspora', 'diaspora', '##Ghana', 'two words', '', null, 'café', 'Jobs_2026'])).toEqual([
        'Diaspora',
        'Ghana',
        'Jobs_2026',
    ]);
});

test('suggestions put prefix matches before contains-matches, ignore case and respect the limit', () => {
    const pool = ['Ghana', 'GhanaJobs', 'DiasporaGhana', 'Nigeria', 'Ghanaian'];
    expect(filterHashtagSuggestions(pool, 'gha')).toEqual(['Ghana', 'GhanaJobs', 'Ghanaian', 'DiasporaGhana']);
    expect(filterHashtagSuggestions(pool, 'gha', 2)).toEqual(['Ghana', 'GhanaJobs']);
    expect(filterHashtagSuggestions(pool, '')).toEqual(pool);
    expect(filterHashtagSuggestions(pool, 'zzz')).toEqual([]);
});

test('a # only triggers at the start of a word and only over tag characters', () => {
    expect(findHashtagTrigger('#', 1)).toEqual({ start: 0, query: '' });
    expect(findHashtagTrigger('Hello #dia', 10)).toEqual({ start: 6, query: 'dia' });
    expect(findHashtagTrigger('line\n#Jobs_2', 12)).toEqual({ start: 5, query: 'Jobs_2' });
    // caret in the middle of a tag completes only what is before it
    expect(findHashtagTrigger('#diaspora', 4)).toEqual({ start: 0, query: 'dia' });
    expect(findHashtagTrigger('issue#12', 8)).toBeNull(); // not the start of a word
    expect(findHashtagTrigger('#dia spora', 10)).toBeNull(); // a space ended the tag
    expect(findHashtagTrigger('C# rocks', 2)).toBeNull();
    expect(findHashtagTrigger('no tag here', 11)).toBeNull();
});

test('draft keys are per user, stable, and never contain the user id', () => {
    const a = '3f1c9a52-7d0e-4b8a-9c11-2a5e6f7b8c9d';
    const b = '3f1c9a52-7d0e-4b8a-9c11-2a5e6f7b8c9e';
    expect(draftOwnerKey(a)).toBe(draftOwnerKey(a));
    expect(draftOwnerKey(a)).not.toBe(draftOwnerKey(b));
    expect(draftMetaKey(draftOwnerKey(a))).not.toContain(a);
    expect(draftMetaKey(draftOwnerKey(a)).startsWith('cpd:v2:')).toBe(true);
});

test("one user's file range covers their files and nobody else's", () => {
    const mine = draftOwnerKey('user-a');
    const theirs = draftOwnerKey('user-b');
    const { lower, upper } = draftFileRange(mine);
    const inRange = (k: string) => k >= lower && k <= upper;
    expect(inRange(draftFileKey(mine, 'Photo-1700000000000-0.5'))).toBe(true);
    expect(inRange(draftFileKey(theirs, 'Photo-1700000000000-0.5'))).toBe(false);
});
