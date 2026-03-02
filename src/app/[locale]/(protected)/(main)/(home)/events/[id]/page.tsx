"use client";

import EventCard2 from "@/components/cards/events/EventCard2";
import PaidEventsModal, { PaidEventsModalRef } from "@/components/events/modals/paidEventsModal";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  GET_EVENT,
  GET_USER_EVENTS,
  REGISTER_EVENT,
  SAVE_EVENT,
  UNSAVE_EVENT,
  type Event,
  type GetEventData,
  type GetUserEventsData,
  type RegisterEventData,
  type SaveEventData,
  type UnsaveEventData,
  getEventLocationDisplay,
  getEventCoverImage,
} from "@/services/gql/events";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

function formatEventDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPriceLabel(event: Event) {
  if (!event.isPaid || !event.tickets?.length) return "Free";
  const cents = event.tickets[0]?.priceInCents;
  if (cents == null) return "Free";
  return `GHC ${(cents / 100).toFixed(2)}/ticket`;
}

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  const modalRef = useRef<PaidEventsModalRef>(null);

  const { data, loading, error } = useQuery<GetEventData>(GET_EVENT, {
    variables: { id: eventId },
    skip: !eventId,
  });
  const { data: userEventsData } = useQuery<GetUserEventsData>(GET_USER_EVENTS);
  const savedEventIds = new Set((userEventsData?.userEvents?.saved ?? []).map((e) => e.id));
  const saved = !!eventId && savedEventIds.has(eventId);

  const [registerForEvent, { loading: registering }] = useMutation<RegisterEventData>(REGISTER_EVENT, {
    onCompleted: () => toast.success("Successfully registered for event"),
    onError: () => toast.error("Failed to register"),
    refetchQueries: [
      { query: GET_EVENT, variables: { id: eventId } },
      { query: GET_USER_EVENTS },
    ],
  });
  const [saveEvent] = useMutation<SaveEventData>(SAVE_EVENT, {
    onCompleted: () => toast.success("Event saved"),
    onError: () => toast.error("Failed to save event"),
    refetchQueries: [{ query: GET_USER_EVENTS }],
  });
  const [unsaveEvent] = useMutation<UnsaveEventData>(UNSAVE_EVENT, {
    onCompleted: () => toast.success("Event removed from saved"),
    onError: () => toast.error("Failed to unsave event"),
    refetchQueries: [{ query: GET_USER_EVENTS }],
  });

  const event = data?.event ?? null;

  const handleAttend = async () => {
    if (!eventId || event?.isPaid) {
      modalRef.current?.open();
      return;
    }
    await registerForEvent({ variables: { input: { eventId } } });
  };

  const handleSave = async () => {
    if (!eventId) return;
    if (saved) {
      await unsaveEvent({ variables: { eventId } });
    } else {
      await saveEvent({ variables: { eventId } });
    }
  };

  if (!eventId) {
    return (
      <div className="p-4 text-center text-text-secondary">Invalid event ID.</div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-text-brand" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="p-4 text-center text-text-secondary">
        Event not found or failed to load.
      </div>
    );
  }

  const dateStr = formatEventDate(event.startAt);
  const locationStr = getEventLocationDisplay(event);
  const priceStr = formatPriceLabel(event);

  return (
    <>
      <div className="h-[calc(100vh-4rem)] lg:w-[60vw] overflow-y-auto scrollbar-hide p-4">
        <div className="lg:min-w-[40rem] mx-auto">
          <EventCard2
            title={event.title}
            date={dateStr}
            location={locationStr}
            attendees={event.registrationCount}
            imageUrl={getEventCoverImage(event)}
            description={event.description}
            priceLabel={priceStr}
            isRegistered={event.isRegistered}
            isSaved={saved}
            onBuyClick={handleAttend}
            onSaveClick={handleSave}
          />
        </div>
      </div>
      <PaidEventsModal ref={modalRef} />
    </>
  );
}
