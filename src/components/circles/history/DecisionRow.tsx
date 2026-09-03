'use client';

import { useLocale, useTranslations } from 'next-intl';

import { isKnownMotionKind } from '@/components/circles/governance/motionKinds';
import type { CircleUser } from '@/hooks/useCircleUsers';
import { Link } from '@/i18n/navigation';
import { formatDateOnly } from '@/macros/time';
import type { CircleMotion } from '@/services/gql/types/circles';

import { OutcomePill } from './OutcomePill';
import { RulesAtTheTime } from './RulesAtTheTime';

export interface DecisionRowProps {
  circleId: string;
  motion: CircleMotion;
  /** Resolved identities, best-effort. A missing entry renders the fallback label. */
  usersById: Record<string, CircleUser>;
}

/**
 * One settled decision.
 *
 * ── WHAT A ROW STATES, AND WHAT IT REFUSES TO ───────────────────────────────
 * What was proposed, who proposed it, what the circle decided, when, and the
 * rule it was decided under. It does not state who voted which way, and there
 * is no cell it could go in: the product exposes an aggregate tally and offers
 * no per-member vote query, deliberately. A history that quietly reconstructed
 * the roster would end the secret ballot through a side door.
 *
 * The title links to the motion, which is how "why was I removed?" is answered
 * — the link goes to the vote and its count, not to an explanation written by
 * the platform.
 */
export function DecisionRow({ circleId, motion, usersById }: DecisionRowProps) {
  const t = useTranslations('circles.history');
  const tCommon = useTranslations('circles.common');
  const tMotion = useTranslations('circles.motion');
  const tKind = useTranslations('circles.governance.motionKind');
  const locale = useLocale();

  /*
   * A motion always carries a title upstream, but the field is nullable across
   * two service boundaries. Falling back to the KIND ("Removing a member")
   * keeps the row meaningful; falling back to the number keeps it identifiable
   * when even the kind is one this build has not heard of. A blank cell in a
   * record of decisions is never acceptable.
   */
  const title =
    motion.title?.trim() ||
    (isKnownMotionKind(motion.kind)
      ? tKind(motion.kind)
      : tMotion('number', { number: motion.motionNumber }));

  const proposerId = (motion.proposedBy ?? '').trim();
  const proposer = proposerId
    ? tCommon('proposedBy', {
        // An unresolved profile reads as "a member", never as an absent person:
        // resolution is best-effort by contract and a failed lookup says nothing
        // about whether the proposer exists.
        name: usersById[proposerId]?.name?.trim() || t('actor.unresolved'),
      })
    : /*
       * `proposedBy` is nulled by a GDPR erasure. That is a different fact from
       * "we could not resolve the name", and conflating the two would either
       * invent an erasure or hide one that happened.
       */
      t('proposerErased');

  /*
   * `decidedAt` is written ONLY by the tally, so an EXPIRED or WITHDRAWN motion
   * has none — nothing was decided. For an expiry the pinned `closesAt` is the
   * moment the window ran out, which is a recorded fact rather than an
   * inference, and it is labelled "lapsed" rather than "decided" because no
   * decision was reached. Nothing is invented for a withdrawal.
   */
  const decided = (() => {
    if (motion.decidedAt) {
      const formatted = formatDateOnly(motion.decidedAt, { locale });
      if (formatted) return formatted;
    }
    if (motion.status === 'EXPIRED' && motion.closesAt) {
      const formatted = formatDateOnly(motion.closesAt, { locale });
      if (formatted) return t('decided.lapsed', { date: formatted });
    }
    return t('decided.unknown');
  })();

  return (
    <tr className="border-b border-border-subtle transition-colors last:border-b-0 hover:bg-surface-subtle">
      {/*
        A row HEADER, not a plain cell: the motion is what every other cell in
        the row is about, so a screen reader should announce "Move the Saturday
        run to 7am — Rules at the time: 2/3 majority" rather than reading a
        threshold with nothing attached to it. `font-normal` because `<th>`
        bolds by default and the proposer line underneath is not a heading.
      */}
      <th scope="row" className="px-3 py-3 text-left align-top font-normal">
        <Link
          href={`/circles/${circleId}/motions/${motion.id}`}
          className="label-small rounded-sm text-text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
        >
          {title}
        </Link>
        <p className="caption-small mt-0.5 text-text-secondary">{proposer}</p>
      </th>

      <td className="px-3 py-3 align-top">
        <OutcomePill status={motion.status} />
      </td>

      <td className="body-small px-3 py-3 align-top whitespace-nowrap text-text-secondary">
        {decided}
      </td>

      <td className="px-3 py-3 align-top">
        <RulesAtTheTime motion={motion} />
      </td>
    </tr>
  );
}
