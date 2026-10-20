'use client';

import { useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { CircleAvatar } from '@/components/circles/index';
import { readCircleWrite } from '@/components/circles/governance';
import { ButtonType1, ButtonType2 } from '@/components/custom/button';
import { useCircleUser } from '@/hooks/useCircleUsers';
import { useRouter } from '@/i18n/navigation';
import { toCdnUrl } from '@/lib/cdn';
import { CIRCLE_PUBLIC_CARD, RESPOND_TO_CIRCLE_INVITATION } from '@/services/gql/circles';
import type {
  CircleInvitation,
  RespondToCircleInvitationData,
} from '@/services/gql/types/circles';

import { invitationErrorKey } from './status';

export interface CircleInvitationRowProps {
  invitation: CircleInvitation;
}

/**
 * One pending invitation: which circle, who asked, when, and Accept / Decline.
 *
 * The invitation itself carries only ids, so the circle comes from its public
 * card and the inviter from their profile. Either may be unresolvable (a
 * private circle has no public card); the row then falls back to a generic
 * label and never shows an id.
 *
 * `errorPolicy: 'all'` makes a refused mutation RESOLVE with `data: null`, so
 * success is read from the data, never from "the promise did not throw".
 */
export function CircleInvitationRow({ invitation }: CircleInvitationRowProps) {
  const t = useTranslations('circles.invitations');
  const locale = useLocale();
  const router = useRouter();
  const client = useApolloClient();
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);
  const [gone, setGone] = useState(false);

  const { data: cardData } = useQuery<{
    circlePublicCard?: { name: string; avatarUrl?: string | null } | null;
  }>(CIRCLE_PUBLIC_CARD, {
    variables: { circleId: invitation.circleId },
    fetchPolicy: 'cache-first',
    errorPolicy: 'all',
  });
  const card = cardData?.circlePublicCard;
  const { user: inviter } = useCircleUser(invitation.invitedBy);

  const [respond] = useMutation<RespondToCircleInvitationData>(RESPOND_TO_CIRCLE_INVITATION);

  const circleName = card?.name ?? t('unknownCircle');
  const inviterName = inviter?.name ?? t('someone');
  const when = invitation.createdAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(invitation.createdAt))
    : '';

  const answer = async (accept: boolean) => {
    if (busy) return;
    setBusy(accept ? 'accept' : 'decline');
    try {
      const result = await respond({ variables: { invitationId: invitation.id, accept } });
      const outcome = readCircleWrite(result, (d) => d.respondToCircleInvitation);
      if (!outcome.ok) {
        toast.error(t(`errors.${invitationErrorKey(outcome.refusal)}`));
        // The invitation may have been revoked or expired: refresh so the row reflects it.
        void client.refetchQueries({ include: ['MyCircleInvitations'] });
        return;
      }
      setGone(true);
      if (accept) {
        toast.success(t('accepted', { name: circleName }));
        await client.refetchQueries({ include: ['MyCircles', 'MyCircleInvitations'] });
        router.push(`/circles/${encodeURIComponent(invitation.circleId)}`);
      } else {
        toast.success(t('declined'));
        void client.refetchQueries({ include: ['MyCircleInvitations'] });
      }
    } catch {
      toast.error(t('errors.unknown'));
    } finally {
      setBusy(null);
    }
  };

  if (gone) return null;

  return (
    <li
      data-testid="circle-invitation"
      className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface-default p-4"
    >
      <div className="flex min-w-0 items-start gap-3">
        <CircleAvatar name={circleName} src={toCdnUrl(card?.avatarUrl)} className="size-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="label-medium break-words text-text-primary">{circleName}</h3>
          <p className="caption-small mt-0.5 break-words text-text-secondary">
            {t('invitedBy', { name: inviterName })}
            {when ? (
              <>
                <span aria-hidden="true" className="px-1">·</span>
                {when}
              </>
            ) : null}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <ButtonType2
          className="flex-1"
          disabled={busy !== null}
          onClick={() => void answer(true)}
          aria-label={t('acceptAria', { name: circleName })}
        >
          {busy === 'accept' ? t('accepting') : t('accept')}
        </ButtonType2>
        <ButtonType1
          className="flex-1"
          disabled={busy !== null}
          onClick={() => void answer(false)}
          aria-label={t('declineAria', { name: circleName })}
        >
          {busy === 'decline' ? t('declining') : t('decline')}
        </ButtonType1>
      </div>
    </li>
  );
}
