import { FC } from "react";
import { FriendActionButtons, FriendButtonType } from "./FriendActionButtons";

export type FriendType =
    | "friends"           
    | "suggested"         
    | "request-received"
    | "request-sent" ;

interface DropdownOption {
    type: "removeFriend" | "blockFriend";
    separator?: boolean;
}

interface TypeOfFriendProps {
    userId: string;
    type: FriendType;
    className?: string;
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

        default:
            return { buttons: [] };
    }
};

export const TypeOfFriend: FC<TypeOfFriendProps> = ({
    userId,
    type,
    className = "mt-4"
}) => {
    const { buttons, dropdownOptions } = getButtonsForType(type);

    // Don't render anything if there are no buttons (e.g., viewing own profile)
    if (buttons.length === 0) {
        return null;
    }

    return (
        <div className={className}>
            <FriendActionButtons
                userId={userId}
                buttonsToShow={buttons}
                dropdownOptions={dropdownOptions}
                className="flex space-x-2 justify-start"
            />
        </div>
    );
};