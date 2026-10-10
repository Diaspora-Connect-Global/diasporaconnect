'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { Building2, CheckCircle2, Clock, Info, TriangleAlert } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { ButtonType2 } from '@/components/custom/button';
import {
  GET_ORGANISER_ASSOCIATION,
  GET_ORGANISER_COMMUNITY,
  JOIN_EVENT_ORGANISER_COMMUNITY,
  type JoinOrganiserData,
  type OrganiserJoinStatus,
} from '@/services/gql/eventsM2';
import { eventRefusal, hasErrors } from '@/lib/eventRefusal';
import { canJoinFromEvent, type OrganiserView } from './organiser';

/** Where a join attempt ended up. `unavailableYet` = the dark-launch refusal. */
export type JoinOutcome =
  | { kind: 'result'; status: OrganiserJoinStatus; requiresPayment: boolean }
  | { kind: 'unavailableYet' }
  | { kind: 'error'; key: string };

/**
 * The result of asking to join the organiser community, shown on its own and
 * never mixed into the registration result: a failed join must not read as a
 * failed registration.
 */
export function JoinOutcomeNotice({ outcome, organiser }: { outcome: JoinOutcome; organiser: OrganiserView }) {
  const t = useTranslations('eventPage.organiser');
  const tErr = useTranslations('eventPage.errors');
  const name = organiser.entity.name;

  let tone: 'ok' | 'wait' | 'warn' | 'info' = 'info';
  let text = '';
  let showLink = false;

  if (outcome.kind === 'unavailableYet') {
    text = t('notAvailableYet');
  } else if (outcome.kind === 'error') {
    tone = 'warn';
    text = tErr(outcome.key);
  } else {
    switch (outcome.status) {
      case 'JOINED':
        tone = 'ok';
        text = t('joinedNow', { name });
        break;
      case 'ALREADY_MEMBER':
        tone = 'ok';
        text = t('member', { name });
        break;
      case 'REQUESTED':
        tone = 'wait';
        text = outcome.requiresPayment ? t('requestedPay', { name }) : t('requestedNow', { name });
        showLink = outcome.requiresPayment;
        break;
      case 'FAILED':
        tone = 'warn';
        text = t('failedJoin', { name });
        break;
      default:
        text = t('notApplicable');
    }
  }

  const Icon = tone === 'ok' ? CheckCircle2 : tone === 'wait' ? Clock : tone === 'warn' ? TriangleAlert : Info;
  const toneClass =
    tone === 'ok'
      ? 'bg-surface-success text-text-success'
      : tone === 'warn'
        ? 'bg-surface-warning text-text-warning'
        : 'bg-surface-subtle text-text-primary';

  return (
    <div role="status" data-testid="organiser-join-outcome" className={`flex items-start gap-2 rounded-xl p-3 text-sm ${toneClass}`}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="space-y-1">
        <p>{text}</p>
        {showLink && (
          <Link href={organiser.href} className="font-medium underline">
            {t('openCommunity', { name })}
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * Rail card: the organiser, the viewer's standing in it, and the explicit
 * "Join" action. Nothing here ever joins anyone on its own.
 */
export default function OrganiserCard({
  eventId,
  organiser,
  signedIn,
}: {
  eventId: string;
  organiser: OrganiserView;
  signedIn: boolean;
}) {
  const t = useTranslations('eventPage.organiser');
  const [join, { loading }] = useMutation<JoinOrganiserData>(JOIN_EVENT_ORGANISER_COMMUNITY);
  const [outcome, setOutcome] = useState<JoinOutcome | null>(null);
  const name = organiser.entity.name;

  const onJoin = async () => {
    setOutcome(null);
    try {
      const result = await join({
        variables: { eventId },
        // The standing is read from the entity, so refresh it after a join.
        refetchQueries: [
          { query: organiser.kind === 'community' ? GET_ORGANISER_COMMUNITY : GET_ORGANISER_ASSOCIATION, variables: { id: organiser.entity.id } },
        ],
      });
      const data = result.data?.joinEventOrganiserCommunity;
      if (!data || hasErrors(result)) {
        const refusal = eventRefusal(result);
        setOutcome(refusal.kind === 'unavailableYet' ? { kind: 'unavailableYet' } : { kind: 'error', key: refusal.key });
        return;
      }
      setOutcome({ kind: 'result', status: data.status, requiresPayment: data.requiresPayment });
    } catch (err) {
      const refusal = eventRefusal(err);
      setOutcome(refusal.kind === 'unavailableYet' ? { kind: 'unavailableYet' } : { kind: 'error', key: refusal.key });
    }
  };

  let body: React.ReactNode;
  if (outcome) {
    body = <JoinOutcomeNotice outcome={outcome} organiser={organiser} />;
  } else if (organiser.standing === 'member') {
    body = (
      <p className="flex items-center gap-2 text-sm text-text-success">
        <CheckCircle2 className="size-4" aria-hidden /> {t('member', { name })}
      </p>
    );
  } else if (organiser.standing === 'pending') {
    body = (
      <p className="flex items-center gap-2 text-sm text-text-secondary">
        <Clock className="size-4" aria-hidden /> {t('pending', { name })}
      </p>
    );
  } else if (organiser.standing === 'suspended') {
    body = null;
  } else if (organiser.paid || organiser.inviteOnly) {
    body = (
      <div className="space-y-2">
        <p className="text-sm text-text-secondary">{organiser.paid ? t('paid', { name }) : t('inviteOnly', { name })}</p>
        <Link href={organiser.href} className="text-sm font-medium text-text-brand hover:underline">
          {t('openCommunity', { name })}
        </Link>
      </div>
    );
  } else if (!signedIn) {
    body = (
      <Link href={organiser.href} className="text-sm font-medium text-text-brand hover:underline">
        {t('openCommunity', { name })}
      </Link>
    );
  } else if (canJoinFromEvent(organiser)) {
    body = (
      <ButtonType2 onClick={onJoin} disabled={loading} className="w-full">
        {loading ? t('sending') : organiser.needsApproval ? t('request', { name }) : t('join', { name })}
      </ButtonType2>
    );
  }

  return (
    <section aria-labelledby="organiser-card-title" data-testid="organiser-card" className="space-y-3 rounded-2xl border border-border-subtle bg-surface-default p-4">
      <h2 id="organiser-card-title" className="flex items-center gap-2 text-base font-semibold text-text-primary">
        <Building2 className="size-4 text-text-secondary" aria-hidden /> {t('title')}
      </h2>
      <Link href={organiser.href} className="block truncate text-sm font-medium text-text-brand hover:underline">
        {name}
      </Link>
      {body}
    </section>
  );
}
