/**
 * Pure unit tests (no browser) for the Daily Summary card's logic:
 *   E2E_BASE_URL=http://x npx playwright test e2e/chat/daily-summary.spec.ts
 * The rendered card is covered by daily-summary-card.spec.ts (browser).
 */
import { test, expect } from '@playwright/test';
import { formatDigestDate, parseDigestBody, resolveJumpTargets } from '../../src/lib/dailySummary';

test.describe('parseDigestBody', () => {
    // Exactly the shape the backend's formatDigestBody() posts.
    const BODY = [
        'Daily summary · 2026-09-23',
        'A busy day of picnic planning.',
        '- Picnic moves to Saturday',
        '- Drinks are covered',
        'Action items:',
        '- Ama to book the pavilion',
        '(Based on 42 messages.)',
    ].join('\n');

    test('splits header, overview, key points, action items and the count', () => {
        expect(parseDigestBody(BODY)).toEqual({
            digestDate: '2026-09-23',
            overview: 'A busy day of picnic planning.',
            keyPoints: ['Picnic moves to Saturday', 'Drinks are covered'],
            actionItems: ['Ama to book the pavilion'],
            messageCount: 42,
        });
    });

    test('singular footer and no action items', () => {
        const parsed = parseDigestBody('Daily summary · 2026-01-02\nQuiet day.\n(Based on 1 message.)');
        expect(parsed?.messageCount).toBe(1);
        expect(parsed?.actionItems).toEqual([]);
        expect(parsed?.overview).toBe('Quiet day.');
    });

    test('multi-line overview is kept, blank lines dropped', () => {
        const parsed = parseDigestBody('Daily summary · 2026-01-02\n\nFirst line.\n\nSecond line.');
        expect(parsed?.overview).toBe('First line.\nSecond line.');
    });

    test('returns null for text that is not a digest (rendered verbatim instead)', () => {
        expect(parseDigestBody('Hello everyone')).toBeNull();
        expect(parseDigestBody('')).toBeNull();
        expect(parseDigestBody(null)).toBeNull();
        expect(parseDigestBody('Daily summary with no date')).toBeNull();
    });
});

test.describe('resolveJumpTargets', () => {
    const loaded = [
        { id: 'a' },
        { id: 'b' },
        { id: 'r1', replyToId: 'b' },
        { id: 'c' },
        { id: 'orphan', replyToId: 'gone' },
    ];

    test('first referenced id is the target; all loaded ones are highlighted in order', () => {
        expect(resolveJumpTargets(['b', 'c'], loaded)).toEqual({
            targetId: 'b',
            highlightIds: ['b', 'c'],
            missingIds: [],
        });
    });

    test('a referenced reply resolves to its main-thread parent, de-duplicated', () => {
        expect(resolveJumpTargets(['r1', 'b', 'a'], loaded)).toEqual({
            targetId: 'b',
            highlightIds: ['b', 'a'],
            missingIds: [],
        });
    });

    test('ids not loaded yet are reported missing; the first LOADED one becomes the target', () => {
        const r = resolveJumpTargets(['old-1', 'c'], loaded);
        expect(r.targetId).toBe('c');
        expect(r.missingIds).toEqual(['old-1']);
    });

    test('nothing loaded → no target (the caller pages back or reports it gone)', () => {
        expect(resolveJumpTargets(['x', 'y'], loaded)).toEqual({
            targetId: null,
            highlightIds: [],
            missingIds: ['x', 'y'],
        });
        expect(resolveJumpTargets([], loaded).targetId).toBeNull();
    });

    test('a reply whose parent is not loaded counts as missing', () => {
        expect(resolveJumpTargets(['orphan'], loaded)).toEqual({
            targetId: null,
            highlightIds: [],
            missingIds: ['orphan'],
        });
    });
});

test.describe('formatDigestDate', () => {
    test('formats the calendar day per locale, in UTC (no off-by-one west of Greenwich)', () => {
        expect(formatDigestDate('2026-09-23', 'en')).toBe('Sep 23, 2026');
        expect(formatDigestDate('2026-09-23', 'de')).toBe('23.09.2026');
        expect(formatDigestDate('2026-01-01', 'en')).toBe('Jan 1, 2026');
    });
    test('passes through anything that is not YYYY-MM-DD', () => {
        expect(formatDigestDate('yesterday', 'en')).toBe('yesterday');
        expect(formatDigestDate(null, 'en')).toBe('');
    });
});
