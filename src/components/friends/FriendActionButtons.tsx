import { ButtonType1, ButtonType2 } from "../custom/button";
import { Button } from "../ui/button";
import { BanIcon, MoreHorizontalIcon } from "lucide-react";
import { Trash } from "iconsax-reactjs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "../ui/dropdown-menu";
import { useFriendActions } from "@/hooks/friends/useFriendActions";
import { ReactNode } from "react";

export type FriendButtonType = 
    | "message" 
    | "addFriend" 
    | "accept" 
    | "ignore" 
    | "cancelRequest"
    | "removeFriend"
    | "blockFriend"
    | "dropdown"; // Special type for dropdown menu

interface DropdownOption {
    type: "removeFriend" | "blockFriend";
    separator?: boolean; // Add separator after this item
}

interface FriendActionButtonsProps {
    userId: string;
    buttonsToShow: FriendButtonType[];
    dropdownOptions?: DropdownOption[]; // Only needed if "dropdown" is in buttonsToShow
    className?: string;
}

export const FriendActionButtons = ({ 
    userId, 
    buttonsToShow,
    dropdownOptions = [],
    className = "flex space-x-2"
}: FriendActionButtonsProps) => {
    const {
        sendMessage,
        addFriend,
        acceptRequest,
        ignoreRequest,
        cancelRequest,
        removeFriend,
        blockFriend,
        t,
    } = useFriendActions();

    const buttonMap: Record<FriendButtonType, ReactNode> = {
        message: (
            <ButtonType1 key="message" onClick={() => sendMessage(userId)}>
                {t('message')}
            </ButtonType1>
        ),
        addFriend: (
            <ButtonType2 key="addFriend" onClick={() => addFriend(userId)}>
                {t('addFriend')}
            </ButtonType2>
        ),
        accept: (
            <ButtonType2 key="accept" onClick={() => acceptRequest(userId)}>
                {t('accept')}
            </ButtonType2>
        ),
        ignore: (
            <ButtonType1 key="ignore" onClick={() => ignoreRequest(userId)}>
                {t('ignore')}
            </ButtonType1>
        ),
        cancelRequest: (
            <ButtonType1 key="cancelRequest" onClick={() => cancelRequest(userId)}>
                {t('cancelRequest')}
            </ButtonType1>
        ),
        removeFriend: (
            <ButtonType1 key="removeFriend" onClick={() => removeFriend(userId)}>
                {t('removeFriend')}
            </ButtonType1>
        ),
        blockFriend: (
            <ButtonType1 key="blockFriend" onClick={() => blockFriend(userId)}>
                {t('blockFriend')}
            </ButtonType1>
        ),
        dropdown: (
            <DropdownMenu key="dropdown">
                <DropdownMenuTrigger asChild>
                    <Button
                        className="cursor-pointer bg-surface-default border-0 shadow-none text-text-primary p-1"
                        variant="outline"
                        aria-label="Open menu"
                        size="icon-sm"
                    >
                        <MoreHorizontalIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-surface-default min-w-[200px]">
                    {dropdownOptions.map((option, index) => {
                        const items = [];
                        
                        if (option.type === "removeFriend") {
                            items.push(
                                <DropdownMenuItem
                                    key="removeFriend"
                                    onSelect={() => removeFriend(userId)}
                                    className="font-body-large text-text-primary flex items-center"
                                >
                                    <Trash size="32" />
                                    <span>{t('removeFriend')}</span>
                                </DropdownMenuItem>
                            );
                        }
                        
                        if (option.type === "blockFriend") {
                            items.push(
                                <DropdownMenuItem
                                    key="blockFriend"
                                    onSelect={() => blockFriend(userId)}
                                    className="font-body-large flex items-center"
                                >
                                    <BanIcon />
                                    <span>{t('blockFriend')}</span>
                                </DropdownMenuItem>
                            );
                        }
                        
                        if (option.separator && index < dropdownOptions.length - 1) {
                            items.push(<DropdownMenuSeparator key={`separator-${index}`} />);
                        }
                        
                        return items;
                    })}
                </DropdownMenuContent>
            </DropdownMenu>
        ),
    };

    return (
        <div className={className}>
            {buttonsToShow.map(buttonType => buttonMap[buttonType])}
        </div>
    );
};
