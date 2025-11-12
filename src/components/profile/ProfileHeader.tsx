import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tier, UserBadge } from "../custom/userBadge";
import { PencilSimpleIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { useState } from "react";
import CustomDialog from "../custom/customDialog";
import FriendListModal from "./FriendListModal";
import { useTranslations } from "next-intl";
import { FriendType, TypeOfFriend } from "../friends/TypeOfFriend";
import { DUMMY_USERS } from "@/data/users";

interface ProfileHeaderProps {
  userId: string;
  friendType?: FriendType;
  showFriendActions?: boolean;
  onEditAvatar?: () => void;
}

export function ProfileHeader({
  userId,
  friendType,
  showFriendActions = false,
  onEditAvatar
}: ProfileHeaderProps) {
  const t = useTranslations('friends');
  
  // Get user data based on userId
  const getUserData = (id: string) => {
    return DUMMY_USERS[id as keyof typeof DUMMY_USERS] || {
      userId: id,
      name: 'Unknown User',
      friendCount: 0,
      bio: 'This user profile could not be found.',
      avatarUrl: 'https://i.pravatar.cc/150?img=50',
      friendType: 'stranger' as FriendType,
    };
  };

  const userData = getUserData(userId);
  
  const initials = userData.name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const [friendList, setFriendListOpen] = useState(false);

  return (
    <Card className="lg:min-h-[10rem] p-1">
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          {/* Avatar with Edit Icon */}
          <div className="relative group">
            <Avatar className="h-25 w-25 ring-4 ring-background">
              <AvatarImage src={userData.avatarUrl} alt={userData.name} />
              <AvatarFallback className="text-4xl">{initials}</AvatarFallback>
            </Avatar>

            {/* Edit Icon (Bottom-Right, Overlap) */}
            {!showFriendActions && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="absolute bottom-0 right-0 flex items-center justify-center bg-surface-brand h-6 w-6 rounded-full transition-all group-hover:scale-110 shadow-md cursor-pointer"
                      onClick={onEditAvatar}
                    >
                      <PencilSimpleIcon size={32} className="h-3.5 w-3.5 text-text-white" />
                      <span className="sr-only">{t('editProfilePicture')}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('changeProfilePicture')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* User Info */}
          <div className="mt-auto">
            <div className="flex items-center  space-x-2">
              <h1 className=" text-text-primary heading-large">{userData.name}</h1>
              <UserBadge tier={userData.tier as Tier} size="sm" />
            </div>
            <div
              onClick={() => setFriendListOpen(!showFriendActions)}
              className="flex items-center space-x-1 text-text-brand cursor-pointer"
            >
              <UsersThreeIcon size={20} />
              <p className="label-large">{userData.friendCount} {t('friends')}</p>
            </div>
          </div>
        </div>

        <p className="mt-2 text-sm">{userData.bio}</p>

        <div className="flex items-end justify-end">
          {/* Show TypeOfFriend component if friendType is provided and showFriendActions is true */}
          {showFriendActions && friendType && (
            <TypeOfFriend
              userId={userId}
              type={friendType}
            />
          )}
        </div>
      </CardContent>

      <CustomDialog
        contentClassName="min-w-[100vw] h-[100vh]"
        title={t('friendList')}
        open={friendList}
        onOpenChange={() => setFriendListOpen(false)}
        showFooter={false}
      >
        <FriendListModal onClose={() => setFriendListOpen(false)} />
      </CustomDialog>
    </Card>
  );
}