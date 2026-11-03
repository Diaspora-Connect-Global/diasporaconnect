/** Display rules for an opportunity (pure, no browser). */
import { test, expect } from '@playwright/test';
import { aboutText, daysUntil, externalHost, opportunityPhase, readableOwnerName, safeEmail, safeExternalUrl } from '../../src/lib/opportunityDisplay';

const NOW = new Date('2026-11-03T10:00:00.000Z');
const DAY = 86_400_000;
const at = (ms: number) => new Date(NOW.getTime() + ms).toISOString();

test('a poster name is shown only when it is a name, never an id', () => {
    expect(readableOwnerName('  Ama Mensah ')).toBe('Ama Mensah');
    expect(readableOwnerName('00000000-0000-4000-8000-00000000f1aa')).toBeNull();
    expect(readableOwnerName('65a1f0c2b9e4d7a1c3f5e8b2')).toBeNull();
    expect(readableOwnerName('')).toBeNull();
    expect(readableOwnerName(null)).toBeNull();
});

test('only http(s) application links are links', () => {
    expect(safeExternalUrl(' https://example.com/apply ')).toBe('https://example.com/apply');
    expect(safeExternalUrl('http://example.com')).toBe('http://example.com/');
    for (const bad of ['javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'data:text/html,<b>x</b>', 'vbscript:x', 'example.com', '//example.com', '', null]) {
        expect(safeExternalUrl(bad)).toBeNull();
    }
    expect(externalHost('https://www.example.com/a?b=1')).toBe('example.com');
});

test('only a plain address becomes a mailto: link', () => {
    expect(safeEmail(' jobs@example.com ')).toBe('jobs@example.com');
    expect(safeEmail('first.last+tag@sub.example.org')).toBe('first.last+tag@sub.example.org');
    for (const bad of ['a@b.com?bcc=x@y.com', 'a@b.com&cc=x@y.com', 'a@b.com,x@y.com', 'a b@c.com', 'a@b', 'not-an-email', 'a@b.com%0Abcc:x@y.com', '', null]) {
        expect(safeEmail(bad)).toBeNull();
    }
});

test('open, closing soon (last 7 days) and closed', () => {
    expect(opportunityPhase({ status: 'PUBLISHED', deadline: null }, NOW)).toBe('open');
    expect(opportunityPhase({ status: 'PUBLISHED', deadline: at(30 * DAY) }, NOW)).toBe('open');
    expect(opportunityPhase({ status: 'PUBLISHED', deadline: at(7 * DAY) }, NOW)).toBe('closingSoon');
    expect(opportunityPhase({ status: 'PUBLISHED', deadline: at(60_000) }, NOW)).toBe('closingSoon');
    expect(opportunityPhase({ status: 'PUBLISHED', deadline: at(-60_000) }, NOW)).toBe('closed');
    expect(opportunityPhase({ status: 'CLOSED', deadline: at(30 * DAY) }, NOW)).toBe('closed');
    expect(opportunityPhase({ status: 'ARCHIVED' }, NOW)).toBe('closed');
    expect(opportunityPhase({ status: 'PUBLISHED', closedAt: at(-DAY) }, NOW)).toBe('closed');
    expect(opportunityPhase({ status: 'PUBLISHED', deadline: 'not a date' }, NOW)).toBe('open');
});

test('days left counts whole days; a passed deadline is negative', () => {
    expect(daysUntil(new Date(at(3 * DAY + 3_600_000)), NOW)).toBe(3);
    expect(daysUntil(new Date(at(3_600_000)), NOW)).toBe(0);
    expect(daysUntil(new Date(at(-1)), NOW)).toBe(-1);
});

test('"About" is left out only when it repeats a short title', () => {
    expect(aboutText('Volunteer drivers', ' volunteer   drivers ')).toBeNull();
    const long = 'x '.repeat(80).trim();
    expect(aboutText(long, long)).toBe(long);
    expect(aboutText('Finance officer', 'Keep the books.')).toBe('Keep the books.');
    expect(aboutText('Finance officer', '  ')).toBeNull();
});
