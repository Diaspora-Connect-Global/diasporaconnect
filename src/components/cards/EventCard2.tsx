import { Bookmark } from "lucide-react";
import Image from "next/image";
import { ButtonType1, ButtonType2 } from "../custom/button";
import Link from "next/link";

// EventCard1 Component with Props
interface EventCardProps {
    title: string;
    date: string;
    location: string;
    attendees: number;
    imageUrl: string; // Required background image URL
}

export default function EventCard2({ title, date, location, attendees, imageUrl }: EventCardProps) {
    return (
        <div className="w-full max-w-lg bg-surface-default rounded-lg overflow-hidden shadow-lg">
            {/* Header Image */}
            <div className="relative h-64 rounded-t-lg overflow-hidden">
                <Image
                    src={imageUrl}
                    alt={`${title} background`}
                    layout="fill"
                    objectFit="cover"
                    className="w-full h-full object-contain"
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
                        objectFit="contain"
                        className="w-full h-full object-contain"
                    />
                </div>
            </div>

            {/* Event Details */}
            <div className="p-6">
                <Link href="/events/1">
                <h2 className="text-2xl font-bold text-primary mb-2">{title}</h2>
                </Link>
                <p className="text-lg font-semibold text-primary mb-1">{date}</p>
                <p className="text-secondary mb-1">{location}</p>
                <p className="text-secondary text-sm mb-6">{attendees} going</p>

                {/* Action Buttons */}
                <div className="flex gap-3 items-center">
                    <ButtonType1 className="flex items-center justify-center w-14 h-14 rounded-full overflow-hidden">
                        <Bookmark className="w-4 h-4 " />
                    </ButtonType1>
                    <ButtonType2 className="flex-1 py-3 px-6 rounded-full"> {/* Added px-6 for balance */}
                        Attend
                    </ButtonType2>
                </div>
            </div>
        </div>
    );
}