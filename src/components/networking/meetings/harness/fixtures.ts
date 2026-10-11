/**
 * Fixture data and a fixture-backed MeetingsApi for the dev-harness pages ONLY
 * (`/dev-harness/networking/meetings/*`). Never imported by a real route. The
 * people and times are invented; the "backend" is a small in-memory state machine
 * that follows the documented transitions, so every screen state can be reviewed
 * before the meetings gateway exists.
 */
import type { MeetingFailure, MeetingOutcome, MeetingsApi, SuggestOutcome } from '../useMeetings';
import type {
  Meeting,
  MeetingCounterpart,
  MeetingPoint,
  MeetingSettings,
  MeetingSlot,
  MeetingSchedule,
  MeetingStatus,
} from '@/services/gql/networkingMeetings';
import { MEETING_PURPOSES } from '@/services/gql/networkingMeetings';

export const TZ = 'Africa/Accra';

export const POINTS: MeetingPoint[] = [
  { id: 'pt-lounge', name: 'Networking lounge', directions: 'Ground floor, next to registration', capacityPerSlot: 6, active: true, sortOrder: 0 },
  { id: 'pt-cafe', name: 'Garden cafe', directions: 'Terrace level', capacityPerSlot: 3, active: true, sortOrder: 1 },
];

const pad = (n: number) => String(n).padStart(2, '0');

/** A slot on `date` at `hh:mm`, `minutes` long. The event zone is UTC+0, so UTC and event clock agree. */
export function slot(date: string, hh: number, mm: number, minutes = 30): MeetingSlot {
  const end = hh * 60 + mm + minutes;
  return {
    startAt: `${date}T${pad(hh)}:${pad(mm)}:00.000Z`,
    endAt: `${date}T${pad(Math.floor(end / 60))}:${pad(end % 60)}:00.000Z`,
    localDate: date,
    localStart: `${pad(hh)}:${pad(mm)}`,
    localEnd: `${pad(Math.floor(end / 60))}:${pad(end % 60)}`,
    utcOffset: '+00:00',
  };
}

export const DAY1 = '2030-11-20';
export const DAY2 = '2030-11-21';

export function slotsFor(minutes: number): MeetingSlot[] {
  const times: Array<[number, number]> = [[9, 0], [9, 30], [10, 0], [11, 0], [14, 0], [15, 30]];
  return [DAY1, DAY2].flatMap((d) => times.map(([h, m]) => slot(d, h, m, minutes)));
}

export const PEOPLE: Record<string, MeetingCounterpart> = {
  david: { handle: 'h-david-71c', displayName: 'David Owusu', avatarUrl: null, username: 'davidowusu', headline: 'Investment Manager, AfricInvest', available: true },
  sarah: { handle: 'h-sarah-a02', displayName: 'Sarah Mensah', avatarUrl: null, username: null, headline: 'Policy Analyst, Ghana Policy Institute', available: true },
  kwame: { handle: 'h-kwame-9d4', displayName: 'Kwame Asante', avatarUrl: null, username: 'kwame', headline: 'Tech Entrepreneur, InnovateGH', available: true },
  ama: { handle: 'h-ama-3f9', displayName: 'Ama Mensah', avatarUrl: null, username: 'amam', headline: 'Founder and CEO, GreenTech Solutions', available: false },
};

export type FixtureState =
  | 'requested-in' | 'requested-out' | 'alt-in' | 'confirmed' | 'reschedule-in' | 'reschedule-out' | 'cancelled' | 'declined' | 'completed' | 'expired' | 'online';

function caps(status: MeetingStatus, awaitingMe: boolean) {
  const open = status === 'REQUESTED' || status === 'ALT_PROPOSED' || status === 'RESCHEDULE_PROPOSED';
  return {
    canAccept: awaitingMe && open,
    canDecline: awaitingMe && open,
    canPropose: awaitingMe && (status === 'REQUESTED' || status === 'ALT_PROPOSED'),
    canCancel: status === 'CONFIRMED' || (open && !awaitingMe) || status === 'RESCHEDULE_PROPOSED',
    canReschedule: status === 'CONFIRMED',
  };
}

