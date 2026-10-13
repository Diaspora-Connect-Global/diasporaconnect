'use client';

import EventDayCard, { type EventDayConfig } from './EventDayCard';
import { useEventDayApi } from './useEventDay';
import type { Meeting } from '@/services/gql/networkingMeetings';

/**
 * The event-day card as the meeting detail uses it. With a `config` (the dev harness) it renders on
 * that; without one it uses the real gateway, and MeetingDetail only mounts this while
 * `EVENT_DAY_UI_ENABLED` is true, so no event-day operation exists in production until then.
 */
export default function EventDaySlot({ meeting, eventId, config }: { meeting: Meeting; eventId: string; config?: EventDayConfig }) {
  return config ? <EventDayCard meeting={meeting} eventId={eventId} config={config} /> : <ConnectedCard meeting={meeting} eventId={eventId} />;
}

function ConnectedCard({ meeting, eventId }: { meeting: Meeting; eventId: string }) {
  const api = useEventDayApi(eventId);
  return <EventDayCard meeting={meeting} eventId={eventId} config={{ api }} />;
}
