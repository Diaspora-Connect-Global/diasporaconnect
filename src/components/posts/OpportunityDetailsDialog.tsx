'use client';

import { useId, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { OpportunitySuggestedType } from '@/lib/opportunityDetection';
import {
  APPLY_METHODS,
  COMMITMENT_TYPES,
  DELIVERY_MODES,
  OPPORTUNITY_CURRENCIES,
  OPPORTUNITY_TYPES,
  TITLE_MAX,
  emptyFormValues,
  todayIso,
  toAttached,
  toFormValues,
  validateOpportunityForm,
  type AttachedOpportunity,
  type OpportunityFormErrors,
  type OpportunityFormValues,
} from '@/lib/opportunityDraft';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The post text: the title is prefilled from its first line, the description IS the post. */
  postText: string;
  suggestedType: OpportunitySuggestedType | null;
  /** Set when editing a job that is already attached. */
  initial?: AttachedOpportunity | null;
  onSave: (job: AttachedOpportunity) => void;
}

const FIELD =
  'w-full min-h-11 rounded-lg border border-border-subtle bg-surface-default px-3 py-2 text-base text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand aria-[invalid=true]:border-text-danger';
const LABEL = 'mb-1 block text-sm font-medium text-text-primary';
const ERROR = 'mt-1 text-sm text-text-danger';

/**
 * Short form that turns a post into a listing. Radix Dialog: focus is trapped, Esc closes
 * only this dialog (not the composer behind it) and focus returns to the opener.
 * Pay is typed in MAJOR units; `toAttached` converts to minor units once, on save.
 */
