import { Tier, UserBadge } from "../custom/userBadge";
import Image from "next/image";
import { FC, useState } from "react";
import { useTranslations } from 'next-intl';
import { FriendActionButtons, FriendButtonType } from "@/components/friends/FriendActionButtons";

interface DropdownOption {
    type: "removeFriend" | "blockFriend";
    separator?: boolean;
}

interface FriendsCardProps {
    /** User data */
    userId: string;
    name: string;
    imageSrc: string;
    mutualConnections?: number;
    tier: Tier;
    connectionId: string;

    /** Current relationship status */
    status: "connected" | "none" | "pending_received" | "pending_sent" | "blocked";

    /** Optional: Override default buttons for this status */
    customButtons?: FriendButtonType[];
    customDropdownOptions?: DropdownOption[];

    /** New prop for handling name click */
    onNameClick?: (userId: string) => void;

    /** Search context for refetching */
    searchQuery?: string;
    isSearching?: boolean;
}

/**
 * Returns default button configuration based on friend status
 */
const getDefaultButtonConfig = (status: "connected" | "none" | "pending_received" | "pending_sent" | "blocked"): {
    buttons: FriendButtonType[];
    dropdownOptions?: DropdownOption[];
} => {
    switch (status) {
        case "connected":
            return {
                buttons: ["message", "dropdown"],
                dropdownOptions: [
                    { type: "removeFriend", separator: true },
                    { type: "blockFriend" }
                ]
            };

        case "none":
            return {
                buttons: ["addFriend"]
            };

        case "pending_received":
            return {
                buttons: ["accept", "ignore"]
            };

        case "pending_sent":
            return {
                buttons: ["cancelRequest"]
            };
        case "blocked":
            return {
                buttons: ["blockFriend"]
            };

        default:
            return { buttons: [] };
    }
};

const FriendsCard: FC<FriendsCardProps> = ({
    userId,
    name,
    imageSrc ,
    mutualConnections,
    tier = "starter",
    status,
    customButtons,
    customDropdownOptions,
    connectionId,
    onNameClick,
    searchQuery = "",
    isSearching = false,
}) => {
    const t = useTranslations('friends');
    const [imageError, setImageError] = useState(false);

    // Use custom buttons if provided, otherwise use defaults based on status
    const defaultConfig = getDefaultButtonConfig(status);
    const buttons = customButtons ?? defaultConfig.buttons;
    const dropdownOptions = customDropdownOptions ?? defaultConfig.dropdownOptions;

    const handleNameClick = () => {
        if (onNameClick) {
            onNameClick(userId);
        }
    };

    // Get initials from name
    const getInitials = (fullName: string) => {
        const names = fullName.trim().split(' ');
        if (names.length === 1) {
            return names[0].charAt(0).toUpperCase();
        }
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    };

    // Generate consistent color based on name
    const getAvatarColor = (fullName: string) => {
        const colors = [
            'bg-blue-500',
            'bg-green-500',
            'bg-purple-500',
            'bg-pink-500',
            'bg-indigo-500',
            'bg-red-500',
            'bg-yellow-500',
            'bg-teal-500',
        ];
        const index = fullName.charCodeAt(0) % colors.length;
        return colors[index];
    };

    return (
        <div className="flex items-center justify-between lg:border border-t border-border-subtle px-3 py-6 lg:rounded-2xl">
            {/* ---- Avatar + Info ---- */}
            <div className="flex items-center space-x-3">
                {!imageError && imageSrc && imageSrc.trim() !== '' && imageSrc !== 'null' && imageSrc !== 'undefined' ? (
                    <Image
                        src={imageSrc}
                        alt={name}
                        width={40}
                        height={40}
                        className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${getAvatarColor(name)} text-white font-semibold text-lg`}>
                        {getInitials(name)}
                    </div>
                )}
                <div>
                    <div className="flex items-center flex-wrap">
                        <div
                            onClick={handleNameClick}
                            className="font-body-large text-text-primary text-sm cursor-pointer hover:text-text-brand transition-colors inline-flex items-center gap-1"
                        >
                            <span className="flex items-center space-x-2 flex-wrap">
                                <p className="whitespace-nowrap">
                                    {name?.trim()}
                                </p>
                                <UserBadge tier={tier} size="sm" />
                            </span>
                        </div>
                    </div>

                    {mutualConnections !== undefined && (
                        <span className="text-sm text-text-secondary">
                            {mutualConnections === 1
                                ? t('mutualConnection', { count: mutualConnections })
                                : t('mutualConnections', { count: mutualConnections })
                            }
                        </span>
                    )}
                </div>
            </div>

            {/* ---- Dynamic Action Buttons ---- */}
            <FriendActionButtons
                userId={userId}
                buttonsToShow={buttons}
                dropdownOptions={dropdownOptions}
                connectionId={connectionId}
                searchQuery={searchQuery}
                isSearching={isSearching}
            />
        </div>
    );
};

export default FriendsCard;