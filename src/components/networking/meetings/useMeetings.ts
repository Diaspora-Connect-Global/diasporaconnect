'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import {
  MEETING_CANCEL,
  MEETING_MY_MEETINGS,
  MEETING_MY_SCHEDULE,
  MEETING_PROPOSE_RESCHEDULE,
  MEETING_REQUEST,
  MEETING_RESPOND,
  MEETING_SETTINGS,
  MEETING_SUGGEST_SLOTS,
  MEETING_UPDATE_SETTINGS,
  type Meeting,
  type MeetingCounts,
  type MeetingFilter,
  type MeetingPage,
  type MeetingRequestInput,
  type MeetingRespondInput,
  type MeetingSchedule,
  type MeetingSettings,
  type MeetingSettingsInput,
  type MeetingSlotSuggestions,
} from '@/services/gql/networkingMeetings';
import { NETWORKING_CONTEXT, NETWORKING_MUTATION } from '@/services/gql/networking';
import { hasFailure, networkingRefusal } from '@/lib/networkingRefusal';

/** A failed meeting operation: the stable code and the `networking.errors` key to show. Never the server's text. */
export interface MeetingFailure {
  ok: false;
  code: string;
  key: string;
}
export type MeetingOutcome = { ok: true; meeting: Meeting } | MeetingFailure;
export type SuggestOutcome = { ok: true; data: MeetingSlotSuggestions } | MeetingFailure;

const failure = (source: unknown): MeetingFailure => {
  const r = networkingRefusal(source);
  return { ok: false, code: r.code, key: r.key };
};

/**
 * Everything the meeting screens do against the backend, as one object. The real
 * implementation is `useMeetingsApi`; the dev harness passes a fixture-backed one,
 * so the same components render in both places.
 */
export interface MeetingsApi {
  suggest(handle: string, durationMinutes: number, meetingPointId?: string | null): Promise<SuggestOutcome>;
  request(input: Omit<MeetingRequestInput, 'eventId'>): Promise<MeetingOutcome>;
  respond(input: Omit<MeetingRespondInput, 'eventId'>): Promise<MeetingOutcome>;
  cancel(meetingId: string): Promise<MeetingOutcome>;
  proposeReschedule(meetingId: string, proposedStarts: string[]): Promise<MeetingOutcome>;
}

export function useMeetingsApi(eventId: string): MeetingsApi {
  const client = useApolloClient();
  const [request] = useMutation<{ eventNetworkingRequestMeeting: Meeting | null }>(MEETING_REQUEST, NETWORKING_MUTATION);
  const [respond] = useMutation<{ eventNetworkingRespondToMeeting: Meeting | null }>(MEETING_RESPOND, NETWORKING_MUTATION);
  const [cancel] = useMutation<{ eventNetworkingCancelMeeting: Meeting | null }>(MEETING_CANCEL, NETWORKING_MUTATION);
  const [reschedule] = useMutation<{ eventNetworkingProposeReschedule: Meeting | null }>(MEETING_PROPOSE_RESCHEDULE, NETWORKING_MUTATION);

  return useMemo<MeetingsApi>(() => {
    const settle = (res: { data?: unknown }, field: string): MeetingOutcome => {
      const meeting = (res.data as Record<string, Meeting | null> | null | undefined)?.[field] ?? null;
      // errorPolicy 'all' resolves a refusal with data:null plus errors: check both.
      if (hasFailure(res) || !meeting) return failure(res);
      return { ok: true, meeting };
    };
    const guard = async (run: () => Promise<MeetingOutcome>): Promise<MeetingOutcome> => {
      try {
        return await run();
      } catch (err) {
        return failure(err);
      }
    };
    return {
      async suggest(handle, durationMinutes, meetingPointId) {
        try {
          const res = await client.query<{ eventNetworkingSuggestMeetingSlots: MeetingSlotSuggestions | null }>({
            query: MEETING_SUGGEST_SLOTS,
            variables: { eventId, handle, durationMinutes, meetingPointId: meetingPointId || undefined, limit: 60 },
            ...NETWORKING_CONTEXT,
          });
          const data = res.data?.eventNetworkingSuggestMeetingSlots ?? null;
          if (hasFailure(res) || !data) return failure(res);
          return { ok: true, data };
        } catch (err) {
          return failure(err);
        }
      },
      request: (input) => guard(async () => settle(await request({ variables: { input: { ...input, eventId } } }), 'eventNetworkingRequestMeeting')),
      respond: (input) => guard(async () => settle(await respond({ variables: { input: { ...input, eventId } } }), 'eventNetworkingRespondToMeeting')),
      cancel: (meetingId) => guard(async () => settle(await cancel({ variables: { eventId, meetingId } }), 'eventNetworkingCancelMeeting')),
      proposeReschedule: (meetingId, proposedStarts) => guard(async () => settle(await reschedule({ variables: { eventId, meetingId, proposedStarts } }), 'eventNetworkingProposeReschedule')),
    };
  }, [cancel, client, eventId, request, reschedule, respond]);
}