export function meeting(over: Partial<Meeting> & { status: Meeting['status'] }): Meeting {
  const awaitingMe = over.awaitingMe ?? false;
  return {
    meetingId: 'm-fixture-1',
    eventId: 'ev-fixture',
    role: 'REQUESTER',
    awaitingMe,
    counterpart: PEOPLE.david,
    slot: slot(DAY1, 10, 0),
    durationMinutes: 30,
    timezone: TZ,
    format: 'IN_PERSON',
    meetingPoint: POINTS[0],
    onlineUrl: null,
    purpose: 'INVESTMENT',
    note: 'Keen to hear how AfricInvest looks at seed-stage fintech.',
    openProposals: [],
    previousSlot: null,
    rescheduleCount: 0,
    cancelledBy: null,
    cancelReason: null,
    expiresAt: null,
    createdAt: '2030-11-10T09:00:00.000Z',
    confirmedAt: null,
    cancelledAt: null,
    version: 1,
    updatedAt: null,
    ...caps(over.status, awaitingMe),
    ...over,
  };
}

export function fixtureMeeting(state: FixtureState): Meeting {
  switch (state) {
    case 'requested-in':
      return meeting({ status: 'REQUESTED', role: 'RECIPIENT', awaitingMe: true, counterpart: PEOPLE.kwame, purpose: 'PARTNERSHIP', note: 'Would love 30 minutes to compare notes on payment rails.' });
    case 'requested-out':
      return meeting({ status: 'REQUESTED', role: 'REQUESTER' });
    case 'alt-in':
      return meeting({ status: 'ALT_PROPOSED', role: 'REQUESTER', awaitingMe: true, openProposals: [slot(DAY1, 11, 0), slot(DAY1, 14, 0), slot(DAY2, 9, 30)].map((s) => ({ slot: s, kind: 'ALTERNATIVE' as const, proposedByMe: false })) });
    case 'confirmed':
      return meeting({ status: 'CONFIRMED', confirmedAt: '2030-11-11T09:00:00.000Z' });
    case 'online':
      return meeting({ status: 'CONFIRMED', format: 'ONLINE', meetingPoint: null, onlineUrl: 'https://meet.example.org/room/summit-check' });
    case 'reschedule-in':
      return meeting({ status: 'RESCHEDULE_PROPOSED', role: 'RECIPIENT', awaitingMe: true, previousSlot: slot(DAY1, 10, 0), openProposals: [slot(DAY2, 10, 0), slot(DAY2, 14, 0)].map((s) => ({ slot: s, kind: 'RESCHEDULE' as const, proposedByMe: false })) });
    case 'reschedule-out':
      return meeting({ status: 'RESCHEDULE_PROPOSED', awaitingMe: false, openProposals: [slot(DAY2, 10, 0)].map((s) => ({ slot: s, kind: 'RESCHEDULE' as const, proposedByMe: true })) });
    case 'cancelled':
      return meeting({ status: 'CANCELLED', cancelledBy: 'COUNTERPART', cancelReason: 'BY_PARTICIPANT', cancelledAt: '2030-11-15T09:00:00.000Z' });
    case 'declined':
      return meeting({ status: 'DECLINED' });
    case 'expired':
      return meeting({ status: 'EXPIRED' });
    case 'completed':
      return meeting({ status: 'COMPLETED', slot: slot('2030-11-19', 15, 0) });
  }
}

