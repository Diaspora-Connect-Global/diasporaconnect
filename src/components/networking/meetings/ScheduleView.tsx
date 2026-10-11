'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarDays, Handshake, Loader2, Mic, UsersRound } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { formatDayHeading } from '@/lib/eventCalendar';
import { focusRing } from '../primitives';
import { NetworkingHeader, type NetworkingEventContext } from '../NetworkingShell';
import { QuietNote, StatusChip, ZoneNote, btnQuiet } from './parts';
import MeetingDetailDialog from './MeetingDetailDialog';
import type { MeetingsApi } from './useMeetings';
import { slotRange } from '@/lib/meetingTime';
import type { Meeting, MeetingSchedule, MeetingScheduleItem } from '@/services/gql/networkingMeetings';

const KIND_ICON = { MEETING: Handshake, SESSION: Mic, CIRCLE_SESSION: UsersRound } as const;

/** My schedule: confirmed meetings, programme sessions and circle sessions on one day-by-day timeline. */
export default function ScheduleView({
  event,
  schedule,
  loading,
  failureKey,
  api,
  onChanged,
}: {
  event: NetworkingEventContext;
  schedule: MeetingSchedule | null;
  loading: boolean;
  failureKey: string | null;
  api: MeetingsApi;
  onChanged: () => void;
}) {
  const t = useTranslations('networking.meetings');
  const te = useTranslations('networking.errors');
  const locale = useLocale();
  const [open, setOpen] = useState<Meeting | null>(null);
  const tz = schedule?.timezone || event.timezone || 'UTC';
  const items = (schedule?.items ?? []).filter((i) => i?.slot?.startAt);
  const days: Array<{ date: string; startAt: string; items: MeetingScheduleItem[] }> = [];
  for (const it of [...items].sort((a, b) => (a.slot!.startAt < b.slot!.startAt ? -1 : 1))) {
    const last = days[days.length - 1];
    if (last && last.date === it.slot!.localDate) last.items.push(it);
    else days.push({ date: it.slot!.localDate, startAt: it.slot!.startAt, items: [it] });
  }
  return (
    <>
      <NetworkingHeader event={event} title={t('schedule.title')} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ZoneNote timezone={tz} atIso={items[0]?.slot?.startAt} />
        <Link href={`/events/${event.id}/networking?tab=meetings`} className={`inline-flex min-h-11 items-center rounded-full border border-border-brand px-5 text-sm font-medium text-text-brand ${focusRing}`} data-testid="schedule-to-meetings">{t('schedule.toMeetings')}</Link>
      </div>
      {schedule && !schedule.circleSessionsAvailable && <QuietNote testId="circle-note">{t('schedule.circleNote')}</QuietNote>}
      {failureKey ? (
        <p role="alert" className="rounded-2xl border border-border-danger bg-surface-danger p-4 text-sm text-text-primary">{te(failureKey)}</p>
      ) : loading && !schedule ? (
        <Loader2 className="mx-auto size-5 animate-spin text-text-brand" aria-label={t('panel.loading')} />
      ) : days.length === 0 ? (
        <p data-testid="schedule-empty" className="rounded-2xl border border-dashed border-border-subtle bg-surface-default p-8 text-center text-sm text-muted-foreground">{t('schedule.empty')}</p>
      ) : (
        <div className="space-y-6" data-testid="schedule">
          {days.map((d) => (
            <section key={d.date} aria-labelledby={`day-${d.date}`} data-testid="schedule-day" data-date={d.date}>
              <h2 id={`day-${d.date}`} className="mb-3 flex items-center gap-2 text-lg font-semibold text-text-primary"><CalendarDays className="size-5 text-text-brand" aria-hidden />{formatDayHeading(d.startAt, locale, tz)}</h2>
              <ol className="space-y-3">
                {d.items.map((it, i) => {
                  const Icon = KIND_ICON[it.kind] ?? CalendarDays;
                  const m = it.meeting ?? null;
                  const title = it.kind === 'MEETING' ? t('schedule.meetingWith', { name: m?.counterpart?.displayName ?? t('thisPerson') }) : it.title ?? t(`schedule.kind.${it.kind}`);
                  return (
                    <li key={`${it.kind}-${it.slot!.startAt}-${i}`} data-testid="schedule-item" data-kind={it.kind} className="grid grid-cols-[5.5rem_1fr] gap-3 sm:grid-cols-[8rem_1fr]">
                      <p className="pt-3 text-sm font-medium tabular-nums text-text-primary">{slotRange(it.slot!)}</p>
                      <div className="flex min-w-0 flex-wrap items-center gap-3 rounded-2xl border border-border-subtle bg-surface-default p-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-brand-subtle text-text-brand"><Icon className="size-4" aria-hidden /></span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-text-primary">{title}</p>
                          <p className="truncate text-xs text-muted-foreground">{[t(`schedule.kind.${it.kind}`), it.location].filter(Boolean).join(' · ')}</p>
                        </div>
                        {it.kind === 'MEETING' && it.status && <StatusChip status={it.status} awaitingMe={m?.awaitingMe} />}
                        {m && <button type="button" onClick={() => setOpen(m)} className={btnQuiet} data-testid="schedule-open">{t('panel.view')}<span className="sr-only"> {title}</span></button>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
      <MeetingDetailDialog meeting={open} eventId={event.id} eventTitle={event.title} api={api} onClose={() => setOpen(null)} onChanged={() => onChanged()} />
    </>
  );
}
