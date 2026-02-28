"use client";
import EventCard1 from "@/components/cards/events/EventCard1";
import EventCardSmall from "@/components/cards/events/EventCardSmall";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import PaidEventsModal, { PaidEventsModalRef } from "@/components/events/modals/paidEventsModal";
import PaidEventCard from "@/components/cards/events/PaidEventsCard";
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_EVENTS, GET_USER_EVENTS, REGISTER_EVENT, SAVE_EVENT, type GetEventsData, type GetUserEventsData, type RegisterEventData, type SaveEventData, type Event } from '@/services/gql/events';
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
                                location={event.locationType === 'physical'
                                    ? `${event.locationDetails?.physical?.venue ?? ''}, ${event.locationDetails?.physical?.city ?? ''}`.trim() || 'Physical'
                                    : event.locationDetails?.virtual?.platform || 'Virtual'
                                }
                                attendees={event.registrationCount}
                                imageUrl="/EVENT.png"
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
                                location={event.locationType === 'physical'
                                    ? `${event.locationDetails?.physical?.venue ?? ''}, ${event.locationDetails?.physical?.city ?? ''}`.trim() || 'Physical'
                                    : event.locationDetails?.virtual?.platform || 'Virtual'
                                }
                                attendees={event.registrationCount}
                                imageUrl="/EVENT.png"
                            />
                        </div>
                    ))}
                </>
            )}
        </>
    );
};

export default function Events() {
    const [activeTab, setActiveTab] = useState<string>("events");
    const tActions = useTranslations("actions");
    const modalRef = useRef<PaidEventsModalRef>(null);
    
    const { data: userEventsData, loading: userEventsLoading } = useQuery<GetUserEventsData>(GET_USER_EVENTS);
    const { data: eventsData, loading: eventsLoading } = useQuery<GetEventsData>(GET_EVENTS, {
        variables: { limit: 20, offset: 0 }
    });
    
    const [registerForEvent] = useMutation<RegisterEventData>(REGISTER_EVENT, {
        refetchQueries: [{ query: GET_USER_EVENTS }],
    });
    const [saveEvent] = useMutation<SaveEventData>(SAVE_EVENT, {
        refetchQueries: [{ query: GET_USER_EVENTS }],
    });

    const handleAttendEvent = async (eventId: string) => {
        try {
            await registerForEvent({
                variables: { input: { eventId } }
            });
            toast.success('Successfully registered for event');
        } catch {
            toast.error('Failed to register for event');
        }
    };

    const handleSaveEvent = async (eventId: string) => {
        try {
            await saveEvent({
                variables: { eventId }
            });
            toast.success('Event saved successfully');
        } catch {
            toast.error('Failed to save event');
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

    const attendingEvents = userEventsData?.userEvents.attending || [];
    const savedEvents = userEventsData?.userEvents.saved || [];
    const allEvents = eventsData?.events || [];
    const paidEvents = allEvents.filter(event => event.isPaid);
    const freeEvents = allEvents.filter(event => !event.isPaid);

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
                        <AttendingComponent attendingEvents={attendingEvents} loading={userEventsLoading} />
                    ) : (
                        <SavedComponent savedEvents={savedEvents} loading={userEventsLoading} />
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
                                location={event.locationType === 'physical'
                                    ? `${event.locationDetails?.physical?.venue ?? ''}, ${event.locationDetails?.physical?.city ?? ''}`.replace(/^,\s*|,\s*$/g, '').trim() || 'Physical'
                                    : event.locationDetails?.virtual?.platform || 'Virtual'
                                }
                                attendees={event.registrationCount}
                                imageUrl="/EVENT.png"
                                onAttendClick={() => handleAttendEvent(event.id)}
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
                                location={event.locationType === 'physical'
                                    ? `${event.locationDetails?.physical?.venue ?? ''}, ${event.locationDetails?.physical?.city ?? ''}`.replace(/^,\s*|,\s*$/g, '').trim() || 'Physical'
                                    : event.locationDetails?.virtual?.platform || 'Virtual'
                                }
                                attendees={event.registrationCount}
                                imageUrl="/EVENT.png"
                                onAttendClick={() => handleAttendEvent(event.id)}
                            />
                        ))}
                    </div>
                )}
            </div>
            <PaidEventsModal ref={modalRef} />
        </div>
    );
}