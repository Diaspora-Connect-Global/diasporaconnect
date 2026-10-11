'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import type { DocumentNode } from 'graphql';
import { toast } from 'sonner';
import {
  GET_EVENT_PAGE,
} from '@/services/gql/eventsM2';
import {
  NETWORKING_CONTEXT,
  NETWORKING_MUTATION,
  NETWORKING_DECIDE,
  NETWORKING_EXPRESS_INTEREST,
  type NetworkingCard,
  type NetworkingDecision,
  NETWORKING_MY_PARTICIPATION,
  NETWORKING_RECORD_AI_CONSENT,
  NETWORKING_STATUS,
  NETWORKING_SUGGEST_PROFILE,
  NETWORKING_TAXONOMY,
  type AiSuggestion,
  type MyParticipation,
  type NetworkingStatus,
  type TaxonomyItem,
} from '@/services/gql/networking';
import { makeLabeler, type LabelFn } from '@/lib/networkingTaxonomy';
import { suggestOffline } from '@/lib/networkingSuggest';
import { hasFailure, networkingRefusal, type NetworkingRefusal } from '@/lib/networkingRefusal';
import { gateState, type GateState } from '@/lib/networkingGate';
import type { EventPageEvent } from '@/services/gql/eventsM2';
import type { NetworkingEventContext } from './NetworkingShell';
import type { SuggestFn, SuggestKind } from './draft';

const PREFIX_BY_KIND: Record<SuggestKind, string[]> = {
  NEEDS: ['capability.'],
  OFFERS: ['capability.'],
  INTERESTS: ['interest.'],
  ROLES: ['role.'],
  MARKETS: ['market.'],
};

