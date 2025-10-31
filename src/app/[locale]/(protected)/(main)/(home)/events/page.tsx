"use client";
import EventCard1 from "@/components/cards/events/EventCard1";
import EventCardSmall from "@/components/cards/events/EventCardSmall";
import { useState } from "react";
import { useTranslations } from "next-intl";




interface Event {
    title: string;
    date: string;
    location: string;
    attendees: number;
    imageUrl: string;
}

const AttendingComponent = ({ attendingEvents }: { attendingEvents: Event[] }) => {
    const t =  useTranslations("home.events")


    return (
        <>
            {attendingEvents.length === 0 ? (
                <p className="text-text-primary">
                    {t("noattending")}
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
    const t =  useTranslations("home.events")


    return (
        <>
            {savedEvents.length === 0 ? (
                <p className="text-text-primary">
                    {t("noevents")}
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
    const [activeTab, setActiveTab] = useState<string>("events");
        const tActions =  useTranslations("actions")

const TABS = [
    {
        name: `${tActions("attending")}`,
        status: "events"
    },
    {
        name:  `${tActions("saved")}`,
        status: "saved"
    },
]

const t =  useTranslations("home.events")

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
        <div className="lg:w-[55.3125rem] h-[53.625rem] p-4 overflow-auto scrollbar-hide">
            {/* 885px equivalent, 64px header height */}
            <div className="mx-auto">
                <p className="text-2xl font-heading-large my-[1.25rem]">{t("yourevents")}</p> {/* 20px equivalent */}

                {/* Toggle Buttons */}
                <div className="flex lg:h-[3.25rem] justify-start border-b-2 border-border-subtle w-fit mb-[0.5rem]">
                    {/* 52px height, 8px margin */}
                    {
                        TABS.map((tab, idx) => (
                            <div key={idx} className="lg:w-[6.375rem] lg:h-[3.25rem]"> {/* 102px, 52px equivalent */}
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
                <div className="overflow-auto scrollbar-hide flex gap-[0.5rem] "> {/* 8px equivalent */}
                    {activeTab === "events" ? (
                        <AttendingComponent attendingEvents={attendingEvents} />
                    ) : (
                        <SavedComponent savedEvents={savedEvents} />
                    )}
                </div>

                <h2 className="font-heading-medium my-[1.25rem] text-2xl">{t("moreevents")}</h2> {/* 20px equivalent */}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-[0.4rem] w-full "> {/* 12px, 24px equivalent */}
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