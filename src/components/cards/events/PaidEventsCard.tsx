import { ButtonType1, ButtonType2 } from "@/components/custom/button";
import { Bookmark } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { EVENT_PLACEHOLDER_IMAGE } from "@/services/gql/events";

interface EventCardProps {
    title: string;
    date: string;
    location: string;
    attendees: number;
    imageUrl: string;
    eventId?: string;
    onAttendClick?: () => void;
}

export default function PaidEventCard({ title, date, location, attendees, imageUrl, eventId, onAttendClick }: EventCardProps) {
    return (
        <div className="w-full max-w-lg bg-surface-default rounded-lg overflow-hidden shadow-lg">
            {/* Header Image */}
            <div className="relative h-32 rounded-t-sm overflow-hidden">
                <Image
                    src={imageUrl}
                    alt={imageUrl === EVENT_PLACEHOLDER_IMAGE ? `Default image for event: ${title}` : `${title} cover`}
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
                        src={EVENT_PLACEHOLDER_IMAGE}
                        alt={`Default image for event: ${title}`}
                        layout="fill"
                        objectFit="fill"
                        className="w-full h-full object-fill"
                    />
                </div>
            </div>

            {/* Event Details */}
            <div className="px-4 py-2">
                <Link href={eventId ? `/events/${eventId}` : "/events"}>
                    <h2 className="text-2xl font-bold text-primary ">{title}</h2>
                </Link>
                <p className="text-lg font-semibold text-primary ">{date}</p>
                <p className="text-secondary ">{location}</p>
                <p className="text-secondary text-sm ">{attendees} going</p>

                {/* Action Buttons */}
                <div className="flex mt-1 space-x-2">
                    <ButtonType1 className=" flex items-center justify-center py-3 px-6 rounded-full overflow-hidden">
                        <Bookmark className="w-8 h-8 " />
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