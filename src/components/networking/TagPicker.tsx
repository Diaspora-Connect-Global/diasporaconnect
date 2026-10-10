'use client';

import { useId, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles, Search } from 'lucide-react';
import { RemovableChip, focusRing } from './primitives';
import type { TaxonomyItem } from '@/services/gql/networking';
import type { LabelFn } from '@/lib/networkingTaxonomy';

export const MAX_PICKS = 12;

/**
 * Pick values from the controlled vocabulary. There is no free tag creation:
 * codes are what matching runs on. Typing filters the list; the sparkle button
 * (when `onSuggest` is given) asks for suggestions for the typed text.
 */
export default function TagPicker({
  label,
  placeholder,
  items,
  value,
  onChange,
  labelOf,
  onSuggest,
  suggestBusy = false,
  max = MAX_PICKS,
  testId,
}: {
  label: string;
  placeholder: string;
  items: TaxonomyItem[];
  value: string[];
  onChange: (next: string[]) => void;
  labelOf: LabelFn;
  onSuggest?: (typed: string) => void;
  suggestBusy?: boolean;
  max?: number;
  testId?: string;
}) {
  const t = useTranslations('networking.picker');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputId = useId();
  const listId = useId();

  const selected = useMemo(() => new Set(value), [value]);
  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((i) => !selected.has(i.code))
      .filter((i) => !q || labelOf(i.code).toLowerCase().includes(q))
      .slice(0, 40);
  }, [items, selected, query, labelOf]);

  const atMax = value.length >= max;
  const add = (code: string) => {
    if (atMax || selected.has(code)) return;
    onChange([...value, code]);
    setQuery('');
  };

  return (
    <div data-testid={testId} className="space-y-2">
      <label htmlFor={inputId} className="text-sm font-semibold text-text-primary">{label}</label>
      <div className="relative">
        <div className="flex items-center gap-2 rounded-xl border-2 border-border-subtle bg-surface-subtle px-3 focus-within:border-border-brand">
          <Search className="size-4 shrink-0 text-text-secondary" aria-hidden />
          <input
            id={inputId}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            value={query}
            maxLength={120}
            disabled={atMax}
            placeholder={atMax ? t('maxReached', { max }) : placeholder}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
              if (e.key === 'Enter') {
                e.preventDefault();
                if (options[0]) add(options[0].code);
              }
            }}
            className="min-h-11 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
          />
          {onSuggest && (
            <button
              type="button"
              disabled={suggestBusy || query.trim().length < 3}
              onClick={() => onSuggest(query.trim())}
              aria-label={t('suggest')}
              title={t('suggest')}
              className={`inline-flex size-8 items-center justify-center rounded-full text-text-brand hover:bg-surface-brand-subtle disabled:opacity-40 ${focusRing}`}
            >
              <Sparkles className="size-4" aria-hidden />
            </button>
          )}
        </div>
        {open && options.length > 0 && !atMax && (
          <ul id={listId} role="listbox" aria-label={label} className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border-subtle bg-surface-default py-1 shadow-lg">
            {options.map((o) => (
              <li key={o.code} role="option" aria-selected={false}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(o.code)}
                  className={`flex min-h-9 w-full items-center px-3 text-left text-sm text-text-primary hover:bg-surface-brand-subtle ${focusRing}`}
                >
                  {labelOf(o.code)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <ul className="flex flex-wrap gap-2" aria-label={label}>
        {value.map((code) => (
          <li key={code}>
            <RemovableChip label={labelOf(code)} removeLabel={t('remove', { label: labelOf(code) })} onRemove={() => onChange(value.filter((c) => c !== code))} />
          </li>
        ))}
      </ul>
      {value.length === 0 && <p className="text-xs text-text-tertiary">{t('empty')}</p>}
    </div>
  );
}
