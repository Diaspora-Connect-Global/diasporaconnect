'use client';

import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Info } from 'lucide-react';

import { ProgressWithLabel, StatusPill } from '@/components/circles/primitives';
import type {
  CircleEntitlement,
  CircleEntitlementKey,
  CircleEntitlementUsage,
} from '@/services/gql/types/circles';

import { buildCircleAllowances, type CircleAllowance } from './allowances';

/**
 * "What your plan covers, and what you're using."
 *
 * The point of the section is that a member can see WHY an action will be
 * refused before they attempt it, so every row shows the allowance and the
 * current count side by side rather than only surfacing a problem at the moment
 * something fails.
 *
 * ── UNLIMITED IS NOT ZERO ───────────────────────────────────────────────────
 * A `null` limit renders as "Unlimited". It never renders as 0 and never
 * renders a full meter. See `allowances.ts` for why the wire makes this easy to
 * get wrong.
 *
 * ── A FULL CAP IS NOT A PUNISHMENT ──────────────────────────────────────────
 * Reaching a cap locks new additions and touches nothing that already exists.
 * The copy on a locked row therefore leads with what is safe ("Nobody is
 * removed") before what is limited. Written the other way round — as a warning
 * with reassurance appended — a design that deliberately protects the circle
 * reads as a threat against it, which is both wrong and frightening.
 */

/** Per-key note shown when a cap is full. Each names what is NOT happening. */
const LOCKED_NOTE_KEY: Partial<Record<CircleEntitlementKey, string>> = {
  MAX_MEMBERS: 'locked.MAX_MEMBERS',
  MAX_ACTIVE_PROJECTS: 'locked.MAX_ACTIVE_PROJECTS',
  MAX_ACTIVE_CHALLENGES: 'locked.MAX_ACTIVE_CHALLENGES',
  STORAGE_MB: 'locked.STORAGE_MB',
};

export interface PlanAllowancesProps {
  entitlements: CircleEntitlement[] | null | undefined;
  usage: CircleEntitlementUsage[] | null | undefined;
}

export function PlanAllowances({ entitlements, usage }: PlanAllowancesProps) {
  const t = useTranslations('circles.plan.allowance');
  const rows = buildCircleAllowances(entitlements, usage);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="heading-xsmall text-text-primary">{t('heading')}</h2>
        <p className="caption-small text-text-secondary">{t('intro')}</p>
      </div>

      <ul className="flex flex-col gap-4">
        {rows.map((row) => (
          <li key={row.key} className="rounded-xl border border-border-subtle p-4">
            <AllowanceRow allowance={row} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Just the value of one allowance — "Unlimited", "40 of 20", "Last 30 days",
 * "On".
 *
 * Shared by the usage list (where a count exists) and by the catalogue cards
 * (where one does not), so a plan's allowance is worded identically in both
 * places. Two independent formatters would eventually disagree about the one
 * case that matters, which is the absent limit.
 */
export function AllowanceValue({ allowance }: { allowance: CircleAllowance }) {
  const t = useTranslations('circles.plan.allowance');
  const locale = useLocale();

  if (allowance.kind === 'FLAG') {
    return <>{allowance.enabled ? t('on') : t('off')}</>;
  }

  if (allowance.kind === 'WINDOW') {
    return (
      <>
        {allowance.limit === null
          ? t('windowUnlimited')
          : t('window', { days: allowance.limit })}
      </>
    );
  }

  const format = allowanceNumberFormatter(allowance.key, locale, t);
  const { limit, current } = allowance;

  // Narrowed on `limit` itself rather than on a derived `isUnlimited` boolean,
  // so the "unlimited" branch is a type-level fact instead of a cast. A cast
  // here would compile just as happily with the two branches swapped.
  if (current === null) {
    return <>{limit === null ? t('unlimited') : t('covered', { limit: format(limit) })}</>;
  }

  return (
    <>
      {limit === null
        ? t('usedUnlimited', { current: format(current) })
        : t('usedOf', { current: format(current), limit: format(limit) })}
    </>
  );
}

/**
 * Numbers are formatted — and given their unit — BEFORE they reach a message,
 * so one set of strings covers plain counts and megabytes alike. The
 * alternative, a unit argument inside every ICU message, multiplies five
 * translations by every unit for no gain.
 */
function allowanceNumberFormatter(
  key: CircleEntitlementKey,
  locale: string,
  t: (key: string, values?: Record<string, string | number>) => string,
) {
  return (value: number) => {
    const formatted = new Intl.NumberFormat(locale).format(value);
    return key === 'STORAGE_MB' ? t('megabytes', { value: formatted }) : formatted;
  };
}

function AllowanceRow({ allowance }: { allowance: CircleAllowance }) {
  const t = useTranslations('circles.plan.allowance');
  const locale = useLocale();

  const name = t(`name.${allowance.key}`);
  const format = allowanceNumberFormatter(allowance.key, locale, t);

  const header = (
    <div className="flex items-center justify-between gap-3">
      <span className="label-medium text-text-primary">{name}</span>
      <span className="flex items-center gap-2">
        <span className="label-small text-text-secondary">
          <AllowanceValue allowance={allowance} />
        </span>
        {/*
          "Full", not "Over limit" or "Exceeded" — the circle has not done
          anything wrong, and a plan change that lowered a cap is the usual
          reason a row is full.
        */}
        {allowance.locked && <StatusPill variant="warning" label={t('full')} />}
      </span>
    </div>
  );

  if (allowance.kind === 'FLAG') {
    return (
      <div className="flex flex-col gap-1.5">
        {header}
        {/*
          Off means SUPPRESSED, not deleted. The circle's saved colours are
          untouched and reappear the moment a plan that includes branding
          applies, so the note says exactly that — otherwise "Off" reads as
          "your branding is gone".
        */}
        {!allowance.enabled && <RowNote>{t('brandingOffNote')}</RowNote>}
      </div>
    );
  }

  if (allowance.kind === 'WINDOW') {
    return (
      <div className="flex flex-col gap-1.5">
        {header}
        {/* A read filter. Nothing is destroyed by a shorter window. */}
        <RowNote>{t('windowNote')}</RowNote>
      </div>
    );
  }

  const lockedNoteKey = LOCKED_NOTE_KEY[allowance.key];

  return (
    <div className="flex flex-col gap-2">
      {header}

      {/*
        Metered only when there is a finite cap AND something counting against
        it. An unlimited allowance has no bar to fill, and a bar with no number
        behind it would be decoration pretending to be data.
      */}
      {allowance.percent !== null && (
        <ProgressWithLabel
          value={allowance.percent}
          tone={allowance.locked ? 'warning' : 'brand'}
          showPercentage={false}
        />
      )}

      {allowance.locked &&
        lockedNoteKey &&
        allowance.current !== null &&
        allowance.limit !== null && (
          <RowNote>
            {t(lockedNoteKey, {
              current: format(allowance.current),
              limit: format(allowance.limit),
            })}
          </RowNote>
        )}
    </div>
  );
}

/** A quiet explanatory line. Never `border-*-success/warning/info` — all three tokens are red. */
function RowNote({ children }: { children: ReactNode }) {
  return (
    <p className="caption-small flex items-start gap-1.5 text-text-secondary">
      <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
