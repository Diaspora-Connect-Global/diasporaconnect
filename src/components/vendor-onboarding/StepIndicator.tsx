'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

const KEYS = ['welcome', 'offer', 'documents'] as const;

/** Three-step progress list. The current step carries `aria-current="step"` and a spoken "Step n of 3". */
export function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const t = useTranslations('vendorOnboarding.steps');
  return (
    <nav aria-label={t('label')} data-testid="vendor-steps">
      <ol className="flex items-start gap-2 rounded-2xl border border-border-subtle bg-surface-default p-3 shadow-sm sm:p-4">
        {KEYS.map((key, i) => {
          const n = i + 1;
          const done = n < current;
          const active = n === current;
          return (
            <li key={key} aria-current={active ? 'step' : undefined} data-state={done ? 'done' : active ? 'current' : 'todo'} className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center sm:flex-row sm:gap-3 sm:text-left">
              <span
                aria-hidden
                className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${active ? 'bg-surface-brand text-white' : done ? 'bg-surface-brand-light/60 text-text-brand' : 'bg-surface-disabled text-text-secondary'}`}
              >
                {done ? <Check className="size-4" /> : n}
              </span>
              <span className={`min-w-0 text-xs font-medium leading-tight sm:text-sm ${active ? 'text-text-primary' : 'text-text-secondary'}`}>
                <span className="sr-only">{t('stepOf', { current: n, total: KEYS.length })}: </span>
                {t(key)}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
