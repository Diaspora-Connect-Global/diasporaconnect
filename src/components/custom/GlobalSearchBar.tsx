'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLazyQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { Search, X, Clock, TrendingUp, Users, Briefcase, CalendarDays } from 'lucide-react';

import { useSearchStore } from '@/store/useSearchStore';
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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildRows(uData: any, oData: any, eData: any, locale: string): ResultRow[] {
  const rows: ResultRow[] = [];

  (uData?.searchUsers?.profiles ?? []).slice(0, 2).forEach((p: any) => {
    rows.push({
      id: `user-${p.userId}`,
      label: `${p.firstName} ${p.lastName}`.trim(),
      subtext: p.headline ?? p.sector ?? p.residenceCountry,
      icon: <Users className="w-4 h-4 shrink-0 text-text-secondary" />,
      href: `/${locale}/profile/${p.userId}`,
    });
  });

  (oData?.searchOpportunities?.opportunities ?? []).slice(0, 2).forEach((o: any) => {
    rows.push({
      id: `opp-${o.id}`,
      label: o.title,
      subtext: o.category ?? o.type,
      icon: <Briefcase className="w-4 h-4 shrink-0 text-text-secondary" />,
      href: `/${locale}/opportunities/${o.id}`,
    });
  });

  (eData?.searchEvents?.events ?? []).slice(0, 2).forEach((e: any) => {
    rows.push({
      id: `event-${e.id}`,
      label: e.title,
      subtext: e.startAt ? new Date(e.startAt).toLocaleDateString() : e.eventCategory,
      icon: <CalendarDays className="w-4 h-4 shrink-0 text-text-secondary" />,
      href: `/${locale}/events/${e.id}`,
    });
  });

  return rows;
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
        <div className={`${px} ${py} text-sm text-text-secondary`}>{t('noResults')}</div>
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

  const { recentSearches, addRecentSearch, clearRecentSearches } = useSearchStore();

  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [resultRows, setResultRows] = useState<ResultRow[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [searchUsers, { loading: uLoading, data: uData }] = useLazyQuery(SEARCH_USERS);
  const [searchOpps, { loading: oLoading, data: oData }] = useLazyQuery(SEARCH_OPPORTUNITIES);
  const [searchEvents, { loading: eLoading, data: eData }] = useLazyQuery(SEARCH_EVENTS);

  const loading = uLoading || oLoading || eLoading;

  useEffect(() => {
    if (inputValue.trim().length < 2) { setResultRows([]); return; }
    setResultRows(buildRows(uData, oData, eData, locale));
  }, [uData, oData, eData, locale, inputValue]);

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
      setInputValue('');
      setResultRows([]);
    }
  }, [mobileOpen]);

  const runTypeahead = useCallback((q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) { setResultRows([]); return; }
    searchUsers({ variables: { searchUsersInput: { query: trimmed, limit: 3, offset: 0 } } });
    searchOpps({ variables: { query: trimmed, limit: 3, offset: 0 } });
    searchEvents({ variables: { query: trimmed, limit: 3, offset: 0 } });
  }, [searchUsers, searchOpps, searchEvents]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runTypeahead(value), 300);
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
