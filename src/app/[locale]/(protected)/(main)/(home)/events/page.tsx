"use client";
import EventCard1 from "@/components/cards/events/EventCard1";
import EventCardSmall from "@/components/cards/events/EventCardSmall";
import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import PaidEventsModal, { PaidEventsModalRef } from "@/components/events/modals/paidEventsModal";
import PaidEventCard from "@/components/cards/events/PaidEventsCard";
import { useQuery, useMutation } from '@apollo/client/react';
import { SEARCH_EVENTS, GET_MY_EVENTS, GET_MY_SAVED_EVENTS, REGISTER_EVENT, SAVE_EVENT, UNSAVE_EVENT, type SearchEventsData, type GetMyEventsData, type GetMySavedEventsData, type RegisterEventData, type SaveEventData, type UnsaveEventData, type Event, getEventLocationDisplay, getEventCoverImage } from '@/services/gql/events';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const AttendingComponent = ({ attendingEvents, loading }: { attendingEvents: Event[], loading: boolean }) => {
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
                                date={new Date(event.startAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit'
                                })}
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

const SavedComponent = ({ savedEvents, loading }: { savedEvents: Event[], loading: boolean }) => {
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
                                date={new Date(event.startAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit'
                                })}
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
    if (!event.isPaid || !event.tickets?.length) return "Free";
    const ticket = event.tickets[0];
    const cents = ticket?.priceInCents;
    if (cents == null) return "Free";
    const currency = ticket?.currency || event.currency || "GHC";
    return `${currency} ${(cents / 100).toFixed(2)}/ticket`;
}

