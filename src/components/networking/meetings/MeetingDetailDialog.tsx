'use client';

import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import MeetingDetail from './MeetingDetail';
import type { MeetingsApi } from './useMeetings';
import type { Meeting } from '@/services/gql/networkingMeetings';

export default function MeetingDetailDialog({
  meeting,
  eventId,
  eventTitle,
  api,
  onClose,
  onChanged,
}: {
  meeting: Meeting | null;
  eventId: string;
  eventTitle: string;
  api: MeetingsApi;
  onClose: () => void;
  onChanged?: (meeting: Meeting) => void;
}) {
  const t = useTranslations('networking.meetings.detail');
  return (
    <Dialog open={Boolean(meeting)} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent data-testid="meeting-dialog" className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{eventTitle}</DialogDescription>
        </DialogHeader>
        {meeting && <MeetingDetail key={meeting.meetingId} meeting={meeting} eventId={eventId} eventTitle={eventTitle} api={api} onChanged={onChanged} />}
      </DialogContent>
    </Dialog>
  );
}
