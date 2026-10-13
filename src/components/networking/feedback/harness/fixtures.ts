/**
 * Fixtures and a fixture-backed FeedbackApi for the dev-harness pages ONLY
 * (`/dev-harness/networking/feedback`, `/dev-harness/networking/recap`). Never imported by a
 * real route. The people are invented; the "backend" keeps answers in memory.
 */
import type { FeedbackApi, FeedbackSubject } from '../useFeedback';
import { USEFULNESS_VALUES, type FeedbackInput, type MyFeedback, type Recap } from '@/services/gql/networkingEventDay';

export const TZ = 'Africa/Accra';
export const MEETING_SUBJECT: FeedbackSubject = {
  type: 'MEETING', id: 'm-fixture-1', title: 'David Owusu', counterpartHandle: 'h-david-71c', startAt: '2030-11-20T10:00:00.000Z', timezone: TZ,
};
export const CIRCLE_SUBJECT: FeedbackSubject = {
  type: 'CIRCLE', id: 'c-fixture-1', title: 'Investing in African Startups', startAt: '2030-11-20T14:00:00.000Z', timezone: TZ,
};

export type FeedbackScenario = 'empty' | 'submitted' | 'closed';
export function parseFeedbackScenario(raw: string | null): FeedbackScenario {
  return raw === 'submitted' || raw === 'closed' ? raw : 'empty';
}

const answered = (type: MyFeedback['subjectType'], editable: boolean): MyFeedback => ({
  subjectType: type,
  attendance: type === 'MEETING' ? 'MET' : 'ATTENDED',
  usefulness: 4,
  outcomes: ['EXCHANGED_CONTACTS', 'POTENTIAL_COLLABORATION'],
  comment: type === 'MEETING' ? 'Good conversation about seed-stage fintech.' : 'Useful circle, I met two relevant people.',
  submittedAt: '2030-11-20T16:00:00.000Z',
  updatedAt: null,
  editableUntil: '2030-11-27T17:00:00.000Z',
  editable,
});

export function fakeFeedbackApi(o: { scenario: FeedbackScenario; onCall?: (call: { name: string; input: unknown }) => void; connectExisting?: boolean }): FeedbackApi {
  const stored = new Map<string, MyFeedback>();
  if (o.scenario !== 'empty') {
    stored.set('MEETING', answered('MEETING', o.scenario === 'submitted'));
    stored.set('CIRCLE', answered('CIRCLE', o.scenario === 'submitted'));
  }
  const log = (name: string, input: unknown) => o.onCall?.({ name, input });
  return {
    async mine(subject) {
      return { ok: true, feedback: stored.get(subject.type) ?? null };
    },
    async submit(subject, input: FeedbackInput) {
      log('submit', { type: subject.type, ...input });
      if (o.scenario === 'closed') return { ok: false, code: 'EVENT_NETWORKING_FEEDBACK_CLOSED', key: 'feedbackClosed' };
      if (input.usefulness != null && !(USEFULNESS_VALUES as readonly number[]).includes(input.usefulness)) return { ok: false, code: 'EVENT_NETWORKING_INVALID_ARGUMENT', key: 'invalid' };
      const prev = stored.get(subject.type);
      const next: MyFeedback = {
        subjectType: subject.type,
        attendance: input.attendance,
        usefulness: input.usefulness ?? null,
        outcomes: input.outcomes ?? [],
        comment: input.comment ?? null,
        submittedAt: prev?.submittedAt ?? '2030-11-20T16:30:00.000Z',
        updatedAt: prev ? '2030-11-20T17:00:00.000Z' : null,
        editableUntil: '2030-11-27T17:00:00.000Z',
        editable: true,
      };
      stored.set(subject.type, next);
      return { ok: true, feedback: next };
    },
    async connect(handle) {
      log('connect', { handle });
      return { ok: true, preExisting: Boolean(o.connectExisting) };
    },
  };
}

export type RecapScenario = 'default' | 'empty' | 'member' | 'pending' | 'closed' | 'caught-up' | 'many';
export function parseRecapScenario(raw: string | null): RecapScenario {
  return (['empty', 'member', 'pending', 'closed', 'caught-up', 'many'] as string[]).includes(raw ?? '') ? (raw as RecapScenario) : 'default';
}

export function recapFixture(s: RecapScenario): Recap {
  const pending: Recap['pendingFeedback'] = [
    { subjectType: 'MEETING', subjectId: 'm-fixture-1', title: 'David Owusu', counterpart: { handle: 'h-david-71c', displayName: 'David Owusu', avatarUrl: null, username: 'davidowusu' }, startAt: '2030-11-20T10:00:00.000Z', endAt: '2030-11-20T10:30:00.000Z', feedbackClosesAt: '2030-11-27T17:00:00.000Z' },
    { subjectType: 'CIRCLE', subjectId: 'c-fixture-1', title: 'Investing in African Startups', counterpart: null, startAt: '2030-11-20T14:00:00.000Z', endAt: '2030-11-20T15:00:00.000Z', feedbackClosesAt: '2030-11-27T17:00:00.000Z' },
  ];
  const base: Recap = {
    matchesCount: 7,
    meetingsHeldCount: 3,
    circlesJoinedCount: 2,
    pendingFeedback: pending,
    pendingFeedbackTotal: 2,
    organiser: { kind: 'COMMUNITY', entityId: 'org-fixture', name: 'Diaspora Business Network', membership: 'NOT_MEMBER' },
    networkingEndsAt: '2030-12-05T17:00:00.000Z',
    networkingOpen: true,
    timezone: TZ,
  };
  switch (s) {
    case 'empty': return { ...base, matchesCount: 0, meetingsHeldCount: 0, circlesJoinedCount: 0, pendingFeedback: [], pendingFeedbackTotal: 0 };
    case 'member': return { ...base, organiser: { ...base.organiser!, membership: 'MEMBER' } };
    case 'pending': return { ...base, organiser: { ...base.organiser!, membership: 'PENDING' } };
    case 'closed': return { ...base, networkingOpen: false };
    case 'caught-up': return { ...base, pendingFeedback: [], pendingFeedbackTotal: 0 };
    case 'many': return { ...base, pendingFeedbackTotal: 27 };
    default: return base;
  }
}
