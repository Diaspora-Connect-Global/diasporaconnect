'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MessageSquareHeart } from 'lucide-react';
import { btnQuiet } from '../meetings/parts';
import { useClockNow, type Clock } from '../eventday/useClock';
import type { Meeting } from '@/services/gql/networkingMeetings';
import FeedbackSheet from './FeedbackSheet';
import { useFeedbackApi, type FeedbackApi } from './useFeedback';

export interface FeedbackConfig {
  api: FeedbackApi;
  clock?: Clock;
}

const realClock: Clock = () => Date.now();

/** Meetings that have happened (or should have): confirmed or completed, and past their end. */
export function feedbackIsDue(meeting: Pick<Meeting, 'status' | 'slot'>, nowMs: number): boolean {
  if (meeting.status !== 'CONFIRMED' && meeting.status !== 'COMPLETED') return false;
  const end = meeting.slot ? Date.parse(meeting.slot.endAt) : NaN;
  return Number.isFinite(end) && nowMs >= end;
}

/** "Give feedback" inside a meeting's detail, once the meeting is over. */
export default function FeedbackEntry({ meeting, eventId, config }: { meeting: Meeting; eventId: string; config?: FeedbackConfig }) {
  return config ? <Entry meeting={meeting} config={config} /> : <ConnectedEntry meeting={meeting} eventId={eventId} />;
}

function ConnectedEntry({ meeting, eventId }: { meeting: Meeting; eventId: string }) {
  const api = useFeedbackApi(eventId);
  return <Entry meeting={meeting} config={{ api }} />;
}

function Entry({ meeting, config }: { meeting: Meeting; config: FeedbackConfig }) {
  const t = useTranslations('networkingEventDay.feedback');
  const [open, setOpen] = useState(false);
  const now = useClockNow(config.clock ?? realClock, 60_000);
  if (!feedbackIsDue(meeting, now)) return null;
  const cp = meeting.counterpart;
  return (
    <div data-testid="feedback-entry">
      <button type="button" onClick={() => setOpen(true)} className={btnQuiet} data-testid="feedback-open">
        <MessageSquareHeart className="size-4" aria-hidden />{t('give')}
      </button>
      <FeedbackSheet
        open={open}
        onOpenChange={setOpen}
        api={config.api}
        subject={{ type: 'MEETING', id: meeting.meetingId, title: cp?.displayName?.trim() || t('thisPerson'), counterpartHandle: cp?.available ? cp.handle : null, startAt: meeting.slot?.startAt ?? null, timezone: meeting.timezone }}
      />
    </div>
  );
}
