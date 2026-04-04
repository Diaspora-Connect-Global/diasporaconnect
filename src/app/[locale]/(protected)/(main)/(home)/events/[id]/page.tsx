"use client";

import EventCard2 from "@/components/cards/events/EventCard2";
import PaidEventsModal, { PaidEventsModalRef } from "@/components/events/modals/paidEventsModal";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  GET_EVENT,
  IS_EVENT_SAVED,
  USER_EVENTS,
  REGISTER_EVENT,
  CANCEL_REGISTRATION,
  SAVE_EVENT,
  UNSAVE_EVENT,
  type Event,
  type GetEventData,
  type IsEventSavedData,
  type RegisterEventData,
  type CancelRegistrationData,
  type SaveEventData,
  type UnsaveEventData,
  getEventLocationDisplay,
  getEventCoverImage,
  isEventSoldOut,
} from "@/services/gql/events";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { useLocale, useTranslations } from "next-intl";

function formatEventDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatPriceLabel(event: Event) {
  if (!event.isPaid || !event.tickets?.length) return "Free";
  const ticket = event.tickets[0];
  const cents = ticket?.priceInCents;
  if (cents == null) return "Free";
  const currency = event.currency || "GHS";
  return `${currency} ${(cents / 100).toFixed(2)}/ticket`;
}

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  const modalRef = useRef<PaidEventsModalRef>(null);
  const locale = useLocale();
  const tEvents = useTranslations("home.events");
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [optimisticRegistered, setOptimisticRegistered] = useState<boolean | null>(null);
  const sessionToken = useAuthStore((s) => s.tokens?.sessionToken);
  const isAuthHydrated = useAuthStore.persist.hasHydrated();
  const shouldLoadUserEventState = isAuthHydrated && !!sessionToken;

  const { data, loading, error } = useQuery<GetEventData>(GET_EVENT, {
    variables: { id: eventId },
    skip: !eventId,
  });
  const { data: savedData } = useQuery<IsEventSavedData>(IS_EVENT_SAVED, {
    variables: { eventId },
    skip: !eventId || !shouldLoadUserEventState,
  });
  const saved = savedData?.isEventSaved ?? false;

  const [registerForEvent] = useMutation<RegisterEventData>(REGISTER_EVENT, {
    refetchQueries: [
      { query: GET_EVENT, variables: { id: eventId } },
      { query: IS_EVENT_SAVED, variables: { eventId } },
      { query: USER_EVENTS },
    ],
    awaitRefetchQueries: true,
  });
  const [saveEvent] = useMutation<SaveEventData>(SAVE_EVENT, {
    onCompleted: () => toast.success("Event saved"),
    onError: () => toast.error("Failed to save event"),
    refetchQueries: [{ query: IS_EVENT_SAVED, variables: { eventId } }],
  });
  const [unsaveEvent] = useMutation<UnsaveEventData>(UNSAVE_EVENT, {
    onCompleted: () => toast.success("Event removed from saved"),
    onError: () => toast.error("Failed to unsave event"),
    refetchQueries: [{ query: IS_EVENT_SAVED, variables: { eventId } }],
  });
  const [cancelRegistration] = useMutation<CancelRegistrationData>(CANCEL_REGISTRATION, {
    refetchQueries: [{ query: GET_EVENT, variables: { id: eventId } }, { query: USER_EVENTS }],
    awaitRefetchQueries: true,
  });

  const event = data?.getEvent ?? null;

  const handleAttend = async () => {
    if (!eventId) return;
    const primaryTicket = event?.tickets?.[0];
    modalRef.current?.open({
      onPaymentSuccess: async ({ ticketId, quantity, promoCode, formResponsesJson }) => {
        const result = await registerForEvent({
          variables: {
            input: {
              eventId,
              ticketId: event?.isPaid ? ticketId : undefined,
              quantity,
              promoCode: promoCode || undefined,
              formResponsesJson: formResponsesJson || undefined,
            },
          },
        });
        const waitlistPosition = result.data?.registerForEvent?.waitlistPosition ?? null;
        if (waitlistPosition != null) {
          return { waitlistPosition };
        }

        const nextRegistrationId = result.data?.registerForEvent?.registrationId;
        if (nextRegistrationId) {
          setRegistrationId(nextRegistrationId);
        }

        const paymentIntentClientSecret = result.data?.registerForEvent?.paymentIntentClientSecret;
        if (paymentIntentClientSecret) {
          toast.info("Registration created. Complete payment to confirm attendance.");
          return;
        }

        setOptimisticRegistered(true);
        toast.success("Successfully registered for event");
      },
      event: event
        ? {
            id: event.id,
            title: event.title,
            startAt: event.startAt,
            isPaid: event.isPaid,
            currency: event.currency ?? undefined,
            ticketId: primaryTicket?.id,
            ticketName: primaryTicket?.name,
            ticketDescription: primaryTicket?.description ?? undefined,
            ticketPriceInCents: primaryTicket?.priceInCents ?? 0,
            registrationFormFields: event.registrationFormFields ?? undefined,
          }
        : undefined,
    });
  };

  const handleSave = async () => {
    if (!eventId) return;
    if (saved) {
      await unsaveEvent({ variables: { eventId } });
    } else {
      await saveEvent({ variables: { eventId } });
    }
  };

  const handleCancelAttend = async () => {
    if (!registrationId) {
      toast.error(tEvents("cancelAttendanceUnavailable"));
      return;
    }

    setOptimisticRegistered(false);
    try {
      await cancelRegistration({ variables: { registrationId } });
      setRegistrationId(null);
      toast.success(tEvents("attendanceCancelled"));
    } catch {
      setOptimisticRegistered(true);
      toast.error(tEvents("cancelAttendanceFailed"));
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

  const dateStr = formatEventDate(event.startAt, locale);
  const locationStr = getEventLocationDisplay(event);
  const priceStr = formatPriceLabel(event);
  const isRegistered = optimisticRegistered ?? event.isRegistered;

  return (
    <>
      <div className="h-[calc(100vh-4rem)] lg:w-[60vw] overflow-y-auto scrollbar-hide p-4">
        <div className="lg:min-w-[40rem] mx-auto">
          <EventCard2
            title={event.title}
            date={dateStr}
            location={locationStr}
            attendees={event.registrationCount ?? 0}
            imageUrl={getEventCoverImage(event)}
            description={event.description}
            priceLabel={priceStr}
            visibility={event.visibility}
            isSoldOut={isEventSoldOut(event)}
            isRegistered={isRegistered}
            isSaved={saved}
            onBuyClick={handleAttend}
            onSaveClick={handleSave}
            onCancelAttend={handleCancelAttend}
          />
        </div>
      </div>
      <PaidEventsModal ref={modalRef} />
    </>
  );
}
