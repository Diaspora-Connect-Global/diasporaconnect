"use client";
import EventCard1 from "@/components/cards/EventCard1";
import EventCardSmall from "@/components/cards/events/EventCardSmall";
import { useState } from "react";

const TABS = [
    {
        name: "Attending",
        status: "events"
    },
    {
        name: "Saved",
        status: "saved"
    },
]

interface Event {
    title: string;
    date: string;
    location: string;
    attendees: number;
    imageUrl: string;
}

const AttendingComponent = ({ attendingEvents }: { attendingEvents: Event[] }) => {

    return (
        <>
            {attendingEvents.length === 0 ? (
                <p className="text-text-primary">
                    You are not attending any event now.
                </p>
            ) : (
                <>
                    {attendingEvents.map((event, index) => (
                        <EventCardSmall
                            key={index}
                            title={event.title}
                            date={event.date}
                            location={event.location}
                            attendees={event.attendees}
                            imageUrl={event.imageUrl}
                        />
                    ))}
                </>
            )}
        </>
    );
};

const SavedComponent = ({ savedEvents }: { savedEvents: Event[] }) => {

    return (
        <>
            {savedEvents.length === 0 ? (
                <p className="text-text-primary">
                    You have no saved events.
                </p>
            ) : (
                <>
                    {savedEvents.map((event, index) => (
                        <EventCardSmall
                            key={index}
                            title={event.title}
                            date={event.date}
                            location={event.location}
                            attendees={event.attendees}
                            imageUrl={event.imageUrl}
                        />
                    ))}
                </>
            )}
        </>
    );
};

export default function Events() {
    const [activeTab, setActiveTab] = useState<string>("events"); // Type the state

    const attendingEvents: Event[] = [
        {
            title: "Accra Arts Festival",
            date: "Oct 21, 2025, 3:00PM",
            location: "Ghana Embassy, Belgium",
            attendees: 32,
            imageUrl: "/EVENT.png",
        },
    ];
    const savedEvents: Event[] = [
        {
            title: "Accra Arts Festival",
            date: "Oct 21, 2025, 3:00PM",
            location: "Ghana Embassy, Belgium",
            attendees: 32,
            imageUrl: "/EVENT.png",
        },
        {
            title: "Accra Arts Festival",
            date: "Oct 21, 2025, 3:00PM",
            location: "Ghana Embassy, Belgium",
            attendees: 32,
            imageUrl: "/EVENT.png",
        },
        {
            title: "Accra Arts Festival",
            date: "Oct 21, 2025, 3:00PM",
            location: "Ghana Embassy, Belgium",
            attendees: 32,
            imageUrl: "/EVENT.png",
        },
        {
            title: "Accra Arts Festival",
            date: "Oct 21, 2025, 3:00PM",
            location: "Ghana Embassy, Belgium",
            attendees: 32,
            imageUrl: "/EVENT.png",
        },
        {
            title: "Accra Arts Festival",
            date: "Oct 21, 2025, 3:00PM",
            location: "Ghana Embassy, Belgium",
            attendees: 32,
            imageUrl: "/EVENT.png",
        },
        {
            title: "Accra Arts Festival",
            date: "Oct 21, 2025, 3:00PM",
            location: "Ghana Embassy, Belgium",
            attendees: 32,
            imageUrl: "/EVENT.png",
        },
    ];
    const moreEvents: Event[] = [
        {
            title: "Accra Arts Festival",
            date: "Oct 21, 2025, 3:00PM",
            location: "Ghana Embassy, Belgium",
            attendees: 32,
            imageUrl: "/EVENT.png",
        },
        {
            title: "Accra Arts Festival",
            date: "Oct 21, 2025, 3:00PM",
            location: "Ghana Embassy, Belgium",
            attendees: 32,
            imageUrl: "/EVENT.png",
        },
    ];

    return (
        <div className="lg:w-[calc(885/1512*100vw)] h-[calc(100vh-64px)] overflow-auto scrollbar-hide ">
            <div className=" mx-auto"> {/* Constrain width and center with margin */}
                <p className=" text-2xl font-heading-large my-5">Your events</p>

                {/* Toggle Buttons */}
                <div className="flex lg:h-[calc(52/1512*100vh)] justify-start border-b-2 border-border-subtle w-fit mb-2">

                    {
                        TABS.map((tab, idx) => (
                            <div key={idx} className="lg:w-[calc(102/1512*100vw)] lg:h-[calc(52/1512*100vh)]">
                                <button
                                    onClick={() => setActiveTab(`${tab.status}`)}
                                    className={`h-full px-2 text-center transition-all duration-200 relative cursor-pointer font-label-large ${activeTab === `${tab.status}`
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
                <div className="overflow-auto scrollbar-hide flex gap-2">
                    {activeTab === "events" ? (
                        <AttendingComponent attendingEvents={attendingEvents} />
                    ) : (
                        <SavedComponent savedEvents={savedEvents} />
                    )}
                </div>

                <h2 className="font-heading-medium my-5 text-2xl">More events</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    {moreEvents.map((event, index) => (
                        <EventCard1
                            key={index}
                            title={event.title}
                            date={event.date}
                            location={event.location}
                            attendees={event.attendees}
                            imageUrl={event.imageUrl}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}