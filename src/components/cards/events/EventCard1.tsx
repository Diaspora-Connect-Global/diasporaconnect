import { Bookmark } from "lucide-react";
import Image from "next/image";
import { ButtonType1, ButtonType2 } from "../../custom/button";
import Link from "next/link";

interface EventCardProps {
    title: string;
    date: string;
    location: string;
    attendees: number;
    imageUrl: string;
    eventId?: string;
    onAttendClick?: () => void;
}

export default function EventCard1({ title, date, location, attendees, imageUrl, eventId, onAttendClick }: EventCardProps) {
    return (
        <div className="w-full max-w-lg bg-surface-default rounded-lg overflow-hidden shadow-lg">
            {/* Header Image */}
            <div className="relative h-64 rounded-t-sm overflow-hidden">
                <Image
                    src={imageUrl}
                    alt={`${title} background`}
                    layout="fill"
                    objectFit="fill"
                    className="w-full h-full object-fill"
                    onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.nextElementSibling?.setAttribute("style", "display: block");
                    }}
                />
                <div className="hidden w-full h-full bg-surface-subtle" style={{ display: "none" }}>
                    <Image
                        src="/EVENT.png"
                        alt="Fallback event background"
                        layout="fill"
                        objectFit="fill"
                        className="w-full h-full object-fill"
                    />
                </div>
            </div>

            {/* Event Details */}
            <div className="p-6">
                <Link href={eventId ? `/events/${eventId}` : "/events"}>
                    <h2 className="text-2xl font-bold text-primary mb-2">{title}</h2>
                </Link>
                <p className="text-lg font-semibold text-primary mb-1">{date}</p>
                <p className="text-secondary mb-1">{location}</p>
                <p className="text-secondary text-sm mb-6">{attendees} going</p>

                {/* Action Buttons */}
                  <div className="flex mt-1 space-x-2">
                    <ButtonType1 className=" flex items-center justify-center py-3 px-6 rounded-full overflow-hidden">
                        <Bookmark className="w-6 h-6 " />
                    </ButtonType1>
                    <ButtonType2 
                    onClick={onAttendClick}
                    className="flex w-full py-3 px-6 rounded-full text-center justify-center"> {/* Added px-6 for balance */}
                        Attend
                    </ButtonType2>
                </div>
            </div>
        </div>
    );
}