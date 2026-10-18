/**
 * Global search: a header trigger that opens a centred panel on desktop and a
 * full-screen sheet on phones. One dialog for both, so focus, keyboard and
 * states behave the same everywhere.
 *
 * Searches people, opportunities and events (as before). Queries fan out from a
 * single debounced call; a request counter drops any response that is no longer
 * the latest. Typo-variant ("Similar") lookups only run when the exact query
 * found nothing.
 */
'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useParams } from 'next/navigation';
import { useApolloClient } from '@apollo/client/react';
import { useLocale, useTranslations } from 'next-intl';
import { Search, X, Clock, Users, Briefcase, CalendarDays, CornerDownLeft, AlertCircle } from 'lucide-react';

import { useSearchStore, CachedResult } from '@/store/useSearchStore';
import { SEARCH_USERS } from '@/services/gql/connection';
import { SEARCH_OPPORTUNITIES } from '@/services/gql/opportunities';
import { SEARCH_EVENTS } from '@/services/gql/events';
import { profileUrl } from '@/lib/profileUrl';
import { countryName } from '@/lib/countryName';

// ─── Types ────────────────────────────────────────────────────────────────────

type Group = 'people' | 'opportunity' | 'event';
const GROUP_ORDER: Group[] = ['people', 'opportunity', 'event'];
const PER_GROUP = 5;
const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;

interface ResultRow {
  key: string; // stable React/DOM key — never rendered
  group: Group;
  label: string;
  subtext?: string;
  href: string;
  isFallback: boolean;
}

type Option =
  | { kind: 'result'; id: string; row: ResultRow }
  | { kind: 'recent'; id: string; query: string }
  | { kind: 'all'; id: string };

type Status = 'idle' | 'loading' | 'done' | 'error';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-default';

const GROUP_ICON: Record<Group, typeof Users> = { people: Users, opportunity: Briefcase, event: CalendarDays };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateVariants(query: string): string[] {
  const trimmed = query.trim();
  const seen = new Set<string>([trimmed]);
  const out: string[] = [trimmed];
  const push = (s: string) => {
    const clean = s.trim();
    if (clean.length >= 2 && !seen.has(clean)) { seen.add(clean); out.push(clean); }
  };

  const VOWELS = 'aeiou';
  const isVowel = (c: string) => VOWELS.includes(c.toLowerCase());

  const tokens = trimmed.split(/\s+/).filter(t => t.length >= 2);
  if (tokens.length > 1) tokens.forEach(t => push(t));

  const words = tokens.length >= 1 ? tokens : [trimmed];
  for (const word of words) {
    if (word.length < 3) continue;
    const lower = word.toLowerCase();

    const vcSwaps: string[] = [];
    const otherSwaps: string[] = [];
    for (let i = 0; i < word.length - 1; i++) {
      const chars = [...word];
      [chars[i], chars[i + 1]] = [chars[i + 1], chars[i]];
      const v = chars.join('');
      if (v === word) continue;
      if (isVowel(word[i]) !== isVowel(word[i + 1])) vcSwaps.push(v);
      else otherSwaps.push(v);
    }

    const vowelSubs: string[] = [];
    for (let i = 0; i < lower.length; i++) {
      if (!isVowel(lower[i])) continue;
      for (const v of VOWELS) {
        if (v === lower[i]) continue;
        const chars = [...lower];
        chars[i] = v;
        vowelSubs.push(chars.join(''));
      }
    }

    const deletions: string[] = [];
    for (let i = 0; i < word.length; i++) {
      deletions.push(word.slice(0, i) + word.slice(i + 1));
    }

    if (word.length <= 5) {
      vcSwaps.forEach(v => push(v));
      vowelSubs.forEach(v => push(v));
      push(lower.slice(0, -1));
      otherSwaps.forEach(v => push(v));
      deletions.forEach(v => push(v));
    } else {
      push(lower.slice(0, -1));
      vcSwaps.forEach(v => push(v));
      if (word.length >= 6) push(lower.slice(0, -2));
      vowelSubs.forEach(v => push(v));
      deletions.forEach(v => push(v));
      otherSwaps.forEach(v => push(v));
    }
  }
  return out.slice(0, 10);
}

