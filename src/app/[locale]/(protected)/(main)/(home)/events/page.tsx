"use client";
import EventCard1 from "@/components/cards/events/EventCard1";
import EventCardSmall from "@/components/cards/events/EventCardSmall";
import { useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import PaidEventsModal, { PaidEventsModalRef } from "@/components/events/modals/paidEventsModal";
import PaidEventCard from "@/components/cards/events/PaidEventsCard";
import { useLazyQuery, useMutation, useQuery } from '@apollo/client/react';
import {
    LIST_EVENTS,
    USER_EVENTS,
    REGISTER_EVENT,
    CANCEL_REGISTRATION,
    SAVE_EVENT,
    UNSAVE_EVENT,
    type ListEventsData,
    type UserEventsData,
    type RegisterEventData,
    type CancelRegistrationData,
    type SaveEventData,
    type UnsaveEventData,
    type Event,
    getEventLocationDisplay,
    getEventCoverImage,
    isEventSoldOut,
} from '@/services/gql/events';
import {
    CONFIRM_PAYMENT_INTENT,
    MY_PAYMENT_METHODS,
    type ConfirmPaymentIntentResponse,
    type MyPaymentMethodsResponse,
} from '@/services/gql/payments';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { useUserStore } from '@/store/useUserStore';
import { openPaystackMobileMoney } from '@/lib/paystack';

function formatEventDate(iso: string, locale: string) {
    return new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(iso));
}

const AttendingComponent = ({ attendingEvents, loading, locale }: { attendingEvents: Event[], loading: boolean, locale: string }) => {
    const t = useTranslations("home.events");

    if (loading) {
        return (
            <div className="flex items-center justify-center p-4">
                <Loader2 className="w-6 h-6 animate-spin text-text-brand" />
            </div>
        );
    }

    return (
        <>
            {attendingEvents.length === 0 ? (
                <p className="text-text-primary">
                    {t("noattending")}
                </p>
            ) : (
                <>
                    {attendingEvents.map((event) => (
                        <div key={event.id} className="snap-start shrink-0">
                            <EventCardSmall
                                eventId={event.id}
                                title={event.title}
                                date={formatEventDate(event.startAt, locale)}
                                location={getEventLocationDisplay(event)}
                                attendees={event.registrationCount ?? 0}
                                visibility={event.visibility}
                                imageUrl={getEventCoverImage(event)}
                            />
                        </div>
                    ))}
                </>
            )}
        </>
    );
};

const SavedComponent = ({ savedEvents, loading, locale }: { savedEvents: Event[], loading: boolean, locale: string }) => {
    const t = useTranslations("home.events");

    if (loading) {
        return (
            <div className="flex items-center justify-center p-4">
                <Loader2 className="w-6 h-6 animate-spin text-text-brand" />
            </div>
        );
    }

    return (
        <>
            {savedEvents.length === 0 ? (
                <p className="text-text-primary">
                    {t("noevents")}
                </p>
            ) : (
                <>
                    {savedEvents.map((event) => (
                        <div key={event.id} className="snap-start shrink-0">
                            <EventCardSmall
                                eventId={event.id}
                                title={event.title}
                                date={formatEventDate(event.startAt, locale)}
                                location={getEventLocationDisplay(event)}
                                attendees={event.registrationCount ?? 0}
                                imageUrl={getEventCoverImage(event)}
                            />
                        </div>
                    ))}
                </>
            )}
        </>
    );
};

function formatPriceLabel(event: Event) {
    if (!event.isPaid) return "Free";
    const ticket = event.tickets?.find((t) => (t?.priceInCents ?? 0) > 0) ?? event.tickets?.[0];
    const cents = ticket?.priceInCents;
    if (cents == null || cents <= 0) return "Paid";
    const currency = ticket?.currency || event.currency || "GHS";
    return `${currency} ${(cents / 100).toFixed(2)}/ticket`;
}

