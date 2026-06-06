'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLazyQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { Search, X, Clock, TrendingUp, Users, Briefcase, CalendarDays } from 'lucide-react';
import Fuse from 'fuse.js';

import { NoResults } from '@/components/feedback';
import { useSearchStore, CachedResult } from '@/store/useSearchStore';
import { SEARCH_USERS } from '@/services/gql/connection';
import { SEARCH_OPPORTUNITIES } from '@/services/gql/opportunities';
import { SEARCH_EVENTS } from '@/services/gql/events';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResultRow {
  id: string;
  label: string;
  subtext?: string;
  icon: React.ReactNode;
  href: string;
  isFallback?: boolean;
}

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

function buildRows(uData: any, oData: any, eData: any, locale: string, isFallback = false): ResultRow[] {
  const rows: ResultRow[] = [];

  (uData?.searchUsers?.profiles ?? []).slice(0, 2).forEach((p: any) => {
    rows.push({
      id: `user-${p.userId}`,
      label: `${p.firstName} ${p.lastName}`.trim(),
      subtext: p.headline ?? p.sector ?? p.residenceCountry,
      icon: <Users className="w-4 h-4 shrink-0 text-text-secondary" />,
      href: `/${locale}/profile/${p.userId}`,
      isFallback,
    });
  });

  (oData?.searchOpportunities?.opportunities ?? []).slice(0, 2).forEach((o: any) => {
    rows.push({
      id: `opp-${o.id}`,
      label: o.title,
      subtext: o.category ?? o.type,
      icon: <Briefcase className="w-4 h-4 shrink-0 text-text-secondary" />,
      href: `/${locale}/opportunities/${o.id}`,
      isFallback,
    });
  });

  (eData?.searchEvents?.events ?? []).slice(0, 2).forEach((e: any) => {
    rows.push({
      id: `event-${e.id}`,
      label: e.title,
      subtext: e.startAt ? new Date(e.startAt).toLocaleDateString() : e.eventCategory,
      icon: <CalendarDays className="w-4 h-4 shrink-0 text-text-secondary" />,
      href: `/${locale}/events/${e.id}`,
      isFallback,
    });
  });

  return rows;
}

function rowToCachedResult(r: ResultRow): CachedResult {
  let type: CachedResult['type'] = 'event';
  if (r.id.startsWith('user-')) type = 'people';
  else if (r.id.startsWith('opp-')) type = 'opportunity';
  return { id: r.id, label: r.label, subtext: r.subtext, type, href: r.href };
}

// ─── Shared results list ──────────────────────────────────────────────────────

interface ResultsListProps {
  query: string;
  resultRows: ResultRow[];
  recentSearches: string[];
  loading: boolean;
  activeIndex: number;
  onSelectRow: (row: ResultRow) => void;
  onSelectRecent: (q: string) => void;
  onViewAll: () => void;
  onClearRecent: () => void;
  padded?: boolean;
}

