"use client";

import EventCard2 from "@/components/cards/events/EventCard2";
import PaidEventsModal, { PaidEventsModalRef } from "@/components/events/modals/paidEventsModal";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApolloClient, useQuery, useMutation } from "@apollo/client/react";
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
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { useUserStore } from "@/store/useUserStore";
import { useLocale, useTranslations } from "next-intl";
import { CONVERT_CURRENCY } from "@/services/gql/marketplace";
import {
  formatAmountWithCurrency,
  getStoredDisplayCurrencyPreference,
  resolveDisplayCurrency,
} from "@/lib/displayCurrency";

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
  if (!event.isPaid) return "Free";
  const ticket = event.tickets?.find((t) => (t?.priceInCents ?? 0) > 0) ?? event.tickets?.[0];
  const cents = ticket?.priceInCents;
  if (cents == null || cents <= 0) return "Paid";
  const currency = ticket?.currency || event.currency || "GHS";
  return `${currency} ${(cents / 100).toFixed(2)}/ticket`;
}

type ConvertCurrencyData = {
  convertCurrency: {
    success: boolean;
    converted_amount: number;
    to_currency: string;
  };
};

export default function EventDetailPage() {
  const apolloClient = useApolloClient();
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const modalRef = useRef<PaidEventsModalRef>(null);
  const locale = useLocale();
  const tEvents = useTranslations("home.events");
  const residenceCountry = useUserStore((s) => s.user?.residenceCountry);
  const countryOfOrigin = useUserStore((s) => s.user?.countryOfOrigin);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [optimisticRegistered, setOptimisticRegistered] = useState<boolean | null>(null);
  const [optimisticSaved, setOptimisticSaved] = useState<boolean | null>(null);
  const [displayCurrencyPreference, setDisplayCurrencyPreference] = useState<string | null>(null);
  const [convertedPriceLabel, setConvertedPriceLabel] = useState<string | null>(null);
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
  const saved = optimisticSaved ?? (savedData?.isEventSaved ?? false);

  const [registerForEvent] = useMutation<RegisterEventData>(REGISTER_EVENT, {
    refetchQueries: [
      { query: GET_EVENT, variables: { id: eventId } },
      { query: IS_EVENT_SAVED, variables: { eventId } },
      { query: USER_EVENTS },
    ],
    awaitRefetchQueries: true,
  });
  const [saveEvent] = useMutation<SaveEventData>(SAVE_EVENT, {
    refetchQueries: [{ query: IS_EVENT_SAVED, variables: { eventId } }, { query: USER_EVENTS }],
    awaitRefetchQueries: true,
  });
  const [unsaveEvent] = useMutation<UnsaveEventData>(UNSAVE_EVENT, {
    refetchQueries: [{ query: IS_EVENT_SAVED, variables: { eventId } }, { query: USER_EVENTS }],
    awaitRefetchQueries: true,
  });
  const [cancelRegistration] = useMutation<CancelRegistrationData>(CANCEL_REGISTRATION, {
    refetchQueries: [{ query: GET_EVENT, variables: { id: eventId } }, { query: USER_EVENTS }],
    awaitRefetchQueries: true,
  });

  const event = data?.getEvent ?? null;

  useEffect(() => {
    setDisplayCurrencyPreference(getStoredDisplayCurrencyPreference());
  }, []);

  const preferredDisplayCurrency = useMemo(
    () =>
      resolveDisplayCurrency({
        preferredCurrency: displayCurrencyPreference,
        residenceCountry,
        countryOfOrigin,
        locale,
      }),
    [displayCurrencyPreference, residenceCountry, countryOfOrigin, locale]
  );

  useEffect(() => {
    let cancelled = false;

    const computeLabel = async () => {
      if (!event) {
        if (!cancelled) setConvertedPriceLabel(null);
        return;
      }

      const fallbackLabel = formatPriceLabel(event);
      if (!event.isPaid) {
        if (!cancelled) setConvertedPriceLabel(fallbackLabel);
        return;
      }

      const ticket = event.tickets?.find((t) => (t?.priceInCents ?? 0) > 0) ?? event.tickets?.[0];
      const cents = ticket?.priceInCents;
      if (cents == null || cents <= 0) {
        if (!cancelled) setConvertedPriceLabel("Paid");
        return;
      }

      const fromCurrency = (ticket?.currency ?? event.currency ?? "USD").toUpperCase();
      if (fromCurrency === preferredDisplayCurrency) {
        const amount = cents / 100;
        if (!cancelled) {
          setConvertedPriceLabel(`${formatAmountWithCurrency(amount, preferredDisplayCurrency, locale)}/ticket`);
        }
        return;
      }

      try {
        const { data } = await apolloClient.query<ConvertCurrencyData>({
          query: CONVERT_CURRENCY,
          variables: {
            amount: cents / 100,
            from_currency: fromCurrency,
            to_currency: preferredDisplayCurrency,
          },
          fetchPolicy: 'no-cache',
        });

        const result = data?.convertCurrency;
        if (!result?.success || typeof result.converted_amount !== 'number') {
          if (!cancelled) setConvertedPriceLabel(fallbackLabel);
          return;
        }

        if (!cancelled) {
          setConvertedPriceLabel(
            `${formatAmountWithCurrency(result.converted_amount, preferredDisplayCurrency, locale)}/ticket`
          );
        }
      } catch {
        if (!cancelled) setConvertedPriceLabel(fallbackLabel);
      }
    };

    void computeLabel();

    return () => {
      cancelled = true;
    };
  }, [event, apolloClient, locale, preferredDisplayCurrency]);

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
    if (!sessionToken) {
      toast.error("Please sign in to save events");
      return;
    }

    const nextSavedState = !saved;
    setOptimisticSaved(nextSavedState);

    try {
      if (saved) {
        const result = await unsaveEvent({ variables: { eventId } });
        if (!result.data?.unsaveEvent) {
          throw new Error("Unsave failed");
        }
        setOptimisticSaved(null);
        toast.success("Event removed from saved");
      } else {
        const result = await saveEvent({ variables: { eventId } });
        if (!result.data?.saveEvent?.id) {
          throw new Error("Save failed");
        }
        setOptimisticSaved(null);
        toast.success("Event saved");
      }
    } catch {
      setOptimisticSaved(null);
      toast.error(saved ? "Failed to unsave event" : "Failed to save event");
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
  const priceStr = convertedPriceLabel ?? formatPriceLabel(event);
  const isRegistered = optimisticRegistered ?? event.isRegistered;

  return (
    <>
      <div className="h-[calc(100vh-4rem)] lg:w-[60vw] overflow-y-auto scrollbar-hide p-4">
        <div className="lg:min-w-[40rem] mx-auto">
          <button
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
                return;
              }
              router.push(`/${locale}/events`);
            }}
            className="mb-4 inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
            <span className="font-medium text-sm">Back</span>
          </button>
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