export default function Events() {
    const [activeTab, setActiveTab] = useState<string>("events");
    const [optimisticSavedState, setOptimisticSavedState] = useState<Record<string, boolean>>({});
    const [optimisticAttendingState, setOptimisticAttendingState] = useState<Record<string, boolean>>({});
    const [registrationIdsByEvent, setRegistrationIdsByEvent] = useState<Record<string, string>>({});
    const tActions = useTranslations("actions");
    const t = useTranslations("home.events");
    const locale = useLocale();
    const modalRef = useRef<PaidEventsModalRef>(null);
    const sessionToken = useAuthStore((s) => s.tokens?.sessionToken);
    const userEmail = useUserStore((s) => s.user?.email);
    const isAuthHydrated = useAuthStore.persist.hasHydrated();
    const shouldLoadUserEvents = isAuthHydrated && !!sessionToken;

    // Single query replaces getMyEvents + getMySavedEvents
    const { data: userEventsData, loading: userEventsLoading } = useQuery<UserEventsData>(USER_EVENTS, {
        skip: !shouldLoadUserEvents,
        fetchPolicy: "cache-and-network",
        notifyOnNetworkStatusChange: true,
    });

    // Discovery feed — listEvents replaces searchEvents
    const { data: eventsData, loading: eventsLoading } = useQuery<ListEventsData>(LIST_EVENTS, {
        variables: { input: { limit: 20, offset: 0 } },
    });

    const [registerForEvent] = useMutation<RegisterEventData>(REGISTER_EVENT, {
        refetchQueries: [{ query: USER_EVENTS }],
        awaitRefetchQueries: true,
    });
    const [confirmPaymentIntent] = useMutation<ConfirmPaymentIntentResponse>(CONFIRM_PAYMENT_INTENT);
    const [fetchMyPaymentMethods] = useLazyQuery<MyPaymentMethodsResponse>(MY_PAYMENT_METHODS, {
        fetchPolicy: 'network-only',
    });
    const [saveEvent] = useMutation<SaveEventData>(SAVE_EVENT, {
        refetchQueries: [{ query: USER_EVENTS }],
        awaitRefetchQueries: true,
    });
    const [unsaveEvent] = useMutation<UnsaveEventData>(UNSAVE_EVENT, {
        refetchQueries: [{ query: USER_EVENTS }],
        awaitRefetchQueries: true,
    });
    const [cancelRegistration] = useMutation<CancelRegistrationData>(CANCEL_REGISTRATION, {
        refetchQueries: [{ query: USER_EVENTS }],
        awaitRefetchQueries: true,
    });

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
        const stripeCards = methods.filter(
            (m) => m.provider === 'STRIPE' && m.type === 'card'
        );
        const primary = stripeCards.find((m) => Boolean(m.is_primary));
        return (primary ?? stripeCards[0])?.id ?? null;
    };

    const handleAttendEvent = (event: Event) => {
        const primaryTicket = event.tickets?.[0];
        modalRef.current?.open({
            onPaymentSuccess: async ({
                ticketId,
                quantity,
                promoCode,
                formResponsesJson,
                paymentMethod,
                totalAmount,
            }) => {
                const result = await registerForEvent({
                    variables: {
                        input: {
                            eventId: event.id,
                            ticketId: event.isPaid ? ticketId : undefined,
                            quantity,
                            promoCode: promoCode || undefined,
                            formResponsesJson: formResponsesJson || undefined,
                        }
                    }
                });
                const waitlistPosition = result.data?.registerForEvent?.waitlistPosition ?? null;
                if (waitlistPosition != null) {
                    return { waitlistPosition };
                }

                const registrationId = result.data?.registerForEvent?.registrationId;
                if (registrationId) {
                    setRegistrationIdsByEvent((prev) => ({ ...prev, [event.id]: registrationId }));
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
                            currency: event.currency ?? 'GHS',
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

                setOptimisticAttendingState((prev) => ({ ...prev, [event.id]: true }));
                toast.success('Successfully registered for event');
            },
            event: {
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
            },
        });
    };

    const handleCancelAttend = async (eventId: string) => {
        const registrationId = registrationIdsByEvent[eventId];
        if (!registrationId) {
            toast.error(t("cancelAttendanceUnavailable"));
            return;
        }

        setOptimisticAttendingState((prev) => ({ ...prev, [eventId]: false }));
        try {
            await cancelRegistration({ variables: { registrationId } });
            setRegistrationIdsByEvent((prev) => {
                const next = { ...prev };
                delete next[eventId];
                return next;
            });
            toast.success(t("attendanceCancelled"));
        } catch {
            setOptimisticAttendingState((prev) => ({ ...prev, [eventId]: true }));
            toast.error(t("cancelAttendanceFailed"));
        }
    };

    const handleSaveEvent = async (eventId: string, isSaved: boolean) => {
        if (!sessionToken) {
            toast.error('Please sign in to save events');
            return;
        }

        const nextSavedState = !isSaved;
        setOptimisticSavedState((prev) => ({ ...prev, [eventId]: nextSavedState }));

        try {
            if (isSaved) {
                const result = await unsaveEvent({ variables: { eventId } });
                if (!result.data?.unsaveEvent) {
                    throw new Error('Unsave failed');
                }
                toast.success('Event removed from saved');
            } else {
                const result = await saveEvent({ variables: { eventId } });
                if (!result.data?.saveEvent?.id) {
                    throw new Error('Save failed');
                }
                toast.success('Event saved successfully');
            }
        } catch {
            setOptimisticSavedState((prev) => ({ ...prev, [eventId]: isSaved }));
            toast.error(isSaved ? 'Failed to unsave event' : 'Failed to save event');
        }
    };

    const TABS = [
        { name: `${tActions("attending")}`, status: "events" },
        { name: `${tActions("saved")}`, status: "saved" },
    ];

    const attendingEvents = userEventsData?.userEvents.attending ?? [];
    const savedEvents = userEventsData?.userEvents.saved ?? [];
    const allEvents = (eventsData?.listEvents.events ?? []).filter(
        (e) => e.status !== 'completed' && new Date(e.endAt) >= new Date()
    );
    const paidEvents = allEvents.filter(event => event.isPaid);
    const freeEvents = allEvents.filter(event => !event.isPaid);

    const savedEventIds = useMemo(() => {
        const ids = new Set(savedEvents.map((event) => event.id));
        for (const [eventId, saved] of Object.entries(optimisticSavedState)) {
            if (saved) ids.add(eventId);
            else ids.delete(eventId);
        }
        return ids;
    }, [savedEvents, optimisticSavedState]);

    const savedEventsToRender = useMemo(() => {
        const eventsById = new Map(savedEvents.map((event) => [event.id, event]));
        for (const event of allEvents) {
            if (savedEventIds.has(event.id) && !eventsById.has(event.id)) {
                eventsById.set(event.id, event);
            }
        }
        return Array.from(eventsById.values());
    }, [savedEvents, allEvents, savedEventIds]);

    const attendingEventIds = useMemo(() => {
        const ids = new Set(attendingEvents.map((event) => event.id));
        for (const [eventId, attending] of Object.entries(optimisticAttendingState)) {
            if (attending) ids.add(eventId);
            else ids.delete(eventId);
        }
        return ids;
    }, [attendingEvents, optimisticAttendingState]);

    const attendingEventsToRender = useMemo(() => {
        const eventsById = new Map(attendingEvents.map((event) => [event.id, event]));
        for (const event of allEvents) {
            if (attendingEventIds.has(event.id) && !eventsById.has(event.id)) {
                eventsById.set(event.id, event);
            }
        }
        return Array.from(eventsById.values());
    }, [attendingEvents, allEvents, attendingEventIds]);

    const upcomingAttending = useMemo(
        () => attendingEventsToRender.filter((e) => e.status !== 'completed' && new Date(e.endAt) >= new Date()),
        [attendingEventsToRender]
    );
    const pastAttending = useMemo(
        () => attendingEventsToRender.filter((e) => e.status === 'completed' || new Date(e.endAt) < new Date()),
        [attendingEventsToRender]
    );

    return (
        <div className="lg:w-[60vw] h-app-inner p-4 overflow-auto scrollbar-hide">
            <div className="mx-auto">
                <p className="heading-small mb-2">{t("yourevents")}</p>

                {/* Toggle Buttons */}
                <div className="flex lg:h-[3.25rem] justify-start border-b-2 border-border-subtle w-fit mb-[0.5rem]">
                    {TABS.map((tab, idx) => (
                        <div key={idx} className="lg:w-[6.375rem] lg:h-[3.25rem]">
                            <button
                                onClick={() => setActiveTab(`${tab.status}`)}
                                className={`h-full px-[0.5rem] text-center transition-all duration-200 relative cursor-pointer font-label-large ${activeTab === `${tab.status}`
                                    ? "text-text-brand border-b-2 border-text-brand"
                                    : "text-text-secondary hover:text-text-primary border-b-2"
                                    }`}
                            >
                                {tab.name}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Events Content */}
                <div className="overflow-x-auto overflow-y-hidden scrollbar-hide flex flex-row gap-[0.5rem] scroll-smooth snap-x snap-mandatory">
                    {activeTab === "events" ? (
                        <AttendingComponent attendingEvents={upcomingAttending} loading={userEventsLoading} locale={locale} />
                    ) : (
                        <SavedComponent savedEvents={savedEventsToRender} loading={userEventsLoading} locale={locale} />
                    )}
                </div>

                {activeTab === "events" && !userEventsLoading && pastAttending.length > 0 && (
                    <>
                        <p className="heading-small mt-6 mb-2 text-text-secondary">{t("pastEvents")}</p>
                        <div className="overflow-x-auto overflow-y-hidden scrollbar-hide flex flex-row gap-[0.5rem] scroll-smooth snap-x snap-mandatory opacity-70">
                            <AttendingComponent attendingEvents={pastAttending} loading={false} locale={locale} />
                        </div>
                    </>
                )}

                <p className="heading-small my-4">{t("paidEvents")}</p>

                {eventsLoading ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="w-8 h-8 animate-spin text-text-brand" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 w-full">
                        {paidEvents.map((event) => (
                            <PaidEventCard
                                key={event.id}
                                eventId={event.id}
                                title={event.title}
                                date={formatEventDate(event.startAt, locale)}
                                location={getEventLocationDisplay(event)}
                                attendees={event.registrationCount ?? 0}
                                visibility={event.visibility}
                                imageUrl={getEventCoverImage(event)}
                                priceLabel={formatPriceLabel(event)}
                                isSoldOut={isEventSoldOut(event)}
                                onAttendClick={() => handleAttendEvent(event)}
                                onSaveClick={() => handleSaveEvent(event.id, savedEventIds.has(event.id))}
                                isSaved={savedEventIds.has(event.id)}
                                isRegistered={attendingEventIds.has(event.id)}
                                onCancelAttend={() => handleCancelAttend(event.id)}
                            />
                        ))}
                    </div>
                )}

                <p className="heading-small my-2">{t("moreevents")}</p>

                {eventsLoading ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="w-8 h-8 animate-spin text-text-brand" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 w-full">
                        {freeEvents.map((event) => (
                            <EventCard1
                                key={event.id}
                                eventId={event.id}
                                title={event.title}
                                date={formatEventDate(event.startAt, locale)}
                                location={getEventLocationDisplay(event)}
                                attendees={event.registrationCount ?? 0}
                                visibility={event.visibility}
                                imageUrl={getEventCoverImage(event)}
                                priceLabel={formatPriceLabel(event)}
                                isSoldOut={isEventSoldOut(event)}
                                onAttendClick={() => handleAttendEvent(event)}
                                onSaveClick={() => handleSaveEvent(event.id, savedEventIds.has(event.id))}
                                isSaved={savedEventIds.has(event.id)}
                                isRegistered={attendingEventIds.has(event.id)}
                                onCancelAttend={() => handleCancelAttend(event.id)}
                            />
                        ))}
                    </div>
                )}
            </div>
            <PaidEventsModal ref={modalRef} />
        </div>
    );
}
