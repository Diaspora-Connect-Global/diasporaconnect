'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { TYPE_KEYS, type CategorySort, type CategoryType } from './categoryFilters';

/**
 * "Refine" rail of a category page: the opportunity type (radio group), a
 * free-text location and the sort order. Each control changes the list query.
 * Phones: a closed disclosure so the listings come first; `lg`: always open.
 */
export function CategoryRefinePanel({
    type,
    location,
    sort,
    onType,
    onLocation,
    onSort,
    onClear,
}: {
    type: CategoryType | null;
    location: string;
    sort: CategorySort;
    onType: (value: CategoryType | null) => void;
    onLocation: (value: string) => void;
    onSort: (value: CategorySort) => void;
    onClear: () => void;
}) {
    const t = useTranslations('opportunityCategory.filters');
    const tTypes = useTranslations('redesign.opportunityTypes');
    const [draft, setDraft] = useState(location);
    useEffect(() => setDraft(location), [location]);
    const [open, setOpen] = useState(false);
    const active = (type ? 1 : 0) + (location ? 1 : 0) + (sort !== 'newest' ? 1 : 0);
    const field = 'min-h-11 w-full rounded-lg border border-border-subtle bg-surface-default px-3 py-2 text-base text-text-primary focus-visible:border-border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand md:text-sm';
    const row = 'flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-1 text-sm text-text-primary hover:bg-surface-subtle has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-text-brand';

    return (
        <aside aria-labelledby="opp-cat-refine-title" data-testid="opp-category-refine" className="rounded-2xl border border-border-subtle bg-surface-default p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <h2 id="opp-cat-refine-title" className="text-base font-bold text-text-primary">
                    <button
                        type="button"
                        aria-expanded={open}
                        aria-controls="opp-cat-refine-body"
                        onClick={() => setOpen((o) => !o)}
                        className="flex min-h-11 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand lg:hidden"
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
                {active > 0 && (
                    <button type="button" onClick={onClear} className="inline-flex min-h-11 items-center rounded-md px-1 text-xs font-medium text-text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
                        {t('clearAll')}
                    </button>
                )}
            </div>
            <div id="opp-cat-refine-body" className={`mt-3 space-y-5 lg:block ${open ? 'block' : 'hidden'}`}>
                <fieldset>
                    <legend className="mb-1 text-sm font-semibold text-text-primary">{t('type')}</legend>
                    <div className="space-y-0.5">
                        <label className={row}>
                            <input type="radio" name="opp-cat-type" checked={type === null} onChange={() => onType(null)} className="size-4 accent-[var(--surface-brand)]" />
                            {t('typeAll')}
                        </label>
                        {TYPE_KEYS.map((k) => (
                            <label key={k} className={row}>
                                <input type="radio" name="opp-cat-type" checked={type === k} onChange={() => onType(k)} className="size-4 accent-[var(--surface-brand)]" />
                                {tTypes(k)}
                            </label>
                        ))}
                    </div>
                </fieldset>
                <div>
                    <label htmlFor="opp-cat-location" className="mb-2 block text-sm font-semibold text-text-primary">
                        {t('location')}
                    </label>
                    {/* 16px on phones: iOS Safari zooms the page into smaller fields. */}
                    <input
                        id="opp-cat-location"
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
                    <label htmlFor="opp-cat-sort" className="mb-2 block text-sm font-semibold text-text-primary">
                        {t('sortBy')}
                    </label>
                    <select id="opp-cat-sort" value={sort} onChange={(e) => onSort(e.target.value as CategorySort)} className={field}>
                        <option value="newest">{t('sort.newest')}</option>
                        <option value="closing">{t('sort.closing')}</option>
                    </select>
                </div>
            </div>
        </aside>
    );
}
