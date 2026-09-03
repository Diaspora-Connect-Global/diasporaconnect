'use client';

import { ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { isKnownMotionKind } from '@/components/circles/governance/motionKinds';
import { StatusPill } from '@/components/circles/primitives';
import type { CircleUser } from '@/hooks/useCircleUsers';
import { Link } from '@/i18n/navigation';
import { formatChatTimestamp } from '@/macros/time';
import type { CircleAuditEvent } from '@/services/gql/types/circles-governance';

import { motionIdFor, readAuditPayload, specFor } from './auditEventCopy';

export interface AuditEntryProps {
  circleId: string;
  event: CircleAuditEvent;
  /** Resolved identities, best-effort. A missing entry renders the fallback label. */
  usersById: Record<string, CircleUser>;
}

/**
 * One entry in the decision log.
 *
 * ── WHAT THIS IS NOT ────────────────────────────────────────────────────────
 * Not an activity feed. Every row is something the circle DECIDED, or something
 * the platform did to it, and the screen is read most often by someone checking
 * a decision after the fact. So a row states the fact, who is answerable for it
 * and when, and links to the vote that authorised it. It does not editorialise.
 *
 * ── THE BALLOT IS NOT PUBLISHED ─────────────────────────────────────────────
 * `MOTION_VOTE_CAST` rows carry the voter's id and their choice — the hash
 * chain needs a complete record, so circle-service writes one. This component
 * renders NEITHER. The product exposes an aggregate tally and offers no query
 * for a per-member vote roster, deliberately; printing the voter here would
 * rebuild that roster out of the audit trail and quietly end the secret ballot.
 *
 * The row is still shown, with its seq and its time, and says "recorded, not
 * published". Dropping it would open a visible hole in a gap-free sequence —
 * and a gap is exactly what tampering looks like.
 */
export function AuditEntry({ circleId, event, usersById }: AuditEntryProps) {
  const t = useTranslations('circles.history');
  const tKind = useTranslations('circles.governance.motionKind');
  const locale = useLocale();

  const spec = specFor(event.eventType);
  const facts = readAuditPayload(event.payloadJson);
  const motionId = motionIdFor(event);

  /*
   * `MOTION_OPENED` carries the motion's own title, which says far more than the
   * event name — "Opened: Move the Saturday run to 7am" beats "Motion opened".
   * Every other row uses the event label, qualified by the motion kind where the
   * payload carries one, so an enactment reads "Enacted · Remove member" rather
   * than making the reader open the motion to find out what happened.
   */
  const headline =
    spec.labelKey === 'motionOpened' && facts.title
      ? t('events.motionOpenedTitled', { title: facts.title })
      : t(`events.${spec.labelKey}`);

  // `kind` is an opaque payload string; only translate one this build knows.
  const rawKind = facts.motionKind ?? facts.kind ?? null;
  const kindLabel = isKnownMotionKind(rawKind) ? tKind(rawKind) : rawKind;
  const showKind = kindLabel && spec.labelKey !== 'motionOpened';

  const actorId = (event.actorUserId ?? '').trim();

  /*
   * Three distinct meanings of "no actor", never conflated — see `ActorRule`.
   * `erased` is a positive statement that someone exercised their right to
   * erasure; `none` says nobody acted, which is precisely what makes a tally
   * trustworthy; `optional` says nothing at all rather than guessing.
   */
  let actorLine: string | null = null;
  if (spec.redacted) {
    actorLine = t('actor.notPublished');
  } else if (actorId) {
    actorLine = t('actor.by', {
      name: usersById[actorId]?.name?.trim() || t('actor.unresolved'),
    });
  } else if (spec.actor === 'erased') {
    actorLine = t('actor.erased');
  } else if (spec.actor === 'none') {
    actorLine = t('actor.automatic');
  }

  const when = event.occurredAt ? formatChatTimestamp(event.occurredAt, { locale }) : '';
  const meta = [actorLine, when].filter(Boolean).join(' · ');

  // Only ever a reason the circle needs — a tally reason ("quorum not met"), an
  // enactment error, or a platform admin's stated cause. Never the raw payload.
  const detail = facts.error ?? facts.reason ?? null;

  const content = (
    <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="label-medium text-text-primary">{headline}</span>
          {showKind ? <StatusPill variant={spec.tone} label={kindLabel} /> : null}
          {spec.platform ? (
            <StatusPill variant="warning" label={t('platformAction')} />
          ) : null}
        </div>

        {meta ? <p className="caption-small mt-1 text-text-secondary">{meta}</p> : null}

        {detail ? <p className="body-small mt-1.5 text-text-primary">{detail}</p> : null}
      </div>

      {/* The gap-free sequence number, printed on every row: a MISSING one is
          evidence of tampering, and a reader can only notice a gap in a
          sequence they can actually see. */}
      <span className="caption-small shrink-0 tabular-nums text-text-secondary">
        {/* Passed as a string: ICU would otherwise group it as a number
            ("#1,234"), and a sequence position is not a quantity. */}
        {t('entry.seq', { seq: String(event.seq) })}
      </span>
    </div>
  );

  /*
   * Membership changes reach the trail as `MOTION_ENACTED` on the motion that
   * caused them, so this link is how "why was I removed?" gets answered — it
   * goes to the vote and its count.
   *
   * Platform rows carry `subjectType: 'CIRCLE'` and an explicit `motionId: null`
   * in their payload, so `motionIdFor` returns null and they get no link.
   * Nothing authorised them by vote, and offering a link would imply otherwise.
   */
  if (!motionId) {
    return (
      <li className="flex border-b border-border-subtle px-1 py-3 last:border-b-0">
        {content}
      </li>
    );
  }

  return (
    <li className="border-b border-border-subtle last:border-b-0">
      <Link
        href={`/circles/${circleId}/motions/${motionId}`}
        className="flex items-start gap-2 rounded-lg px-1 py-3 transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
      >
        {content}
        <ChevronRight
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-text-secondary"
        />
      </Link>
    </li>
  );
}