export interface PagedMeetings {
  meetings: Meeting[];
  counts: MeetingCounts | null;
  loading: boolean;
  loaded: boolean;
  hasMore: boolean;
  failureKey: string | null;
  loadMore: () => void;
  reload: () => void;
}

/** One Meetings tab, cursor-paged. Runs only while `enabled`; changing the filter starts over. */
export function useMyMeetings(eventId: string, filter: MeetingFilter, enabled: boolean, limit = 12): PagedMeetings {
  const client = useApolloClient();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [counts, setCounts] = useState<MeetingCounts | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failureKey, setFailureKey] = useState<string | null>(null);
  const ticket = useRef(0);
  const inflight = useRef(false);

  const fetchPage = useCallback(
    async (after: string | null, reset: boolean) => {
      if (inflight.current && !reset) return;
      inflight.current = true;
      const mine = ++ticket.current;
      setLoading(true);
      try {
        const res = await client.query<{ eventNetworkingMyMeetings: MeetingPage | null }>({
          query: MEETING_MY_MEETINGS,
          variables: { eventId, filter, cursor: after, limit },
          ...NETWORKING_CONTEXT,
        });
        if (mine !== ticket.current) return;
        const page = res.data?.eventNetworkingMyMeetings ?? null;
        if (hasFailure(res) || !page) {
          setFailureKey(networkingRefusal(res).key);
          setMore(false);
          return;
        }
        setFailureKey(null);
        const incoming = (Array.isArray(page.meetings) ? page.meetings : []).filter((m) => Boolean(m?.meetingId));
        setMeetings((prev) => {
          const base = reset ? [] : prev;
          const seen = new Set(base.map((m) => m.meetingId));
          return [...base, ...incoming.filter((m) => !seen.has(m.meetingId))];
        });
        if (page.counts) setCounts(page.counts);
        setCursor(page.nextCursor ?? null);
        setMore(Boolean(page.nextCursor));
      } catch (err) {
        if (mine === ticket.current) {
          setFailureKey(networkingRefusal(err).key);
          setMore(false);
        }
      } finally {
        if (mine === ticket.current) {
          setLoading(false);
          setLoaded(true);
        }
        inflight.current = false;
      }
    },
    [client, eventId, filter, limit],
  );

  useEffect(() => {
    if (!enabled) return;
    setMeetings([]);
    setCursor(null);
    setLoaded(false);
    void fetchPage(null, true);
  }, [enabled, fetchPage]);

  return {
    meetings,
    counts,
    loading,
    loaded,
    hasMore: more,
    failureKey,
    loadMore: () => { if (more && !loading) void fetchPage(cursor, false); },
    reload: () => void fetchPage(null, true),
  };
}

export function useMySchedule(eventId: string, enabled: boolean) {
  const q = useQuery<{ eventNetworkingMySchedule: MeetingSchedule | null }>(MEETING_MY_SCHEDULE, { variables: { eventId }, skip: !enabled || !eventId, ...NETWORKING_CONTEXT });
  const schedule = q.data?.eventNetworkingMySchedule ?? null;
  const failureKey = hasFailure(q) && !schedule ? networkingRefusal(q).key : null;
  return { schedule, loading: q.loading, failureKey, reload: () => void q.refetch() };
}

/** Organiser settings + save. `save` resolves the fresh settings or the failure to show. */
export function useMeetingSettings(eventId: string, enabled: boolean) {
  const q = useQuery<{ eventNetworkingMeetingSettings: MeetingSettings | null }>(MEETING_SETTINGS, { variables: { eventId }, skip: !enabled || !eventId, ...NETWORKING_CONTEXT });
  const [update] = useMutation<{ eventNetworkingUpdateMeetingSettings: MeetingSettings | null }>(MEETING_UPDATE_SETTINGS, NETWORKING_MUTATION);
  const settings = q.data?.eventNetworkingMeetingSettings ?? null;
  const failureKey = hasFailure(q) && !settings ? networkingRefusal(q).key : null;
  const save = useCallback(
    async (input: Omit<MeetingSettingsInput, 'eventId'>): Promise<{ ok: true; settings: MeetingSettings } | MeetingFailure> => {
      try {
        const res = await update({ variables: { input: { ...input, eventId } } });
        const next = res.data?.eventNetworkingUpdateMeetingSettings ?? null;
        if (hasFailure(res) || !next) return failure(res);
        await q.refetch();
        return { ok: true, settings: next };
      } catch (err) {
        return failure(err);
      }
    },
    [eventId, q, update],
  );
  return { settings, loading: q.loading, failureKey, save };
}
