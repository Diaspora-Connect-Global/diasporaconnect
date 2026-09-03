import { ButtonType1, ButtonType2 } from "@/components/custom/button";
import { Bookmark, EllipsisVertical } from "lucide-react";
import Link from "next/link";
import { EVENT_PLACEHOLDER_IMAGE } from "@/services/gql/events";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
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

export default function PaidEventCard({ title, date, location, attendees, imageUrl, visibility, eventId, priceLabel, isSoldOut, onAttendClick, onSaveClick, isSaved, isRegistered, onCancelAttend }: EventCardProps) {
    const tActions = useTranslations('actions');

    return (
        <div className="w-full max-w-lg bg-surface-default rounded-2xl overflow-hidden shadow-sm border border-border-subtle">
            {/* Header Image */}
            <div className="relative h-32 rounded-t-2xl overflow-hidden">
                <ImageWithFallback
                    src={imageUrl}
                    fallbackSrc={EVENT_PLACEHOLDER_IMAGE}
                    alt={imageUrl === EVENT_PLACEHOLDER_IMAGE ? `Default image for event: ${title}` : `${title} cover`}
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="absolute inset-0 w-full h-full object-fill"
                />
            </div>

            {/* Event Details */}
            <div className="px-4 py-2">
                <div className="flex justify-between items-start mb-2 gap-4">
                    <Link href={eventId ? `/events/${eventId}` : "/events"} className="flex flex-col items-start min-w-0">
                        <h2 className="text-2xl font-bold text-text-primary truncate max-w-full">{title}</h2>
                        {visibility && visibility !== 'public' && (
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-surface-subtle text-text-secondary capitalize border border-border-subtle">
                                {visibility.replace('_', ' ')}
                            </span>
                        )}
                    </Link>
                    {priceLabel && (
                        <p className="text-text-primary whitespace-nowrap"><span className="text-lg font-bold text-text-primary">{priceLabel}</span></p>
                    )}
                </div>
                <p className="text-lg font-semibold text-text-primary">{date}</p>
                <p className="text-text-secondary">{location}</p>
                <p className="text-text-secondary text-sm">{tActions('going', { count: attendees })}</p>

                {/* Action Buttons */}
                <div className="flex mt-1 space-x-2">
                    <ButtonType1
                        onClick={onSaveClick}
                        className={`flex items-center justify-center overflow-hidden ${isSaved ? "bg-text-brand text-text-white border-text-brand" : ""}`}
                        size="lg"
                    >
                        <Bookmark className={`w-8 h-8 ${isSaved ? "fill-current" : ""}`} />
                        <span className="sr-only">{isSaved ? tActions('saved') : tActions('save')}</span>
                    </ButtonType1>
                    <ButtonType2
                        onClick={onAttendClick}
                        disabled={isRegistered || isSoldOut}
                        size="lg"
                        className="flex w-full text-center justify-center">
                        {isRegistered ? tActions('attending') : isSoldOut ? tActions('soldOut') : tActions('attend')}
                    </ButtonType2>
                    {isRegistered && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <ButtonType1 className="flex items-center justify-center overflow-hidden" size="lg">
                                    <EllipsisVertical className="w-5 h-5" />
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
