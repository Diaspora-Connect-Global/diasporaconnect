'use client';

import { ArrowLeft, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CircleInvitationRow, useMyCircleInvitations } from '@/components/circles/invitations';
import PageLoader from '@/components/custom/PageLoader';
import { EmptyState, ErrorState } from '@/components/feedback';
import { Link } from '@/i18n/navigation';
import { CIRCLE_COLUMN_CLASS } from '@/lib/feedColumnLayout';

/**
 * Circle invitations — the inbox of circles that asked you to join.
 *
 * Accepting makes you a member and lands you on the circle (member cap is
 * enforced by circle-service); declining removes the row.
 */
export default function CircleInvitationsPage() {
  const t = useTranslations('circles.invitations');
  const tCommon = useTranslations('circles.common');
  const tGlobal = useTranslations('common');
  const { pending, loading, error, data, refetch } = useMyCircleInvitations();

  return (
    <div className="h-app-inner flex overflow-hidden">
      <div className={`${CIRCLE_COLUMN_CLASS} overflow-y-auto`}>
        <div className="flex shrink-0 items-center gap-2 pb-3">
          <Link
            href="/circles"
            aria-label={tGlobal('previousPage')}
            className="rounded-full p-1.5 text-text-primary transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
          <div className="min-w-0">
            <h1 className="label-large text-text-primary">{t('title')}</h1>
            <p className="caption-small text-text-secondary">{t('subtitle')}</p>
          </div>
        </div>

        {loading && !data ? (
          <PageLoader />
        ) : error && pending.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <ErrorState
              size="lg"
              description={t('loadError')}
              retryLabel={tCommon('retry')}
              onRetry={() => void refetch()}
            />
          </div>
        ) : pending.length === 0 ? (
          <EmptyState icon={Mail} title={t('emptyTitle')} description={t('emptyBody')} />
        ) : (
          <ul className="flex flex-col gap-3 pb-8" aria-label={t('title')}>
            {pending.map((invitation) => (
              <CircleInvitationRow key={invitation.id} invitation={invitation} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
