import { ButtonType1, ButtonType2 } from "../custom/button";
import { Tier, UserBadge } from "../custom/userBadge";
import Image from "next/image";
import { FC } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { BanIcon, MoreHorizontalIcon } from "lucide-react";
import { Trash } from "iconsax-reactjs";

type FriendStatus =
    | "all-friends"
    | "suggested"
    | "request-received"
    | "request-sent"
    | "stranger";

interface FriendsCardProps {
    /** User data */
    name: string;
    imageSrc: string;
    mutualConnections?: number;
    tier: Tier;

    /** Current relationship status */
    status: FriendStatus;

    /** Action callbacks – only the ones that make sense for the current status */
    onMessage?: () => void;
    onAddFriend?: () => void;
    onAccept?: () => void;
    onIgnore?: () => void;
    onCancelRequest?: () => void;
    onRemoveFriend?: () => void;
    onBlockFriend?: () => void;
}

/**
 * Renders the correct button(s) and wires them to the supplied callbacks.
 */
const renderActions = (
    status: FriendStatus,
    callbacks: Pick<
        FriendsCardProps,
        "onMessage" | "onAddFriend" | "onAccept" | "onIgnore" | "onCancelRequest" | "onRemoveFriend" | "onBlockFriend"
    >
) => {
    const {
        onMessage,
        onAddFriend,
        onAccept,
        onIgnore,
        onCancelRequest,
        onRemoveFriend,
        onBlockFriend,
    } = callbacks;

    switch (status) {
        case "all-friends":
            return (
                <>
                    <ButtonType1 onClick={onMessage}>Message</ButtonType1>

                    <DropdownMenu >
                        <DropdownMenuTrigger asChild>
                            <Button className='cursor-pointer bg-surface-default border-0 shadow-none text-text-primary p-1' variant="outline" aria-label="Open menu" size="icon-sm">
                                <MoreHorizontalIcon className="w-4 h-4 sm:w-5 sm:h-5" /> {/* Smaller icon on mobile */}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className='bg-surface-default min-w-[200px]'> {/* Wider menu for touch targets */}
                            <DropdownMenuItem onSelect={onRemoveFriend} className='font-body-large text-text-primary flex items-center'>
                                <Trash
                                    size="32"
                                />
                                <span>Remove friend</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={onBlockFriend} className='font-body-large flex items-center'>
                                <BanIcon />
                                <span>Block friend</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </>

            )

        case "suggested":
        case "stranger":
            return <ButtonType2 onClick={onAddFriend}>Add friend</ButtonType2>;

        case "request-received":
            return (
                <>
                    <ButtonType2 onClick={onAccept}>Accept</ButtonType2>
                    <ButtonType1 onClick={onIgnore}>Ignore</ButtonType1>
                </>
            );

        case "request-sent":
            return (
                <ButtonType1 onClick={onCancelRequest}>Cancel request</ButtonType1>
            );

        default:
            return null;
    }
};

const FriendsCard: FC<FriendsCardProps> = ({
    name,
    imageSrc = "https://github.com/shadcn.png",
    mutualConnections,
    tier = "starter",
    status,
    onMessage,
    onAddFriend,
    onAccept,
    onIgnore,
    onCancelRequest,
    onRemoveFriend,
    onBlockFriend,
}) => {
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
                        <span className="font-body-large text-text-primary text-sm">
                            {name}
                        </span>
                        {tier && <UserBadge tier={tier} size="sm" />}
                    </div>

                    {mutualConnections !== undefined && (
                        <span className="text-sm text-text-secondary">
                            {mutualConnections} mutual connection
                            {mutualConnections !== 1 ? "s" : ""}
                        </span>
                    )}
                </div>
            </div>

            {/* ---- Dynamic Action Buttons ---- */}
            <div className="flex space-x-2">
                {renderActions(status, {
                    onMessage,
                    onAddFriend,
                    onAccept,
                    onIgnore,
                    onCancelRequest,
                    onRemoveFriend,
                    onBlockFriend,
                })}
            </div>
        </div>
    );
};

export default FriendsCard;