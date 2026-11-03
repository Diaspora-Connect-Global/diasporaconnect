'use client';

import type { FormEvent, ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Section } from '@/components/redesign/Section';

const PRIMARY =
  'inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-surface-brand px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-surface-disabled disabled:text-text-secondary disabled:opacity-100';
const SECONDARY =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border-subtle bg-surface-default px-5 py-2.5 text-sm font-medium text-text-primary transition-colors hover:border-border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand';

export { PRIMARY as PRIMARY_BUTTON_CLASS, SECONDARY as SECONDARY_BUTTON_CLASS };

/**
 * One numbered form section: heading, subtitle, the fields, then Back / primary.
 * Submitting (button or Enter) is ignored while the primary is disabled and runs `onNext`
 * (errors are logged, not thrown), exactly as the old MultiStep did.
 */
export function StepFrame({
  id,
  number,
  title,
  subtitle,
  children,
  isNextDisabled = false,
  nextText,
  onNext,
  onBack,
}: {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  children: ReactNode;
  isNextDisabled?: boolean;
  nextText?: string;
  onNext: () => Promise<void> | void;
  onBack: () => void;
}) {
  const t = useTranslations('vendorOnboarding.common');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (isNextDisabled) return;
    try {
      await onNext();
    } catch (error) {
      console.error('Error in next handler:', error);
    }
  };
  return (
    <Section labelledBy={id} testId="vendor-step" className="sm:p-6">
      <form onSubmit={submit} aria-busy={isNextDisabled || undefined} className="space-y-5">
        <div className="flex items-start gap-3">
          <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-brand text-sm font-semibold text-white">
            {number}
          </span>
          <div className="min-w-0">
            <h2 id={id} className="text-lg font-bold leading-tight text-text-primary sm:text-xl">
              {title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {children}
        <div className="flex items-center justify-between gap-3 border-t border-border-subtle pt-4">
          <button type="button" onClick={onBack} className={SECONDARY}>
            <ArrowLeft className="size-4" aria-hidden />
            {t('back')}
          </button>
          <button type="submit" disabled={isNextDisabled} className={PRIMARY}>
            {nextText ?? t('continue')}
            <ArrowRight className="size-4" aria-hidden />
          </button>
        </div>
      </form>
    </Section>
  );
}
