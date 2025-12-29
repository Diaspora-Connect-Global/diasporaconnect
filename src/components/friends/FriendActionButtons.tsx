import { ButtonType1, ButtonType2, ButtonType4Pill } from "../custom/button";
import { Button } from "../ui/button";
import { BanIcon, MoreHorizontalIcon, Loader2 } from "lucide-react";
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
    | "dropdown";

interface DropdownOption {
    type: "removeFriend" | "blockFriend";
    separator?: boolean;
}

interface FriendActionButtonsProps {
    userId: string;
    buttonsToShow: FriendButtonType[];
    dropdownOptions?: DropdownOption[];
    className?: string;
    connectionId: string;
    searchQuery?: string;
    isSearching?: boolean;
}

export const FriendActionButtons = ({ 
    userId, 
    buttonsToShow,
    connectionId,
    dropdownOptions = [],
    className = "flex space-x-2",
    searchQuery = "",
    isSearching = false,
}: FriendActionButtonsProps) => {
    const {
        sendMessage,
        addFriend,
        acceptRequest,
        ignoreRequest,
        cancelRequest,
        removeFriend,
        blockFriend,
        isActionLoading,
        t,
    } = useFriendActions({ searchQuery, isSearching });

    // Check loading states for each action
    const isAddFriendLoading = isActionLoading('addFriend', userId);
    const isAcceptLoading = isActionLoading('acceptRequest', connectionId);
    const isIgnoreLoading = isActionLoading('ignoreRequest', connectionId);
    const isCancelLoading = isActionLoading('cancelRequest', connectionId);
    const isRemoveLoading = isActionLoading('removeFriend', connectionId);
    const isBlockLoading = isActionLoading('blockFriend', userId);

    const buttonMap: Record<FriendButtonType, ReactNode> = {
        message: (
            <ButtonType1 key="message" onClick={() => sendMessage(connectionId)}>
                {t('message')}
            </ButtonType1>
        ),
        addFriend: (
            <ButtonType2 
                key="addFriend" 
                onClick={() => addFriend(userId)}
                disabled={isAddFriendLoading}
            >
                {isAddFriendLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    t('addFriend')
                )}
            </ButtonType2>
        ),
        accept: (
            <ButtonType2 
                key="accept" 
                onClick={() => acceptRequest(connectionId)}
                disabled={isAcceptLoading}
            >
                {isAcceptLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    t('accept')
                )}
            </ButtonType2>
        ),
        ignore: (
            <ButtonType1 
                key="ignore" 
                onClick={() => ignoreRequest(connectionId)}
                disabled={isIgnoreLoading}
            >
                {isIgnoreLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    t('ignore')
                )}
            </ButtonType1>
        ),
        cancelRequest: (
            <ButtonType1 
                key="cancelRequest" 
                onClick={() => cancelRequest(connectionId)}
                disabled={isCancelLoading}
            >
                {isCancelLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    t('cancelRequest')
                )}
            </ButtonType1>
        ),
        removeFriend: (
            <ButtonType1 
                key="removeFriend" 
                onClick={() => removeFriend(connectionId)}
                disabled={isRemoveLoading}
            >
                {isRemoveLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    t('removeFriend')
                )}
            </ButtonType1>
        ),
        blockFriend: (
            <ButtonType4Pill
                key="blockFriend" 
                >
                  Blocked
            </ButtonType4Pill>
        ),
        dropdown: (
            <DropdownMenu key="dropdown">
                <DropdownMenuTrigger asChild>
                    <Button
                        className="cursor-pointer bg-surface-default border-0 shadow-none text-text-primary p-1"
                        variant="outline"
                        aria-label="Open menu"
                        size="icon-sm"
                        disabled={isRemoveLoading || isBlockLoading}
                    >
                        {(isRemoveLoading || isBlockLoading) ? (
                            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                        ) : (
                            <MoreHorizontalIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-surface-default min-w-[200px]">
                    {dropdownOptions.map((option, index) => {
                        const items = [];
                        
                        if (option.type === "removeFriend") {
                            items.push(
                                <DropdownMenuItem
                                    key="removeFriend"
                                    onSelect={() => removeFriend(connectionId)}
                                    className="font-body-large text-text-primary flex items-center"
                                    disabled={isRemoveLoading}
                                >
                                    {isRemoveLoading ? (
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                    ) : (
                                        <Trash size="32" />
                                    )}
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
                                    disabled={isBlockLoading}
                                >
                                    {isBlockLoading ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <BanIcon />
                                    )}
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