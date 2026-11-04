'use client';

import { useState } from 'react';
import { ArrowRight, ShieldCheck, Store, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Section } from '@/components/redesign/Section';
import { ICON_CHIP_CLASS } from '@/components/more/MoreLinkCard';
import { PRIMARY_BUTTON_CLASS } from './StepFrame';

const SLIDES: Array<{ key: 'slide1' | 'slide2' | 'slide3'; icon: LucideIcon }> = [
  { key: 'slide1', icon: Store },
  { key: 'slide2', icon: Users },
  { key: 'slide3', icon: ShieldCheck },
];

/** The three-slide welcome (Skip jumps to the last slide, Finish moves on), as one card. */
export function IntroCard({ onFinish }: { onFinish: () => void }) {
  const t = useTranslations('vendorOnboarding');
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;
  const { key, icon: Icon } = SLIDES[index];
  return (
    <Section labelledBy="vendor-intro-title" testId="vendor-intro" className="sm:p-6">
      <div className="flex flex-col items-center gap-4 py-2 text-center sm:py-6">
        <span className={`grid size-16 place-items-center rounded-full ${ICON_CHIP_CLASS}`}>
          <Icon className="size-8" strokeWidth={1.5} aria-hidden />
        </span>
        <div aria-live="polite" className="max-w-xl space-y-2">
          <h2 id="vendor-intro-title" className="text-xl font-bold leading-tight text-text-primary sm:text-2xl">
            {t(`intro.${key}.title`)}
          </h2>
          <p className="text-sm leading-relaxed text-text-secondary sm:text-base">{t(`intro.${key}.description`)}</p>
        </div>
        <div role="img" aria-label={t('intro.progress', { current: index + 1, total: SLIDES.length })} className="flex justify-center gap-2">
          {SLIDES.map((s, i) => (
            <span key={s.key} aria-hidden className={`h-2 rounded-full transition-all ${i === index ? 'w-4 bg-surface-brand' : 'w-2 bg-surface-disabled'}`} />
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 border-t border-border-subtle pt-4">
        {!last ? (
          <button type="button" onClick={() => setIndex(SLIDES.length - 1)} className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium text-text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
            {t('common.skip')}
          </button>
        ) : (
          <span />
        )}
        <button type="button" onClick={() => (last ? onFinish() : setIndex((i) => i + 1))} className={PRIMARY_BUTTON_CLASS}>
          {last ? t('common.finish') : t('common.next')}
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </Section>
  );
}
