'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';

export const MARKETPLACE_CURRENCIES = ['GHS', 'USD', 'EUR', 'GBP', 'NGN', 'KES'] as const;

export type MarketplaceFilters = { tag: string; cur: string; min: string; max: string };

/**
 * "Refine your search" for the marketplace. Every control changes a real query:
 * tags and currency apply to products, the price range to both. The panel is a
 * closed disclosure on phones (listings first) and always open at `lg`.
 */
export function MarketplaceRefinePanel({
  isProducts,
  filters,
  tags,
  onChange,
  onClear,
}: {
  isProducts: boolean;
  filters: MarketplaceFilters;
  tags: readonly string[];
  onChange: (next: Partial<MarketplaceFilters>) => void;
  onClear: () => void;
}) {
  const t = useTranslations('marketplacePage');
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState(filters.min);
  const [max, setMax] = useState(filters.max);
  useEffect(() => setMin(filters.min), [filters.min]);
  useEffect(() => setMax(filters.max), [filters.max]);
  const active = (isProducts && filters.tag ? 1 : 0) + (isProducts && filters.cur ? 1 : 0) + (filters.min ? 1 : 0) + (filters.max ? 1 : 0);
  const field = 'w-full rounded-lg border border-border-subtle bg-surface-default px-3 py-2 text-base text-text-primary focus-visible:border-border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand md:text-sm';
  const commit = () => onChange({ min, max });

  return (
    <aside aria-labelledby="mp-refine-title" data-testid="mp-refine" className="rounded-2xl border border-border-subtle bg-surface-default p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 id="mp-refine-title" className="text-base font-bold text-text-primary">
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mp-refine-body"
            onClick={() => setOpen((o) => !o)}
            className="flex min-h-11 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand lg:hidden"
          >
            <SlidersHorizontal className="size-4 text-text-secondary" aria-hidden />
            {t('refineTitle')}
            {active > 0 && (
              <>
                <span aria-hidden className="grid min-w-5 place-items-center rounded-full bg-surface-brand px-1.5 text-[11px] font-semibold text-white">{active}</span>
                <span className="sr-only">{t('active', { count: active })}</span>
              </>
            )}
            <ChevronDown className={`size-4 text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          <span className="hidden lg:inline">{t('refineTitle')}</span>
        </h2>
        {active > 0 && (
          <button type="button" onClick={onClear} className="min-h-11 px-1 text-xs font-medium text-text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
            {t('clearAll')}
          </button>
        )}
      </div>

      <div id="mp-refine-body" className={`mt-3 space-y-5 lg:block ${open ? 'block' : 'hidden'}`}>
        {isProducts && tags.length > 0 && (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-text-primary">{t('tags')}</legend>
            <ul className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const on = filters.tag === tag;
                return (
                  <li key={tag}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => onChange({ tag: on ? '' : tag })}
                      className={`min-h-9 max-w-full truncate rounded-full border px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand ${on ? 'border-border-brand bg-surface-brand-subtle text-text-brand' : 'border-border-subtle bg-surface-default text-text-primary hover:bg-surface-subtle'}`}
                    >
                      {tag}
                    </button>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        )}

        {isProducts && (
          <div>
            <label htmlFor="mp-currency" className="mb-2 block text-sm font-semibold text-text-primary">{t('currency')}</label>
            <select id="mp-currency" value={filters.cur} onChange={(e) => onChange({ cur: e.target.value })} className={field}>
              <option value="">{t('anyCurrency')}</option>
              {MARKETPLACE_CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-text-primary">{t('price')}</legend>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="mp-min" className="sr-only">{t('min')}</label>
              <input id="mp-min" type="number" inputMode="decimal" min={0} step="0.01" placeholder={t('min')} value={min} onChange={(e) => setMin(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && commit()} className={field} />
            </div>
            <div>
              <label htmlFor="mp-max" className="sr-only">{t('max')}</label>
              <input id="mp-max" type="number" inputMode="decimal" min={0} step="0.01" placeholder={t('max')} value={max} onChange={(e) => setMax(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && commit()} className={field} />
            </div>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">{t('priceNote')}</p>
        </fieldset>
      </div>
    </aside>
  );
}