export default function Events() {
    const [activeTab, setActiveTab] = useState<string>("events");
    const [optimisticSavedState, setOptimisticSavedState] = useState<Record<string, boolean>>({});
    const [optimisticAttendingState, setOptimisticAttendingState] = useState<Record<string, boolean>>({});
    const tActions = useTranslations("actions");
    const modalRef = useRef<PaidEventsModalRef>(null);
    
    const { data: myEventsData, loading: myEventsLoading } = useQuery<GetMyEventsData>(GET_MY_EVENTS, {
        fetchPolicy: "cache-and-network",
        notifyOnNetworkStatusChange: true,
    });
    const { data: mySavedEventsData, loading: mySavedEventsLoading } = useQuery<GetMySavedEventsData>(GET_MY_SAVED_EVENTS, {
        fetchPolicy: "cache-and-network",
        notifyOnNetworkStatusChange: true,
    });
    const { data: eventsData, loading: eventsLoading } = useQuery<SearchEventsData>(SEARCH_EVENTS, {
        variables: { limit: 20, offset: 0 }
    });
    
    const [registerForEvent] = useMutation<RegisterEventData>(REGISTER_EVENT, {
        refetchQueries: [{ query: GET_MY_EVENTS }],
        awaitRefetchQueries: true,
    });
    const [saveEvent] = useMutation<SaveEventData>(SAVE_EVENT, {
        refetchQueries: [{ query: GET_MY_SAVED_EVENTS }],
        awaitRefetchQueries: true,
    });
    const [unsaveEvent] = useMutation<UnsaveEventData>(UNSAVE_EVENT, {
        refetchQueries: [{ query: GET_MY_SAVED_EVENTS }],
        awaitRefetchQueries: true,
    });

    const userEventsLoading = myEventsLoading || mySavedEventsLoading;

    const handleAttendEvent = (event: Event) => {
        const primaryTicket = event.tickets?.[0];
        modalRef.current?.open({
            onPaymentSuccess: async ({ ticketId, quantity }) => {
                await registerForEvent({
                    variables: {
                        input: {
                            eventId: event.id,
                            ticketId: event.isPaid ? ticketId : undefined,
                            quantity,
                        }
                    }
                });
                setOptimisticAttendingState((prev) => ({ ...prev, [event.id]: true }));
                toast.success('Successfully registered for event');
            },
            event: {
                id: event.id,
                title: event.title,
                startAt: event.startAt,
                isPaid: event.isPaid,
                ticketId: primaryTicket?.id,
                ticketName: primaryTicket?.name,
                ticketDescription: primaryTicket?.description ?? undefined,
                ticketPriceInCents: primaryTicket?.priceInCents ?? 0,
            },
        });
    };

    const handleCancelAttend = () => {
        toast.info('Cancel attendance will be available once backend support is added');
    };

    const handleSaveEvent = async (eventId: string, isSaved: boolean) => {
        const nextSavedState = !isSaved;
        setOptimisticSavedState((prev) => ({ ...prev, [eventId]: nextSavedState }));

        try {
            if (isSaved) {
                await unsaveEvent({
                    variables: { eventId }
                });
                toast.success('Event removed from saved');
            } else {
                await saveEvent({
                    variables: { eventId }
                });
                toast.success('Event saved successfully');
            }
        } catch {
            // Roll back optimistic toggle when request fails
            setOptimisticSavedState((prev) => ({ ...prev, [eventId]: isSaved }));
            toast.error(isSaved ? 'Failed to unsave event' : 'Failed to save event');
        }
    };

    const TABS = [
        {
            name: `${tActions("attending")}`,
            status: "events"
        },
        {
            name: `${tActions("saved")}`,
            status: "saved"
        },
    ];

    const t = useTranslations("home.events");

    const attendingEvents = myEventsData?.getMyEvents || [];
    const savedEvents = mySavedEventsData?.getMySavedEvents || [];
    const allEvents = eventsData?.searchEvents.events || [];
    const paidEvents = allEvents.filter(event => event.isPaid);
    const freeEvents = allEvents.filter(event => !event.isPaid);
    const savedEventIds = useMemo(() => {
        const ids = new Set(savedEvents.map((event) => event.id));
        for (const [eventId, saved] of Object.entries(optimisticSavedState)) {
            if (saved) {
                ids.add(eventId);
            } else {
                ids.delete(eventId);
            }
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
            if (attending) {
                ids.add(eventId);
            } else {
                ids.delete(eventId);
            }
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

    return (
        <div className="lg:w-[60vw] h-app-inner p-4 overflow-auto scrollbar-hide">
            <div className="mx-auto">
                <p className="heading-small mb-2">{t("yourevents")}</p>

                {/* Toggle Buttons */}
                <div className="flex lg:h-[3.25rem] justify-start border-b-2 border-border-subtle w-fit mb-[0.5rem]">
                    {
                        TABS.map((tab, idx) => (
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
                        ))
                    }
                </div>

                {/* Events Content */}
                <div className="overflow-x-auto overflow-y-hidden scrollbar-hide flex flex-row gap-[0.5rem] scroll-smooth snap-x snap-mandatory">
                    {activeTab === "events" ? (
                        <AttendingComponent attendingEvents={attendingEventsToRender} loading={userEventsLoading} />
                    ) : (
                        <SavedComponent savedEvents={savedEventsToRender} loading={userEventsLoading} />
                    )}
                </div>

                <p className="heading-small my-4">Paid Events</p>

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
                                date={new Date(event.startAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit'
                                })}
                                location={getEventLocationDisplay(event)}
                                attendees={event.registrationCount ?? 0}
                                visibility={event.visibility}
                                imageUrl={getEventCoverImage(event)}
                                priceLabel={formatPriceLabel(event)}
                                isSoldOut={event.isPaid ? event.capacityType === 'limited' && (event.tickets?.every(t => t.availableQuantity === 0) ?? false) : event.capacityType === 'limited' && event.registrationCount === event.capacity}
                                onAttendClick={() => handleAttendEvent(event)}
                                onSaveClick={() => handleSaveEvent(event.id, savedEventIds.has(event.id))}
                                isSaved={savedEventIds.has(event.id)}
                                isRegistered={attendingEventIds.has(event.id)}
                                onCancelAttend={handleCancelAttend}
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
                                date={new Date(event.startAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit'
                                })}
                                location={getEventLocationDisplay(event)}
                                attendees={event.registrationCount ?? 0}
                                visibility={event.visibility}
                                imageUrl={getEventCoverImage(event)}
                                priceLabel={formatPriceLabel(event)}
                                isSoldOut={event.isPaid ? event.capacityType === 'limited' && (event.tickets?.every(t => t.availableQuantity === 0) ?? false) : event.capacityType === 'limited' && event.registrationCount === event.capacity}
                                onAttendClick={() => handleAttendEvent(event)}
                                onSaveClick={() => handleSaveEvent(event.id, savedEventIds.has(event.id))}
                                isSaved={savedEventIds.has(event.id)}
                                isRegistered={attendingEventIds.has(event.id)}
                                onCancelAttend={handleCancelAttend}
                            />
                        ))}
                    </div>
                )}
            </div>
            <PaidEventsModal ref={modalRef} />
        </div>
    );
}