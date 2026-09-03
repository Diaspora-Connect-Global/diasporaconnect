'use client';

import { useLocale, useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

import type { CircleAllowance } from './allowances';

/**
 * The one-line summary under the capacity cards: what the circle is on, and
 * whether anything is currently locked.
 *
 * ── WHY A SUMMARY AT ALL ────────────────────────────────────────────────────
 * The cards answer "which allowance?", and a lead scanning six of them still
 * has to work out the only question they actually came with: *is anything
 * blocked right now?* This states it once, in words, at the bottom.
 *
 * ── "OVER CAPACITY" IS A FACT, NOT A FAULT ──────────────────────────────────
 * It is warning-coloured because it is the state that explains a refusal, and
 * because a lead needs to find it quickly. It is NOT danger-coloured, and the
 * bar carries no coloured border: being over a cap breaks nothing, removes
 * nothing, and is usually the direct and intended result of a plan change the
 * circle made on purpose.
 *
 * ── UNLIMITED IS NOT ZERO ───────────────────────────────────────────────────
 * `limit === null` means UNLIMITED. The member line says so in words rather
 * than rendering "Up to 0 members", which is what reading the wire's
 * `intValue: 0` directly would produce — see `allowances.ts`.
 */
export interface PlanStatusBarProps {
  /** Display name of the current plan. Never used to decide anything. */
  planName: string;
  /** The same rows the cards render, so the two can never disagree. */
  allowances: CircleAllowance[];
  className?: string;
}

export function PlanStatusBar({ planName, allowances, className }: PlanStatusBarProps) {
  const t = useTranslations('circles.plan.statusBar');
  const locale = useLocale();

  const members = allowances.find((row) => row.key === 'MAX_MEMBERS');

  /*
   * `locked` is computed SERVER-SIDE against the same limit the row carries, so
   * this reads a verdict rather than recomputing one. Restricted to CAPs: a
   * suppressed flag is not a capacity problem and a chat window is a read
   * filter, so neither belongs in a line about being over capacity.
   */
  const overCapacity = allowances.some((row) => row.kind === 'CAP' && row.locked);

  const memberLine =
    members === undefined
      ? null
      : members.limit === null
        ? t('unlimitedMembers')
        : t('upToMembers', {
            limit: new Intl.NumberFormat(locale).format(members.limit),
          });

  return (
    <section
      className={cn(
        'flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-subtle p-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="caption-small text-text-secondary">{t('planLabel')}</span>
        <span className="label-medium text-text-primary">
          {memberLine ? `${planName} · ${memberLine}` : planName}
        </span>
      </div>

      <div className="flex min-w-0 flex-col gap-0.5 sm:items-end">
        <span className="caption-small text-text-secondary">{t('statusLabel')}</span>
        <span
          className={cn(
            'label-medium',
            overCapacity ? 'text-text-warning' : 'text-text-success',
          )}
        >
          {overCapacity ? t('overCapacity') : t('withinPlan')}
        </span>
      </div>
    </section>
  );
}
