'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { Briefcase, CalendarClock, MapPin } from 'lucide-react';
import { CATEGORY_PHOTOS } from '@/lib/redesignImages';
import { compensationParts } from '@/lib/compensation';
import { OpportunityBookmark } from '@/components/redesign/OpportunityBookmark';
import { daysUntil, toDate, type OpportunityPhase } from '@/lib/opportunityDisplay';
import type { Opportunity } from '@/services/gql/types/opportunities';
import { useOpportunityLabels } from './useOpportunityLabels';

const PHASE_CLASS: Record<OpportunityPhase, string> = {
  open: 'bg-emerald-500/20 text-emerald-50 ring-1 ring-inset ring-emerald-300/50',
  closingSoon: 'bg-amber-400/20 text-amber-50 ring-1 ring-inset ring-amber-300/60',
  closed: 'bg-white/15 text-white ring-1 ring-inset ring-white/30',
};

/** Opportunities have no image of their own: a photo for their kind, as on their cards. */
function heroPhoto(o: Opportunity) {
  if (o.category === 'REAL_ESTATE_INFRASTRUCTURE') return CATEGORY_PHOTOS.property;
  if (o.type === 'INVESTMENT' || o.type === 'GRANT') return CATEGORY_PHOTOS.investment;
  return CATEGORY_PHOTOS.job;
}

function Fact({ icon: Icon, label, value, sub }: { icon: typeof MapPin; label: string; value: string; sub?: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3 sm:px-5 sm:first:pl-0">
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0">
        <dt className="sr-only">{label}</dt>
        <dd className="break-words font-semibold">{value}</dd>
        {sub && <dd className="break-words text-xs text-white/75">{sub}</dd>}
      </div>
    </div>
  );
}

/**
 * The opportunity's banner, laid out like the event page's: its kind and whether
 * it is still open, the title, who posted it, and the three facts people look for
 * first (where, what kind of work and pay, until when). A missing fact is left out.
 */
export default function OpportunityHero({
  item,
  phase,
  poster,
  now,
  children,
}: {
  item: Opportunity;
  phase: OpportunityPhase;
  poster: string;
  now: Date;
  children?: ReactNode;
}) {
  const t = useTranslations('opportunityPage');
  const format = useFormatter();
  const locale = useLocale();
  const labels = useOpportunityLabels();

  const workMode = labels.deliveryMode(item.deliveryMode);
  const place = labels.place(item.location, item.deliveryMode);
  const commitment = labels.commitment(item.commitmentType);
  const pay = compensationParts(item.compensationMin, item.compensationMax, item.compensationCurrency, locale);
  const payText = !pay ? '' : pay.kind === 'range' ? `${pay.min} – ${pay.max}` : pay.kind === 'from' ? t('payFrom', { amount: pay.min }) : t('payUpTo', { amount: pay.max });
  const deadline = toDate(item.deadline);
  const days = deadline ? daysUntil(deadline, now) : null;
  // Long titles (a post turned into a listing) get a smaller size and at most three lines; the full text is in "About".
  const long = (item.title ?? '').length > 90;

  return (
    <header className="relative overflow-hidden rounded-2xl bg-slate-900 text-white" data-testid="opportunity-hero">
      <Image src={heroPhoto(item).src} alt="" fill priority sizes="(min-width: 1024px) 80vw, 100vw" className="object-cover" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-slate-950/30" />
      <div className="relative flex min-h-60 flex-col justify-end gap-3 p-4 sm:min-h-72 sm:p-6">
        <div className="absolute right-3 top-3">
          <OpportunityBookmark id={item.id} saved={!!item.isSavedByCurrentUser} look="photo" />
        </div>

        <div className="flex flex-wrap items-center gap-2 pr-14">
          <span className="rounded-full bg-surface-brand px-3 py-1 text-xs font-medium text-text-white" data-testid="opportunity-type">
            {labels.type(item.type, item.category)}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${PHASE_CLASS[phase]}`} data-testid="opportunity-status">
            {t(`status.${phase}`)}
          </span>
        </div>

        <h1 className={`line-clamp-3 max-w-3xl break-words font-bold leading-tight ${long ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-4xl'}`}>{item.title}</h1>
        <p className="text-sm text-white/85">{t('postedBy', { name: poster })}</p>

        {(place || commitment || payText || deadline) && (
          <dl className="mt-1 flex flex-col gap-3 text-sm sm:flex-row sm:flex-wrap sm:gap-y-3 sm:divide-x sm:divide-white/25">
            {place && <Fact icon={MapPin} label={t('facts.location')} value={place} sub={item.location?.trim() && workMode ? workMode : undefined} />}
            {(commitment || payText) && <Fact icon={Briefcase} label={t('facts.commitment')} value={commitment || payText} sub={commitment && payText ? payText : undefined} />}
            {deadline && (
              <Fact
                icon={CalendarClock}
                label={t('facts.deadline')}
                value={t('deadline.by', { date: format.dateTime(deadline, { dateStyle: 'medium' }) })}
                sub={phase === 'closed' ? t('status.closed') : days !== null && days >= 0 ? t('deadline.daysLeft', { count: days }) : undefined}
              />
            )}
          </dl>
        )}
        {children}
      </div>
    </header>
  );
}
