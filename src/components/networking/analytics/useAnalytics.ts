'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import {
  NETWORKING_ANALYTICS,
  NETWORKING_ANALYTICS_OPTIONS,
  filtersToVariables,
  type AnalyticsFilterOptions,
  type AnalyticsFilters,
  type NetworkingAnalytics,
} from '@/services/gql/networkingAnalytics';
import { NETWORKING_CONTEXT } from '@/services/gql/networking';
import { hasFailure, networkingRefusal } from '@/lib/networkingRefusal';

export interface AnalyticsFailure {
  ok: false;
  code: string;
  /** Key under `networking.errors`. Never the server's text. */
  key: string;
}
export type AnalyticsOutcome = { ok: true; data: NetworkingAnalytics } | AnalyticsFailure;
export type OptionsOutcome = { ok: true; data: AnalyticsFilterOptions } | AnalyticsFailure;

const failure = (source: unknown): AnalyticsFailure => {
  const r = networkingRefusal(source);
  return { ok: false, code: r.code, key: r.key };
};

/**
 * Everything the analytics screen asks of the backend. The real implementation is
 * `useAnalyticsApi`; the dev harness passes a fixture-backed one.
 */
export interface AnalyticsApi {
  load(filters: AnalyticsFilters): Promise<AnalyticsOutcome>;
  options(): Promise<OptionsOutcome>;
}

export function useAnalyticsApi(eventId: string): AnalyticsApi {
  const client = useApolloClient();
  return useMemo<AnalyticsApi>(
    () => ({
      async load(filters) {
        try {
          const res = await client.query<{ eventNetworkingAnalytics: NetworkingAnalytics | null }>({
            query: NETWORKING_ANALYTICS,
            variables: { eventId, filters: filtersToVariables(filters) },
            ...NETWORKING_CONTEXT,
          });
          const data = res.data?.eventNetworkingAnalytics ?? null;
          if (hasFailure(res) || !data) return failure(res);
          return { ok: true, data };
        } catch (err) {
          return failure(err);
        }
      },
      async options() {
        try {
          const res = await client.query<{ eventNetworkingAnalyticsFilterOptions: AnalyticsFilterOptions | null }>({
            query: NETWORKING_ANALYTICS_OPTIONS,
            variables: { eventId },
            ...NETWORKING_CONTEXT,
          });
          const data = res.data?.eventNetworkingAnalyticsFilterOptions ?? null;
          if (hasFailure(res) || !data) return failure(res);
          return { ok: true, data };
        } catch (err) {
          return failure(err);
        }
      },
    }),
    [client, eventId],
  );
}

/** One query per distinct filter set; a stale answer (an older filter) is dropped. No polling. */
export function useAnalyticsData(api: AnalyticsApi, filters: AnalyticsFilters) {
  const [data, setData] = useState<NetworkingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [failureKey, setFailureKey] = useState<string | null>(null);
  const ticket = useRef(0);
  const key = JSON.stringify(filtersToVariables(filters));

  const run = useCallback(() => {
    const mine = ++ticket.current;
    setLoading(true);
    api.load(JSON.parse(key) as AnalyticsFilters).then((r) => {
      if (mine !== ticket.current) return;
      if (r.ok) {
        setData(r.data);
        setFailureKey(null);
      } else {
        setFailureKey(r.key);
      }
      setLoading(false);
    });
  }, [api, key]);

  useEffect(() => {
    run();
    return () => {
      ticket.current += 1;
    };
  }, [run]);

  return { data, loading, failureKey, reload: run };
}

export function useFilterOptions(api: AnalyticsApi): AnalyticsFilterOptions {
  const [options, setOptions] = useState<AnalyticsFilterOptions>({ circles: [], industries: [] });
  useEffect(() => {
    let live = true;
    api.options().then((r) => {
      if (live && r.ok) setOptions({ circles: r.data.circles ?? [], industries: r.data.industries ?? [] });
    });
    return () => {
      live = false;
    };
  }, [api]);
  return options;
}
