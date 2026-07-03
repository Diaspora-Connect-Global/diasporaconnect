"use client";

import EventCard2 from "@/components/cards/events/EventCard2";
import HomeSidebar from "@/components/home/HomeSidebar";
import SuggestedEvents from "@/components/events/SuggestedEvents";
import PaidEventsModal, { PaidEventsModalRef } from "@/components/events/modals/paidEventsModal";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApolloClient, useQuery, useMutation, useLazyQuery } from "@apollo/client/react";
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
  getEventVenueLines,
  getEventCoverImage,
  isEventSoldOut,
} from "@/services/gql/events";
import {
  CONFIRM_PAYMENT_INTENT,
  MY_PAYMENT_METHODS,
  type ConfirmPaymentIntentResponse,
  type MyPaymentMethodsResponse,
} from "@/services/gql/payments";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { useUserStore } from "@/store/useUserStore";
import { useLocale, useTranslations } from "next-intl";
import { CONVERT_CURRENCY } from "@/services/gql/marketplace";
import { openPaystackMobileMoney } from "@/lib/paystack";
import { formatAmountWithCurrency } from "@/lib/displayCurrency";
import { useDisplayCurrency } from "@/hooks/useDisplayCurrency";

function formatEventDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Start → end. Single-day events show one date with a time range; multi-day shows both dates. */
function formatEventDateRange(startIso: string, endIso: string | undefined, locale: string) {
  const start = formatEventDate(startIso, locale);
  if (!endIso) return start;
  const startDate = new Date(startIso);
  const endDate = new Date(endIso);
  const sameDay = startDate.toDateString() === endDate.toDateString();
  if (sameDay) {
    const endTime = new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
    }).format(endDate);
    return `${start} – ${endTime}`;
  }
  return `${start} – ${formatEventDate(endIso, locale)}`;
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
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [optimisticRegistered, setOptimisticRegistered] = useState<boolean | null>(null);
  const [optimisticSaved, setOptimisticSaved] = useState<boolean | null>(null);
  const { currency: preferredDisplayCurrency } = useDisplayCurrency();
  const [convertedPriceLabel, setConvertedPriceLabel] = useState<string | null>(null);
  const sessionToken = useAuthStore((s) => s.tokens?.sessionToken);
  const userEmail = useUserStore((s) => s.user?.email);
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
  const [confirmPaymentIntent] = useMutation<ConfirmPaymentIntentResponse>(CONFIRM_PAYMENT_INTENT);
  const [fetchMyPaymentMethods] = useLazyQuery<MyPaymentMethodsResponse>(MY_PAYMENT_METHODS, {
    fetchPolicy: 'network-only',
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

  // Seed registrationId from server if the user is already registered
  useEffect(() => {
    if (event?.myRegistrationId && !registrationId) {
      setRegistrationId(event.myRegistrationId);
    }
  }, [event?.myRegistrationId]);

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
            // convertCurrency now speaks integer minor units in AND out.
            amount: cents,
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
            `${formatAmountWithCurrency(result.converted_amount / 100, preferredDisplayCurrency, locale)}/ticket`
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

  const parsePaymentIntentIdFromClientSecret = (clientSecret?: string | null): string | null => {
    if (!clientSecret) return null;
    const marker = '_secret_';
    const index = clientSecret.indexOf(marker);
    if (index <= 0) return null;
    return clientSecret.slice(0, index);
  };

  const getPrimaryStripeCardPaymentMethodId = async (): Promise<string | null> => {
    const { data } = await fetchMyPaymentMethods();
    const methods = data?.myPaymentMethods?.payment_methods ?? [];
    const stripeCards = methods.filter((m) => m.provider === 'STRIPE' && m.type === 'card');
    const primary = stripeCards.find((m) => Boolean(m.is_primary));
    return (primary ?? stripeCards[0])?.id ?? null;
  };

  const handleAttend = async () => {
    if (!eventId) return;
    const primaryTicket = event?.tickets?.[0];
    modalRef.current?.open({
      onPaymentSuccess: async ({ ticketId, quantity, promoCode, formResponsesJson, paymentMethod, totalAmount }) => {
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
          const paymentIntentId = parsePaymentIntentIdFromClientSecret(paymentIntentClientSecret);
          if (!paymentIntentId) {
            toast.error('Unable to resolve payment intent for this event payment.');
            return;
          }

          if (paymentMethod === 'mobile') {
            if (!userEmail) {
              toast.error('Email is required for mobile money checkout.');
              return;
            }
            const amountInPesewas = Math.round((totalAmount ?? 0) * 100);
            const { reference } = await openPaystackMobileMoney({
              email: userEmail,
              amountInPesewas,
              currency: event?.currency ?? 'GHS',
            });
            await confirmPaymentIntent({
              variables: {
                input: {
                  payment_intent_id: paymentIntentId,
                  payment_method_id: reference,
                  provider: 'PAYSTACK',
                },
              },
            });
          } else {
            const stripePaymentMethodId = await getPrimaryStripeCardPaymentMethodId();
            if (!stripePaymentMethodId) {
              toast.error('No Stripe card found. Please save a card first.');
              return;
            }
            await confirmPaymentIntent({
              variables: {
                input: {
                  payment_intent_id: paymentIntentId,
                  payment_method_id: stripePaymentMethodId,
                  provider: 'STRIPE',
                },
              },
            });
          }
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

  const handleDownloadTicket = () => {
    router.push(`/${locale}/events/${eventId}/ticket`);
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

  const dateStr = formatEventDateRange(event.startAt, event.endAt, locale);
  const locationStr = getEventLocationDisplay(event);
  const venue = getEventVenueLines(event);
  const priceStr = convertedPriceLabel ?? formatPriceLabel(event);
  const isRegistered = optimisticRegistered ?? event.isRegistered;

  return (
    <>
      <div className="lg:flex justify-center min-h-full">
        {/* LEFT: home sidebar (only when authenticated) */}
        {sessionToken && (
          <div className="hidden lg:block lg:sticky lg:w-[20vw] top-[4rem] h-[calc(100vh-4rem)] scrollbar-hide">
            <HomeSidebar />
          </div>
        )}

        {/* MIDDLE: back button + event card */}
        <div className="h-[calc(100vh-4rem)] flex-1 min-w-0 lg:max-w-[45rem] overflow-y-auto scrollbar-hide p-4">
          <div className="mx-auto">
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
              venueName={venue.venueName}
              addressLines={venue.addressLines}
              virtualLink={venue.virtualLink}
              platform={venue.platform}
              registrationLink={event.registrationLink}
              isSoldOut={isEventSoldOut(event)}
              isRegistered={isRegistered}
              isSaved={saved}
              onBuyClick={handleAttend}
              onSaveClick={handleSave}
              onCancelAttend={handleCancelAttend}
              onDownloadTicket={handleDownloadTicket}
            />
          </div>
        </div>

        {/* RIGHT: suggestions for other events */}
        <div className="hidden lg:block lg:w-[22vw] h-[calc(100vh-4rem)] overflow-y-auto scrollbar-hide p-4">
          <SuggestedEvents currentEventId={eventId} />
        </div>
      </div>
      <PaidEventsModal ref={modalRef} />
    </>
  );
}
