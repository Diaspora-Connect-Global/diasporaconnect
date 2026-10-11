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
  NETWORKING_RESPOND_TO_INTEREST,
  NETWORKING_WITHDRAW_INTEREST,
  NETWORKING_CONNECT,
  NETWORKING_BLOCK,
  NETWORKING_REPORT,
  NETWORKING_MY_INTERESTS,
  NETWORKING_MY_MATCHES,
  REPORT_DETAILS_MAX,
  type ConnectResult,
  type ExpressInterestResult,
  type InterestEntry,
  type InterestSource,
  type MatchEntry,
  type ReportReason,
  type ReportResult,
  type RespondResult,
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


interface PageShape { cards?: NetworkingCard[] | null; nextCursor?: string | null; reviewingSkipped?: boolean; refreshing?: boolean; [k: string]: unknown }

export interface Paged<T extends { handle: string }> {
  items: T[];
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

export interface PagedCards extends Omit<Paged<NetworkingCard>, 'items'> {
  cards: NetworkingCard[];
}

/**
 * Cursor-paged list. `enabled=false` never touches the network (this is how a
 * hidden tab or an unreleased feature stays silent). Always `no-cache`.
 * `pick` turns one page into its items; every item is keyed by `handle`.
 */
export function usePagedItems<T extends { handle: string }>(
  doc: DocumentNode,
  rootField: string,
  baseVars: Record<string, unknown>,
  enabled: boolean,
  pick: (page: PageShape) => T[],
  limit = 12,
): Paged<T> {
  const client = useApolloClient();
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [more, setMore] = useState(false);
  const [refusal, setRefusal] = useState<NetworkingRefusal | null>(null);
  const [meta, setMeta] = useState({ reviewingSkipped: false, refreshing: false });
  const ticket = useRef(0);
  const inflight = useRef(false);
  const varsKey = JSON.stringify(baseVars);
  const pickRef = useRef(pick);
  pickRef.current = pick;

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
        const incoming = pickRef.current(page).filter((c) => Boolean(c?.handle));
        setItems((prev) => {
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
    setItems([]);
    setCursor(null);
    setLoaded(false);
    void fetchPage(null, true);
  }, [enabled, fetchPage]);

  return {
    items,
    loading,
    loaded,
    hasMore: more,
    refusal,
    reviewingSkipped: meta.reviewingSkipped,
    refreshing: meta.refreshing,
    loadMore: () => { if (more && !loading) void fetchPage(cursor, false); },
    reload: () => { setItems([]); void fetchPage(null, true); },
    remove: (handle) => setItems((c) => c.filter((x) => x.handle !== handle)),
  };
}

const pickCards = (page: PageShape): NetworkingCard[] => (Array.isArray(page.cards) ? page.cards : []);

export function usePagedCards(doc: DocumentNode, rootField: string, baseVars: Record<string, unknown>, enabled: boolean, limit = 12): PagedCards {
  const { items, ...rest } = usePagedItems<NetworkingCard>(doc, rootField, baseVars, enabled, pickCards, limit);
  return { ...rest, cards: items };
}

/** Sent interests: only entries that carry a handle (the card may be null when the person is gone). */
export function useSentInterests(eventId: string, enabled: boolean) {
  return usePagedItems<InterestEntry>(NETWORKING_MY_INTERESTS, 'eventNetworkingMyInterests', { eventId }, enabled, (p) => (Array.isArray(p.interests) ? (p.interests as InterestEntry[]) : []), 12);
}

/** Matches, keyed by the person's handle. */
export type MatchItem = MatchEntry & { handle: string };
export function useMatches(eventId: string, enabled: boolean) {
  return usePagedItems<MatchItem>(
    NETWORKING_MY_MATCHES,
    'eventNetworkingMyMatches',
    { eventId },
    enabled,
    (p) => (Array.isArray(p.matches) ? (p.matches as MatchEntry[]).filter((m) => m?.card?.handle).map((m) => ({ ...m, handle: m.card.handle })) : []),
    12,
  );
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

/** Text of the refusal, in the person's language. Nothing the server said is shown verbatim. */
function useRefusalText() {
  const t = useTranslations('networking.errors');
  return useCallback((source: unknown) => t(networkingRefusal(source).key), [t]);
}

/**
 * Express interest. A HIDDEN sender must first confirm that the recipient will see
 * their profile; the confirm step is shown before the first send, and also when the
 * server answers `EVENT_NETWORKING_REVEAL_CONFIRMATION_REQUIRED` (our idea of the
 * visibility was stale). `express()` resolves true only when the interest was sent.
 */
export function useInterestFlow(eventId: string, visibility: string | null | undefined) {
  const [run] = useMutation<{ eventNetworkingExpressInterest: ExpressInterestResult | null }>(NETWORKING_EXPRESS_INTEREST, NETWORKING_MUTATION);
  const report = useReportRefusal();
  const t = useTranslations('networking.interest');
  const [pending, setPending] = useState<{ handle: string; name: string } | null>(null);
  const [sending, setSending] = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const hidden = visibility === 'HIDDEN';

  const send = useCallback(
    async (handle: string, source: InterestSource, acknowledge: boolean): Promise<'ok' | 'confirm' | 'failed'> => {
      try {
        const res = await run({ variables: { eventId, handle, source, acknowledgeProfileReveal: acknowledge ? true : undefined } });
        const r = res.data?.eventNetworkingExpressInterest ?? null;
        if (hasFailure(res) || !r?.success) {
          if (networkingRefusal(res).code === 'EVENT_NETWORKING_REVEAL_CONFIRMATION_REQUIRED') return 'confirm';
          report(res);
          return 'failed';
        }
        if (r.matched) toast.success(t('matched'));
        else toast.success(t('sent'));
        return 'ok';
      } catch (err) {
        if (networkingRefusal(err).code === 'EVENT_NETWORKING_REVEAL_CONFIRMATION_REQUIRED') return 'confirm';
        report(err);
        return 'failed';
      }
    },
    [eventId, report, run, t],
  );

  const ask = useCallback(
    (handle: string, name: string) =>
      new Promise<boolean>((resolve) => {
        resolver.current?.(false);
        resolver.current = resolve;
        setPending({ handle, name });
      }),
    [],
  );

  const express = useCallback(
    async (handle: string, source: InterestSource = 'OTHER', name = ''): Promise<boolean> => {
      if (hidden) return ask(handle, name);
      const out = await send(handle, source, false);
      if (out === 'confirm') return ask(handle, name);
      return out === 'ok';
    },
    [ask, hidden, send],
  );
  // `source` for the confirm step is remembered per call.
  const lastSource = useRef<InterestSource>('OTHER');
  const expressTracked = useCallback(
    (handle: string, source: InterestSource = 'OTHER', name = '') => {
      lastSource.current = source;
      return express(handle, source, name);
    },
    [express],
  );

  const confirm = useCallback(async () => {
    if (!pending) return;
    setSending(true);
    const out = await send(pending.handle, lastSource.current, true);
    setSending(false);
    setPending(null);
    resolver.current?.(out === 'ok');
    resolver.current = null;
  }, [pending, send]);

  const cancel = useCallback(() => {
    setPending(null);
    resolver.current?.(false);
    resolver.current = null;
  }, []);

  return { express: expressTracked, pending, sending, confirm, cancel };
}

export function useRespondToInterest(eventId: string) {
  const [run] = useMutation<{ eventNetworkingRespondToInterest: RespondResult | null }>(NETWORKING_RESPOND_TO_INTEREST, NETWORKING_MUTATION);
  const report = useReportRefusal();
  return useCallback(
    async (handle: string, accept: boolean): Promise<RespondResult | null> => {
      try {
        const res = await run({ variables: { eventId, handle, accept } });
        const r = res.data?.eventNetworkingRespondToInterest ?? null;
        if (hasFailure(res) || !r?.success) { report(res); return null; }
        return r;
      } catch (err) {
        report(err);
        return null;
      }
    },
    [eventId, report, run],
  );
}

export function useWithdrawInterest(eventId: string) {
  const [run] = useMutation<{ eventNetworkingWithdrawInterest: { success: boolean } | null }>(NETWORKING_WITHDRAW_INTEREST, NETWORKING_MUTATION);
  const report = useReportRefusal();
  return useCallback(
    async (handle: string): Promise<boolean> => {
      try {
        const res = await run({ variables: { eventId, handle } });
        if (hasFailure(res) || !res.data?.eventNetworkingWithdrawInterest?.success) { report(res); return false; }
        return true;
      } catch (err) {
        report(err);
        return false;
      }
    },
    [eventId, report, run],
  );
}

export function useConnect(eventId: string) {
  const [run] = useMutation<{ eventNetworkingConnect: ConnectResult | null }>(NETWORKING_CONNECT, NETWORKING_MUTATION);
  const report = useReportRefusal();
  return useCallback(
    async (handle: string): Promise<ConnectResult | null> => {
      try {
        const res = await run({ variables: { eventId, handle } });
        const r = res.data?.eventNetworkingConnect ?? null;
        if (hasFailure(res) || !r?.success) { report(res); return null; }
        return r;
      } catch (err) {
        report(err);
        return null;
      }
    },
    [eventId, report, run],
  );
}

export function useBlock(eventId: string) {
  const [run] = useMutation<{ eventNetworkingBlock: { success: boolean } | null }>(NETWORKING_BLOCK, NETWORKING_MUTATION);
  const report = useReportRefusal();
  return useCallback(
    async (handle: string): Promise<boolean> => {
      try {
        const res = await run({ variables: { eventId, handle } });
        if (hasFailure(res) || !res.data?.eventNetworkingBlock?.success) { report(res); return false; }
        return true;
      } catch (err) {
        report(err);
        return false;
      }
    },
    [eventId, report, run],
  );
}

export function useReportPerson(eventId: string) {
  const [run] = useMutation<{ eventNetworkingReport: ReportResult | null }>(NETWORKING_REPORT, NETWORKING_MUTATION);
  const text = useRefusalText();
  return useCallback(
    /** Resolves the case reference ('' when the server gave none) or an error text. */
    async (handle: string, reason: ReportReason, details: string): Promise<{ ok: true; caseNumber: string } | { ok: false; message: string }> => {
      try {
        const clean = details.trim().slice(0, REPORT_DETAILS_MAX);
        const res = await run({ variables: { eventId, handle, reason, details: clean || undefined } });
        const r = res.data?.eventNetworkingReport ?? null;
        if (hasFailure(res) || !r?.success) return { ok: false, message: text(res) };
        return { ok: true, caseNumber: r.caseNumber ?? '' };
      } catch (err) {
        return { ok: false, message: text(err) };
      }
    },
    [eventId, run, text],
  );
}