export function fixtureList(): Meeting[] {
  const ids = (m: Meeting, id: string, who: MeetingCounterpart, s?: MeetingSlot) => ({ ...m, meetingId: id, counterpart: who, slot: s ?? m.slot });
  return [
    ids(fixtureMeeting('requested-in'), 'm-1', PEOPLE.kwame, slot(DAY1, 9, 30)),
    ids(fixtureMeeting('requested-out'), 'm-2', PEOPLE.david, slot(DAY1, 11, 0)),
    ids(fixtureMeeting('alt-in'), 'm-3', PEOPLE.sarah, slot(DAY1, 14, 0)),
    ids(fixtureMeeting('confirmed'), 'm-4', PEOPLE.david, slot(DAY1, 15, 30)),
    ids(fixtureMeeting('reschedule-in'), 'm-5', PEOPLE.kwame, slot(DAY2, 9, 0)),
    ids(fixtureMeeting('completed'), 'm-6', PEOPLE.sarah),
    ids(fixtureMeeting('cancelled'), 'm-7', PEOPLE.david, slot(DAY2, 11, 0)),
  ];
}

export const FILTER_STATUSES: Record<string, MeetingStatus[]> = {
  PENDING: ['REQUESTED'],
  ALTERNATIVES: ['ALT_PROPOSED', 'RESCHEDULE_PROPOSED'],
  UPCOMING: ['CONFIRMED'],
  COMPLETED: ['COMPLETED'],
  CANCELLED: ['CANCELLED', 'DECLINED', 'EXPIRED'],
};

export const SCHEDULE_ITEMS = (circlesAvailable: boolean): MeetingSchedule => ({
  timezone: TZ,
  circleSessionsAvailable: circlesAvailable,
  items: [
    { kind: 'SESSION', title: 'Opening keynote', location: 'Hall A', sessionType: 'KEYNOTE', sessionId: 's1', slot: slot(DAY1, 9, 0, 45) },
    { kind: 'MEETING', status: 'CONFIRMED', location: POINTS[0].name, slot: slot(DAY1, 10, 0), meeting: fixtureMeeting('confirmed') },
    { kind: 'SESSION', title: 'Funding panel', location: 'Hall B', sessionType: 'PANEL', sessionId: 's2', slot: slot(DAY1, 11, 0, 60) },
    ...(circlesAvailable ? [{ kind: 'CIRCLE_SESSION' as const, title: 'Investing in African Startups', location: 'Meeting Room B', circleId: 'c1', slot: slot(DAY1, 14, 0, 60) }] : []),
    { kind: 'MEETING', status: 'CONFIRMED', location: null, slot: slot(DAY2, 10, 0), meeting: { ...fixtureMeeting('online'), meetingId: 'm-on', counterpart: PEOPLE.kwame, slot: slot(DAY2, 10, 0) } },
    { kind: 'SESSION', title: 'Closing remarks', location: 'Hall A', sessionType: 'TALK', sessionId: 's3', slot: slot(DAY2, 16, 0, 30) },
  ],
});

export const SETTINGS: MeetingSettings = {
  eventId: 'ev-fixture',
  meetingPolicy: 'MUTUAL_ONLY',
  meetingDurations: [15, 30],
  meetingWindows: [
    { date: DAY1, startTime: '09:00', endTime: '12:00' },
    { date: DAY1, startTime: '14:00', endTime: '17:00' },
  ],
  maxMeetingsPerPerson: 20,
  maxPendingRequests: 20,
  meetingPoints: POINTS,
  timezone: TZ,
  version: 3,
  allowedFormats: ['IN_PERSON', 'ONLINE'],
  slotStepMinutes: 15,
};

const fail = (code: string, key: string): MeetingFailure => ({ ok: false, code: `EVENT_NETWORKING_${code}`, key });

/**
 * A MeetingsApi over fixtures. `initial` is the meeting the detail screen starts from;
 * `slotTakenOnce` makes the first request answer SLOT_TAKEN (the retry then succeeds);
 * `empty` returns no shared times. Each call is reported to `onCall`.
 */
