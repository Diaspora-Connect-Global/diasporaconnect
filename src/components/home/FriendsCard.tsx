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
    status: "connected" | "none" | "pending_received" | "pending_sent" | "blocked";

    /** Optional: Override default buttons for this status */
    customButtons?: FriendButtonType[];
    customDropdownOptions?: DropdownOption[];

    /** New prop for handling name click */
    onNameClick?: (userId: string) => void;
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
        <div className="flex items-center justify-between lg:border border-t border-border-subtle px-3 py-6 lg:rounded-2xl">
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
                    <div className="flex items-center flex-wrap">
                        <div
                            onClick={handleNameClick}
                            className="font-body-large text-text-primary text-sm cursor-pointer hover:text-text-brand transition-colors inline-flex items-center gap-1 mr-2"
                        >
                            <span className="flex items-center space-x-2 ">
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
                connectionId={""}
            />
        </div>
    );
};

export default FriendsCard;