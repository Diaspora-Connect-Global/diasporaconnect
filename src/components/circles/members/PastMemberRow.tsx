'use client';

import { Gavel, LogOut, ShieldAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import {
  AvatarGroup,
  StatusPill,
  type StatusPillVariant,
} from '@/components/circles/primitives';
import type { CircleUser } from '@/hooks/useCircleUsers';
import { Link } from '@/i18n/navigation';
import { formatDateOnly } from '@/macros/time';
import type { CircleMember } from '@/services/gql/types/circles';
import type { CirclePastMemberReason } from '@/services/gql/types/circles-invites';

export interface PastMemberRowProps {
  member: CircleMember;
  /** Resolved identity, or `undefined` while it is still loading. */
  user?: CircleUser;
  /** Display name already resolved (with its loading fallback) by the list. */
  displayName: string;
  /** Needed to build the link to the motion that removed someone. */
  circleId: string;
}

/**
 * How each ending is presented.
 *
 * ── THE COLOURS DO NOT EDITORIALISE ─────────────────────────────────────────
 * LEFT and REMOVED are both `neutral`. Painting a removal red would have this
 * screen pass judgement on a decision the circle made by vote — a passed motion
 * is a legitimate outcome of the circle's own rules, not an error state, and
 * the person it names is not a problem to be flagged. The words carry the
 * difference; colour does not, which is also the channel that survives being
 * colour-blind.
 *
 * SUSPENDED is `info` for the one distinction that IS structural rather than
 * evaluative: it did not happen inside this circle. It reads as a note from
 * elsewhere, which is exactly what it is.
 */
const REASON_STYLE: Record<
  CirclePastMemberReason,
  { variant: StatusPillVariant; icon: LucideIcon }
> = {
  LEFT: { variant: 'neutral', icon: LogOut },
  REMOVED: { variant: 'neutral', icon: Gavel },
  SUSPENDED: { variant: 'info', icon: ShieldAlert },
};

/**
 * One person who is no longer in the circle, labelled with WHY.
 *
 * ── EVERY ENDING GETS A REASON, AND THE REASONS ARE NOT INTERCHANGEABLE ─────
 *   LEFT       they chose to go. Stated plainly and without a euphemism.
 *   REMOVED    a passed REMOVE_MEMBER motion was enacted. The platform never
 *              removes anyone — a motion does — so `removedByMotionId` is
 *              always present, and THE LABEL ITSELF LINKS TO IT. The receipt is
 *              the point: a governance outcome that cannot be traced back to
 *              the vote that produced it is indistinguishable from an
 *              administrator quietly deleting somebody.
 *   SUSPENDED  a PLATFORM action against that person's account. Worded so it
 *              cannot be read as the circle's doing, because it was not, and
 *              because members of the circle will read this row as a verdict
 *              on their peer if it is left ambiguous.
 *
 * There is deliberately no BANNED. `circle_membership.status` has exactly four
 * values and none of them is a ban; inventing the word here would put a state
 * on the screen that no row can ever hold. If banning should read differently
 * from removal that is a schema change, not a label.
 *
 * ── AND NO CONTROLS ─────────────────────────────────────────────────────────
 * No re-invite button, no "restore", no menu. Re-admitting someone is an
 * admission like any other and runs through the circle's join mode or an
 * ADMIT_MEMBER motion; a one-click restore here would be a lead silently
 * reversing a decision the circle took together.
 */
export function PastMemberRow({
  member,
  user,
  displayName,
  circleId,
}: PastMemberRowProps) {
  const t = useTranslations('circles.members.past');
  const locale = useLocale();

  /*
   * `status` is the BARE domain value (`LEFT`, not `MEMBERSHIP_LEFT`) — the
   * prefixed spelling belongs to the gateway's filter ARGUMENTS and appears
   * nowhere in a response. A wrong guess here would fall through the lookup to
   * `undefined` and render a bare row with no reason at all, which is precisely
   * the silent-blank failure the enum note in `types/circles.ts` documents.
   */
  const reason = member.status as CirclePastMemberReason;
  const style = REASON_STYLE[reason];

  // An unrecognised status is dropped rather than rendered unlabelled: a person
  // in the "former members" list with no stated reason is worse than one that
  // is simply absent, because it implies the circle is hiding the reason.
  if (!style) return null;

  const Icon = style.icon;
  const endedOn = member.leftAt
    ? formatDateOnly(member.leftAt, { locale })
    : null;

  const label = t(`reason.${reason}`);

  const pill = (
    <StatusPill
      variant={style.variant}
      icon={<Icon aria-hidden="true" />}
      label={label}
    />
  );

  return (
    <li className="flex items-center gap-3 py-2.5">
      {/*
        Dimmed rather than greyed out of existence. These are people the circle
        actually had, and the record is the reason this section exists.
      */}
      <AvatarGroup
        size="md"
        className="opacity-70"
        users={[
          { id: member.userId, name: displayName, avatarUrl: user?.avatarUrl },
        ]}
      />

      <div className="min-w-0 flex-1">
        <Link
          href={`/${member.userId}`}
          className="label-medium block truncate text-text-primary hover:underline"
        >
          {displayName}
        </Link>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {reason === 'REMOVED' && member.removedByMotionId ? (
            /*
              The LABEL is the link, not a separate "view motion" affordance
              beside it — the fact and its receipt are one thing, and splitting
              them lets the fact be read without the evidence.

              `removedByMotionId` is contractually always present on a REMOVED
              row, so the unlinked branch below should be unreachable. It is
              still written, because the alternative when it is somehow absent
              is a link to `/motions/null` that 404s on the receipt.
            */
            <Link
              href={`/circles/${circleId}/motions/${member.removedByMotionId}`}
              // Underlined at REST, not only on hover: a receipt nobody can see
              // is a link nobody follows, and hover does not exist on touch.
              className="underline decoration-dotted underline-offset-2 hover:decoration-solid"
              aria-label={t('viewMotion')}
            >
              {pill}
            </Link>
          ) : (
            pill
          )}

          {endedOn && (
            <span className="caption-small text-text-secondary">
              {t('endedOn', { date: endedOn })}
            </span>
          )}
        </div>

        {/*
          Said in full, once, for the one ending this circle did not decide.
          The pill alone is too terse to carry it: "Suspended" beside a name, in
          a list of people the circle removed, reads as something the circle did.
        */}
        {reason === 'SUSPENDED' && (
          <p className="caption-small mt-0.5 text-text-secondary">
            {t('platformNote')}
          </p>
        )}
      </div>
    </li>
  );
}
