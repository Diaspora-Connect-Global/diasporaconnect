"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { CalendarDays, Plus, Search } from "lucide-react";
import PaidEventsModal, { PaidEventsModalRef } from "@/components/events/modals/paidEventsModal";
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
} from '@/services/gql/events';
import {
    CONFIRM_PAYMENT_INTENT,
    MY_PAYMENT_METHODS,
    type ConfirmPaymentIntentResponse,
    type MyPaymentMethodsResponse,
} from '@/services/gql/payments';
import PageLoader from '@/components/custom/PageLoader';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { useUserStore } from '@/store/useUserStore';
import { openPaystackMobileMoney } from '@/lib/paystack';
import { Link } from '@/i18n/navigation';
import { useAdminOrganisers } from '@/hooks/useAdminOrganisers';
import { PageHero } from '@/components/redesign/PageHero';
import { EmptyState } from '@/components/feedback';
import { CATEGORY_PHOTOS } from '@/lib/redesignImages';
import { DateTile, EventListingCard } from '@/components/events/redesign/EventListingCard';
import { eventFormat } from '@/lib/eventFormat';
import { ForYouRail } from '@/components/discover/DiscoverSections';

type Filter = 'all' | 'free' | 'paid' | 'inPerson' | 'online';
const FILTERS: Filter[] = ['all', 'free', 'paid', 'inPerson', 'online'];

function matchesFilter(e: Event, f: Filter) {
    const where = eventFormat(e.locationType);
    switch (f) {
        case 'free': return !e.isPaid;
        case 'paid': return !!e.isPaid;
        case 'inPerson': return where !== 'virtual';
        case 'online': return where === 'virtual' || where === 'hybrid';
        default: return true;
    }
}