function ResultsList({
  query, resultRows, recentSearches, loading, activeIndex,
  onSelectRow, onSelectRecent, onViewAll, onClearRecent, padded,
}: ResultsListProps) {
  const t = useTranslations('home.header');
  const px = padded ? 'px-4' : 'px-3';
  const py = padded ? 'py-3' : 'py-2';
  const showRecent = query.trim().length === 0;

  if (showRecent) {
    if (recentSearches.length === 0) {
      return (
        <div className={`flex items-center gap-2 ${px} py-4 text-sm text-text-secondary`}>
          <TrendingUp className="w-4 h-4 shrink-0" />
          <span>{t('startTyping')}</span>
        </div>
      );
    }
    return (
      <>
        <div className={`flex items-center justify-between ${px} pt-3 pb-1`}>
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            {t('recentSearches')}
          </span>
          <button onClick={onClearRecent} className="text-xs text-text-brand hover:underline">
            {t('clearAll')}
          </button>
        </div>
        {recentSearches.slice(0, 5).map((r, i) => (
          <button
            key={r}
            onClick={() => onSelectRecent(r)}
            className={`flex w-full items-center gap-3 ${px} ${py} text-sm text-text-primary hover:bg-surface-hover transition-colors ${activeIndex === i ? 'bg-surface-hover' : ''}`}
          >
            <Clock className="w-4 h-4 shrink-0 text-text-secondary" />
            <span className="truncate">{r}</span>
          </button>
        ))}
      </>
    );
  }

  return (
    <>
      {loading && (
        <div className={`${px} ${py} text-sm text-text-secondary`}>{t('searching')}</div>
      )}
      {!loading && resultRows.length === 0 && (
        <NoResults size="sm" title={t('noResults')} />
      )}
      {resultRows.map((row, i) => (
        <button
          key={row.id}
          onClick={() => onSelectRow(row)}
          className={`flex w-full items-center gap-3 ${px} ${py} text-sm text-text-primary hover:bg-surface-hover transition-colors ${activeIndex === i ? 'bg-surface-hover' : ''}`}
        >
          {row.icon}
          <span className="flex-1 truncate text-left">{row.label}</span>
          {row.subtext && (
            <span className="text-xs text-text-secondary truncate max-w-[7rem]">{row.subtext}</span>
          )}
          {row.isFallback && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-surface-hover text-text-secondary shrink-0">Similar</span>
          )}
        </button>
      ))}
      <button
        onClick={onViewAll}
        className={`flex w-full items-center gap-2 ${px} ${py} text-sm text-text-brand font-medium hover:bg-surface-hover border-t border-border-subtle transition-colors ${activeIndex === resultRows.length ? 'bg-surface-hover' : ''}`}
      >
        <Search className="w-4 h-4 shrink-0" />
        <span className="truncate">{t('viewAllResults')} &ldquo;{query}&rdquo;</span>
      </button>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GlobalSearchBar() {
  const t = useTranslations('home.header');
  const router = useRouter();
  const params = useParams();
  const locale = (Array.isArray(params?.locale) ? params.locale[0] : params?.locale) ?? 'en';

  const { recentSearches, addRecentSearch, addRecentEntry, clearRecentSearches } = useSearchStore();

  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [resultRows, setResultRows] = useState<ResultRow[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Primary queries
  const [searchUsers,  { loading: uLoading, data: uData }] = useLazyQuery(SEARCH_USERS);
  const [searchOpps,   { loading: oLoading, data: oData }] = useLazyQuery(SEARCH_OPPORTUNITIES);
  const [searchEvents, { loading: eLoading, data: eData }] = useLazyQuery(SEARCH_EVENTS);

  // Fallback queries (fire with first token when multi-word query returns nothing)
  const [searchUsersFb,  { data: uFallback }] = useLazyQuery(SEARCH_USERS);
  const [searchOppsFb,   { data: oFallback }] = useLazyQuery(SEARCH_OPPORTUNITIES);
  const [searchEventsFb, { data: eFallback }] = useLazyQuery(SEARCH_EVENTS);

  const loading = uLoading || oLoading || eLoading;

  useEffect(() => {
    if (inputValue.trim().length < 2) { setResultRows([]); return; }

    const primary = buildRows(uData, oData, eData, locale, false);
    const fallback = buildRows(uFallback, oFallback, eFallback, locale, true);

    // Deduplicate fallbacks against primary by id
    const primaryIds = new Set(primary.map((r) => r.id));
    const uniqueFallback = fallback.filter((r) => !primaryIds.has(r.id));

    const combined = [...primary, ...uniqueFallback];

    if (inputValue.trim().length >= 3 && combined.length > 0) {
      const fuse = new Fuse(combined, {
        keys: ['label', 'subtext'],
        threshold: 0.5,
        includeScore: true,
      });
      const fuseResults = fuse.search(inputValue.trim());
      const seen = new Set<string>();
      const merged: ResultRow[] = [];
      fuseResults.forEach(({ item }) => {
        if (!seen.has(item.id)) { seen.add(item.id); merged.push(item); }
      });
      // Ensure exact-match primaries aren't dropped by fuse threshold
      primary.forEach((r) => { if (!seen.has(r.id)) { seen.add(r.id); merged.unshift(r); } });
      const final = merged.slice(0, 8);
      setResultRows(final);
      if (inputValue.trim().length >= 2 && final.length > 0) {
        addRecentEntry(inputValue.trim(), final.slice(0, 5).map(rowToCachedResult));
      }
    } else {
      const final = combined.slice(0, 6);
      setResultRows(final);
      if (inputValue.trim().length >= 2 && final.length > 0) {
        addRecentEntry(inputValue.trim(), final.slice(0, 5).map(rowToCachedResult));
      }
    }
  }, [uData, oData, eData, uFallback, oFallback, eFallback, locale, inputValue, addRecentEntry]);

  useEffect(() => { setActiveIndex(-1); }, [resultRows, inputValue]);

  // Close desktop dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-focus mobile input; reset on close
  useEffect(() => {
    if (mobileOpen) {
      setTimeout(() => mobileInputRef.current?.focus(), 50);
    } else {
      if (urlDebounceRef.current) clearTimeout(urlDebounceRef.current);
      setInputValue('');
      setResultRows([]);
    }
  }, [mobileOpen]);

  const runTypeahead = useCallback((q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) { setResultRows([]); return; }

    searchUsers({ variables: { searchUsersInput: { query: trimmed, limit: 5, offset: 0 } } });
    searchOpps({ variables: { input: { searchTerm: trimmed, limit: 5, offset: 0 } } });
    searchEvents({ variables: { input: { searchTerm: trimmed, limit: 5, offset: 0 } } });

    // Fire fallback with first individual token for multi-word or possible-typo queries
    const variants = generateVariants(trimmed);
    if (variants.length > 1) {
      const fbQ = variants[1];
      searchUsersFb({ variables: { searchUsersInput: { query: fbQ, limit: 3, offset: 0 } } });
      searchOppsFb({ variables: { input: { searchTerm: fbQ, limit: 3, offset: 0 } } });
      searchEventsFb({ variables: { input: { searchTerm: fbQ, limit: 3, offset: 0 } } });
    }
  }, [searchUsers, searchOpps, searchEvents, searchUsersFb, searchOppsFb, searchEventsFb]);

  const handleInputChange = (value: string) => {
    setInputValue(value);

    // Typeahead debounce (300ms)
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runTypeahead(value), 300);

    // URL debounce — update ?q= as user types so back button works
    if (urlDebounceRef.current) clearTimeout(urlDebounceRef.current);
    urlDebounceRef.current = setTimeout(() => {
      const trimmed = value.trim();
      if (trimmed.length >= 2) {
        router.replace(`/${locale}/search?q=${encodeURIComponent(trimmed)}`, { scroll: false });
      }
    }, 400);
  };

  const close = () => { setOpen(false); setMobileOpen(false); };

  const submitSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    addRecentSearch(trimmed);
    router.push(`/${locale}/search?q=${encodeURIComponent(trimmed)}`);
    setInputValue('');
    setResultRows([]);
    close();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const isTyping = inputValue.trim().length > 0;
    const total = isTyping ? resultRows.length + 1 : recentSearches.slice(0, 5).length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, total - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!isTyping) {
        if (activeIndex >= 0 && recentSearches[activeIndex]) submitSearch(recentSearches[activeIndex]);
        return;
      }
      if (activeIndex >= 0 && activeIndex < resultRows.length) {
        router.push(resultRows[activeIndex].href);
        close();
      } else {
        submitSearch(inputValue);
      }
    } else if (e.key === 'Escape') {
      close();
    }
  };

  const sharedInput = (
    ref: React.RefObject<HTMLInputElement | null>,
    className: string,
    onFocus?: () => void,
  ) => (
    <input
      ref={ref}
      value={inputValue}
      onChange={(e) => handleInputChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onFocus={onFocus}
      placeholder={t('searchLabel')}
      autoComplete="off"
      aria-label={t('searchLabel')}
      role="combobox"
      aria-expanded={open || mobileOpen}
      className={className}
    />
  );

  const listProps = {
    query: inputValue,
    resultRows,
    recentSearches,
    loading,
    activeIndex,
    onSelectRow: (row: ResultRow) => { router.push(row.href); close(); },
    onSelectRecent: submitSearch,
    onViewAll: () => submitSearch(inputValue),
    onClearRecent: clearRecentSearches,
  };

  return (
    <>
      {/* ── Desktop (lg+) ── */}
      <div ref={containerRef} className="relative hidden lg:block w-64">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-subtle border border-border-subtle focus-within:border-text-brand transition-colors">
          <Search className="w-4 h-4 shrink-0 text-text-secondary" />
          {sharedInput(inputRef, 'flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary outline-none', () => setOpen(true))}
          {inputValue && (
            <button onClick={() => { setInputValue(''); setResultRows([]); inputRef.current?.focus(); }} aria-label="Clear" className="text-text-secondary hover:text-text-primary">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {open && (
          <div className="absolute top-full mt-1 w-full min-w-[18rem] bg-surface-default border border-border-subtle rounded-xl shadow-lg z-50 overflow-hidden">
            <ResultsList {...listProps} />
          </div>
        )}
      </div>

      {/* ── Mobile: icon button ── */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label={t('searchLabel')}
        className="lg:hidden p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
      >
        <Search className="w-5 h-5" />
      </button>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-surface-default flex flex-col lg:hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
            <div className="flex flex-1 items-center gap-2 px-3 py-2 rounded-lg bg-surface-subtle border border-border-subtle focus-within:border-text-brand transition-colors">
              <Search className="w-4 h-4 shrink-0 text-text-secondary" />
              {sharedInput(mobileInputRef, 'flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary outline-none')}
              {inputValue && (
                <button onClick={() => { setInputValue(''); setResultRows([]); mobileInputRef.current?.focus(); }} aria-label="Clear" className="text-text-secondary hover:text-text-primary">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button onClick={() => setMobileOpen(false)} aria-label="Close search" className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ResultsList {...listProps} padded />
          </div>
        </div>
      )}
    </>
  );
}
