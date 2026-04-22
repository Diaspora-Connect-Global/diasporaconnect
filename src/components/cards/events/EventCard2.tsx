import Image from "next/image";
import { EVENT_PLACEHOLDER_IMAGE } from "@/services/gql/events";
import { ButtonType1, ButtonType2 } from "../../custom/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EllipsisVertical, Lock, Globe, Users, Shield } from "lucide-react";
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
    onBuyClick?: () => void;
    onSaveClick?: () => void;
    isSaved?: boolean;
    isRegistered?: boolean;
    isSoldOut?: boolean;
    onCancelAttend?: () => void;
}

export default function EventCard2({ title, date, location, attendees, imageUrl, description, priceLabel, visibility = "public", onBuyClick, onSaveClick, isSaved, isRegistered, isSoldOut, onCancelAttend }: EventCardProps) {
    const tActions = useTranslations('actions');

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
                <Image
                    src={imageUrl}
                    alt={imageUrl === EVENT_PLACEHOLDER_IMAGE ? `Default image for event: ${title}` : `${title} cover`}
                    fill
                    className="object-cover"
                    onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.nextElementSibling?.setAttribute("style", "display: block");
                    }}
                />
                <div className="hidden w-full h-full bg-surface-subtle items-center justify-center" style={{ display: "none" }}>
                    <Image
                        src={EVENT_PLACEHOLDER_IMAGE}
                        alt={`Default image for event: ${title}`}
                        width={200}
                        height={200}
                        className="object-contain"
                    />
                </div>
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

                {(description != null && description !== "") && (
                    <div className="mt-6 border-t pt-4">
                        <p className="text-xl font-bold text-text-primary">About</p>
                        <p className="text-text-primary mt-2 text-justify whitespace-pre-wrap">{description}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