/** One row of the "Your events" rail: date tile, title, time and place. */
function YourEventRow({ event }: { event: Event }) {
    const format = useFormatter();
    const start = new Date(event.startAt);
    const when = Number.isNaN(start.getTime()) ? '' : format.dateTime(start, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
    const place = event.locationDetails || event.locationType ? getEventLocationDisplay(event) : '';
    return (
        <li>
            <Link href={`/events/${encodeURIComponent(event.id)}`} prefetch={false} className="flex min-w-0 items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-text-brand">
                <DateTile iso={event.startAt} size="sm" />
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-text-primary">{event.title}</span>
                    <span className="block truncate text-xs text-text-secondary">{[when, place].filter(Boolean).join(' · ')}</span>
                </span>
            </Link>
        </li>
    );
}

export default function Events() {
    // `?tab=saved` opens the Saved tab directly (linked from the More page).
    const searchParams = useSearchParams();
    const { organisers } = useAdminOrganisers();
    const [activeTab, setActiveTab] = useState<string>(() =>
        searchParams.get("tab") === "saved" ? "saved" : "events",
    );
    const [optimisticSavedState, setOptimisticSavedState] = useState<Record<string, boolean>>({});
    const [optimisticAttendingState, setOptimisticAttendingState] = useState<Record<string, boolean>>({});
    const [registrationIdsByEvent, setRegistrationIdsByEvent] = useState<Record<string, string>>({});
    const tActions = useTranslations("actions");
    const t = useTranslations("home.events");
    const tPage = useTranslations("eventsPage");
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<Filter>("all");
    const [showPast, setShowPast] = useState(false);
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

    const attendingEvents = userEventsData?.userEvents?.attending ?? [];
    const savedEvents = userEventsData?.userEvents?.saved ?? [];
    const allEvents = useMemo(
        () => (eventsData?.listEvents?.events ?? []).filter(
            (e) => e.status !== 'completed' && new Date(e.endAt) >= new Date()
        ),
        [eventsData]
    );
    const attendingEventIds = useMemo(() => {
        const ids = new Set(attendingEvents.map((event) => event.id));
        for (const [eventId, attending] of Object.entries(optimisticAttendingState)) {
            if (attending) ids.add(eventId);
            else ids.delete(eventId);
        }
        return ids;
    }, [attendingEvents, optimisticAttendingState]);


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

    // Everything still to come, soonest first. Events you are going to stay in the grid, marked "Attending".
    const upcoming = useMemo(
        () => [...allEvents].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
        [allEvents]
    );
    const needle = search.trim().toLowerCase();
    const shown = useMemo(
        () => upcoming.filter((e) => matchesFilter(e, filter) && (!needle || `${e.title} ${getEventLocationDisplay(e)}`.toLowerCase().includes(needle))),
        [upcoming, filter, needle]
    );
    const yourList = activeTab === "saved" ? savedEventsToRender : upcomingAttending;

    // One gate for both sections (your events + discovery) so the page appears
    // whole. Only while a query has no data yet: the save/attend mutations
    // refetch USER_EVENTS, and that must not blank the page again.
    if (
        (shouldLoadUserEvents && userEventsLoading && !userEventsData) ||
        (eventsLoading && !eventsData)
    ) {
        return (
            <div className="h-app-inner flex">
                <PageLoader />
            </div>
        );
    }

    const tab = "-mb-px border-b-2 px-1 pb-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand";

    return (
        <div className="h-app-inner overflow-y-auto scrollbar-hide">
            <div className="mx-auto w-full space-y-5 px-4 py-4 pb-10 lg:px-0 lg:py-6">
                <PageHero id="events-title" eyebrow={tPage("eyebrow")} title={tPage("title")} subtitle={tPage("subtitle")} image={CATEGORY_PHOTOS.event} priority>
                    <div className="flex flex-wrap items-center gap-3">
                        <form role="search" onSubmit={(e) => e.preventDefault()} className="flex min-w-0 max-w-xl flex-1 items-center gap-2 rounded-full border border-border-subtle bg-surface-default p-1.5 pl-4 shadow-sm focus-within:border-border-brand">
                            <label htmlFor="events-search" className="sr-only">{tPage("searchLabel")}</label>
                            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                            {/* 16px on phones: iOS Safari zooms the page into smaller fields. */}
                            <input
                                id="events-search"
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={tPage("searchPlaceholder")}
                                autoComplete="off"
                                enterKeyHint="search"
                                maxLength={100}
                                className="min-w-0 flex-1 bg-transparent py-1.5 text-base text-text-primary outline-none placeholder:text-muted-foreground md:text-sm"
                            />
                        </form>
                        {/* Only people who administer a community or association can organise events. */}
                        {organisers.length > 0 && (
                            <Link
                                href="/events/create"
                                data-testid="create-event-link"
                                className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-surface-brand px-5 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2"
                            >
                                <Plus className="size-4" aria-hidden />
                                {t("create")}
                            </Link>
                        )}
                    </div>
                </PageHero>

                <ForYouRail kinds={['events']} />

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    {/* Your events: first on phones, the right rail on desktop. */}
                    <aside aria-labelledby="your-events-title" data-testid="your-events" className="h-fit rounded-2xl border border-border-subtle bg-surface-default p-5 shadow-sm lg:sticky lg:top-0 lg:col-start-2 lg:row-start-1">
                        <h2 id="your-events-title" className="text-base font-bold text-text-primary">{t("yourevents")}</h2>
                        <div role="tablist" aria-label={t("yourevents")} className="mt-3 flex gap-5 border-b border-border-subtle">
                            {(["events", "saved"] as const).map((k) => (
                                <button
                                    key={k}
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === k}
                                    onClick={() => setActiveTab(k)}
                                    className={`${tab} ${activeTab === k ? "border-text-brand text-text-brand" : "border-transparent text-muted-foreground hover:text-text-primary"}`}
                                >
                                    {k === "events" ? tActions("attending") : tActions("saved")}
                                </button>
                            ))}
                        </div>
                        <div role="tabpanel">
                            {yourList.length === 0 ? (
                                <p className="py-4 text-sm text-text-secondary">{(activeTab === "saved" ? t("noevents") : t("noattending")).trim()}</p>
                            ) : (
                                <ul className="-mx-2 mt-2 divide-y divide-border-subtle">
                                    {yourList.map((e) => <YourEventRow key={e.id} event={e} />)}
                                </ul>
                            )}
                            {activeTab === "events" && pastAttending.length > 0 && (
                                <div className="mt-2 border-t border-border-subtle pt-3">
                                    <button type="button" onClick={() => setShowPast((v) => !v)} aria-expanded={showPast} className="text-sm font-medium text-text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
                                        {showPast ? tPage("hidePast") : tPage("showPast", { count: pastAttending.length })}
                                    </button>
                                    {showPast && (
                                        <ul className="-mx-2 mt-1 divide-y divide-border-subtle opacity-75">
                                            {pastAttending.map((e) => <YourEventRow key={e.id} event={e} />)}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    </aside>

                    <section aria-labelledby="upcoming-events-title" data-testid="upcoming-events" className="min-w-0 rounded-2xl border border-border-subtle bg-surface-default p-5 shadow-sm lg:col-start-1 lg:row-start-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h2 id="upcoming-events-title" className="text-lg font-bold text-text-primary">{tPage("upcoming")}</h2>
                            {upcoming.length > 0 && <span className="text-sm text-text-secondary">{tPage("upcomingCount", { count: shown.length })}</span>}
                        </div>
                        <div role="group" aria-label={tPage("filtersLabel")} className="mt-3 flex flex-wrap gap-2">
                            {FILTERS.map((f) => (
                                <button
                                    key={f}
                                    type="button"
                                    aria-pressed={filter === f}
                                    onClick={() => setFilter(f)}
                                    className={`min-h-8 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand ${filter === f ? "border-transparent bg-surface-brand text-white" : "border-border-subtle bg-surface-default text-text-primary hover:bg-surface-subtle"}`}
                                >
                                    {tPage(`filters.${f}`)}
                                </button>
                            ))}
                        </div>
                        {shown.length === 0 ? (
                            <div className="py-8">
                                <EmptyState size="sm" icon={CalendarDays} title={upcoming.length === 0 ? tPage("noUpcoming") : tPage("noMatches")} />
                            </div>
                        ) : (
                            <div className="@container mt-4">
                                <ul className="grid grid-cols-1 gap-4 @[34rem]:grid-cols-2 @[54rem]:grid-cols-3">
                                    {shown.map((event) => (
                                        <li key={event.id} className="min-w-0">
                                            <EventListingCard
                                                event={event}
                                                isSaved={savedEventIds.has(event.id)}
                                                isRegistered={attendingEventIds.has(event.id)}
                                                onAttend={() => handleAttendEvent(event)}
                                                onSave={() => handleSaveEvent(event.id, savedEventIds.has(event.id))}
                                                onCancelAttend={() => handleCancelAttend(event.id)}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </section>
                </div>
            </div>
            <PaidEventsModal ref={modalRef} />
        </div>
    );
}
