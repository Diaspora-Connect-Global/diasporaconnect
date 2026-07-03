"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import { useQuery } from "@apollo/client/react";
import EventCardSmall from "@/components/cards/events/EventCardSmall";
import {
  LIST_EVENTS,
  getEventLocationDisplay,
  getEventCoverImage,
  type ListEventsData,
} from "@/services/gql/events";

const SUGGESTION_LIMIT = 6;

function formatEventDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function SuggestedEvents({ currentEventId }: { currentEventId: string }) {
  const locale = useLocale();
  const { data, loading } = useQuery<ListEventsData>(LIST_EVENTS, {
    variables: { input: { limit: 10, offset: 0 } },
  });

  const suggestions = useMemo(() => {
    const events = data?.listEvents.events ?? [];
    return events.filter((event) => event.id !== currentEventId).slice(0, SUGGESTION_LIMIT);
  }, [data, currentEventId]);

  if (loading && suggestions.length === 0) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-surface-subtle animate-pulse" />
        ))}
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-text-primary">Suggested events</h2>
      <div className="space-y-2">
        {suggestions.map((event) => (
          <EventCardSmall
            key={event.id}
            eventId={event.id}
            title={event.title}
            date={formatEventDate(event.startAt, locale)}
            location={getEventLocationDisplay(event)}
            attendees={event.registrationCount ?? 0}
            imageUrl={getEventCoverImage(event)}
            visibility={event.visibility}
          />
        ))}
      </div>
    </div>
  );
}
