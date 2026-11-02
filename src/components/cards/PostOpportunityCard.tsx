'use client';

import { Briefcase, MapPin, Users } from 'lucide-react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ICON_CHIP_CLASS, TONE_CLASS } from '@/components/more/MoreLinkCard';
import { compensationParts } from '@/lib/compensation';
import { useUserStore } from '@/store/useUserStore';
import type { LinkedOpportunity } from '@/services/gql/types/postsFeed';

/**
 * Job card under a post that carries a listing. Same look as the redesign `JobCard`
 * (icon tile, title, place, commitment, pay, deadline) plus an Open / Closed BADGE
 * and the call to action: "View & apply", or "Manage" for the listing's own poster.
 * Pay is integer minor units; `compensationParts` holds the single ÷100. Ids are only
 * compared (owner check) and never rendered.
 */
export default function PostOpportunityCard({ opportunity }: { opportunity: LinkedOpportunity }) {
  const t = useTranslations('feed.opportunityCard');
  const tr = useTranslations('redesign');
  const format = useFormatter();
  const locale = useLocale();
  const viewerId = useUserStore((s) => s.user?.userId);

  const pay = compensationParts(opportunity.compensationMin, opportunity.compensationMax, opportunity.compensationCurrency, locale);
  const payText = !pay
    ? ''
    : pay.kind === 'range'
      ? `${pay.min} – ${pay.max}`
      : pay.kind === 'from'
        ? tr('salaryFrom', { amount: pay.min })
        : tr('salaryUpTo', { amount: pay.max });
  const remote = opportunity.deliveryMode === 'REMOTE' || opportunity.deliveryMode === 'ONLINE';
  const place = opportunity.location?.trim() || (remote ? tr('remote') : '');
  const commitment = opportunity.commitmentType && tr.has(`commitmentTypes.${opportunity.commitmentType}`) ? tr(`commitmentTypes.${opportunity.commitmentType}`) : '';
  const kind = opportunity.type && tr.has(`opportunityTypes.${opportunity.type}`) ? tr(`opportunityTypes.${opportunity.type}`) : tr('kinds.opportunity');
  const deadline = opportunity.deadline && !Number.isNaN(new Date(opportunity.deadline).getTime()) ? new Date(opportunity.deadline) : null;
  const closed = opportunity.status === 'CLOSED' || (deadline !== null && deadline.getTime() < Date.now());
  const isOwner = opportunity.ownerType === 'USER' && !!opportunity.ownerId && opportunity.ownerId === viewerId;
  const id = encodeURIComponent(opportunity.id);
  const applicants = opportunity.applicationCount ?? 0;

  return (
    // The feed card around this may be clickable (opens the post): keep our clicks to ourselves.
    <div
      data-testid="post-opportunity-card"
      onClick={(e) => e.stopPropagation()}
      className="mb-[1rem] flex min-w-0 flex-col gap-3 rounded-2xl border border-border-subtle bg-surface-subtle p-3.5"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${ICON_CHIP_CLASS}`}>
          <Briefcase className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-surface-default px-2 py-0.5 text-xs font-medium text-text-secondary">{kind}</span>
            <span
              data-testid="post-opportunity-status"
              className={`rounded-md px-2 py-0.5 text-xs font-semibold ${closed ? 'border border-border-subtle bg-surface-default text-text-secondary' : TONE_CLASS.success}`}
            >
              {closed ? t('closed') : t('open')}
            </span>
          </div>
          <h3 className="break-words text-sm font-semibold leading-snug text-text-primary">{opportunity.title}</h3>
          {place && (
            <p className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-text-secondary">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{place}</span>
            </p>
          )}
        </div>
      </div>

      {(commitment || payText || deadline || (isOwner && applicants > 0)) && (
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {commitment && <span className={`rounded-md px-2 py-0.5 font-medium ${TONE_CLASS.success}`}>{commitment}</span>}
          {payText && <span data-testid="post-opportunity-pay" className="font-medium text-success">{payText}</span>}
          {deadline && <span className="font-medium text-text-secondary">{tr('closes', { date: format.dateTime(deadline, { dateStyle: 'medium' }) })}</span>}
          {isOwner && applicants > 0 && (
            <span className="inline-flex items-center gap-1 font-medium text-text-secondary">
              <Users className="size-3.5" aria-hidden />
              {t('applicants', { count: applicants })}
            </span>
          )}
        </div>
      )}

      <Link
        href={isOwner ? `/opportunities/${id}/applicants` : `/opportunities/${id}`}
        prefetch={false}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-surface-brand px-5 py-2 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2 sm:w-auto sm:self-start"
      >
        {isOwner ? t('manage') : closed ? t('viewListing') : t('viewAndApply')}
      </Link>
    </div>
  );
}