export function fakeMeetingsApi(opts: { initial?: Meeting; slotTakenOnce?: boolean; empty?: boolean; onCall?: (call: { name: string; input: unknown }) => void } = {}): MeetingsApi {
  let current = opts.initial ?? fixtureMeeting('requested-in');
  let taken = Boolean(opts.slotTakenOnce);
  const record = (name: string, input: unknown) => opts.onCall?.({ name, input });
  const done = (m: Meeting): MeetingOutcome => {
    current = { ...m, version: current.version + 1, ...caps(m.status, m.awaitingMe) };
    return { ok: true, meeting: current };
  };
  return {
    async suggest(handle, durationMinutes, meetingPointId): Promise<SuggestOutcome> {
      record('suggest', { durationMinutes, meetingPointId });
      await new Promise((r) => setTimeout(r, 60));
      return {
        ok: true,
        data: {
          slots: opts.empty ? [] : slotsFor(durationMinutes).filter((s) => !meetingPointId || meetingPointId !== 'pt-cafe' || s.localStart !== '09:00'),
          timezone: TZ,
          allowedDurations: [15, 30, 45],
          allowedFormats: ['IN_PERSON', 'ONLINE'],
          meetingPointOptions: POINTS,
          purposes: MEETING_PURPOSES,
        },
      };
    },
    async request(input) {
      record('request', input);
      await new Promise((r) => setTimeout(r, 80));
      if (taken) {
        taken = false;
        return fail('SLOT_TAKEN', 'slotTaken');
      }
      const s = slotsFor(input.durationMinutes).find((x) => x.startAt === input.startAt) ?? slot(DAY1, 10, 0, input.durationMinutes);
      return done(meeting({ status: 'REQUESTED', slot: s, durationMinutes: input.durationMinutes, format: input.format, purpose: input.purpose, note: input.note ?? null, meetingPoint: POINTS.find((p) => p.id === input.meetingPointId) ?? null, onlineUrl: input.onlineUrl ?? null }));
    },
    async respond(input) {
      record('respond', input);
      await new Promise((r) => setTimeout(r, 60));
      if (input.action === 'ACCEPT') {
        const chosen = current.openProposals.find((p) => p.slot.startAt === input.startAt)?.slot ?? current.slot;
        return done({ ...current, status: 'CONFIRMED', awaitingMe: false, slot: chosen, openProposals: [], previousSlot: current.status === 'RESCHEDULE_PROPOSED' ? current.slot : null, onlineUrl: input.onlineUrl ?? current.onlineUrl, confirmedAt: '2030-11-12T09:00:00.000Z' });
      }
      if (input.action === 'DECLINE') {
        // Declining a reschedule keeps the original time.
        if (current.status === 'RESCHEDULE_PROPOSED') return done({ ...current, status: 'CONFIRMED', awaitingMe: false, openProposals: [] });
        return done({ ...current, status: 'DECLINED', awaitingMe: false, openProposals: [] });
      }
      const proposals = (input.proposedStarts ?? []).map((st) => ({ slot: slotsFor(current.durationMinutes).find((x) => x.startAt === st) ?? slot(DAY1, 10, 0), kind: 'ALTERNATIVE' as const, proposedByMe: true }));
      return done({ ...current, status: 'ALT_PROPOSED', awaitingMe: false, openProposals: proposals });
    },
    async cancel() {
      record('cancel', current.meetingId);
      await new Promise((r) => setTimeout(r, 60));
      return done({ ...current, status: 'CANCELLED', awaitingMe: false, cancelledBy: 'ME', cancelReason: 'BY_PARTICIPANT', openProposals: [] });
    },
    async proposeReschedule(_id, starts) {
      record('proposeReschedule', starts);
      await new Promise((r) => setTimeout(r, 60));
      const proposals = starts.map((st) => ({ slot: slotsFor(current.durationMinutes).find((x) => x.startAt === st) ?? slot(DAY2, 10, 0), kind: 'RESCHEDULE' as const, proposedByMe: true }));
      return done({ ...current, status: 'RESCHEDULE_PROPOSED', awaitingMe: false, previousSlot: current.slot, openProposals: proposals });
    },
  };
}
