import { Bookmark } from "lucide-react";
import { EllipsisVertical } from "lucide-react";
import Image from "next/image";
import { EVENT_PLACEHOLDER_IMAGE } from "@/services/gql/events";
import { ButtonType1, ButtonType2 } from "../../custom/button";
import Link from "next/link";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";

interface EventCardProps {
    title: string;
    date: string;
    location: string;
    attendees: number;
    imageUrl: string;
    visibility?: string;
    eventId?: string;
    priceLabel?: string;
    isSoldOut?: boolean;
    onAttendClick?: () => void;
    onSaveClick?: () => void;
    isSaved?: boolean;
    isRegistered?: boolean;
    onCancelAttend?: () => void;
}

export default function EventCard1({ title, date, location, attendees, imageUrl, visibility, eventId, priceLabel, isSoldOut, onAttendClick, onSaveClick, isSaved, isRegistered, onCancelAttend }: EventCardProps) {
    const tActions = useTranslations('actions');

    return (
        <div className="w-full bg-surface-default rounded-2xl overflow-hidden shadow-sm border border-border-subtle">
            {/* Header Image */}
            <div className="relative h-40 rounded-t-2xl overflow-hidden">
                <Image
                    src={imageUrl}
                    alt={imageUrl === EVENT_PLACEHOLDER_IMAGE ? `Default image for event: ${title}` : `${title} cover`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.nextElementSibling?.setAttribute("style", "display: block");
                    }}
                />
                <div className="hidden w-full h-full bg-surface-subtle" style={{ display: "none" }}>
                    <Image
                        src={EVENT_PLACEHOLDER_IMAGE}
                        alt={`Default image for event: ${title}`}
                        fill
                        sizes="(max-width: 1024px) 100vw, 33vw"
                        className="w-full h-full object-cover"
                    />
                </div>
                {priceLabel && (
                    <span className="absolute top-2 right-2 bg-surface-default/90 backdrop-blur-sm text-text-primary text-xs font-semibold px-2 py-1 rounded-full border border-border-subtle">
                        {priceLabel}
                    </span>
                )}
            </div>

            {/* Event Details */}
            <div className="px-4 py-3">
                <div className="flex flex-col items-start min-w-0 mb-1">
                    <Link href={eventId ? `/events/${eventId}` : "/events"} className="min-w-0 w-full">
                        <h2 className="text-base font-bold text-text-primary truncate">{title}</h2>
                    </Link>
                    {visibility && visibility !== 'public' && (
                        <span className="inline-block mt-0.5 px-2 py-0.5 text-xs rounded-full bg-surface-subtle text-text-secondary capitalize border border-border-subtle">
                            {visibility.replace('_', ' ')}
                        </span>
                    )}
                </div>
                <p className="text-sm font-semibold text-text-primary">{date}</p>
                <p className="text-xs text-text-secondary truncate">{location}</p>
                <p className="text-xs text-text-secondary mb-3">{tActions('going', { count: attendees })}</p>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                    <ButtonType1
                        onClick={onSaveClick}
                        className={`flex items-center justify-center overflow-hidden ${isSaved ? "bg-text-brand text-text-white border-text-brand" : ""}`}
                    >
                        <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
                        <span className="sr-only">{isSaved ? tActions('saved') : tActions('save')}</span>
                    </ButtonType1>
                    <ButtonType2
                        onClick={onAttendClick}
                        disabled={isRegistered || isSoldOut}
                        className="flex w-full text-center justify-center text-sm">
                        {isRegistered ? tActions('attending') : isSoldOut ? tActions('soldOut') : tActions('attend')}
                    </ButtonType2>
                    {isRegistered && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <ButtonType1 className="flex items-center justify-center overflow-hidden">
                                    <EllipsisVertical className="w-4 h-4" />
                                </ButtonType1>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={onCancelAttend}>
                                    {tActions('notAttendingAnymore')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>
        </div>
    );
}
