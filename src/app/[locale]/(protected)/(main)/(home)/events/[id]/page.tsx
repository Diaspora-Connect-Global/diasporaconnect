"use client";
import EventCard2 from "@/components/cards/events/EventCard2";
import PaidEventsModal, { PaidEventsModalRef } from "@/components/events/modals/paidEventsModal";
import { useRef } from "react";

export default function EventsId() {
    const modalRef = useRef<PaidEventsModalRef>(null);

    const event = {
        title: "Accra Arts Festival",
        date: "Oct 21, 2025, 3:00PM",
        location: "Ghana Embassy, Belgium",
        attendees: 38,
        imageUrl: "/EVENT.png",
    };

    return (
        <>
            <div className="h-[calc(100vh-4rem)] lg:w-[60vw] overflow-y-auto scrollbar-hide p-4">
                <div className="lg:min-w-[40rem] mx-auto">
                    <EventCard2
                        title={event.title}
                        date={event.date}
                        location={event.location}
                        attendees={event.attendees}
                        imageUrl={event.imageUrl}
                        onBuyClick={() => modalRef.current?.open()}
                    />
                </div>
            </div>

            {/* Modal is self-contained */}
            <PaidEventsModal ref={modalRef} />
        </>
    );
}