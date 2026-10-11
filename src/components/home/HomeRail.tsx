'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { ArrowRight, Briefcase, CalendarDays, ChevronRight, Compass, Users, UsersRound } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { QuickActionRow } from '@/components/redesign/QuickActionRow';
import { RailCard } from '@/components/redesign/RailCard';
import { useUpcomingRegistrations } from '@/hooks/redesign/useUpcomingRegistrations';
import { useMyCirclesPreview } from '@/hooks/redesign/useMyCirclesPreview';
import { getEventLocationDisplay } from '@/services/gql/events';
import { toCdnUrl } from '@/lib/cdn';

/**
 * Home right rail: community call to action, quick actions that exist, the
 * viewer's registered upcoming events and their circles. `idPrefix` keeps ids
 * unique because the rail is rendered once for desktop and once under the main
 * column on phones.
 */
export function HomeRail({ idPrefix }: { idPrefix: string }) {
  const t = useTranslations('homePage.rail');
  const tAll = useTranslations('redesign');
  const tHome = useTranslations('homePage');
  const format = useFormatter();
  const { events } = useUpcomingRegistrations(3);
  const { circles } = useMyCirclesPreview(3);

  return (
    <div className="space-y-4" data-testid={`home-rail-${idPrefix}`}>
      <Link
        href="/community"
        prefetch={false}
        className="flex items-center gap-4 rounded-2xl border border-border-subtle bg-surface-default p-4 shadow-sm transition-[border-color,box-shadow] hover:border-border-brand hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
      >
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-surface-info text-text-info">
          <UsersRound className="size-7" strokeWidth={1.5} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-text-primary">{t('ctaTitle')}</span>
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{t('ctaBody')}</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </Link>

      <RailCard id={`${idPrefix}-quick`} title={t('quickActions')} className="space-y-0">
        <div className="space-y-2.5">
          <QuickActionRow href="/discover" icon={Briefcase} tone="info" title={t('findOpps')} subtitle={t('findOppsHint')} />
          <QuickActionRow href="/marketplace?tab=services" icon={Compass} tone="success" title={t('exploreServices')} subtitle={t('exploreServicesHint')} />
          <QuickActionRow href="/community" icon={Users} tone="warning" title={t('connect')} subtitle={t('connectHint')} />
        </div>
      </RailCard>

      {events.length > 0 && (
        <RailCard id={`${idPrefix}-upcoming`} title={t('upcoming')} href="/events" viewAllLabel={tAll('viewAll')} testId="home-upcoming">
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id}>
                <Link href={`/events/${encodeURIComponent(e.id)}`} prefetch={false} className="group flex items-center gap-3 rounded-lg p-1.5 hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
                  <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-surface-danger text-text-danger">
                    <CalendarDays className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-text-primary">{e.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {format.dateTime(new Date(e.startAt), { dateStyle: 'medium', timeStyle: 'short' })} · {getEventLocationDisplay(e)}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </RailCard>
      )}

      {circles.length > 0 && (
        <RailCard id={`${idPrefix}-circles`} title={t('circles')} href="/circles" viewAllLabel={tAll('viewAll')} testId="home-circles">
          <ul className="grid grid-cols-3 gap-2">
            {circles.map((c) => {
              const img = c.bannerUrl || c.avatarUrl;
              return (
                <li key={c.id} className="min-w-0">
                  <Link href={`/circles/${encodeURIComponent(c.id)}`} prefetch={false} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
                    <span className="grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-lg bg-surface-brand-subtle text-lg font-bold text-text-brand">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={toCdnUrl(img)} alt="" width={160} height={120} loading="lazy" className="size-full object-cover" />
                      ) : (
                        <span aria-hidden>{c.name.trim().charAt(0).toUpperCase()}</span>
                      )}
                    </span>
                    <span className="mt-1 block truncate text-xs font-semibold text-text-primary">{c.name}</span>
                    {typeof c.memberCount === 'number' && c.memberCount > 0 && (
                      <span className="block truncate text-[11px] text-muted-foreground">{t('members', { count: c.memberCount })}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </RailCard>
      )}

      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800 p-5 text-white shadow-sm">
        <h2 className="text-base font-bold">{t('promoTitle')}</h2>
        <p className="mt-1.5 text-sm text-white/80">{t('promoBody')}</p>
        <Link
          href="/discover"
          prefetch={false}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/70 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {tHome('heroCta')}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </section>
    </div>
  );
}
