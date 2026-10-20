'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Check, Loader2, UserPlus, Vote } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { AvatarGroup } from '@/components/circles/primitives';
import {
  readCircleWrite,
  refusalMessageKey,
} from '@/components/circles/governance/mutationOutcome';
import { ErrorState } from '@/components/feedback';
import { ICON_CHIP_CLASS } from '@/components/more/MoreLinkCard';
import { circleUserDisplayName, useCircleUsers } from '@/hooks/useCircleUsers';
import { Link } from '@/i18n/navigation';
import { formatDateOnly } from '@/macros/time';
import { CIRCLE_JOIN_REQUESTS, CIRCLE_MOTIONS, OPEN_CIRCLE_MOTION } from '@/services/gql/circles';
import type {
  CircleJoinRequestsData,
  CircleJoinRequestsVariables,
  CircleMotionsData,
  CircleMotionsVariables,
  OpenCircleMotionData,
  OpenCircleMotionVariables,
} from '@/services/gql/types/circles';

/** Pending requests are a queue, not an archive; the newest page is what a lead acts on. */
const REQUESTS_LIMIT = 25;
const MOTIONS_LIMIT = 50;

export interface JoinRequestsSectionProps {
  circleId: string;
}

/**
 * Pending join requests — LEADS ONLY (the caller mounts it behind `isLead`).
 *
 * Approving is NOT a direct lead action: circle-service admits people only
 * through an ADMIT_MEMBER motion (the circle governs itself), so "Approve"
 * opens that motion and the circle votes. A request leaves this list when the
 * enacted motion closes it as APPROVED. There is no decline mutation in the
 * API, so there is no decline control.
 */
export function JoinRequestsSection({ circleId }: JoinRequestsSectionProps) {
  const t = useTranslations('circles.joinRequests');
  const tCommon = useTranslations('circles.common');
  const tActions = useTranslations('circles.actions');
  const locale = useLocale();

  const { data, loading, error, refetch } = useQuery<
    CircleJoinRequestsData,
    CircleJoinRequestsVariables
  >(CIRCLE_JOIN_REQUESTS, {
    variables: { circleId, status: 'JOIN_REQUEST_PENDING', limit: REQUESTS_LIMIT, offset: 0 },
    errorPolicy: 'all',
  });

  // Open admission votes, so a row whose vote is already running says so
  // instead of offering a second (refused) Approve.
  const { data: motionsData } = useQuery<CircleMotionsData, CircleMotionsVariables>(
    CIRCLE_MOTIONS,
    {
      variables: { circleId, status: 'OPEN', kind: 'ADMIT_MEMBER', limit: MOTIONS_LIMIT, offset: 0 },
      errorPolicy: 'all',
    },
  );

  const [openMotion] = useMutation<OpenCircleMotionData, OpenCircleMotionVariables>(
    OPEN_CIRCLE_MOTION,
    { refetchQueries: ['CircleMotions'], awaitRefetchQueries: true },
  );

  const requests = useMemo(() => data?.circleJoinRequests ?? [], [data]);
  const { usersById } = useCircleUsers(requests.map((r) => r.userId));

  const motionByUser = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of motionsData?.circleMotions ?? []) {
      if (m.subjectId) map.set(m.subjectId, m.id);
    }
    return map;
  }, [motionsData]);

  const [busyId, setBusyId] = useState<string | null>(null);

  async function approve(requestId: string, userId: string) {
    if (busyId) return;
    setBusyId(requestId);
    const name = usersById[userId]?.name?.trim();
    try {
      const result = await openMotion({
        variables: {
          input: {
            circleId,
            kind: 'ADMIT_MEMBER',
            title: name ? t('motionTitle', { name }) : t('motionTitleFallback'),
            subjectType: 'MEMBER',
            subjectId: userId,
            // Stable per request: a double click or a retry replays the same motion.
            idempotencyKey: `admit-${requestId}`,
          },
        },
      });
      // `data`, not the absence of a throw: errorPolicy 'all' resolves refusals.
      const outcome = readCircleWrite(result, (d) => d.openCircleMotion);
      if (!outcome.ok) {
        toast.error(tActions(`writeErrors.${refusalMessageKey(outcome.refusal)}`));
        return;
      }
      toast.success(t('voteOpened'));
    } catch {
      toast.error(tActions(`writeErrors.${refusalMessageKey('UNKNOWN')}`));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section data-testid="join-requests" className="flex flex-col gap-3 rounded-xl border border-border-subtle p-4">
      <div className="flex items-start gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${ICON_CHIP_CLASS}`}>
          <UserPlus aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="label-medium text-text-primary">
            {t('title', { count: requests.length })}
          </h2>
          <p className="caption-small text-text-secondary">{t('description')}</p>
        </div>
      </div>

      {loading && requests.length === 0 ? (
        <p role="status" className="caption-small text-text-secondary">
          {tCommon('loading')}
        </p>
      ) : error && requests.length === 0 ? (
        <ErrorState
          size="sm"
          description={t('loadError')}
          retryLabel={tCommon('retry')}
          onRetry={() => void refetch()}
        />
      ) : requests.length === 0 ? (
        <p className="body-small text-text-secondary">{t('empty')}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border-subtle">
          {requests.map((request) => {
            const user = usersById[request.userId];
            const displayName = circleUserDisplayName(user, tCommon('loading'));
            const motionId = motionByUser.get(request.userId);
            const busy = busyId === request.id;
            const asked = request.createdAt
              ? formatDateOnly(request.createdAt, { locale })
              : null;
            return (
              <li key={request.id} className="flex flex-col gap-2 py-3">
                <div className="flex items-center gap-3">
                  <AvatarGroup
                    size="md"
                    users={[{ id: request.userId, name: displayName, avatarUrl: user?.avatarUrl }]}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/${request.userId}`}
                      className="label-medium block truncate text-text-primary hover:underline"
                    >
                      {displayName}
                    </Link>
                    {asked && (
                      <span className="caption-small text-text-secondary">
                        {t('requestedOn', { date: asked })}
                      </span>
                    )}
                  </div>
                </div>

                {request.note && (
                  <p className="body-small line-clamp-3 break-words rounded-lg bg-surface-subtle px-3 py-2 text-text-primary">
                    {request.note}
                  </p>
                )}

                {motionId ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Vote aria-hidden="true" className="size-4 shrink-0 text-text-brand" />
                    <span className="caption-small text-text-secondary">{t('voteRunning')}</span>
                    <Link
                      href={`/circles/${circleId}/motions/${motionId}`}
                      className="label-small text-text-brand underline underline-offset-2"
                    >
                      {t('viewVote')}
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => void approve(request.id, request.userId)}
                      disabled={busyId !== null}
                      aria-label={t('approveFor', { name: displayName })}
                      className="label-small inline-flex w-fit cursor-pointer items-center gap-2 rounded-full bg-surface-brand px-4 py-2 text-text-white transition-colors hover:bg-border-brand disabled:cursor-not-allowed disabled:bg-surface-disabled disabled:text-text-primary"
                    >
                      {busy ? (
                        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                      ) : (
                        <Check aria-hidden="true" className="size-4" />
                      )}
                      {t('approve')}
                    </button>
                    <span className="caption-small text-text-secondary">{t('approveHint')}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
