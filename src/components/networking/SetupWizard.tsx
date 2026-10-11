'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Loader2, ShieldCheck } from 'lucide-react';
import GoalsEditor from './GoalsEditor';
import { AboutEditor, AvailabilityEditor, HowToMeetEditor, VisibilityEditor } from './PreferenceEditors';
import { Chip, InlineNotice, focusRing } from './primitives';
import { ChipRow } from './PersonParts';
import type { NetworkingDraft, SuggestFn } from './draft';
import type { LabelFn } from '@/lib/networkingTaxonomy';
import type { NetworkingVisibility, PrefillData, TaxonomyItem } from '@/services/gql/networking';

export const CONSENT_VERSION = 'networking-v1';
const STEPS = ['intro', 'profile', 'goals', 'meet', 'visibility', 'review'] as const;
type Step = (typeof STEPS)[number];

const FIELD_BY_PREFIX: Record<string, 'roles' | 'interests' | 'offers' | 'industries' | 'markets' | 'languages'> = {
  role: 'roles', interest: 'interests', capability: 'offers', industry: 'industries', market: 'markets', language: 'languages',
};

const primary = `inline-flex min-h-11 items-center justify-center rounded-full bg-surface-brand px-6 text-sm font-semibold text-text-white disabled:opacity-50 ${focusRing}`;
const secondary = `inline-flex min-h-11 items-center justify-center rounded-full border border-border-subtle px-5 text-sm font-medium text-text-primary disabled:opacity-50 ${focusRing}`;

export interface WizardProps {
  draft: NetworkingDraft;
  onDraft: (d: NetworkingDraft) => void;
  taxonomy: TaxonomyItem[];
  labelOf: LabelFn;
  prefill: PrefillData | null;
  allowedVisibility: NetworkingVisibility[];
  aiConsent: boolean;
  onEnableAi?: () => void;
  suggest?: SuggestFn;
  days: string[];
  timeZone: string;
  saving: boolean;
  /** Persist as a draft (no consent needed), then leave. */
  onSaveLater: () => void;
  /** Opt in. Only callable once consent is ticked. */
  onJoin: (consent: boolean) => void;
  initialStep?: number;
}

/**
 * Six steps: what this is + consent, what we already know (kept apart from
 * suggestions), goals, how/when to meet, who can see you, review and join.
 * AI help is off until the person turns it on in the goals step.
 */