export function eventVenueLabel(e: EventPageEvent | null | undefined): string | null {
  const l = e?.locationDetails;
  if (!l) return null;
  const parts = [l.venueName, l.city, l.country].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

/** Everything every networking page needs: event context, standing, my profile, vocabulary. */
export function useNetworkingBase(eventId: string) {
  const locale = useLocale();
  const t = useTranslations('networking');
  const event = useQuery<{ getEvent: EventPageEvent | null }>(GET_EVENT_PAGE, { variables: { id: eventId }, skip: !eventId });
  const status = useQuery<{ eventNetworkingStatus: NetworkingStatus | null }>(NETWORKING_STATUS, { variables: { eventId }, skip: !eventId, ...NETWORKING_CONTEXT });
  const mineQ = useQuery<{ eventNetworkingMyParticipation: MyParticipation | null }>(NETWORKING_MY_PARTICIPATION, { variables: { eventId }, skip: !eventId, ...NETWORKING_CONTEXT });
  const tax = useQuery<{ eventNetworkingTaxonomy: TaxonomyItem[] | null }>(NETWORKING_TAXONOMY, { variables: { eventId }, skip: !eventId, ...NETWORKING_CONTEXT });

  const labelOf: LabelFn = useMemo(() => makeLabeler(t as unknown as Parameters<typeof makeLabeler>[0], locale), [t, locale]);
  const e = event.data?.getEvent ?? null;
  const context: NetworkingEventContext = {
    id: eventId,
    title: e?.title ?? '',
    startAt: e?.startAt ?? null,
    endAt: e?.endAt ?? null,
    timezone: e?.timezone ?? null,
    venue: eventVenueLabel(e),
  };

  const refusal: NetworkingRefusal | null = hasFailure(status) ? networkingRefusal(status) : hasFailure(mineQ) && !mineQ.data?.eventNetworkingMyParticipation ? networkingRefusal(mineQ) : null;
  const loading = status.loading || mineQ.loading;
  const mine = mineQ.data?.eventNetworkingMyParticipation ?? null;
  const gate: GateState = gateState({ loading, refusalKind: refusal?.kind ?? null, status: status.data?.eventNetworkingStatus ?? null, mine });

  return {
    context,
    event: e,
    eventLoading: event.loading,
    mine,
    me: mine?.participation?.profile?.fields ?? null,
    taxonomy: tax.data?.eventNetworkingTaxonomy ?? [],
    labelOf,
    gate,
    refusal,
    loading,
    refetchMine: mineQ.refetch,
  };
}

export type NetworkingBase = ReturnType<typeof useNetworkingBase>;

/** Suggestions: AI when the person opted in (and it answers), the offline keyword suggester otherwise. */
export function useSuggest(eventId: string, taxonomy: TaxonomyItem[], aiConsent: boolean): { suggest: SuggestFn; enableAi: () => Promise<boolean>; ready: boolean } {
  const locale = useLocale();
  const [run] = useMutation<{ eventNetworkingSuggestProfile: AiSuggestion | null }>(NETWORKING_SUGGEST_PROFILE, NETWORKING_MUTATION);
  const [consent] = useMutation(NETWORKING_RECORD_AI_CONSENT, NETWORKING_MUTATION);

  const suggest: SuggestFn = useCallback(
    async (kind, text) => {
      const known = new Set(taxonomy.map((i) => i.code));
      if (aiConsent) {
        try {
          const res = await run({ variables: { eventId, text: text.slice(0, 500), kind, locale } });
          const s = res.data?.eventNetworkingSuggestProfile;
          if (!hasFailure(res) && s?.available && s.suggestedCodes.length > 0) {
            return { codes: s.suggestedCodes.filter((c) => known.has(c)), source: 'ai' as const };
          }
        } catch {
          /* fall back to the offline suggester */
        }
      }
      return { codes: suggestOffline(text, taxonomy, PREFIX_BY_KIND[kind]), source: 'offline' as const };
    },
    [aiConsent, eventId, locale, run, taxonomy],
  );

  const enableAi = useCallback(async () => {
    const res = await consent({ variables: { eventId, consent: true } });
    return !hasFailure(res);
  }, [consent, eventId]);

  return { suggest, enableAi, ready: true };
}

/* ------------------------------------------------------------------ */
/* Paged card lists (deck, review later, directory, interest lists)    */
/* ------------------------------------------------------------------ */


interface PageShape { cards?: NetworkingCard[] | null; nextCursor?: string | null; reviewingSkipped?: boolean; refreshing?: boolean }

export interface PagedCards {
  cards: NetworkingCard[];
  loading: boolean;
  hasMore: boolean;
  refusal: NetworkingRefusal | null;
  reviewingSkipped: boolean;
  refreshing: boolean;
  loaded: boolean;
  loadMore: () => void;
  reload: () => void;
  remove: (handle: string) => void;
}

/**
 * Cursor-paged list of cards. `enabled=false` never touches the network (this is
 * how a hidden tab or an unreleased feature stays silent). Always `no-cache`.
 */
export function usePagedCards(doc: DocumentNode, rootField: string, baseVars: Record<string, unknown>, enabled: boolean, limit = 12): PagedCards {
  const client = useApolloClient();
  const [cards, setCards] = useState<NetworkingCard[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [more, setMore] = useState(false);
  const [refusal, setRefusal] = useState<NetworkingRefusal | null>(null);
  const [meta, setMeta] = useState({ reviewingSkipped: false, refreshing: false });
  const ticket = useRef(0);
  const inflight = useRef(false);
  const varsKey = JSON.stringify(baseVars);

  const fetchPage = useCallback(
    async (after: string | null, reset: boolean) => {
      if (inflight.current && !reset) return;
      inflight.current = true;
      const mine = ++ticket.current;
      setLoading(true);
      try {
        const res = await client.query<Record<string, PageShape | null>>({
          query: doc,
          variables: { ...JSON.parse(varsKey), cursor: after, limit },
          ...NETWORKING_CONTEXT,
        });
        if (mine !== ticket.current) return;
        const page = res.data?.[rootField] ?? null;
        if (hasFailure(res) || !page) {
          setRefusal(networkingRefusal(res));
          setMore(false);
          return;
        }
        setRefusal(null);
        const incoming = Array.isArray(page.cards) ? page.cards.filter((c): c is NetworkingCard => Boolean(c?.handle)) : [];
        setCards((prev) => {
          const base = reset ? [] : prev;
          const seen = new Set(base.map((c) => c.handle));
          return [...base, ...incoming.filter((c) => !seen.has(c.handle))];
        });
        setCursor(page.nextCursor ?? null);
        setMore(Boolean(page.nextCursor));
        setMeta({ reviewingSkipped: Boolean(page.reviewingSkipped), refreshing: Boolean(page.refreshing) });
      } catch (err) {
        if (mine === ticket.current) { setRefusal(networkingRefusal(err)); setMore(false); }
      } finally {
        if (mine === ticket.current) { setLoading(false); setLoaded(true); }
        inflight.current = false;
      }
    },
    [client, doc, limit, rootField, varsKey],
  );

  useEffect(() => {
    if (!enabled) return;
    setCards([]);
    setCursor(null);
    setLoaded(false);
    void fetchPage(null, true);
  }, [enabled, fetchPage]);

  return {
    cards,
    loading,
    loaded,
    hasMore: more,
    refusal,
    reviewingSkipped: meta.reviewingSkipped,
    refreshing: meta.refreshing,
    loadMore: () => { if (more && !loading) void fetchPage(cursor, false); },
    reload: () => { setCards([]); void fetchPage(null, true); },
    remove: (handle) => setCards((c) => c.filter((x) => x.handle !== handle)),
  };
}

/** Tell the person why a networking write did not happen. The dark-launch refusal is information, not an error. */
export function useReportRefusal() {
  const t = useTranslations('networking.errors');
  return useCallback(
    (source: unknown) => {
      const r = networkingRefusal(source);
      if (r.kind === 'unavailableYet') toast.info(t(r.key));
      else toast.error(t(r.key));
    },
    [t],
  );
}

export function useDecide(eventId: string) {
  const [run] = useMutation(NETWORKING_DECIDE, NETWORKING_MUTATION);
  const report = useReportRefusal();
  return useCallback(
    async (handle: string, decision: NetworkingDecision): Promise<boolean> => {
      try {
        const res = await run({ variables: { eventId, handle, decision } });
        if (hasFailure(res) || !(res.data as { eventNetworkingDecide?: unknown } | null | undefined)?.eventNetworkingDecide) {
          report(res);
          return false;
        }
        return true;
      } catch (err) {
        report(err);
        return false;
      }
    },
    [eventId, report, run],
  );
}

/** Only used while `INTERESTS_UI_ENABLED`; the operation does not exist on the gateway before that. */
export function useExpressInterest(eventId: string) {
  const [run] = useMutation(NETWORKING_EXPRESS_INTEREST, NETWORKING_MUTATION);
  const report = useReportRefusal();
  return useCallback(
    async (handle: string): Promise<boolean> => {
      try {
        const res = await run({ variables: { eventId, handle } });
        if (hasFailure(res)) { report(res); return false; }
        return true;
      } catch (err) {
        report(err);
        return false;
      }
    },
    [eventId, report, run],
  );
}
