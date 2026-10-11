'use client';

import { useTranslations } from 'next-intl';
import { ChevronRight, Eye, Filter, Lightbulb, Users, Heart, Handshake, CircleDot, CalendarClock, CalendarDays, Settings2, UserSearch } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { CompletenessRing, focusRing } from './primitives';
import { tabHref } from './NetworkingShell';

const card = 'rounded-2xl border border-border-subtle bg-surface-default p-4';

export function CompletenessCard({ value, eventId }: { value: number; eventId: string }) {
  const t = useTranslations('networking.rail');
  return (
    <section aria-labelledby="rail-completeness" className={card} data-testid="rail-completeness">
      <h2 id="rail-completeness" className="text-base font-semibold text-text-primary">{t('progressTitle')}</h2>
      <div className="mt-3 flex items-center gap-4">
        <CompletenessRing value={value} />
        <div>
          <p className="text-sm font-medium text-text-primary">{value >= 100 ? t('complete') : t('keepGoing')}</p>
          <p className="text-xs text-muted-foreground">{t('progressHint')}</p>
        </div>
      </div>
      {value < 100 && (
        <Link href={`/events/${eventId}/networking`} className={`mt-3 inline-flex min-h-6 text-sm font-medium text-text-brand hover:underline ${focusRing}`}>{t('improve')}</Link>
      )}
    </section>
  );
}

function RowLink({ href, icon, title, hint }: { href: string; icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <li>
      <Link href={href} className={`flex min-h-12 items-center gap-3 rounded-xl px-1 py-2 hover:bg-surface-subtle ${focusRing}`}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-brand-subtle text-text-brand">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-text-primary">{title}</span>
          {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
        </span>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}

export function QuickActionsCard({ eventId, interests, circles, meetings = false }: { eventId: string; interests: boolean; circles: boolean; meetings?: boolean }) {
  const t = useTranslations('networking.rail');
  return (
    <section aria-labelledby="rail-actions" className={card} data-testid="rail-actions">
      <h2 id="rail-actions" className="text-base font-semibold text-text-primary">{t('quickActions')}</h2>
      <ul className="mt-2 divide-y divide-border-subtle">
        <RowLink href={tabHref(eventId, 'people')} icon={<Users className="size-4" aria-hidden />} title={t('viewPeople')} hint={t('viewPeopleHint')} />
        <RowLink href={tabHref(eventId, 'recommended')} icon={<UserSearch className="size-4" aria-hidden />} title={t('viewRecommended')} hint={t('viewRecommendedHint')} />
        {interests && <RowLink href={tabHref(eventId, 'interests')} icon={<Heart className="size-4" aria-hidden />} title={t('myInterests')} hint={t('myInterestsHint')} />}
        {interests && <RowLink href={tabHref(eventId, 'matches')} icon={<Handshake className="size-4" aria-hidden />} title={t('myMatches')} hint={t('myMatchesHint')} />}
        {meetings && <RowLink href={tabHref(eventId, 'meetings')} icon={<CalendarClock className="size-4" aria-hidden />} title={t('myMeetings')} hint={t('myMeetingsHint')} />}
        {meetings && <RowLink href={`/events/${eventId}/schedule`} icon={<CalendarDays className="size-4" aria-hidden />} title={t('mySchedule')} hint={t('myScheduleHint')} />}
        {circles && <RowLink href={tabHref(eventId, 'circles')} icon={<CircleDot className="size-4" aria-hidden />} title={t('circles')} hint={t('circlesHint')} />}
      </ul>
    </section>
  );
}

/** "Don't want to be seen right now?" with the real pause / resume control. */
export function VisibilityPrompt({ paused, busy, onTogglePause }: { paused: boolean; busy?: boolean; onTogglePause: () => void }) {
  const t = useTranslations('networking.rail');
  return (
    <section aria-labelledby="rail-visibility" className={`${card} bg-surface-brand-subtle`} data-testid="rail-visibility">
      <div className="flex items-start gap-3">
        <Eye className="mt-0.5 size-5 shrink-0 text-text-brand" aria-hidden />
        <div>
          <h2 id="rail-visibility" className="text-sm font-semibold text-text-primary">{paused ? t('pausedTitle') : t('pauseTitle')}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{paused ? t('pausedBody') : t('pauseBody')}</p>
          <button type="button" disabled={busy} onClick={onTogglePause} data-testid="toggle-pause" className={`mt-3 inline-flex min-h-9 items-center rounded-full border border-border-brand bg-surface-default px-4 text-sm font-medium text-text-brand disabled:opacity-50 ${focusRing}`}>
            {paused ? t('resume') : t('pause')}
          </button>
        </div>
      </div>
    </section>
  );
}

/** "Quick filters": each opens the People tab with that filter ready. */
export function QuickFiltersCard({ eventId }: { eventId: string }) {
  const t = useTranslations('networking.rail');
  const items: Array<{ filter: string; label: string }> = [
    { filter: 'industries', label: t('filterIndustry') },
    { filter: 'markets', label: t('filterMarket') },
    { filter: 'languages', label: t('filterLanguage') },
    { filter: 'needs', label: t('filterLookingFor') },
  ];
  return (
    <section aria-labelledby="rail-filters" className={card} data-testid="rail-filters">
      <h2 id="rail-filters" className="text-base font-semibold text-text-primary">{t('quickFilters')}</h2>
      <ul className="mt-2 divide-y divide-border-subtle">
        {items.map((i) => (
          <RowLink key={i.filter} href={`${tabHref(eventId, 'people')}&filter=${i.filter}`} icon={<Filter className="size-4" aria-hidden />} title={i.label} />
        ))}
      </ul>
    </section>
  );
}

export function SmartMatchingCard() {
  const t = useTranslations('networking.rail');
  const tt = useTranslations('networking.tier');
  return (
    <section aria-labelledby="rail-smart" className={card}>
      <h2 id="rail-smart" className="flex items-center gap-2 text-base font-semibold text-text-primary"><Lightbulb className="size-4 text-text-brand" aria-hidden />{t('smartTitle')}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('smartBody')}</p>
      <details className="mt-3 text-sm">
        <summary className={`min-h-6 cursor-pointer font-medium text-text-brand ${focusRing}`}>{t('howItWorks')}</summary>
        <dl className="mt-2 space-y-2">
          {(['DIRECT_OPPORTUNITY', 'STRONG_FIT', 'SHARED_INTERESTS', 'BROADER_COMPATIBILITY'] as const).map((k) => (
            <div key={k}>
              <dt className="font-medium text-text-primary">{tt(k)}</dt>
              <dd className="text-xs text-muted-foreground">{tt(`${k}Hint`)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">{t('noPercent')}</p>
      </details>
    </section>
  );
}

export function ManagePreferencesCard({ eventId }: { eventId: string }) {
  const t = useTranslations('networking.rail');
  return (
    <section aria-labelledby="rail-manage" className={card}>
      <div className="flex items-start gap-3">
        <Settings2 className="mt-0.5 size-5 shrink-0 text-text-brand" aria-hidden />
        <div>
          <h2 id="rail-manage" className="text-sm font-semibold text-text-primary">{t('manageTitle')}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t('manageBody')}</p>
          <Link href={`/events/${eventId}/networking`} className={`mt-3 inline-flex min-h-9 items-center rounded-full border border-border-brand px-4 text-sm font-medium text-text-brand ${focusRing}`}>{t('managePrefs')}</Link>
        </div>
      </div>
    </section>
  );
}