export default function SetupWizard(p: WizardProps) {
  const t = useTranslations('networking.wizard');
  const tp = useTranslations('networking.person');
  const [step, setStep] = useState(p.initialStep ?? 0);
  const [consent, setConsent] = useState(false);
  const id: Step = STEPS[step];
  const d = p.draft;

  const addFromProfile = (code: string) => {
    const field = FIELD_BY_PREFIX[code.split('.')[0]];
    if (!field) return;
    const list = d[field];
    p.onDraft({ ...d, [field]: list.includes(code) ? list.filter((c) => c !== code) : [...list, code].slice(0, 12) });
  };
  const taken = useMemo(() => new Set([...d.roles, ...d.interests, ...d.offers, ...d.industries, ...d.markets, ...d.languages]), [d]);
  const known = new Set(p.taxonomy.map((i) => i.code));
  const usableCodes = (p.prefill?.matchedCodes ?? []).filter((c) => known.has(c.code));

  const useProfileDetails = () =>
    p.onDraft({
      ...d,
      headline: d.headline || p.prefill?.headline || '',
      organization: d.organization || p.prefill?.organization || '',
      locationLabel: d.locationLabel || p.prefill?.locationLabel || '',
      intro: d.intro || p.prefill?.intro || '',
    });

  return (
    <div data-testid="wizard" className="space-y-5">
      <nav aria-label={t('progress')}>
        <ol className="flex flex-wrap gap-2">
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === step ? 'step' : undefined} className={`flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium ${i === step ? 'bg-surface-brand text-text-white' : i < step ? 'bg-surface-success text-text-success' : 'bg-surface-subtle text-muted-foreground'}`}>
              {i < step ? <Check className="size-3" aria-hidden /> : <span aria-hidden>{i + 1}</span>}
              <span className={i === step ? '' : 'hidden sm:inline'}>{t(`steps.${s}`)}</span>
            </li>
          ))}
        </ol>
      </nav>

      <section className="rounded-2xl border border-border-subtle bg-surface-default p-4 sm:p-6" aria-labelledby="wizard-step-title">
        <h2 id="wizard-step-title" className="text-xl font-semibold text-text-primary">{t(`title.${id}`)}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t(`lead.${id}`)}</p>

        <div className="mt-5 space-y-5">
          {id === 'intro' && (
            <>
              <ul className="space-y-2 text-sm text-text-primary">
                {(['what', 'who', 'control', 'ai'] as const).map((k) => (
                  <li key={k} className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-text-brand" aria-hidden />{t(`intro.${k}`)}</li>
                ))}
              </ul>
              <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border-2 border-border-subtle p-3 focus-within:ring-2 focus-within:ring-text-brand">
                <input data-testid="consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-5 accent-[var(--text-brand)]" />
                <span className="text-sm text-text-primary">{t('intro.consent')}</span>
              </label>
            </>
          )}

          {id === 'profile' && (
            <>
              <div data-testid="from-profile">
                <h3 className="text-sm font-semibold text-text-primary">{t('profile.fromProfile')}</h3>
                {usableCodes.length === 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">{t('profile.nothing')}</p>
                ) : (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {usableCodes.map((c) => {
                      const on = taken.has(c.code);
                      return (
                        <li key={c.code}>
                          <button type="button" aria-pressed={on} onClick={() => addFromProfile(c.code)} className={`inline-flex min-h-8 items-center gap-1 rounded-full border px-3 text-sm ${on ? 'border-border-brand bg-surface-brand-subtle text-text-brand' : 'border-border-subtle bg-surface-default text-text-primary'} ${focusRing}`}>
                            {on && <Check className="size-3" aria-hidden />}{p.labelOf(c.code)}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="mt-2 text-xs text-muted-foreground">{t('profile.separate')}</p>
              </div>
              {(p.prefill?.headline || p.prefill?.organization || p.prefill?.locationLabel || p.prefill?.intro) && (
                <button type="button" onClick={useProfileDetails} className={secondary}>{t('profile.useDetails')}</button>
              )}
              {(p.prefill?.unavailableFields?.length ?? 0) > 0 && <p className="text-xs text-muted-foreground">{t('profile.unavailable')}</p>}
            </>
          )}

          {id === 'goals' && (
            <GoalsEditor draft={d} onChange={p.onDraft} taxonomy={p.taxonomy} labelOf={p.labelOf} suggest={p.suggest} aiConsent={p.aiConsent} onEnableAi={p.onEnableAi} extended />
          )}

          {id === 'meet' && (
            <>
              <HowToMeetEditor draft={d} onChange={p.onDraft} />
              <AvailabilityEditor days={p.days} timeZone={p.timeZone} slots={d.availability} onChange={(a) => p.onDraft({ ...d, availability: a })} />
              <AboutEditor draft={d} onChange={p.onDraft} />
            </>
          )}

          {id === 'visibility' && <VisibilityEditor draft={d} onChange={p.onDraft} allowed={p.allowedVisibility} />}

          {id === 'review' && (
            <div className="space-y-4" data-testid="review">
              <dl className="space-y-3 text-sm">
                {([['needs', d.needs], ['offers', d.offers], ['interests', d.interests], ['industries', d.industries]] as const).map(([k, list]) => (
                  <div key={k}>
                    <dt className="font-semibold text-text-primary">{t(`review.${k}`)}</dt>
                    <dd className="mt-1">{list.length > 0 ? <ChipRow codes={[...list]} labelOf={p.labelOf} max={8} /> : <span className="text-muted-foreground">{t('review.none')}</span>}</dd>
                  </div>
                ))}
                <div>
                  <dt className="font-semibold text-text-primary">{t('review.visibility')}</dt>
                  <dd><Chip tone="brand">{tp(`visibilityMode.${d.visibility}`)}</Chip></dd>
                </div>
              </dl>
              {!consent && <InlineNotice tone="warning" testId="review-consent-missing">{t('review.consentMissing')}</InlineNotice>}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4">
          <button type="button" onClick={p.onSaveLater} disabled={p.saving} data-testid="save-later" className={`${secondary} text-text-brand`}>{t('saveLater')}</button>
          <div className="flex gap-2">
            {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className={secondary}>{t('back')}</button>}
            {step < STEPS.length - 1 ? (
              <button type="button" data-testid="wizard-next" disabled={id === 'intro' && !consent} onClick={() => setStep(step + 1)} className={primary}>{t('next')}</button>
            ) : (
              <button type="button" data-testid="wizard-join" disabled={!consent || p.saving} onClick={() => p.onJoin(consent)} className={primary}>
                {p.saving && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}{t('join')}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
