'use client';

import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Info } from 'lucide-react';

import { ProgressWithLabel, StatusPill } from '@/components/circles/primitives';
import { ButtonType1, ButtonType3 } from '@/components/custom/button';
import type { CircleEntitlementKey } from '@/services/gql/types/circles';

import type { CircleAllowance } from './allowances';

/**
 * "What your plan covers, and what you're using."
 *
 * The point of the section is that a member can see WHY an action will be
 * refused before they attempt it, so every card shows the allowance and the
 * current count side by side rather than only surfacing a problem at the moment
 * something fails.
 *
 * ── CARDS, ONE GRID, FIXED ORDER ────────────────────────────────────────────
 * Two columns from `sm`, one below it. The order is `CIRCLE_ALLOWANCE_ORDER`
 * and is NOT re-sorted by which allowances are full: a grid that reshuffles as
 * usage crosses a cap moves the card someone is reading, and it would also make
 * two circles on the same plan look like they are on different ones. The full
 * cards are marked, not promoted.
 *
 * ── UNLIMITED IS NOT ZERO ───────────────────────────────────────────────────
 * A `null` limit renders as "Unlimited". It never renders as 0 and never
 * renders a full meter. See `allowances.ts` for why the wire makes this easy to
 * get wrong.
 *
 * ── A FULL CAP IS NOT A PUNISHMENT ──────────────────────────────────────────
 * Reaching a cap locks new additions and touches nothing that already exists.
 * The copy on a locked card therefore leads with what is safe ("Nobody is
 * removed") before what is limited. Written the other way round — as a warning
 * with reassurance appended — a design that deliberately protects the circle
 * reads as a threat against it, which is both wrong and frightening.
 *
 * ── AND THE ACTION IS NEVER "UPGRADE" ───────────────────────────────────────
 * There is no upgrade and no downgrade. Entitlements are admin-defined per
 * plan, so a costlier tier is not guaranteed to be a superset of a cheaper one
 * and "direction" is a fiction — no arrow, no "get more", no "Pro". The button
 * says Change plan, because the operation is `changeCirclePlan`.
 */

/** Per-key note shown when a cap is full. Each names what is NOT happening. */
const LOCKED_NOTE_KEY: Partial<Record<CircleEntitlementKey, string>> = {
  MAX_MEMBERS: 'locked.MAX_MEMBERS',
  MAX_ACTIVE_PROJECTS: 'locked.MAX_ACTIVE_PROJECTS',
  MAX_ACTIVE_CHALLENGES: 'locked.MAX_ACTIVE_CHALLENGES',
  STORAGE_MB: 'locked.STORAGE_MB',
};

export interface PlanAllowancesProps {
  /** Built once by the screen — the change dialog needs the same rows. */
  allowances: CircleAllowance[];
  /** LEAD only, matching `assertCircleLead` on `changeCirclePlan`. */
  canManage: boolean;
  /**
   * Take the reader to the catalogue. There is no "change plan" that does not
   * first pick a target, so this is the only honest destination for both the
   * lead's button and a member's link.
   */
  onSeePlans: () => void;
}

/**
 * Is this the state a lead needs to see first — a cap that has locked, or a
 * capability the plan has suppressed?
 *
 * Both mean "something you might try will be refused, and here is why". Read
 * off the server's own `locked` verdict and the flag's own value, never
 * recomputed from a count and a limit.
 */
function needsALook(allowance: CircleAllowance): boolean {
  if (allowance.kind === 'FLAG') return !allowance.enabled;
  return allowance.locked;
}

export function PlanAllowances({
  allowances,
  canManage,
  onSeePlans,
}: PlanAllowancesProps) {
  const t = useTranslations('circles.plan.allowance');

  /*
   * Two bands, each in CIRCLE_ALLOWANCE_ORDER. The split is by the one thing
   * the reader came to find out — is anything blocked? — so on the usual
   * "40 members on a plan for 20, branding suppressed" circle the two cards
   * that explain it sit side by side at the top instead of being the 1st and
   * 6th rows of a list.
   *
   * A card moves band only when `locked` or the flag actually flips, which is a
   * real change of state and worth noticing. Within a band nothing re-sorts, so
   * two circles on the same plan never look like they are on different ones.
   */
  const attention = allowances.filter(needsALook);
  const rest = allowances.filter((allowance) => !needsALook(allowance));

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="heading-xsmall text-text-primary">{t('heading')}</h2>
        <p className="caption-small text-text-secondary">{t('intro')}</p>
      </div>

      {attention.length > 0 && (
        <AllowanceGrid
          allowances={attention}
          canManage={canManage}
          onSeePlans={onSeePlans}
        />
      )}

      {rest.length > 0 && (
        <div className="flex flex-col gap-3">
          {/* Only worth a heading when there is a band above it to distinguish. */}
          {attention.length > 0 && (
            <h3 className="label-medium text-text-primary">{t('everythingElse')}</h3>
          )}
          <AllowanceGrid
            allowances={rest}
            canManage={canManage}
            onSeePlans={onSeePlans}
          />
        </div>
      )}
    </section>
  );
}

