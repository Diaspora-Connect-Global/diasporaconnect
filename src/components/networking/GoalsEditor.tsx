'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Briefcase, Sparkles, X } from 'lucide-react';
import TagPicker from './TagPicker';
import { Chip, focusRing } from './primitives';
import { itemsOfKind, type LabelFn } from '@/lib/networkingTaxonomy';
import type { TaxonomyItem } from '@/services/gql/networking';
import type { NetworkingDraft, SuggestFn, SuggestKind, SuggestResult } from './draft';

const MORE: Array<{ field: 'roles' | 'interests' | 'industries' | 'markets' | 'languages'; kind: 'ROLE' | 'INTEREST' | 'INDUSTRY' | 'MARKET' | 'LANGUAGE'; ai?: SuggestKind }> = [
  { field: 'roles', kind: 'ROLE', ai: 'ROLES' },
  { field: 'interests', kind: 'INTEREST', ai: 'INTERESTS' },
  { field: 'industries', kind: 'INDUSTRY' },
  { field: 'markets', kind: 'MARKET', ai: 'MARKETS' },
  { field: 'languages', kind: 'LANGUAGE' },
];

/** Suggestions under a picker: dismissible, and the person decides what to add. */
function SuggestionStrip({
  result,
  labelOf,
  taken,
  onAdd,
  onDismiss,
  aiConsent,
  onEnableAi,
}: {
  result: SuggestResult;
  labelOf: LabelFn;
  taken: string[];
  onAdd: (code: string) => void;
  onDismiss: () => void;
  aiConsent: boolean;
  onEnableAi?: () => void;
}) {
  const t = useTranslations('networking.suggest');
  const codes = result.codes.filter((c) => !taken.includes(c));
  return (
    <div data-testid="suggestion-strip" data-source={result.source} className="rounded-xl bg-surface-brand-subtle p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-text-brand">
          <Sparkles className="size-3.5" aria-hidden />
          {result.source === 'ai' ? t('titleAi') : t('titleOffline')}
        </p>
        <button type="button" onClick={onDismiss} aria-label={t('dismiss')} className={`inline-flex size-6 items-center justify-center rounded-full hover:bg-surface-brand-light ${focusRing}`}>
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
      {codes.length === 0 ? (
        <p className="mt-2 text-sm text-text-secondary">{t('none')}</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2" aria-label={t('listLabel')}>
          {codes.map((c) => (
            <li key={c}>
              <button type="button" onClick={() => onAdd(c)} className={`inline-flex min-h-8 items-center gap-1 rounded-full border border-border-brand/40 bg-surface-default px-3 text-sm text-text-brand hover:bg-surface-brand-light ${focusRing}`}>
                <span aria-hidden>+</span> {labelOf(c)}
              </button>
            </li>
          ))}
        </ul>
      )}
      {result.source === 'offline' && !aiConsent && onEnableAi && (
        <button type="button" onClick={onEnableAi} className={`mt-2 text-xs font-medium text-text-brand underline ${focusRing}`}>
          {t('enableAi')}
        </button>
      )}
    </div>
  );
}

/**
 * "Your networking goals": what you are looking for / what you can offer, plus
 * (in the wizard) the wider profile pickers. Suggestions are opt-in: without AI
 * consent the sparkle button uses the offline suggester and says so.
 */
export default function GoalsEditor({
  draft,
  onChange,
  taxonomy,
  labelOf,
  suggest,
  aiConsent,
  onEnableAi,
  extended = false,
}: {
  draft: NetworkingDraft;
  onChange: (next: NetworkingDraft) => void;
  taxonomy: TaxonomyItem[];
  labelOf: LabelFn;
  suggest?: SuggestFn;
  aiConsent: boolean;
  onEnableAi?: () => void;
  extended?: boolean;
}) {
  const t = useTranslations('networking.goals');
  const [strips, setStrips] = useState<Partial<Record<string, SuggestResult>>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const set = <K extends keyof NetworkingDraft>(k: K, v: NetworkingDraft[K]) => onChange({ ...draft, [k]: v });
  const capability = itemsOfKind(taxonomy, 'CAPABILITY');

  const runSuggest = async (field: string, kind: SuggestKind, text: string) => {
    if (!suggest) return;
    setBusy(field);
    try {
      const res = await suggest(kind, text);
      setStrips((s) => ({ ...s, [field]: res }));
    } finally {
      setBusy(null);
    }
  };
  const strip = (field: keyof NetworkingDraft & string, list: string[]) => {
    const r = strips[field];
    if (!r) return null;
    return (
      <SuggestionStrip
        result={r}
        labelOf={labelOf}
        taken={list}
        aiConsent={aiConsent}
        onEnableAi={onEnableAi}
        onAdd={(c) => set(field as 'needs', [...list, c].slice(0, 12))}
        onDismiss={() => setStrips((s) => ({ ...s, [field]: undefined }))}
      />
    );
  };

  return (
    <div data-testid="goals-editor" className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-brand-subtle text-text-brand"><Briefcase className="size-5" aria-hidden /></div>
        <div>
          <h2 className="text-base font-semibold text-text-primary sm:text-lg">{t('title')}</h2>
          <p className="text-sm text-text-secondary">{t('subtitle')}</p>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2 md:gap-6">
        <div className="space-y-3">
          <TagPicker testId="picker-needs" label={t('needs')} placeholder={t('needsPlaceholder')} items={capability} value={draft.needs} onChange={(v) => set('needs', v)} labelOf={labelOf} onSuggest={suggest ? (txt) => runSuggest('needs', 'NEEDS', txt) : undefined} suggestBusy={busy === 'needs'} />
          {strip('needs', draft.needs)}
        </div>
        <div className="space-y-3">
          <TagPicker testId="picker-offers" label={t('offers')} placeholder={t('offersPlaceholder')} items={capability} value={draft.offers} onChange={(v) => set('offers', v)} labelOf={labelOf} onSuggest={suggest ? (txt) => runSuggest('offers', 'OFFERS', txt) : undefined} suggestBusy={busy === 'offers'} />
          {strip('offers', draft.offers)}
        </div>
      </div>
      {!suggest ? null : (
        <p className="text-xs text-text-tertiary">{aiConsent ? t('aiOn') : t('aiOff')}</p>
      )}
      {extended && (
        <div className="grid gap-5 md:grid-cols-2 md:gap-6">
          {MORE.map(({ field, kind, ai }) => (
            <div key={field} className="space-y-3">
              <TagPicker
                testId={`picker-${field}`}
                label={t(`more.${field}`)}
                placeholder={t(`morePlaceholder.${field}`)}
                items={itemsOfKind(taxonomy, kind)}
                value={draft[field]}
                onChange={(v) => set(field, v)}
                labelOf={labelOf}
                onSuggest={suggest && ai ? (txt) => runSuggest(field, ai, txt) : undefined}
                suggestBusy={busy === field}
              />
              {strip(field, draft[field])}
            </div>
          ))}
        </div>
      )}
      {draft.needs.length + draft.offers.length === 0 && (
        <p className="text-xs text-text-tertiary"><Chip>{t('hintChip')}</Chip> {t('hint')}</p>
      )}
    </div>
  );
}
