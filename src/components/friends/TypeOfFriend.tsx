import { FC } from "react";
import { useTranslations } from "next-intl";
import { FriendActionButtons, FriendButtonType } from "./FriendActionButtons";

export type FriendType =
    | "friends"
    | "suggested"
    | "request-received"
    | "request-sent"
    | "blocked";

interface DropdownOption {
    type: "removeFriend" | "blockFriend";
    separator?: boolean;
}

interface TypeOfFriendProps {
    userId: string;
    type: FriendType;
    className?: string;
    connectionId: string;
    onConnectionAction?: () => void;
}

/**
 * Returns button configuration based on friend type
 */
const getButtonsForType = (type: FriendType): {
    buttons: FriendButtonType[];
    dropdownOptions?: DropdownOption[];
} => {
    switch (type) {
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
                buttons: ["addFriend", "dropdown"],
                dropdownOptions: [
                    { type: "removeFriend", separator: true },
                    { type: "blockFriend" }
                ]
            };

        case "request-received":
            return {
                buttons: ["accept", "ignore", "dropdown"],
                dropdownOptions: [
                    { type: "removeFriend", separator: true },
                    { type: "blockFriend" }
                ]
            };

        case "request-sent":
            return {
                buttons: ["cancelRequest", "dropdown"],
                dropdownOptions: [
                    { type: "removeFriend", separator: true },
                    { type: "blockFriend" }
                ]
            };

        case "blocked":
            return { buttons: [] };

        default:
            return { buttons: [] };
    }
};

export const TypeOfFriend: FC<TypeOfFriendProps> = ({
    userId,
    type,
    connectionId,
    className = "mt-4",
    onConnectionAction,
}) => {
    const t = useTranslations("friends");
    const { buttons, dropdownOptions } = getButtonsForType(type);

    // Blocked: show label only, no actions
    if (type === "blocked") {
        return (
            <div className={className}>
                <p className="text-sm text-text-secondary italic">
                    {t("youHaveBlockedThisUser") || "You have blocked this user."}
                </p>
            </div>
        );
    }

    // Don't render anything if there are no buttons (e.g., viewing own profile)
    if (buttons.length === 0) {
        return null;
    }

    return (
        <div className={className}>
            <FriendActionButtons
                userId={userId}
                connectionId={connectionId}
                buttonsToShow={buttons}
                dropdownOptions={dropdownOptions}
                className="flex space-x-2 justify-start"
                onConnectionAction={onConnectionAction}
            />
        </div>
    );
};