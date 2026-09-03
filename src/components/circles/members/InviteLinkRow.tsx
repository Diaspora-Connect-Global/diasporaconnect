'use client';

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import {
  Countdown,
  StatusPill,
  type CountdownLabels,
} from '@/components/circles/primitives';
import { formatDateOnly } from '@/macros/time';
import type { CircleInviteLink } from '@/services/gql/types/circles-invites';

import {
  INVITE_LINK_STATUS_VARIANT,
  effectiveInviteLinkStatus,
  occupiesLiveSlot,
} from './inviteLinkStatus';

export interface InviteLinkRowProps {
  link: CircleInviteLink;
  /** Shared clock; `null` before the panel has mounted. See `effectiveInviteLinkStatus`. */
  now: number | null;
  onRevoke: (inviteLinkId: string) => void;
  revoking: boolean;
}

/** How long a link may run, so the absolute date needs a month as well as a day. */
const EXPIRY_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
};

/**
 * One link in the lead's inventory.
 *
 * ── ONE STATUS, THE ONE THAT EXPLAINS THE REFUSAL ───────────────────────────
 * A link can be revoked AND expired AND fully spent at once. Exactly one pill
 * is shown, chosen by the precedence REVOKED > EXPIRED > EXHAUSTED > ACTIVE,
 * which runs from the most deliberate cause to the most incidental — "a lead
 * took this down" is a different fact from "it ran out", and reporting the
 * second when the first is also true misattributes the decision.
 *
 * ── WHY AN EXHAUSTED LINK STILL SHOWS A COUNTDOWN ───────────────────────────
 * Because it is still occupying one of the circle's ten slots. circle-service
 * counts live links as `status = 'ACTIVE' AND expires_at > now`, with no clause
 * on the budget, so a fully-spent link keeps its slot until it expires or
 * somebody revokes it. Hiding the clock would make the cap arithmetic look
 * wrong to the one person who has to reason about it.
 */
export function InviteLinkRow({
  link,
  now,
  onRevoke,
  revoking,
}: InviteLinkRowProps) {
  const t = useTranslations('circles.invites.link');
  const tCountdown = useTranslations('circles.invites.countdown');
  const locale = useLocale();

  const [confirming, setConfirming] = useState(false);

  const status = effectiveInviteLinkStatus(link, now);
  const used = Number(link.useCount);
  const max = Number(link.maxUses);
  const remaining = Math.max(0, max - used);

  /*
   * `Countdown` interpolates `{days}` / `{hours}` / `{minutes}` itself, so the
   * templates must reach it UNPARSED — `t()` would try to resolve those braces
   * as ICU arguments and throw on the missing values. `t.raw` is the documented
   * way to hand a message over whole.
   */
  const countdownLabels = useMemo<Partial<CountdownLabels>>(
    () => ({
      daysHours: String(tCountdown.raw('daysHours')),
      days: String(tCountdown.raw('days')),
      hoursMinutes: String(tCountdown.raw('hoursMinutes')),
      minutes: String(tCountdown.raw('minutes')),
      closesAt: String(tCountdown.raw('expiresAt')),
      ended: String(tCountdown.raw('expired')),
    }),
    [tCountdown],
  );

  /*
   * Revoke is offered only where it CHANGES something: an active link stops
   * admitting people, and a spent one gives its slot back. circle-service would
   * accept a revoke on an expired link too — its guard is on the stored status,
   * not the derived one — but nothing a person can observe would differ, so
   * offering the button would be offering a no-op.
   *
   * A revoked link is never re-opened; that is why revoking asks first.
   */
  const canRevoke = occupiesLiveSlot(status);

  const expiryLine = () => {
    if (status === 'REVOKED') {
      return link.revokedAt
        ? t('revokedOn', { date: formatDateOnly(link.revokedAt, { locale }) })
        : t('revokedNoDate');
    }
    if (status === 'EXPIRED') {
      return link.expiresAt
        ? t('expiredOn', { date: formatDateOnly(link.expiresAt, { locale }) })
        : t('expiredNoDate');
    }
    return null;
  };

  const terminalLine = expiryLine();

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border-subtle p-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill
            variant={INVITE_LINK_STATUS_VARIANT[status]}
            label={t(`status.${status}`)}
          />
          <span className="caption-small text-text-secondary">
            {status === 'ACTIVE'
              ? t('remaining', { remaining, max })
              : t('used', { used, max })}
          </span>
        </div>

        {terminalLine ? (
          <span className="caption-small text-text-secondary">
            {terminalLine}
          </span>
        ) : (
          link.expiresAt && (
            <Countdown
              deadline={link.expiresAt}
              variant="both"
              precision="compact"
              absoluteFormat={EXPIRY_FORMAT}
              labels={countdownLabels}
            />
          )
        )}
      </div>

      {canRevoke &&
        (confirming ? (
          <div className="flex shrink-0 items-center gap-2">
            <span className="caption-small text-text-primary">
              {t('revokeConfirm')}
            </span>
            {/*
              Revocation is terminal — there is no un-revoke, by design, so that
              a URL somebody screenshotted months ago cannot come back to life.
              An inline two-step keeps that from being one stray click, without
              putting a modal in front of a routine housekeeping action.
            */}
            <button
              type="button"
              disabled={revoking}
              onClick={() => onRevoke(link.id)}
              className="label-small cursor-pointer rounded-full bg-surface-danger px-3 py-1 text-text-danger transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {revoking ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                t('revokeYes')
              )}
            </button>
            <button
              type="button"
              disabled={revoking}
              onClick={() => setConfirming(false)}
              className="label-small cursor-pointer rounded-full px-3 py-1 text-text-secondary transition-colors hover:bg-surface-subtle disabled:cursor-not-allowed"
            >
              {t('revokeCancel')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="label-small shrink-0 cursor-pointer self-start rounded-full px-3 py-1 text-text-danger transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
          >
            {t('revoke')}
          </button>
        ))}
    </li>
  );
}
