import { Link } from "@/i18n/navigation";
import Image from "next/image";

interface EventCardProps {
    title: string;
    date: string;
    location: string;
    attendees: number;
    imageUrl: string;
}

export default function EventCardSmall({ title, date, location, attendees, imageUrl }: EventCardProps) {
    return (
        <div className="w-full lg:w-[18.3125rem] flex bg-surface-default rounded-lg overflow-hidden">
            
            {/* Image container */}
            <div className="relative w-[5rem] min-h-full lg:w-[4.6875rem]">
                <Image
                    src={imageUrl}
                    alt={`${title} background`}
                    fill
                    className="object-fill"
                    onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.nextElementSibling?.setAttribute("style", "display: block");
                    }}
                />

                {/* Fallback image */}
                <div className="hidden absolute inset-0 bg-surface-subtle">
                    <Image
                        src="/EVENT.png"
                        alt="Fallback event background"
                        fill
                        className="object-cover"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-3 py-2">
                <Link href="/events/1">
                    <h2 className="font-caption-large text-primary truncate">
                        {title}
                    </h2>
                </Link>

                <p className="font-caption-medium text-primary mt-1">
                    {date}
                </p>

                <div className="flex flex-wrap items-start mt-1">
                    <span className="text-secondary font-caption-small">
                        {location} |
                    </span>
                    <p className="text-secondary font-caption-small ml-1">
                        {attendees} going
                    </p>
                </div>
            </div>
        </div>
    );
}