/** "FULL_TIME" -> "Full time"; leaves already-readable text alone. */
function humanize(v?: string | null): string | undefined {
  if (!v) return undefined;
  if (!/^[A-Z0-9_]+$/.test(v)) return v;
  const s = v.replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function buildRows(uData: any, oData: any, eData: any, locale: string, isFallback: boolean): ResultRow[] {
  const rows: ResultRow[] = [];
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });

  (uData?.searchUsers?.profiles ?? []).slice(0, PER_GROUP).forEach((p: any) => {
    const label = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || p.username || '';
    if (!label) return;
    rows.push({
      key: `user-${p.userId}`,
      group: 'people',
      label,
      subtext: p.headline || p.sector || countryName(p.residenceCountry, locale) || undefined,
      href: `/${locale}${profileUrl({ username: p.username, userId: p.userId })}`,
      isFallback,
    });
  });

  (oData?.searchOpportunities?.opportunities ?? []).slice(0, PER_GROUP).forEach((o: any) => {
    rows.push({
      key: `opp-${o.id}`,
      group: 'opportunity',
      label: o.title,
      subtext: [humanize(o.category ?? o.type), o.location].filter(Boolean).join(' · ') || undefined,
      href: `/${locale}/opportunities/${encodeURIComponent(String(o.id))}`,
      isFallback,
    });
  });

  (eData?.searchEvents?.events ?? []).slice(0, PER_GROUP).forEach((e: any) => {
    const d = e.startAt ? new Date(e.startAt) : null;
    rows.push({
      key: `event-${e.id}`,
      group: 'event',
      label: e.title,
      subtext: d && !Number.isNaN(d.getTime()) ? dateFmt.format(d) : humanize(e.eventCategory),
      href: `/${locale}/events/${encodeURIComponent(String(e.id))}`,
      isFallback,
    });
  });

  return rows;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function rowToCachedResult(r: ResultRow): CachedResult {
  return { id: r.key, label: r.label, subtext: r.subtext, type: r.group === 'opportunity' ? 'opportunity' : r.group === 'people' ? 'people' : 'event', href: r.href };
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

// ─── Component ────────────────────────────────────────────────────────────────

export default function GlobalSearchBar() {
  const t = useTranslations('searchModal');
  const router = useRouter();
  const params = useParams();
  const intlLocale = useLocale();
  const locale = (Array.isArray(params?.locale) ? params.locale[0] : params?.locale) ?? intlLocale ?? 'en';
  const client = useApolloClient();
  const uid = useId();
  const listId = `${uid}-list`;
  const optId = (i: number) => `${uid}-opt-${i}`;

  const { recentSearches, addRecentEntry, addRecentSearch, clearRecentSearches } = useSearchStore();

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [activeIndex, setActiveIndex] = useState(-1);

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const seqRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  const trimmed = query.trim();
  const canSearch = trimmed.length >= MIN_CHARS;

  // ── Fetching: one debounced fan-out, latest response wins ──
  const run = useCallback(
    async (q: string) => {
      const seq = ++seqRef.current;
      setStatus('loading');
      const ask = async (term: string, limit: number) => {
        const opts = { fetchPolicy: 'cache-first', errorPolicy: 'none' } as const;
        const settled = await Promise.allSettled([
          client.query({ query: SEARCH_USERS, variables: { searchUsersInput: { query: term, limit, offset: 0 } }, ...opts }),
          client.query({ query: SEARCH_OPPORTUNITIES, variables: { input: { searchTerm: term, limit, offset: 0 } }, ...opts }),
          client.query({ query: SEARCH_EVENTS, variables: { input: { searchTerm: term, limit, offset: 0 } }, ...opts }),
        ]);
        const val = (i: number) => (settled[i].status === 'fulfilled' ? (settled[i] as PromiseFulfilledResult<{ data?: unknown }>).value.data : undefined);
        return { failed: settled.filter((s) => s.status === 'rejected').length, rows: (isFb: boolean) => buildRows(val(0), val(1), val(2), locale, isFb) };
      };
      try {
        const primary = await ask(q, PER_GROUP);
        if (seq !== seqRef.current) return;
        let result = primary.rows(false);
        let failed = primary.failed;
        if (result.length === 0 && failed < 3) {
          const variants = generateVariants(q);
          if (variants.length > 1) {
            const fb = await ask(variants[1], 3);
            if (seq !== seqRef.current) return;
            result = fb.rows(true);
            failed = Math.max(failed, fb.failed);
          }
        }
        if (failed === 3) { setRows([]); setStatus('error'); return; }
        setRows(result);
        setStatus('done');
      } catch {
        if (seq === seqRef.current) { setRows([]); setStatus('error'); }
      }
    },
    [client, locale],
  );

  const onChange = (value: string) => {
    setQuery(value);
    setActiveIndex(-1);
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = value.trim();
    if (q.length < MIN_CHARS) {
      seqRef.current++; // invalidate anything in flight
      setRows([]);
      setStatus('idle');
      return;
    }
    setStatus('loading');
    timerRef.current = setTimeout(() => run(q), DEBOUNCE_MS);
  };

  // ── Open / close ──
  const openFrom = (el: HTMLElement) => { triggerRef.current = el; setOpen(true); };
  const close = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    seqRef.current++;
    setOpen(false);
    setQuery('');
    setRows([]);
    setStatus('idle');
    setActiveIndex(-1);
    // Return focus after the dialog unmounts.
    const el = triggerRef.current;
    requestAnimationFrame(() => el?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    inputRef.current?.focus();
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // ── Options (flat, for keyboard) ──
  const grouped = useMemo(
    () => GROUP_ORDER.map((g) => ({ group: g, rows: rows.filter((r) => r.group === g) })).filter((g) => g.rows.length > 0),
    [rows],
  );
  const options: Option[] = useMemo(() => {
    if (!canSearch) {
      return recentSearches.slice(0, 5).map((q, i) => ({ kind: 'recent' as const, id: optId(i), query: q }));
    }
    const list: Option[] = [];
    grouped.forEach((g) => g.rows.forEach((row) => list.push({ kind: 'result', id: '', row })));
    list.push({ kind: 'all', id: '' });
    return list.map((o, i) => ({ ...o, id: optId(i) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSearch, grouped, recentSearches, uid]);

  useEffect(() => {
    if (activeIndex >= 0) document.getElementById(optId(activeIndex))?.scrollIntoView({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  // ── Actions ──
  const remember = () => {
    if (!canSearch) return;
    addRecentSearch(trimmed);
    if (rows.length > 0) addRecentEntry(trimmed, rows.slice(0, 5).map(rowToCachedResult));
  };
  const goAll = (q: string) => {
    const s = q.trim();
    if (!s) return;
    addRecentSearch(s);
    router.push(`/${locale}/search?q=${encodeURIComponent(s)}`);
    close();
  };
  const choose = (o: Option) => {
    if (o.kind === 'result') { remember(); router.push(o.row.href); close(); }
    else if (o.kind === 'recent') { goAll(o.query); }
    else goAll(trimmed);
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    const n = options.length;
    if (e.key === 'ArrowDown') { e.preventDefault(); if (n) setActiveIndex((i) => (i + 1) % n); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (n) setActiveIndex((i) => (i <= 0 ? n - 1 : i - 1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && options[activeIndex]) choose(options[activeIndex]);
      else if (canSearch) goAll(trimmed);
    }
  };

  // Esc anywhere in the dialog closes; Tab is trapped inside it.
  const onPanelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key !== 'Tab' || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.tabIndex >= 0 && el.getClientRects().length > 0);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const cur = document.activeElement;
    if (e.shiftKey && cur === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
  };

  // ── Render ──
  let flat = -1;
  const optionClass = (i: number) =>
    `flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left text-sm text-text-primary transition-colors hover:bg-surface-hover ${i === activeIndex ? 'bg-surface-hover' : ''}`;

  const announce =
    status === 'loading' ? t('searching')
    : status === 'error' ? t('error')
    : status === 'done' ? (rows.length === 0 ? t('noResultsTitle', { query: trimmed }) : t('resultsCount', { count: rows.length }))
    : '';

  const dialog = open && (
    <div className="fixed inset-0 z-[70] flex items-stretch justify-center md:items-start md:px-4 md:pt-[10vh]" data-testid="search-modal">
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" onMouseDown={close} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('dialogLabel')}
        onKeyDown={onPanelKeyDown}
        className="relative flex h-dvh w-full min-w-0 flex-col bg-surface-default md:h-auto md:max-h-[min(36rem,80vh)] md:max-w-xl md:overflow-hidden md:rounded-2xl md:border md:border-border-subtle md:shadow-xl"
      >
        <div className="flex items-center gap-2 border-b border-border-subtle px-3 py-3 md:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border-subtle bg-surface-subtle px-3 focus-within:border-text-brand">
            <Search className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder={t('placeholder')}
              aria-label={t('placeholder')}
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={activeIndex >= 0 ? optId(activeIndex) : undefined}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              className="h-11 min-w-0 flex-1 bg-transparent text-base text-text-primary outline-none placeholder:text-text-secondary"
            />
            {query && (
              <button
                type="button"
                onClick={() => { onChange(''); inputRef.current?.focus(); }}
                aria-label={t('clear')}
                className={`inline-flex size-8 shrink-0 items-center justify-center rounded-md text-text-secondary hover:text-text-primary ${FOCUS_RING}`}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={close}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-md px-2 text-sm font-medium text-text-brand hover:bg-surface-hover ${FOCUS_RING}`}
          >
            {t('close')}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div role="status" aria-live="polite" className="sr-only">{announce}</div>

          {!canSearch && (
            recentSearches.length === 0 ? (
              <p className="px-4 py-6 text-sm text-text-secondary">{t('hint')}</p>
            ) : (
              <div>
                <div className="flex items-center justify-between px-4 pb-1 pt-3">
                  <h2 className="text-sm font-semibold text-text-secondary">{t('recent')}</h2>
                  <button type="button" onClick={clearRecentSearches} className={`min-h-8 rounded px-1 text-sm text-text-brand hover:underline ${FOCUS_RING}`}>
                    {t('clearRecent')}
                  </button>
                </div>
                <div role="listbox" id={listId} aria-label={t('recent')}>
                  {options.map((o, i) => o.kind === 'recent' && (
                    <div key={o.query} id={o.id} role="option" aria-selected={i === activeIndex} onClick={() => choose(o)} className={`${optionClass(i)} cursor-pointer`}>
                      <Clock className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{o.query}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

          {canSearch && status === 'error' && (
            <div className="flex flex-col items-start gap-2 px-4 py-6" role="alert">
              <p className="flex items-center gap-2 text-sm font-medium text-text-primary"><AlertCircle className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />{t('error')}</p>
              <p className="text-sm text-text-secondary">{t('errorHint')}</p>
              <button type="button" onClick={() => run(trimmed)} className={`min-h-11 rounded-md border border-border-subtle px-3 text-sm font-medium text-text-primary hover:bg-surface-hover ${FOCUS_RING}`}>
                {t('retry')}
              </button>
            </div>
          )}

          {canSearch && status === 'loading' && rows.length === 0 && (
            <div className="space-y-1 px-4 py-3" aria-hidden="true" data-testid="search-loading">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <div className="size-8 shrink-0 animate-pulse rounded-lg bg-surface-hover" />
                  <div className="flex-1 space-y-1.5"><div className="h-3.5 w-2/3 animate-pulse rounded bg-surface-hover" /><div className="h-3 w-1/3 animate-pulse rounded bg-surface-hover" /></div>
                </div>
              ))}
            </div>
          )}

          {canSearch && status === 'done' && rows.length === 0 && (
            <div className="px-4 py-6">
              <p className="break-words text-sm font-medium text-text-primary">{t('noResultsTitle', { query: trimmed })}</p>
              <p className="mt-1 text-sm text-text-secondary">{t('noResultsHint')}</p>
            </div>
          )}

          {canSearch && status !== 'error' && (rows.length > 0 || status === 'done') && (
            <div role="listbox" id={listId} aria-label={t('results')} aria-busy={status === 'loading'}>
              {rows.length > 0 && rows.every((r) => r.isFallback) && (
                <p className="px-4 pt-3 text-sm text-text-secondary">{t('similarNote')}</p>
              )}
              {grouped.map((g) => {
                const Icon = GROUP_ICON[g.group];
                const hid = `${uid}-h-${g.group}`;
                return (
                  <div key={g.group} role="group" aria-labelledby={hid}>
                    <h2 id={hid} className="px-4 pb-1 pt-3 text-sm font-semibold text-text-secondary">{t(`groups.${g.group}`)}</h2>
                    {g.rows.map((row) => {
                      const i = ++flat;
                      return (
                        <a
                          key={row.key}
                          id={optId(i)}
                          role="option"
                          aria-selected={i === activeIndex}
                          href={row.href}
                          tabIndex={-1}
                          onClick={(e) => {
                            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                            e.preventDefault();
                            choose({ kind: 'result', id: optId(i), row });
                          }}
                          className={optionClass(i)}
                        >
                          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-secondary"><Icon className="size-4" aria-hidden="true" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{row.label}</span>
                            {row.subtext && <span className="block truncate text-sm text-text-secondary">{row.subtext}</span>}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                );
              })}
              {(() => {
                const i = ++flat;
                return (
                  <div
                    id={optId(i)}
                    role="option"
                    aria-selected={i === activeIndex}
                    onClick={() => goAll(trimmed)}
                    className={`${optionClass(i)} mt-2 cursor-pointer border-t border-border-subtle font-medium text-text-brand`}
                  >
                    <Search className="size-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{t('seeAll', { query: trimmed })}</span>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        <div className="hidden items-center gap-3 border-t border-border-subtle px-4 py-2 text-sm text-text-secondary md:flex">
          <CornerDownLeft className="size-4" aria-hidden="true" />
          <span>{t('keyboardHint')}</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop trigger looks like the old input; below lg it is an icon. */}
      <button
        type="button"
        onClick={(e) => openFrom(e.currentTarget)}
        aria-haspopup="dialog"
        aria-label={t('open')}
        className={`hidden w-44 items-center gap-2 rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1.5 text-left text-sm text-text-secondary transition-colors hover:border-text-brand lg:flex xl:w-56 ${FOCUS_RING}`}
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{t('placeholder')}</span>
      </button>
      <button
        type="button"
        onClick={(e) => openFrom(e.currentTarget)}
        aria-haspopup="dialog"
        aria-label={t('open')}
        className={`inline-flex size-11 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary lg:hidden ${FOCUS_RING}`}
      >
        <Search className="size-5" aria-hidden="true" />
      </button>
      {mounted && dialog ? createPortal(dialog, document.body) : null}
    </>
  );
}
