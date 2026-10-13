/**
 * Fixtures and a fixture-backed EventDayApi for the dev-harness pages ONLY
 * (`/dev-harness/networking/event-day`). Never imported by a real route. The
 * "backend" is an in-memory state machine; the clock starts at a chosen moment
 * relative to the meeting so every window state can be reviewed at any hour.
 */
import { fixtureMeeting, meeting, PEOPLE } from '../../meetings/harness/fixtures';
import type { Meeting } from '@/services/gql/networkingMeetings';
import type { EventDayState } from '@/services/gql/networkingEventDay';
import { LocateError, type Locate } from '../locate';
import type { Clock } from '../useClock';
import type { EventDayApi, EventDayOutcome } from '../useEventDay';

/** The fixture meeting runs 10:00-10:30 UTC on this day (event time = UTC+0 in Accra). */
export const MEETING_START = Date.parse('2030-11-20T10:00:00.000Z');
export const MEETING_END = Date.parse('2030-11-20T10:30:00.000Z');

export type EventDayScenario =
  | 'before' | 'window' | 'arrived' | 'other-arrived' | 'sharing' | 'other-sharing' | 'they-cant-find'
  | 'online' | 'after' | 'geo-denied' | 'geo-unavailable' | 'geo-timeout';

export const SCENARIOS: EventDayScenario[] = [
  'before', 'window', 'arrived', 'other-arrived', 'sharing', 'other-sharing', 'they-cant-find', 'online', 'after', 'geo-denied', 'geo-unavailable', 'geo-timeout',
];

export function parseScenario(raw: string | null): EventDayScenario {
  return (SCENARIOS as string[]).includes(raw ?? '') ? (raw as EventDayScenario) : 'window';
}

/** Clock that reads `startOffsetMs` from the meeting start at load and then runs in real time. */
export function offsetClock(startOffsetMs: number): Clock {
  const anchor = MEETING_START + startOffsetMs;
  const loaded = Date.now();
  return () => anchor + (Date.now() - loaded);
}

const MIN = 60_000;
export function clockOffsetFor(s: EventDayScenario): number {
  if (s === 'before') return -2 * 60 * MIN;
  if (s === 'after') return 60 * MIN;
  if (s === 'arrived' || s === 'other-arrived' || s === 'they-cant-find') return 2 * MIN;
  return -10 * MIN;
}

export function scenarioMeeting(s: EventDayScenario): Meeting {
  return s === 'online' ? fixtureMeeting('online') : meeting({ status: 'CONFIRMED', confirmedAt: '2030-11-11T09:00:00.000Z', counterpart: PEOPLE.david });
}

export function locateFor(s: EventDayScenario, log: (name: string) => void): Locate {
  return async () => {
    log('locate');
    if (s === 'geo-denied') throw new LocateError('denied');
    if (s === 'geo-unavailable') throw new LocateError('unavailable');
    if (s === 'geo-timeout') throw new LocateError('timeout');
    return { latitude: 5.6037, longitude: -0.187, accuracyMeters: 18 };
  };
}

export interface FakeEventDayOptions {
  scenario: EventDayScenario;
  clock: Clock;
  /** Seconds a share lasts (production: 900). Short values let a spec watch it expire. */
  ttlSeconds?: number;
  /** Seconds before "I can't find you" can be pressed again (production: ~120). */
  cooldownSeconds?: number;
  onCall?: (call: { name: string; input: unknown }) => void;
}

export function fakeEventDayApi(o: FakeEventDayOptions): EventDayApi {
  const ttl = (o.ttlSeconds ?? 900) * 1000;
  const cooldown = (o.cooldownSeconds ?? 120) * 1000;
  const iso = (ms: number) => new Date(ms).toISOString();
  const t0 = o.clock();
  const s = o.scenario;
  let state: EventDayState = {
    myArrivedAt: s === 'arrived' || s === 'other-arrived' ? iso(t0 - 90_000) : null,
    counterpartArrivedAt: s === 'other-arrived' ? iso(t0 - 60_000) : null,
    counterpartCantFindAt: s === 'they-cant-find' ? iso(t0 - 60_000) : null,
    cantFindAvailableAt: null,
    mySharingExpiresAt: s === 'sharing' ? iso(t0 + ttl) : null,
    counterpartPin: s === 'other-sharing' ? { latitude: 5.6051, longitude: -0.1869, accuracyMeters: 25, expiresAt: iso(t0 + ttl) } : null,
    venueAddress: 'Accra International Conference Centre, Ridge, Accra, Ghana',
  };
  const log = (name: string, input: unknown = {}) => o.onCall?.({ name, input });
  const ok = (): EventDayOutcome => ({ ok: true, state: { ...state } });
  return {
    async state() { return ok(); },
    async arrived() {
      log('arrived');
      state = { ...state, myArrivedAt: state.myArrivedAt ?? iso(o.clock()), counterpartCantFindAt: null };
      return ok();
    },
    async cantFind() {
      log('cantFind');
      const wait = state.cantFindAvailableAt ? Date.parse(state.cantFindAvailableAt) - o.clock() : 0;
      if (wait > 0) return { ok: false, code: 'EVENT_NETWORKING_CANT_FIND_COOLDOWN', key: 'cantFindCooldown' };
      state = { ...state, cantFindAvailableAt: iso(o.clock() + cooldown) };
      return ok();
    },
    async share(_id, position) {
      log('share', position);
      state = { ...state, mySharingExpiresAt: iso(o.clock() + ttl) };
      return ok();
    },
    async stop() {
      log('stop');
      state = { ...state, mySharingExpiresAt: null };
      return ok();
    },
  };
}
