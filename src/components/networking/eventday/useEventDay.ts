'use client';

import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client/react';
import {
  EVENT_DAY_ARRIVED,
  EVENT_DAY_CANT_FIND,
  EVENT_DAY_SHARE,
  EVENT_DAY_STATE,
  EVENT_DAY_STOP,
  eventDayFailure,
  type EventDayFailure,
  type EventDayState,
} from '@/services/gql/networkingEventDay';
import { NETWORKING_CONTEXT } from '@/services/gql/networking';
import { hasFailure } from '@/lib/networkingRefusal';
import type { Position } from './locate';

export type EventDayOutcome = { ok: true; state: EventDayState } | EventDayFailure;

/**
 * Everything the event-day card does against the backend. The real implementation is
 * `useEventDayApi`; the dev harness passes a fixture-backed one so the same component
 * renders in both places.
 */
export interface EventDayApi {
  state(meetingId: string): Promise<EventDayOutcome>;
  arrived(meetingId: string): Promise<EventDayOutcome>;
  cantFind(meetingId: string): Promise<EventDayOutcome>;
  share(meetingId: string, position: Position): Promise<EventDayOutcome>;
  stop(meetingId: string): Promise<EventDayOutcome>;
}

export function useEventDayApi(eventId: string): EventDayApi {
  const client = useApolloClient();
  return useMemo<EventDayApi>(() => {
    const settle = (res: { data?: unknown }, field: string): EventDayOutcome => {
      const state = (res.data as Record<string, EventDayState | null> | null | undefined)?.[field] ?? null;
      // errorPolicy 'all' resolves a refusal with data:null plus errors: check both.
      if (hasFailure(res) || !state) return eventDayFailure(res);
      return { ok: true, state };
    };
    const mutate = async (mutation: typeof EVENT_DAY_ARRIVED, field: string, variables: Record<string, unknown>): Promise<EventDayOutcome> => {
      try {
        return settle(await client.mutate({ mutation, variables, ...NETWORKING_CONTEXT }), field);
      } catch (err) {
        return eventDayFailure(err);
      }
    };
    return {
      async state(meetingId) {
        try {
          const res = await client.query({ query: EVENT_DAY_STATE, variables: { eventId, meetingId }, ...NETWORKING_CONTEXT });
          return settle(res, 'eventNetworkingMeetingEventDay');
        } catch (err) {
          return eventDayFailure(err);
        }
      },
      arrived: (meetingId) => mutate(EVENT_DAY_ARRIVED, 'eventNetworkingMarkArrived', { eventId, meetingId }),
      cantFind: (meetingId) => mutate(EVENT_DAY_CANT_FIND, 'eventNetworkingCantFindYou', { eventId, meetingId }),
      share: (meetingId, p) =>
        mutate(EVENT_DAY_SHARE, 'eventNetworkingShareLocation', { eventId, meetingId, input: { latitude: p.latitude, longitude: p.longitude, accuracyMeters: p.accuracyMeters } }),
      stop: (meetingId) => mutate(EVENT_DAY_STOP, 'eventNetworkingStopSharingLocation', { eventId, meetingId }),
    };
  }, [client, eventId]);
}
