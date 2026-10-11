'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarClock } from 'lucide-react';
import MeetingRequestSheet, { type MeetingPerson } from './MeetingRequestSheet';
import { btnPrimary, btnQuiet } from './parts';
import type { MeetingsApi } from './useMeetings';
import type { Meeting } from '@/services/gql/networkingMeetings';

/** "Request a meeting": the button plus its sheet. Rendered only while MEETINGS_UI_ENABLED (or in the harness). */
export default function MeetingRequestButton({
  person,
  api,
  hiddenSender,
  variant = 'primary',
  onRequested,
}: {
  person: MeetingPerson;
  api: MeetingsApi;
  hiddenSender: boolean;
  variant?: 'primary' | 'quiet';
  onRequested?: (meeting: Meeting) => void;
}) {
  const t = useTranslations('networking.meetings.request');
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${variant === 'primary' ? btnPrimary : btnQuiet} flex-1`} data-testid="request-meeting" aria-haspopup="dialog">
        <CalendarClock className="size-4" aria-hidden />{t('button')}
      </button>
      <MeetingRequestSheet open={open} onOpenChange={setOpen} person={person} api={api} hiddenSender={hiddenSender} onRequested={onRequested} />
    </>
  );
}
