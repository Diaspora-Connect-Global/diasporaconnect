import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { EVENT_PLACEHOLDER_IMAGE } from "@/services/gql/events";
import { useTranslations } from "next-intl";

interface EventCardProps {
    title: string;
    date: string;
    location: string;
    attendees: number;
    imageUrl: string;
    visibility?: string;
    eventId?: string;
}

export default function EventCardSmall({ title, date, location, attendees, imageUrl, visibility, eventId }: EventCardProps) {
    const tActions = useTranslations('actions');

    return (
        <div className="w-full lg:w-[18.3125rem] flex bg-surface-default rounded-lg overflow-hidden">
            
            {/* Image container */}
            <div className="relative w-[5rem] min-h-full lg:w-[4.6875rem]">
                <Image
                    src={imageUrl}
                    alt={imageUrl === EVENT_PLACEHOLDER_IMAGE ? `Default image for event: ${title}` : `${title} cover`}
                    fill
                    sizes="80px"
                    className="object-fill"
                    onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.nextElementSibling?.setAttribute("style", "display: block");
                    }}
                />

                {/* Fallback image when URL fails */}
                <div className="hidden absolute inset-0 bg-surface-subtle">
                    <Image
                        src={EVENT_PLACEHOLDER_IMAGE}
                        alt={`Default image for event: ${title}`}
                        fill
                        sizes="80px"
                        className="object-cover"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-3 py-2 min-w-0">
                <Link href={eventId ? `/events/${eventId}` : "/events"} className="flex gap-2 items-center">
                    <h2 className="caption-large text-text-primary truncate min-w-0">
                        {title}
                    </h2>
                    {visibility && visibility !== 'public' && (
                        <span className="shrink-0 px-1.5 py-0.5 text-[0.65rem] rounded bg-surface-subtle text-text-text-secondary capitalize border border-border-subtle">
                            {visibility.replace('_', ' ')}
                        </span>
                    )}
                </Link>

                <p className="caption-medium text-text-primary mt-1">
                    {date}
                </p>

                <div className="flex flex-wrap items-start mt-1">
                    <span className="text-text-secondary caption-small">
                        {location} |
                    </span>
                    <p className="text-text-secondary caption-small ml-1">
                        {tActions('going', { count: attendees })}
                    </p>
                </div>
            </div>
        </div>
    );
}
