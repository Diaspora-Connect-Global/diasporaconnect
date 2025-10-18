import EventCard2 from "@/components/cards/EventCard2";

export default function EventsId() {
    const event = {
        title: "Accra Arts Festival",
        date: "Oct 21, 2025, 3:00PM",
        location: "Ghana Embassy, Belgium",
        attendees: 32,
        imageUrl: "/EVENT.png",
    }
    return (

        <div className="w-full h-[calc(100vh-64px)] overflow-auto scrollbar-hide p-4">
            <div className="max-w-[90%] mx-auto">
                <EventCard2
                    title={event.title}
                    date={event.date}
                    location={event.location}
                    attendees={event.attendees}
                    imageUrl={event.imageUrl}
                />
            </div>
        </div>


    );

}