import Image from "next/image";
import { EVENT_PLACEHOLDER_IMAGE } from "@/services/gql/events";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { ButtonType1, ButtonType2 } from "../../custom/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EllipsisVertical, Lock, Globe, Users, Shield, MapPin, Video, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

interface EventCardProps {
    title: string;
    date: string;
    location: string;
    attendees: number;
    imageUrl: string;
    description?: string;
    priceLabel?: string;
    visibility?: string;
    /** Structured venue/location details for the detail view (optional — list cards omit these). */
    venueName?: string;
    addressLines?: string[];
    virtualLink?: string | null;
    platform?: string | null;
    registrationLink?: string | null;
    onBuyClick?: () => void;
    onSaveClick?: () => void;
    isSaved?: boolean;
    isRegistered?: boolean;
    isSoldOut?: boolean;
    onCancelAttend?: () => void;
}

export default function EventCard2({ title, date, location, attendees, imageUrl, description, priceLabel, visibility = "public", venueName, addressLines, virtualLink, platform, registrationLink, onBuyClick, onSaveClick, isSaved, isRegistered, isSoldOut, onCancelAttend }: EventCardProps) {
    const tActions = useTranslations('actions');

    const hasVenue = Boolean(venueName) || (addressLines?.length ?? 0) > 0 || Boolean(virtualLink) || Boolean(platform);

    const visibilityMeta: Record<string, { label: string; icon: React.ReactNode }> = {
        public: { label: "Public", icon: <Globe size={12} /> },
        community: { label: "Community", icon: <Users size={12} /> },
        association: { label: "Association", icon: <Shield size={12} /> },
        invite_only: { label: "Invite only", icon: <Lock size={12} /> },
    };
    const badge = visibilityMeta[visibility] ?? visibilityMeta.public;

    return (
        <div className="w-full bg-surface-default border border-border-default rounded-2xl overflow-hidden shadow-sm">
            {/* Header Image */}
            <div className="relative h-64 rounded-t-2xl overflow-hidden bg-surface-subtle">
                <ImageWithFallback
                    src={imageUrl}
                    fallbackSrc={EVENT_PLACEHOLDER_IMAGE}
                    alt={imageUrl === EVENT_PLACEHOLDER_IMAGE ? `Default image for event: ${title}` : `${title} cover`}
                    className="absolute inset-0 w-full h-full object-cover"
                />
            </div>

            {/* Event Details */}
            <div className="p-6">
                <div className="flex justify-between items-start mb-2 gap-4">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <h2 className="text-2xl font-bold text-text-primary break-words">{title}</h2>
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface-subtle border border-border-default px-2.5 py-0.5 text-xs font-semibold text-text-secondary whitespace-nowrap">
                            {badge.icon}
                            {badge.label}
                        </span>
                    </div>
                    {priceLabel != null && (
                        <div className="flex-shrink-0">
                            <span className="text-lg font-bold text-text-primary">{priceLabel}</span>
                        </div>
                    )}
                </div>
                <p className="text-lg font-semibold text-text-primary mb-1">{date}</p>
                <p className="text-text-secondary mb-1">{location}</p>
                <p className="text-text-secondary text-sm mb-6">{tActions('going', { count: attendees })}</p>

                {/* Action Buttons */}
                <div className="flex gap-3 text-center items-center justify-between">
                    <div className="flex items-center gap-4">
                        <ButtonType2 onClick={onBuyClick} size="lg" disabled={isRegistered || isSoldOut}>
                            {isRegistered ? tActions('attending') : isSoldOut ? tActions('soldOut') : tActions('attend')}
                        </ButtonType2>
                        {onSaveClick && (
                            <ButtonType1 onClick={onSaveClick} className="flex items-center justify-center overflow-hidden" size="lg">
                                {isSaved ? tActions('saved') : tActions('save')}
                            </ButtonType1>
                        )}
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
                    <ButtonType1 className="flex items-center justify-center rounded-full overflow-hidden">
                        <Image
                            src="/SHARE.svg"
                            alt="Share Icon"
                            width={24}
                            height={24}
                            className="object-contain"
                        />
                    </ButtonType1>
                </div>

                {hasVenue && (
                    <div className="mt-6 border-t pt-4">
                        <p className="text-xl font-bold text-text-primary">Venue</p>
                        <div className="mt-2 space-y-2 text-text-primary">
                            {(venueName || (addressLines?.length ?? 0) > 0) && (
                                <div className="flex items-start gap-2">
                                    <MapPin size={18} className="mt-0.5 flex-shrink-0 text-text-secondary" />
                                    <div>
                                        {venueName && <p className="font-semibold">{venueName}</p>}
                                        {addressLines?.map((line, i) => (
                                            <p key={i} className="text-text-secondary">{line}</p>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {(platform || virtualLink) && (
                                <div className="flex items-start gap-2">
                                    <Video size={18} className="mt-0.5 flex-shrink-0 text-text-secondary" />
                                    <div className="min-w-0">
                                        {platform && <p className="font-semibold">{platform}</p>}
                                        {virtualLink && (
                                            <a
                                                href={virtualLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-text-brand underline break-all"
                                            >
                                                {virtualLink}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="mt-6 border-t pt-4">
                    <p className="text-xl font-bold text-text-primary">About</p>
                    {(description != null && description !== "") ? (
                        <p className="text-text-primary mt-2 text-justify whitespace-pre-wrap">{description}</p>
                    ) : (
                        <p className="text-text-secondary mt-2 italic">No description provided.</p>
                    )}
                </div>

                {registrationLink && (
                    <div className="mt-6 border-t pt-4">
                        <a
                            href={registrationLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-text-brand font-semibold underline break-all"
                        >
                            <ExternalLink size={18} className="flex-shrink-0" />
                            {tActions('register')}
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
