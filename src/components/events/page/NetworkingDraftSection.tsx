'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import type { NetworkingTaxonomyItem } from '@/services/gql/eventPageNetworking';

/** What the Register tab collects for a networking DRAFT. Codes only; no free text beyond one short note. */
export interface NetworkingDraft {
  industries: string[];
  interests: string[];
  offers: string[];
  needs: string[];
  note: string;
}
export const EMPTY_DRAFT: NetworkingDraft = { industries: [], interests: [], offers: [], needs: [], note: '' };
/** The profile table caps every list at 12 (and the gateway enforces it), so the picker does too. */
export const DRAFT_LIST_CAP = 12;
export const DRAFT_NOTE_MAX = 280;

export function draftIsEmpty(d: NetworkingDraft): boolean {
  return !d.industries.length && !d.interests.length && !d.offers.length && !d.needs.length && !d.note.trim();
}

/** "industry.real_estate" → "Real estate": only used when no translation exists for the code. */
function humanise(code: string): string {
  const last = code.split('.').pop() ?? code;
  const words = last.replace(/[_-]+/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : code;
}

type FieldKey = 'industries' | 'interests' | 'offers' | 'needs';

function MultiPick({
  id,
  label,
  placeholder,
  options,
  selected,
  onChange,
  tx,
}: {
  id: string;
  label: string;
  placeholder: string;
  options: Array<{ code: string; label: string }>;
  selected: string[];
  onChange: (next: string[]) => void;
  tx: { max: string };
}) {
  const t = useTranslations('eventRegister.networking');
  const labelOf = (code: string) => options.find((o) => o.code === code)?.label ?? humanise(code);
  const toggle = (code: string) => {
    if (selected.includes(code)) onChange(selected.filter((c) => c !== code));
    else if (selected.length < DRAFT_LIST_CAP) onChange([...selected, code]);
  };
  return (
    <div className="min-w-0">
      <p id={`${id}-label`} className="mb-1 text-xs font-medium text-text-secondary">{label}</p>
      <details className="group rounded-lg border border-border-subtle bg-surface-default">
        <summary
          aria-labelledby={`${id}-label`}
          className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm text-text-secondary [&::-webkit-details-marker]:hidden"
        >
          <span className="truncate">{selected.length ? t('selectedCount', { count: selected.length }) : placeholder}</span>
          <Plus className="size-4 shrink-0 transition-transform group-open:rotate-45" aria-hidden />
        </summary>
        <ul role="group" aria-labelledby={`${id}-label`} className="max-h-52 space-y-0.5 overflow-y-auto border-t border-border-subtle p-2">
          {options.map((o) => {
            const on = selected.includes(o.code);
            const blocked = !on && selected.length >= DRAFT_LIST_CAP;
            return (
              <li key={o.code}>
                <label className={`flex min-h-9 items-center gap-2 rounded-md px-2 text-sm ${blocked ? 'opacity-50' : 'cursor-pointer hover:bg-surface-hover'}`}>
                  <input type="checkbox" checked={on} disabled={blocked} onChange={() => toggle(o.code)} className="size-4 accent-surface-brand" />
                  <span className="text-text-primary">{o.label}</span>
                </label>
              </li>
            );
          })}
        </ul>
        {selected.length >= DRAFT_LIST_CAP && <p className="px-3 pb-2 text-xs text-text-secondary">{tx.max}</p>}
      </details>
      {selected.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((c) => (
            <li key={c} className="rounded-full bg-surface-info px-2.5 py-1 text-xs text-text-brand">{labelOf(c)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Optional networking profile, collected while registering and saved as a DRAFT
 * after the registration succeeds. Nothing here is shared with anyone; joining
 * networking is a separate, explicit step on the networking page.
 */
export default function NetworkingDraftSection({
  number,
  taxonomy,
  draft,
  onChange,
}: {
  number: number;
  taxonomy: NetworkingTaxonomyItem[];
  draft: NetworkingDraft;
  onChange: (next: NetworkingDraft) => void;
}) {
  const t = useTranslations('eventRegister.networking');
  // Taxonomy labels are i18n keys owned by the networking feature. Use the translation when
  // the app has one, otherwise a readable form of the code, never the raw key.
  const tRoot = useTranslations();
  const labelFor = (key: string | null | undefined, code: string) => {
    if (key && tRoot.has(key as never)) return tRoot(key as never);
    return humanise(code);
  };

  const lists = useMemo(() => {
    const sorted = [...taxonomy].sort((a, b) => a.sortOrder - b.sortOrder);
    const by = (kind: string) => sorted.filter((i) => i.kind === kind);
    return {
      industries: by('INDUSTRY').map((i) => ({ code: i.code, label: labelFor(i.labelKey, i.code) })),
      interests: by('INTEREST').map((i) => ({ code: i.code, label: labelFor(i.labelKey, i.code) })),
      offers: by('CAPABILITY').map((i) => ({ code: i.code, label: labelFor(i.offerLabelKey ?? i.labelKey, i.code) })),
      needs: by('CAPABILITY').map((i) => ({ code: i.code, label: labelFor(i.needLabelKey ?? i.labelKey, i.code) })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taxonomy, tRoot]);

  const fields: Array<{ key: FieldKey; label: string; placeholder: string }> = [
    { key: 'industries', label: t('industry'), placeholder: t('industryPlaceholder') },
    { key: 'interests', label: t('interests'), placeholder: t('interestsPlaceholder') },
    { key: 'offers', label: t('offers'), placeholder: t('offersPlaceholder') },
    { key: 'needs', label: t('needs'), placeholder: t('needsPlaceholder') },
  ].filter((f) => lists[f.key as FieldKey].length > 0) as Array<{ key: FieldKey; label: string; placeholder: string }>;
  if (fields.length === 0) return null;

  return (
    <section aria-labelledby="reg-networking" className="space-y-3 border-t border-border-subtle pt-5" data-testid="networking-draft-section">
      <div>
        <h3 id="reg-networking" className="text-base font-bold text-text-primary">
          {number}. {t('title')} <span className="text-sm font-normal text-text-secondary">({t('optional')})</span>
        </h3>
        <p className="text-sm text-text-secondary">{t('helper')}</p>
      </div>
      <div className="grid gap-4 rounded-xl bg-surface-subtle/50 p-4 sm:grid-cols-2">
        {fields.map((f) => (
          <MultiPick
            key={f.key}
            id={`draft-${f.key}`}
            label={f.label}
            placeholder={f.placeholder}
            options={lists[f.key]}
            selected={draft[f.key]}
            onChange={(next) => onChange({ ...draft, [f.key]: next })}
            tx={{ max: t('max', { count: DRAFT_LIST_CAP }) }}
          />
        ))}
        <div className="sm:col-span-2">
          <label htmlFor="draft-note" className="mb-1 block text-xs font-medium text-text-secondary">{t('note')}</label>
          <textarea
            id="draft-note"
            value={draft.note}
            maxLength={DRAFT_NOTE_MAX}
            rows={2}
            onChange={(e) => onChange({ ...draft, note: e.target.value })}
            className="w-full rounded-lg border border-border-subtle bg-surface-default px-3 py-2 text-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
          />
        </div>
      </div>
      <p className="text-xs text-text-secondary" data-testid="networking-draft-note">{t('draftNote')}</p>
    </section>
  );
}
