'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, CalendarCheck, Handshake, MessageSquareHeart, PartyPopper, UserRound, Users, UsersRound } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { TONE_CLASS } from '@/components/more/MoreLinkCard';
import { PersonAvatar, SectionCard, focusRing } from '../primitives';
import { btnQuiet } from '../meetings/parts';
import FeedbackSheet from '../feedback/FeedbackSheet';
import type { FeedbackApi, FeedbackSubject } from '../feedback/useFeedback';
import { formatDayHeading, formatInZone } from '@/lib/eventCalendar';
import type { FeedbackPrompt, Recap, RecapOrganiser } from '@/services/gql/networkingEventDay';

/** The organiser's page: `/community/{id}` or `/association/{id}` (the same targets the event page uses). */
export function organiserHref(o: Pick<RecapOrganiser, 'kind' | 'entityId'>): string {
  return `/${o.kind === 'ASSOCIATION' ? 'association' : 'community'}/${o.entityId}`;
}

function subjectOf(p: FeedbackPrompt, timezone: string | null): FeedbackSubject {
  return { type: p.subjectType, id: p.subjectId, title: p.title, counterpartHandle: p.subjectType === 'MEETING' ? p.counterpart?.handle ?? null : null, startAt: p.startAt, timezone };
}

/**
 * The personal post-event recap: how many matches, meetings and circles THIS person had, who is
 * still waiting for their feedback, and where to keep in touch. Nothing about anyone else.
 */
export default function RecapView({ recap, api, onFeedbackSaved }: { recap: Recap; api: FeedbackApi; onFeedbackSaved?: () => void }) {
  const t = useTranslations('networkingEventDay.recap');
  const locale = useLocale();
  const tz = recap.timezone;
  const [done, setDone] = useState<string[]>([]);
  const [open, setOpen] = useState<FeedbackPrompt | null>(null);

  const rows = recap.pendingFeedback.filter((p) => !done.includes(`${p.subjectType}:${p.subjectId}`));
  const hidden = Math.max(0, recap.pendingFeedbackTotal - recap.pendingFeedback.length);
  const waiting = rows.length + hidden;
  const org = recap.organiser;

  const stats: Array<{ key: string; label: string; value: number; icon: React.ReactNode; tone: keyof typeof TONE_CLASS }> = [
    { key: 'matches', label: t('stats.matches'), value: recap.matchesCount, icon: <Handshake className="size-5" aria-hidden />, tone: 'brand' },
    { key: 'meetings', label: t('stats.meetings'), value: recap.meetingsHeldCount, icon: <CalendarCheck className="size-5" aria-hidden />, tone: 'info' },
    { key: 'circles', label: t('stats.circles'), value: recap.circlesJoinedCount, icon: <UsersRound className="size-5" aria-hidden />, tone: 'success' },
  ];

  return (
    <div className="@container space-y-5" data-testid="recap">
      <section aria-labelledby="recap-title" className="rounded-2xl border border-border-subtle bg-gradient-to-r from-surface-info via-surface-brand-subtle to-surface-default p-5 sm:p-6">
        <h2 id="recap-title" className="flex items-center gap-2 text-xl font-bold text-text-primary"><PartyPopper className="size-5 text-text-brand" aria-hidden />{t('title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        <dl className="mt-4 grid grid-cols-1 gap-3 @sm:grid-cols-3" data-testid="recap-stats">
          {stats.map((s) => (
            <div key={s.key} className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-default p-3" data-testid={`recap-stat-${s.key}`}>
              <span className={`grid size-11 shrink-0 place-items-center rounded-full ${TONE_CLASS[s.tone]}`}>{s.icon}</span>
              <div className="min-w-0">
                <dd className="text-2xl font-bold tabular-nums text-text-primary" data-testid="recap-stat-value">{s.value}</dd>
                <dt className="text-xs text-muted-foreground">{s.label}</dt>
              </div>
            </div>
          ))}
        </dl>
      </section>

      <SectionCard id="recap-feedback" title={t('feedback.title')} subtitle={t('feedback.subtitle')} icon={<MessageSquareHeart className="size-5" aria-hidden />}>
        {waiting === 0 ? (
          <p data-testid="recap-caught-up" className="text-sm text-muted-foreground">{t('feedback.empty')}</p>
        ) : (
          <>
            <ul className="divide-y divide-border-subtle" data-testid="recap-pending">
              {rows.map((p) => (
                <li key={`${p.subjectType}:${p.subjectId}`} data-testid="recap-pending-row" data-kind={p.subjectType} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                  {p.subjectType === 'MEETING'
                    ? <PersonAvatar name={p.counterpart?.displayName ?? p.title} url={p.counterpart?.avatarUrl} className="size-10" />
                    : <span className={`grid size-10 shrink-0 place-items-center rounded-full ${TONE_CLASS.success}`}><Users className="size-5" aria-hidden /></span>}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">{p.title}</p>
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">{p.subjectType === 'MEETING' ? <UserRound className="size-3.5" aria-hidden /> : <Users className="size-3.5" aria-hidden />}{t(`feedback.kind.${p.subjectType}`)}</span>
                      {p.startAt && <span>{formatDayHeading(p.startAt, locale, tz)}</span>}
                    </p>
                  </div>
                  <button type="button" onClick={() => setOpen(p)} className={btnQuiet} data-testid="recap-give-feedback">{t('feedback.give')}</button>
                </li>
              ))}
            </ul>
            {hidden > 0 && <p className="mt-3 text-xs text-muted-foreground" data-testid="recap-more">{t('feedback.more', { count: hidden })}</p>}
          </>
        )}
      </SectionCard>

      {org && org.membership !== 'UNAVAILABLE' && (
        <section aria-labelledby="recap-org" data-testid="recap-organiser" data-membership={org.membership} className="rounded-2xl border border-border-subtle bg-surface-default p-4 sm:p-5">
          <h2 id="recap-org" className="text-base font-semibold text-text-primary sm:text-lg">{t('organiser.title', { name: org.name })}</h2>
          {org.membership === 'NOT_MEMBER' && (
            <>
              <p className="mt-1 text-sm text-muted-foreground">{t('organiser.body')}</p>
              <Link href={organiserHref(org)} className={`mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-border-brand bg-surface-brand px-5 text-sm font-semibold text-text-white hover:opacity-90 ${focusRing}`} data-testid="recap-join-organiser">
                {t('organiser.join', { name: org.name })}<ArrowRight className="size-4" aria-hidden />
              </Link>
            </>
          )}
          {org.membership === 'PENDING' && <p className="mt-1 text-sm text-muted-foreground" data-testid="recap-organiser-pending">{t('organiser.pending', { name: org.name })}</p>}
          {org.membership === 'MEMBER' && <p className="mt-1 text-sm text-muted-foreground" data-testid="recap-organiser-member">{t('organiser.member', { name: org.name })}</p>}
        </section>
      )}

      <p className="rounded-xl bg-surface-subtle px-4 py-3 text-sm text-text-primary" data-testid="recap-ends" data-open={recap.networkingOpen ? 'true' : 'false'}>
        {recap.networkingOpen && recap.networkingEndsAt ? t('ends', { date: formatInZone(recap.networkingEndsAt, locale, tz) }) : t('closed')}
      </p>

      {open && (
        <FeedbackSheet
          open
          onOpenChange={(o) => { if (!o) setOpen(null); }}
          subject={subjectOf(open, tz)}
          api={api}
          onSaved={() => {
            setDone((d) => [...d, `${open.subjectType}:${open.subjectId}`]);
            onFeedbackSaved?.();
          }}
        />
      )}
    </div>
  );
}
