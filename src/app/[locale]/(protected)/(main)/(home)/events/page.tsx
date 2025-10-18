"use client";
import EventCard1 from "@/components/cards/EventCard1";
import { useState } from "react";

interface Event {
    title: string;
    date: string;
    location: string;
    attendees: number;
    imageUrl: string;
}

const AttendingComponent = ({ attendingEvents }: { attendingEvents: Event[] }) => {

    return (
        <div className="p-4 rounded-md mt-4">
            {attendingEvents.length === 0 ? (
                <p className="text-text-primary">
                    You are not attending any event now.
                </p>
            ) : (
                <p className="text-text-primary">
                    {/* Add rendering for events if needed */}
                </p>
            )}
            {/* Add your events data rendering here if array has items */}
        </div>
    );
};

const SavedComponent = ({ savedEvents }: { savedEvents: Event[] }) => {

    return (
        <div className="p-4 rounded-md mt-4">
            {savedEvents.length === 0 ? (
                <p className="text-text-primary">
                    You have no saved events.
                </p>
            ) : (
                <p className="text-text-primary">
                    {/* Add rendering for events if needed */}
                </p>
            )}
            {/* Add your saved data rendering here if array has items */}
        </div>
    );
};

export default function Events() {
    const [activeTab, setActiveTab] = useState<"events" | "saved">("events"); // Type the state

    const attendingEvents: Event[] = []; // Typed array
    const savedEvents: Event[] = []; // Typed array
    // Sample events data for More events section
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
        <div className="w-full h-[calc(100vh-64px)] overflow-auto scrollbar-hide p-4">
            <div className="max-w-[90%] mx-auto"> {/* Constrain width and center with margin */}
                <p className=" text-2xl font-heading-large my-5">Your events</p>

                {/* Toggle Buttons */}
                <div className="flex justify-start border-b border-border-subtle w-fit mb-6">
                    <button
                        onClick={() => setActiveTab("events")}
                        className={`px-4 py-2 text-center transition-all duration-200 relative -mb-px ${
                            activeTab === "events"
                                ? "text-text-brand font-medium border-b-2 border-text-brand"
                                : "text-text-secondary hover:text-text-primary"
                        }`}
                    >
                        Attending
                    </button>
                    <button
                        onClick={() => setActiveTab("saved")}
                        className={`px-4 py-2 text-center transition-all duration-200 relative -mb-px ${
                            activeTab === "saved"
                                ? "text-text-brand font-medium border-b-2 border-text-brand"
                                : "text-text-secondary hover:text-text-primary"
                        }`}
                    >
                        Saved
                    </button>
                </div>

                {/* Events Content */}
                <div className="rounded-md overflow-auto scrollbar-hide max-h-[300px]">
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