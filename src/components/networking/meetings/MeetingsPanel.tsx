'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { PersonAvatar } from '../primitives';
import { QuietNote, SlotText, StatusChip, btnQuiet } from './parts';
import MeetingDetailDialog from './MeetingDetailDialog';
import type { MeetingsApi } from './useMeetings';
import { MEETING_FILTERS, type Meeting, type MeetingCounts, type MeetingFilter } from '@/services/gql/networkingMeetings';

const COUNT_KEY: Record<MeetingFilter, keyof MeetingCounts> = {
  PENDING: 'pending',
  UPCOMING: 'upcoming',
  ALTERNATIVES: 'alternatives',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

/** The Meetings tab: Pending · Upcoming · Alternative times · Completed · Cancelled, cursor-paged. */
export default function MeetingsPanel({
  eventId,
  eventTitle,
  filter,
  onFilter,
  counts,
  meetings,
  loading,
  loaded,
  hasMore,
  failureKey,
  onLoadMore,
  onChanged,
  api,
}: {
  eventId: string;
  eventTitle: string;
  filter: MeetingFilter;
  onFilter: (f: MeetingFilter) => void;
  counts: MeetingCounts | null;
  meetings: Meeting[];
  loading: boolean;
  loaded: boolean;
  hasMore: boolean;
  failureKey: string | null;
  onLoadMore: () => void;
  onChanged: () => void;
  api: MeetingsApi;
}) {
  const t = useTranslations('networking.meetings');
  const te = useTranslations('networking.errors');
  const [open, setOpen] = useState<Meeting | null>(null);
  return (
    <div data-testid="panel-meetings" className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('panel.intro')}</p>
      {counts && counts.awaitingMe > 0 && <QuietNote testId="awaiting-me">{t('panel.awaitingMe', { count: counts.awaitingMe })}</QuietNote>}
      <div role="group" aria-label={t('panel.filters')} className="flex flex-wrap gap-2">
        {MEETING_FILTERS.map((f) => {
          const n = counts?.[COUNT_KEY[f]];
          const on = f === filter;
          return (
            <button
              key={f}
              type="button"
              aria-pressed={on}
              onClick={() => onFilter(f)}
              data-testid={`meetings-filter-${f.toLowerCase()}`}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-1 ${on ? 'border-border-brand bg-surface-brand-subtle text-text-brand' : 'border-border-subtle text-text-primary hover:bg-surface-subtle'}`}
            >
              {t(`panel.filter.${f}`)}
              {typeof n === 'number' && <span className="rounded-full bg-surface-subtle px-1.5 text-xs" data-testid="filter-count">{n}</span>}
            </button>
          );
        })}
      </div>

      {failureKey ? (
        <p role="alert" className="rounded-2xl border border-border-danger bg-surface-danger p-4 text-sm text-text-primary">{te(failureKey)}</p>
      ) : loaded && meetings.length === 0 && !loading ? (
        <p data-testid="meetings-empty" className="rounded-2xl border border-dashed border-border-subtle bg-surface-default p-8 text-center text-sm text-muted-foreground">{t(`panel.empty.${filter}`)}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2" data-testid="meetings-list">
          {meetings.map((m) => (
            <li key={m.meetingId}>
              <article data-testid="meeting-card" data-status={m.status} className="flex h-full flex-col gap-3 rounded-2xl border border-border-subtle bg-surface-default p-4">
                <div className="flex items-start gap-3">
                  <PersonAvatar name={m.counterpart?.displayName} url={m.counterpart?.avatarUrl} className="size-12" />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold text-text-primary">{m.counterpart?.displayName ?? t('thisPerson')}</h3>
                    {m.counterpart?.headline && <p className="truncate text-xs text-muted-foreground">{m.counterpart.headline}</p>}
                  </div>
                </div>
                <StatusChip status={m.status} awaitingMe={m.awaitingMe} />
                {m.slot && <p className="text-sm text-text-primary"><SlotText slot={m.slot} timezone={m.timezone || 'UTC'} /></p>}
                <div className="mt-auto pt-1">
                  <button type="button" onClick={() => setOpen(m)} className={btnQuiet} data-testid="meeting-open">{t('panel.view')}<span className="sr-only"> {m.counterpart?.displayName ?? ''}</span></button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
      {loading && <Loader2 className="mx-auto size-5 animate-spin text-text-brand" aria-label={t('panel.loading')} />}
      {hasMore && !loading && (
        <div className="text-center"><button type="button" onClick={onLoadMore} className={btnQuiet} data-testid="meetings-more">{t('panel.loadMore')}</button></div>
      )}
      <MeetingDetailDialog meeting={open} eventId={eventId} eventTitle={eventTitle} api={api} onClose={() => setOpen(null)} onChanged={() => onChanged()} />
    </div>
  );
}