function AllowanceGrid({
  allowances,
  canManage,
  onSeePlans,
}: {
  allowances: CircleAllowance[];
  canManage: boolean;
  onSeePlans: () => void;
}) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {allowances.map((allowance) => (
        <li
          key={allowance.key}
          /*
           * `border-border-subtle` on every card, whatever its state. A full
           * cap is shown by its pill, its meter and its words — a coloured
           * border would make the card itself look like an error, which is
           * the opposite of what a lock is.
           */
          className="flex flex-col rounded-xl border border-border-subtle bg-surface-default p-4"
        >
          <AllowanceCard
            allowance={allowance}
            canManage={canManage}
            onSeePlans={onSeePlans}
          />
        </li>
      ))}
    </ul>
  );
}

/**
 * Just the value of one allowance — "Unlimited", "40 of 20", "Last 30 days",
 * "On".
 *
 * Shared by the usage cards (where a count exists) and by the catalogue cards
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

function AllowanceCard({
  allowance,
  canManage,
  onSeePlans,
}: {
  allowance: CircleAllowance;
  canManage: boolean;
  onSeePlans: () => void;
}) {
  const t = useTranslations('circles.plan.allowance');
  const locale = useLocale();

  const name = t(`name.${allowance.key}`);
  const format = allowanceNumberFormatter(allowance.key, locale, t);

  /*
   * A FLAG the plan does not grant is the branding case, and it is the one
   * state on this screen most likely to be misread as data loss. It gets the
   * same treatment as a full cap — a pill, an explanation, a way out — but the
   * pill says "Hidden", never "Off": the colours are still stored.
   */
  const suppressed = allowance.kind === 'FLAG' && !allowance.enabled;
  const needsPlan = allowance.locked || suppressed;

  const header = (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="label-medium text-text-primary">{name}</span>
        <span className="heading-xsmall text-text-primary">
          <AllowanceValue allowance={allowance} />
        </span>
      </div>
      {/*
        "Full", not "Over limit" or "Exceeded" — the circle has not done
        anything wrong, and a plan change that lowered a cap is the usual
        reason a card is full.
      */}
      {allowance.locked && (
        <StatusPill variant="warning" label={t('full')} className="mt-0.5 shrink-0" />
      )}
      {suppressed && (
        <StatusPill variant="warning" label={t('hidden')} className="mt-0.5 shrink-0" />
      )}
    </div>
  );

  const lockedNoteKey = LOCKED_NOTE_KEY[allowance.key];

  return (
    <div className="flex flex-1 flex-col gap-2">
      {header}

      {/*
        Metered only when there is a finite cap AND something counting against
        it. An unlimited allowance has no bar to fill, and a bar with no number
        behind it would be decoration pretending to be data. Windows and flags
        are never metered: neither is a quantity being consumed.
      */}
      {allowance.percent !== null && (
        <ProgressWithLabel
          value={allowance.percent}
          tone={allowance.locked ? 'warning' : 'brand'}
          showPercentage={false}
        />
      )}

      {/* A read filter. Nothing is destroyed by a shorter window. */}
      {allowance.kind === 'WINDOW' && <CardNote>{t('windowNote')}</CardNote>}

      {/*
        Suppressed means the colours are RETAINED and hidden — they come back
        intact on a plan that includes branding. The note says so before it says
        why, so "Hidden" cannot be read as "gone".
      */}
      {suppressed && (
        <>
          <p className="body-small text-text-secondary">{t('brandingOffNote')}</p>
          <CardNote>{t('brandingHiddenWhy')}</CardNote>
        </>
      )}

      {allowance.locked &&
        lockedNoteKey &&
        allowance.current !== null &&
        allowance.limit !== null && (
          <CardNote>
            {t(lockedNoteKey, {
              current: format(allowance.current),
              limit: format(allowance.limit),
            })}
          </CardNote>
        )}

      {needsPlan && (
        /*
         * `mt-auto` pins the action to the bottom of the card so a row of cards
         * of different heights lines its buttons up.
         *
         * A lead gets the button because `changeCirclePlan` is LEAD-gated; every
         * other member gets the same destination as a quieter link, because
         * reading the catalogue is not gated and "why can't we add anyone?"
         * deserves an answer even from someone who cannot act on it.
         */
        <div className="mt-auto pt-2">
          {canManage ? (
            <ButtonType1 onClick={onSeePlans}>{t('changePlan')}</ButtonType1>
          ) : (
            <ButtonType3 className="px-0" onClick={onSeePlans}>
              {t('seePlans')}
            </ButtonType3>
          )}
        </div>
      )}
    </div>
  );
}

/** A quiet explanatory line. Never `border-*-success/warning/info` — all three tokens are red. */
function CardNote({ children }: { children: ReactNode }) {
  return (
    <p className="caption-small flex items-start gap-1.5 text-text-secondary">
      <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
