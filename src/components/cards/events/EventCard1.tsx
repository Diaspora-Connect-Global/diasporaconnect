import { Bookmark } from "lucide-react";
import { EllipsisVertical } from "lucide-react";
import Image from "next/image";
import { EVENT_PLACEHOLDER_IMAGE } from "@/services/gql/events";
import { ButtonType1, ButtonType2 } from "../../custom/button";
import Link from "next/link";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
    return (
        <div className="w-full max-w-lg bg-surface-default rounded-lg overflow-hidden shadow-lg">
            {/* Header Image */}
            <div className="relative h-64 rounded-t-sm overflow-hidden">
                <Image
                    src={imageUrl}
                    alt={imageUrl === EVENT_PLACEHOLDER_IMAGE ? `Default image for event: ${title}` : `${title} cover`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
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
                        fill
                        sizes="(max-width: 1024px) 100vw, 33vw"
                        className="w-full h-full object-fill"
                    />
                </div>
            </div>

            {/* Event Details */}
            <div className="p-6">
                <div className="flex justify-between items-start mb-2 gap-4">
                    <Link href={eventId ? `/events/${eventId}` : "/events"} className="flex flex-col items-start min-w-0">
                        <h2 className="text-2xl font-bold text-primary truncate max-w-full">{title}</h2>
                        {visibility && visibility !== 'public' && (
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-surface-subtle text-text-secondary capitalize border border-border-subtle">
                                {visibility.replace('_', ' ')}
                            </span>
                        )}
                    </Link>
                    {priceLabel && (
                        <p className="text-text-primary whitespace-nowrap"><span className="text-lg font-bold text-primary">{priceLabel}</span></p>
                    )}
                </div>
                <p className="text-lg font-semibold text-primary mt-1">{date}</p>
                <p className="text-secondary mb-1">{location}</p>
                <p className="text-secondary text-sm mb-6">{attendees} going</p>

                {/* Action Buttons */}
                  <div className="flex mt-1 space-x-2">
                    <ButtonType1
                        onClick={onSaveClick}
                        className={`flex items-center justify-center overflow-hidden ${isSaved ? "bg-text-brand text-text-white border-text-brand" : ""}`}
                        size="lg"
                    >
                        <Bookmark className={`w-6 h-6 ${isSaved ? "fill-current" : ""}`} />
                        <span className="sr-only">{isSaved ? "Saved" : "Save"}</span>
                    </ButtonType1>
                    <ButtonType2 size="lg" 
                    onClick={onAttendClick}
                    disabled={isRegistered || isSoldOut}
                    className="flex w-full text-center justify-center">
                        {isRegistered ? "Attending" : isSoldOut ? "Sold Out" : "Attend"}
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
                                    Not attending anymore
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>
        </div>
    );
}