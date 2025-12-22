import { FC } from "react";
import { Tier } from "../custom/userBadge";
import Image from "next/image";
import { useTranslations } from 'next-intl';
import { FriendActionButtons, FriendButtonType } from "@/components/friends/FriendActionButtons";
import { FriendType } from "../friends/TypeOfFriend";
import { useFriendActionLoading } from "./FriendListModal";
import { Loader2 } from "lucide-react";

interface DropdownOption {
    type: "removeFriend" | "blockFriend";
    separator?: boolean;
}

interface FriendsCardWithLoadingProps {
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

const FriendsCardWithLoading: FC<FriendsCardWithLoadingProps> = ({
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
    const { loadingUserId } = useFriendActionLoading();

    // Use custom buttons if provided, otherwise use defaults based on status
    const defaultConfig = getDefaultButtonConfig(status);
    const buttons = customButtons ?? defaultConfig.buttons;
    const dropdownOptions = customDropdownOptions ?? defaultConfig.dropdownOptions;

    const handleNameClick = () => {
        if (onNameClick) {
            onNameClick(userId);
        }
    };

    const isLoading = loadingUserId === userId;

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
                                {/* <UserBadge tier={tier} size="sm" /> */}
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

            {/* ---- Dynamic Action Buttons with Loading State ---- */}
            {isLoading ? (
                <div className="flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-text-brand" />
                </div>
            ) : (
                <FriendActionButtons
                    userId={userId}
                    buttonsToShow={buttons}
                    dropdownOptions={dropdownOptions}
                    connectionId={""}
                />
            )}
        </div>
    );
};

export default FriendsCardWithLoading;
