'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { DISCOVER_CATEGORY_KEYS, type DiscoverCategoryKey, type DiscoverSort } from './discoverCategories';

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
  const dirty = categories.length > 0 || !!location || sort !== 'newest';
  const field = 'w-full rounded-lg border border-border-subtle bg-surface-default px-3 py-2 text-base text-text-primary focus-visible:border-border-brand focus-visible:outline-none md:text-sm';

  return (
    <aside aria-labelledby="discover-refine-title" data-testid="discover-refine" className="space-y-5 rounded-2xl border border-border-subtle bg-surface-default p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 id="discover-refine-title" className="text-base font-bold text-text-primary">
          {t('title')}
        </h2>
        {dirty && (
          <button type="button" onClick={onClear} className="text-xs font-medium text-text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
            {t('clearAll')}
          </button>
        )}
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-text-primary">{t('category')}</legend>
        <ul className="space-y-1">
          {DISCOVER_CATEGORY_KEYS.map((k) => (
            <li key={k}>
              <label className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-1 py-1.5 text-sm text-text-primary hover:bg-surface-subtle">
                <span>{tCat(k)}</span>
                <input type="checkbox" checked={categories.includes(k)} onChange={() => onToggleCategory(k)} className="size-4 accent-[var(--surface-brand)]" />
              </label>
            </li>
          ))}
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
          <option value="applications">{t('sort.applications')}</option>
        </select>
      </div>
    </aside>
  );
}
