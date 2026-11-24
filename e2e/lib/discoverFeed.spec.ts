/** Pure unit checks for what Discover lists and how the kinds are merged (no browser). */
import { test, expect } from '@playwright/test';
import { activeKinds, byClosing, byNewest, interleave, opportunitySpecs, uniqueBy, upcomingEvents } from '../../src/components/discover/feedLogic';
import { parseCategories } from '../../src/components/discover/discoverCategories';

test('with no filter every kind is listed', () => {
  expect(activeKinds([], '')).toEqual(['opportunities', 'events', 'services', 'products']);
  expect(opportunitySpecs([])).toEqual([{}]);
});

test('a category narrows to its kind; clearing returns to everything', () => {
  expect(activeKinds(['events'], '')).toEqual(['events']);
  expect(activeKinds(['jobs', 'services'], '')).toEqual(['opportunities', 'services']);
  expect(activeKinds([], '')).toHaveLength(4);
});

test('a place leaves out products and services, which have none', () => {
  expect(activeKinds([], 'Accra')).toEqual(['opportunities', 'events']);
  expect(activeKinds(['products'], 'Accra')).toEqual([]);
  expect(activeKinds([], '   ')).toHaveLength(4);
});

test('opportunity rows become one query per type or category, without repeats', () => {
  expect(opportunitySpecs(['jobs'])).toEqual([{ type: 'EMPLOYMENT' }, { type: 'CONTRACT' }]);
  expect(opportunitySpecs(['investments', 'realEstate'])).toEqual([{ type: 'INVESTMENT' }, { category: 'REAL_ESTATE_INFRASTRUCTURE' }]);
  expect(opportunitySpecs(['events', 'services'])).toEqual([{}]);
});

test('kinds take turns, each keeping its own order, and the longer list carries on alone', () => {
  expect(interleave([['o1', 'o2', 'o3'], ['e1'], [], ['p1', 'p2']])).toEqual(['o1', 'e1', 'p1', 'o2', 'p2', 'o3']);
  expect(interleave([])).toEqual([]);
});

test('uniqueBy keeps the first of a repeated id', () => {
  expect(uniqueBy([{ id: 'a', n: 1 }, { id: 'b', n: 2 }, { id: 'a', n: 3 }], (x) => x.id)).toEqual([{ id: 'a', n: 1 }, { id: 'b', n: 2 }]);
});

test('opportunity orders: newest first, soonest deadline first with none last', () => {
  const rows = [{ createdAt: '2026-01-01', deadline: null }, { createdAt: '2026-03-01', deadline: '2026-12-01' }, { createdAt: null, deadline: '2026-11-01' }];
  expect([...rows].sort(byNewest).map((r) => r.createdAt)).toEqual(['2026-03-01', '2026-01-01', null]);
  expect([...rows].sort(byClosing).map((r) => r.deadline)).toEqual(['2026-11-01', '2026-12-01', null]);
});

test('events: past, cancelled and draft ones are dropped, the place text filters, soonest first', () => {
  const now = Date.parse('2026-11-24T12:00:00Z');
  const ev = (id: string, startAt: string, status = 'published', city = 'Accra', endAt?: string) => ({ id, startAt, endAt, status, city });
  const list = [
    ev('later', '2026-12-20T10:00:00Z'),
    ev('past', '2026-10-01T10:00:00Z'),
    ev('running', '2026-11-24T09:00:00Z', 'published', 'Accra', '2026-11-24T18:00:00Z'),
    ev('cancelled', '2026-12-01T10:00:00Z', 'CANCELLED'),
    ev('draft', '2026-12-02T10:00:00Z', 'draft'),
    ev('berlin', '2026-12-03T10:00:00Z', 'published', 'Berlin'),
  ];
  const place = (e: { city: string }) => e.city;
  expect(upcomingEvents(list, now, '', place).map((e) => e.id)).toEqual(['running', 'berlin', 'later']);
  expect(upcomingEvents(list, now, ' accra ', place).map((e) => e.id)).toEqual(['running', 'later']);
  expect(upcomingEvents([null, undefined, ...list], now, '', place)).toHaveLength(3);
});

test('old ?cat=forYou / latest links are ignored instead of narrowing to nothing', () => {
  expect(parseCategories('forYou,latest')).toEqual([]);
  expect(parseCategories('latest,jobs,bogus,events')).toEqual(['jobs', 'events']);
});
