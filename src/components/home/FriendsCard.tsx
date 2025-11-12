import { Tier, UserBadge } from "../custom/userBadge";
import Image from "next/image";
import { FC } from "react";
import { useTranslations } from 'next-intl';
import { FriendActionButtons, FriendButtonType } from "@/components/friends/FriendActionButtons";
import { FriendType } from "../friends/TypeOfFriend";

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

    /** Current relationship status */
    status: FriendType;

    /** Optional: Override default buttons for this status */
    customButtons?: FriendButtonType[];
    customDropdownOptions?: DropdownOption[];
    
    /** New prop for handling name click */
    onNameClick?: (userId: string) => void;
}

/**
 * Returns default button configuration based on friend status
 */
const getDefaultButtonConfig = (status: FriendType): {
    buttons: FriendButtonType[];
    dropdownOptions?: DropdownOption[];
} => {
    switch (status) {
        case "friends":
            return {
                buttons: ["message", "dropdown"],
                dropdownOptions: [
                    { type: "removeFriend", separator: true },
                    { type: "blockFriend" }
                ]
            };
        
        case "suggested":
            return {
                buttons: ["addFriend"]
            };
        
        case "request-received":
            return {
                buttons: ["accept", "ignore"]
            };
        
        case "request-sent":
            return {
                buttons: ["cancelRequest"]
            };
        
        default:
            return { buttons: [] };
    }
};

const FriendsCard: FC<FriendsCardProps> = ({
    userId,
    name,
    imageSrc = "https://github.com/shadcn.png",
    mutualConnections,
    tier = "starter",
    status,
    customButtons,
    customDropdownOptions,
    onNameClick,
}) => {
    const t = useTranslations('friends');
    
    // Use custom buttons if provided, otherwise use defaults based on status
    const defaultConfig = getDefaultButtonConfig(status);
    const buttons = customButtons ?? defaultConfig.buttons;
    const dropdownOptions = customDropdownOptions ?? defaultConfig.dropdownOptions;
    
    const handleNameClick = () => {
        if (onNameClick) {
            onNameClick(userId);
        }
    };
    
    return (
        <div className="flex items-center justify-between border border-border-subtle px-3 py-6 rounded-2xl">
            {/* ---- Avatar + Info ---- */}
            <div className="flex items-center space-x-3">
                <Image
                    src={imageSrc}
                    alt={name}
                    width={40}
                    height={40}
                    className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                />

                <div>
                    <div className="flex items-center space-x-2">
                        <span 
                            onClick={handleNameClick}
                            className="font-body-large text-text-primary text-sm cursor-pointer hover:text-text-brand transition-colors"
                        >
                            {name}
                        </span>
                        {tier && <UserBadge tier={tier} size="sm" />}
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
            />
        </div>
    );
};

export default FriendsCard;