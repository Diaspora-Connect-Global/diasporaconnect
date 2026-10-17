'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { TONE_CLASS } from '@/components/more/MoreLinkCard';
import { CATEGORY_PHOTOS } from '@/lib/redesignImages';
import { DISCOVER_CATEGORY_KEYS, DISCOVER_ICONS, DISCOVER_TONES, type DiscoverCategoryKey, type DiscoverSort } from './discoverCategories';

/**
 * "Refine your search": category checkboxes, a free-text location and the sort
 * order. Location applies to opportunities (server-side) and events (by their
 * place text); the sort applies to opportunities. Nothing here is decorative —
 * each control changes a real query.
 */
export function RefinePanel({
  categories,
  location,
  sort,
  onToggleCategory,
  onLocation,
  onSort,
  onClear,
}: {
  categories: readonly DiscoverCategoryKey[];
  location: string;
  sort: DiscoverSort;
  onToggleCategory: (key: DiscoverCategoryKey) => void;
  onLocation: (value: string) => void;
  onSort: (value: DiscoverSort) => void;
  onClear: () => void;
}) {
  const t = useTranslations('discover.refine');
  const tCat = useTranslations('discover.categories');
  const [draft, setDraft] = useState(location);
  useEffect(() => setDraft(location), [location]);
  const active = categories.length + (location ? 1 : 0) + (sort !== 'newest' ? 1 : 0);
  const dirty = active > 0;
  // Phones: the panel is a closed disclosure so the listings come first; desktop: always open.
  const [open, setOpen] = useState(false);
  const field = 'w-full rounded-lg border border-border-subtle bg-surface-default px-3 py-2 text-base text-text-primary focus-visible:border-border-brand focus-visible:outline-none md:text-sm';

  return (
    <aside aria-labelledby="discover-refine-title" data-testid="discover-refine" className="rounded-2xl border border-border-subtle bg-surface-default p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 id="discover-refine-title" className="text-base font-bold text-text-primary">
          <button
            type="button"
            aria-expanded={open}
            aria-controls="discover-refine-body"
            onClick={() => setOpen((o) => !o)}
            className="flex min-h-6 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand lg:hidden"
          >
            <SlidersHorizontal className="size-4 text-text-secondary" aria-hidden />
            {t('title')}
            {active > 0 && (
              <>
                <span aria-hidden className="grid min-w-5 place-items-center rounded-full bg-surface-brand px-1.5 text-[11px] font-semibold text-white">{active}</span>
                <span className="sr-only">{t('active', { count: active })}</span>
              </>
            )}
            <ChevronDown className={`size-4 text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          <span className="hidden lg:inline">{t('title')}</span>
        </h2>
        {dirty && (
          <button type="button" onClick={onClear} className="text-xs font-medium text-text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
            {t('clearAll')}
          </button>
        )}
      </div>
      <div id="discover-refine-body" className={`mt-5 space-y-5 lg:block ${open ? 'block' : 'hidden'}`}>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-text-primary">{t('category')}</legend>
          <ul className="space-y-1">
            {DISCOVER_CATEGORY_KEYS.map((k) => {
              const Icon = DISCOVER_ICONS[k];
              return (
              <li key={k}>
                <label className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-1 py-1.5 text-sm text-text-primary hover:bg-surface-subtle">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${TONE_CLASS[DISCOVER_TONES[k]]}`}>
                      <Icon className="size-3.5" strokeWidth={2} aria-hidden />
                    </span>
                    <span className="truncate">{tCat(k)}</span>
                  </span>
                  <input type="checkbox" checked={categories.includes(k)} onChange={() => onToggleCategory(k)} className="size-4 accent-[var(--surface-brand)]" />
                </label>
              </li>
              );
            })}
          </ul>
        </fieldset>
        <div>
          <label htmlFor="discover-location" className="mb-2 block text-sm font-semibold text-text-primary">
            {t('location')}
          </label>
          <input
            id="discover-location"
            type="text"
            value={draft}
            maxLength={80}
            placeholder={t('locationPlaceholder')}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => draft.trim() !== location && onLocation(draft.trim())}
            onKeyDown={(e) => e.key === 'Enter' && onLocation(draft.trim())}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="discover-sort" className="mb-2 block text-sm font-semibold text-text-primary">
            {t('sortBy')}
          </label>
          <select id="discover-sort" value={sort} onChange={(e) => onSort(e.target.value as DiscoverSort)} className={field}>
            <option value="newest">{t('sort.newest')}</option>
            <option value="closing">{t('sort.closing')}</option>
          </select>
        </div>
      </div>
    </aside>
  );
}

/**
 * "Need help getting something done?" — the mockup's rail promo, pointed at a
 * real feature: it narrows Discover to services. No concierge is claimed
 * because none exists.
 */
export function DiscoverHelpCard({ onBrowseServices }: { onBrowseServices: () => void }) {
  const t = useTranslations('discover.help');
  return (
    <section aria-labelledby="discover-help-title" data-testid="discover-help" className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800 p-5 text-white shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={CATEGORY_PHOTOS.legal.src} alt="" width={720} height={480} loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover opacity-25" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/85 to-slate-900/30" aria-hidden />
      <div className="relative space-y-2">
        <h2 id="discover-help-title" className="text-lg font-bold leading-snug">{t('title')}</h2>
        <p className="text-sm text-white/85">{t('body')}</p>
        <button
          type="button"
          onClick={onBrowseServices}
          className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          {t('cta')}
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}
