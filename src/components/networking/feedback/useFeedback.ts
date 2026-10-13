'use client';

import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client/react';
import {
  FEEDBACK_MINE,
  FEEDBACK_SUBMIT_CIRCLE,
  FEEDBACK_SUBMIT_MEETING,
  eventDayFailure,
  type EventDayFailure,
  type FeedbackInput,
  type FeedbackSubjectType,
  type MyFeedback,
} from '@/services/gql/networkingEventDay';
import { NETWORKING_CONNECT, NETWORKING_CONTEXT, type ConnectResult } from '@/services/gql/networking';
import { hasFailure } from '@/lib/networkingRefusal';

/** What a feedback sheet is about. `id` is only ever sent back to the gateway, never shown. */
export interface FeedbackSubject {
  type: FeedbackSubjectType;
  id: string;
  /** The other person's name (meeting) or the circle's title. */
  title: string;
  /** Meetings: the other person, so "Stay connected" can send the existing Connect. */
  counterpartHandle?: string | null;
  startAt?: string | null;
  timezone?: string | null;
}

export type MineOutcome = { ok: true; feedback: MyFeedback | null } | EventDayFailure;
export type SubmitOutcome = { ok: true; feedback: MyFeedback } | EventDayFailure;
export type ConnectOutcome = { ok: true; preExisting: boolean } | EventDayFailure;

/**
 * Everything the feedback sheets and the recap do against the backend. The real
 * implementation is `useFeedbackApi`; the dev harness passes a fixture-backed one.
 */
export interface FeedbackApi {
  mine(subject: FeedbackSubject): Promise<MineOutcome>;
  submit(subject: FeedbackSubject, input: FeedbackInput): Promise<SubmitOutcome>;
  /** The EXISTING Connect (`eventNetworkingConnect`); feedback never connects anyone by itself. */
  connect(handle: string): Promise<ConnectOutcome>;
}

export function useFeedbackApi(eventId: string): FeedbackApi {
  const client = useApolloClient();
  return useMemo<FeedbackApi>(
    () => ({
      async mine(subject) {
        try {
          const res = await client.query<{ eventNetworkingMyFeedback: MyFeedback | null }>({
            query: FEEDBACK_MINE,
            variables: { eventId, subjectType: subject.type, subjectId: subject.id },
            ...NETWORKING_CONTEXT,
          });
          // A missing answer is `null` without errors; only real errors fail.
          if (hasFailure(res)) return eventDayFailure(res);
          return { ok: true, feedback: res.data?.eventNetworkingMyFeedback ?? null };
        } catch (err) {
          return eventDayFailure(err);
        }
      },
      async submit(subject, input) {
        const meeting = subject.type === 'MEETING';
        try {
          const res = await client.mutate<Record<string, MyFeedback | null>>({
            mutation: meeting ? FEEDBACK_SUBMIT_MEETING : FEEDBACK_SUBMIT_CIRCLE,
            variables: meeting ? { eventId, meetingId: subject.id, input } : { eventId, circleId: subject.id, input },
            ...NETWORKING_CONTEXT,
          });
          const feedback = res.data?.[meeting ? 'eventNetworkingSubmitMeetingFeedback' : 'eventNetworkingSubmitCircleFeedback'] ?? null;
          if (hasFailure(res) || !feedback) return eventDayFailure(res);
          return { ok: true, feedback };
        } catch (err) {
          return eventDayFailure(err);
        }
      },
      async connect(handle) {
        try {
          const res = await client.mutate<{ eventNetworkingConnect: ConnectResult | null }>({ mutation: NETWORKING_CONNECT, variables: { eventId, handle }, ...NETWORKING_CONTEXT });
          const r = res.data?.eventNetworkingConnect ?? null;
          if (hasFailure(res) || !r?.success) return eventDayFailure(res);
          return { ok: true, preExisting: Boolean(r.preExisting) };
        } catch (err) {
          return eventDayFailure(err);
        }
      },
    }),
    [client, eventId],
  );
}
