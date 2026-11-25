import { expect, test } from '@playwright/test';
import { appendUnique, isEventCancelled, isEventOpen, isEventOver, openEventsSoonestFirst } from '../../src/lib/eventTiming';

const now = Date.parse('2026-11-25T12:00:00Z');
const h = (n: number) => new Date(now + n * 3600_000).toISOString();

test('isEventOver: ended, running, completed, no end, bad dates', () => {
  expect(isEventOver({ startAt: h(-5), endAt: h(-1) }, now)).toBe(true);
  expect(isEventOver({ startAt: h(-1), endAt: h(2) }, now)).toBe(false);
  expect(isEventOver({ startAt: h(1), endAt: h(3) }, now)).toBe(false);
  expect(isEventOver({ status: 'COMPLETED', startAt: h(1), endAt: h(3) }, now)).toBe(true);
  // no end: the start stands in
  expect(isEventOver({ startAt: h(-1), endAt: null }, now)).toBe(true);
  expect(isEventOver({ startAt: h(1) }, now)).toBe(false);
  // unknown times are never "over"
  expect(isEventOver({ startAt: 'nope', endAt: '' }, now)).toBe(false);
  expect(isEventOver(null, now)).toBe(false);
});

test('isEventCancelled / isEventOpen', () => {
  expect(isEventCancelled({ status: 'CANCELLED' })).toBe(true);
  expect(isEventCancelled({ status: 'published' })).toBe(false);
  expect(isEventOpen({ status: 'PUBLISHED', startAt: h(1), endAt: h(2) }, now)).toBe(true);
  expect(isEventOpen({ status: 'cancelled', startAt: h(1), endAt: h(2) }, now)).toBe(false);
  expect(isEventOpen({ status: 'published', startAt: h(-3), endAt: h(-2) }, now)).toBe(false);
});

test('openEventsSoonestFirst drops ended and cancelled events and sorts by start', () => {
  const list = [
    { id: 'later', startAt: h(48), endAt: h(50) },
    { id: 'old', startAt: h(-48), endAt: h(-46) },
    { id: 'done', status: 'completed', startAt: h(5), endAt: h(6) },
    { id: 'off', status: 'CANCELLED', startAt: h(5), endAt: h(6) },
    { id: 'running', startAt: h(-1), endAt: h(1) },
    null,
    { id: 'soon', startAt: h(2), endAt: h(3) },
  ];
  expect(openEventsSoonestFirst(list, now).map((e) => e.id)).toEqual(['running', 'soon', 'later']);
});

test('appendUnique keeps order and skips ids already shown', () => {
  const out = appendUnique([{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, null, { id: 'c' }, { id: 'c' }]);
  expect(out.map((e) => e.id)).toEqual(['a', 'b', 'c']);
});

// The RSVP handler and the "Cancel registration" buttons all gate on isEventOpen.
test('isEventOpen gates attendance changes: ended, completed and cancelled events are closed', () => {
  expect(isEventOpen({ status: 'PUBLISHED', startAt: h(-5), endAt: h(-1) }, now)).toBe(false);
  expect(isEventOpen({ status: 'COMPLETED', startAt: h(1), endAt: h(3) }, now)).toBe(false);
  expect(isEventOpen({ status: 'cancelled', startAt: h(1), endAt: h(3) }, now)).toBe(false);
  expect(isEventOpen({ status: 'PUBLISHED', startAt: h(-1), endAt: h(2) }, now)).toBe(true);
  expect(isEventOpen({ status: 'PUBLISHED', startAt: h(24), endAt: h(26) }, now)).toBe(true);
  expect(isEventOpen(null, now)).toBe(false);
});