export default function OpportunityDetailsDialog({ open, onOpenChange, postText, suggestedType, initial, onSave }: Props) {
  const t = useTranslations('createPost.opportunity');
  const tTypes = useTranslations('redesign.opportunityTypes');
  const tCommit = useTranslations('redesign.commitmentTypes');
  const [values, setValues] = useState<OpportunityFormValues>(() =>
    initial ? toFormValues(initial) : emptyFormValues(postText, suggestedType),
  );
  const [errors, setErrors] = useState<OpportunityFormErrors>({});
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;

  const set = <K extends keyof OpportunityFormValues>(key: K, value: OpportunityFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // a portal'd form's submit would otherwise bubble to React ancestors
    const found = validateOpportunityForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = (['title', 'pay', 'deadline', 'externalLink', 'applicationEmail'] as const).find((k) => found[k]);
      const target = first === 'pay' ? 'payMin' : first;
      if (target) document.getElementById(id(target))?.focus();
      return;
    }
    onSave(toAttached(values));
    onOpenChange(false);
  };

  const err = (k: keyof OpportunityFormErrors) => (errors[k] ? t(`errors.${errors[k]}`) : null);
  const describedBy = (k: keyof OpportunityFormErrors, extra?: string) =>
    [errors[k] ? id(`${k}-err`) : null, extra].filter(Boolean).join(' ') || undefined;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/50" />
        <DialogPrimitive.Content
          data-testid="opportunity-details-dialog"
          className="fixed inset-0 z-[60] flex h-dvh w-full flex-col overflow-hidden bg-surface-default focus:outline-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[90dvh] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:border-border-subtle sm:shadow-xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
            <DialogPrimitive.Title className="min-w-0 text-base font-bold text-text-primary sm:text-lg">{t('dialog.title')}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">{t('dialog.description')}</DialogPrimitive.Description>
            <DialogPrimitive.Close
              aria-label={t('dialog.close')}
              className="grid size-9 shrink-0 place-items-center rounded-full text-text-secondary hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
            >
              <X className="size-5" aria-hidden />
            </DialogPrimitive.Close>
          </div>

          <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-4">
              <div>
                <label htmlFor={id('type')} className={LABEL}>{t('fields.type')}</label>
                <select id={id('type')} className={FIELD} value={values.type} onChange={(e) => set('type', e.target.value as OpportunitySuggestedType)}>
                  {OPPORTUNITY_TYPES.map((o) => (
                    <option key={o} value={o}>{tTypes(o)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={id('title')} className={LABEL}>{t('fields.title')}</label>
                <input
                  id={id('title')}
                  className={FIELD}
                  value={values.title}
                  maxLength={TITLE_MAX + 50}
                  onChange={(e) => set('title', e.target.value)}
                  aria-invalid={!!errors.title}
                  aria-describedby={describedBy('title')}
                  aria-required="true"
                  autoComplete="off"
                />
                {errors.title && <p id={id('title-err')} className={ERROR}>{err('title')}</p>}
              </div>

              <div>
                <label htmlFor={id('location')} className={LABEL}>{t('fields.location')}</label>
                <input id={id('location')} className={FIELD} value={values.location} maxLength={200} onChange={(e) => set('location', e.target.value)} autoComplete="off" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <label htmlFor={id('delivery')} className={LABEL}>{t('fields.deliveryMode')}</label>
                  <select id={id('delivery')} className={FIELD} value={values.deliveryMode} onChange={(e) => set('deliveryMode', e.target.value as OpportunityFormValues['deliveryMode'])}>
                    <option value="">{t('fields.notSpecified')}</option>
                    {DELIVERY_MODES.map((o) => (
                      <option key={o} value={o}>{t(`deliveryModes.${o}`)}</option>
                    ))}
                  </select>
                </div>
                <div className="min-w-0">
                  <label htmlFor={id('commitment')} className={LABEL}>{t('fields.commitmentType')}</label>
                  <select id={id('commitment')} className={FIELD} value={values.commitmentType} onChange={(e) => set('commitmentType', e.target.value as OpportunityFormValues['commitmentType'])}>
                    <option value="">{t('fields.notSpecified')}</option>
                    {COMMITMENT_TYPES.map((o) => (
                      <option key={o} value={o}>{tCommit(o)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <fieldset className="min-w-0">
                <legend className={LABEL}>{t('fields.payLegend')}</legend>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="min-w-0">
                    <label htmlFor={id('payMin')} className="mb-1 block text-xs text-text-secondary">{t('fields.payMin')}</label>
                    <input id={id('payMin')} inputMode="decimal" className={FIELD} value={values.payMin} onChange={(e) => set('payMin', e.target.value)} aria-invalid={!!errors.pay} aria-describedby={describedBy('pay')} autoComplete="off" />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor={id('payMax')} className="mb-1 block text-xs text-text-secondary">{t('fields.payMax')}</label>
                    <input id={id('payMax')} inputMode="decimal" className={FIELD} value={values.payMax} onChange={(e) => set('payMax', e.target.value)} aria-invalid={!!errors.pay} aria-describedby={describedBy('pay')} autoComplete="off" />
                  </div>
                  <div className="col-span-2 min-w-0 sm:col-span-1">
                    <label htmlFor={id('currency')} className="mb-1 block text-xs text-text-secondary">{t('fields.currency')}</label>
                    <select id={id('currency')} className={FIELD} value={values.currency} onChange={(e) => set('currency', e.target.value)}>
                      {OPPORTUNITY_CURRENCIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {errors.pay && <p id={id('pay-err')} className={ERROR}>{err('pay')}</p>}
                <p className="mt-1 text-xs text-text-secondary">{t('fields.payHint')}</p>
              </fieldset>

              <div>
                <label htmlFor={id('deadline')} className={LABEL}>{t('fields.deadline')}</label>
                <input
                  id={id('deadline')}
                  type="date"
                  min={todayIso()}
                  className={FIELD}
                  value={values.deadline}
                  onChange={(e) => set('deadline', e.target.value)}
                  aria-invalid={!!errors.deadline}
                  aria-describedby={describedBy('deadline')}
                />
                {errors.deadline && <p id={id('deadline-err')} className={ERROR}>{err('deadline')}</p>}
              </div>

              <fieldset className="min-w-0">
                <legend className={LABEL}>{t('fields.applyHow')}</legend>
                <div className="space-y-2">
                  {APPLY_METHODS.map((m) => (
                    <label key={m} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border-subtle px-3 py-2 text-sm text-text-primary has-[:checked]:border-border-brand has-[:checked]:bg-surface-brand-light/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-text-brand">
                      <input type="radio" name={id('method')} value={m} checked={values.applicationMethod === m} onChange={() => set('applicationMethod', m)} className="size-4 accent-[#186682]" />
                      <span>{t(`apply.${m}`)}</span>
                    </label>
                  ))}
                </div>
                {values.applicationMethod === 'EXTERNAL_LINK' && (
                  <div className="mt-3">
                    <label htmlFor={id('externalLink')} className={LABEL}>{t('fields.externalLink')}</label>
                    <input id={id('externalLink')} type="url" inputMode="url" placeholder="https://" className={FIELD} value={values.externalLink} onChange={(e) => set('externalLink', e.target.value)} aria-invalid={!!errors.externalLink} aria-describedby={describedBy('externalLink')} aria-required="true" autoComplete="off" />
                    {errors.externalLink && <p id={id('externalLink-err')} className={ERROR}>{err('externalLink')}</p>}
                  </div>
                )}
                {values.applicationMethod === 'EMAIL_REQUEST' && (
                  <div className="mt-3">
                    <label htmlFor={id('applicationEmail')} className={LABEL}>{t('fields.applicationEmail')}</label>
                    <input id={id('applicationEmail')} type="email" inputMode="email" className={FIELD} value={values.applicationEmail} onChange={(e) => set('applicationEmail', e.target.value)} aria-invalid={!!errors.applicationEmail} aria-describedby={describedBy('applicationEmail')} aria-required="true" autoComplete="off" />
                    {errors.applicationEmail && <p id={id('applicationEmail-err')} className={ERROR}>{err('applicationEmail')}</p>}
                  </div>
                )}
              </fieldset>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-border-subtle p-4 sm:flex-row sm:justify-end">
              <DialogPrimitive.Close className="min-h-11 rounded-full border border-border-subtle px-5 py-2 text-sm font-semibold text-text-primary hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
                {t('dialog.cancel')}
              </DialogPrimitive.Close>
              <button type="submit" className="min-h-11 rounded-full bg-surface-brand px-5 py-2 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2">
                {t('dialog.save')}
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
