import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { ButtonType2 } from "@/components/custom/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tier, UserBadge } from "../custom/userBadge";
import { PencilSimpleIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { Loader2 } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import CustomDialog from "../custom/customDialog";
import FriendListModal from "./FriendListModal";
import { useTranslations } from "next-intl";
import { FriendType, TypeOfFriend } from "../friends/TypeOfFriend";
import { Profile } from "@/services/gql/profile";
import { mapTrustScoreToTier } from "@/lib/userTier";

interface UserData {
  name: string;
  avatarUrl?: string;
  tier?: Tier;
  friendCount?: number;
  bio?: string;
}

interface ProfileHeaderProps {
  userId: string;
  userData: Profile | undefined;
  friendType?: FriendType;
  showFriendActions?: boolean;
  onEditAvatar?: () => void;
  /** When true, shows a loader overlay on the avatar (e.g. while profile picture is uploading). */
  avatarUploading?: boolean;
  connectionId: string;
  onConnectionAction?: () => void;
}

export function ProfileHeader({
  userId,
  friendType,
  connectionId,
  userData,
  showFriendActions = false,
  onEditAvatar,
  avatarUploading = false,
  onConnectionAction,
}: ProfileHeaderProps) {
  const t = useTranslations('friends');
  const searchParams = useSearchParams();
  const router = useRouter();
  const userTier = mapTrustScoreToTier(userData?.trustScore);

  const initials = userData?.firstName
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Check if friendList modal should be open based on query param
  const friendListOpen = searchParams.get('m') === 'friends';

  const openFriendList = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('m', 'friends');
    router.push(`?${params.toString()}`);
  };

  const closeFriendList = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('m');
    params.delete('t');
    router.push(`?${params.toString()}`);
  };

  return (
    <Card className="lg:min-h-[10rem] p-1">
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          {/* Avatar with Edit Icon */}
          <div className="relative group">
            <Avatar className="h-25 w-25 ring-4 ring-background">
              <AvatarImage src={userData?.avatarUrl || undefined} alt={userData?.avatarUrl || 'Profile'} />
              <AvatarFallback className="text-4xl">{initials}</AvatarFallback>
            </Avatar>
            {avatarUploading && (
              <div
                className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center ring-4 ring-background"
                aria-hidden
              >
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              </div>
            )}

            {/* Edit Icon (Bottom-Right, Overlap) */}
            {!showFriendActions && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ButtonType2
                      className="absolute bottom-0 right-0 flex items-center justify-center h-6 w-6 rounded-full p-0 min-w-0 transition-all group-hover:scale-110 shadow-md"
                      onClick={onEditAvatar}
                    >
                      <PencilSimpleIcon size={32} className="h-3.5 w-3.5 text-text-white" />
                      <span className="sr-only">{t('editProfilePicture')}</span>
                    </ButtonType2>
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
            <div className="flex items-center space-x-2">
              <h1 className="text-text-primary text-xl sm:text-2xl lg:text-[28px] font-semibold leading-tight line-clamp-2 break-words max-w-full">
                {userData?.firstName} {userData?.middleName} {userData?.lastName}
              </h1>
              {userTier ? <UserBadge tier={userTier} size="md" className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" /> : null}
            </div>
            <div
              onClick={() => !showFriendActions && openFriendList()}
              className="flex items-center space-x-1 text-text-brand cursor-pointer"
            >
              <UsersThreeIcon size={20} />
              <p className="label-medium">{userData?.connectionCount} {t('friends')}</p>
            </div>
          </div>
        </div>

        <p className="mt-2 text-sm">{userData?.bio}</p>

        <div className="flex items-end justify-end">
          {/* Show TypeOfFriend component if friendType is provided and showFriendActions is true */}
          {showFriendActions && friendType && (
            <TypeOfFriend
              userId={userId}
              type={friendType}
              connectionId={connectionId}
              onConnectionAction={onConnectionAction}
            />
          )}
        </div>
      </CardContent>

      <CustomDialog
        contentClassName="min-w-[100dvw] h-[100dvh]"
        title={t('friendList')}
        open={friendListOpen}
        onOpenChange={closeFriendList}
        showFooter={false}
      >
        <FriendListModal onClose={closeFriendList} />
      </CustomDialog>
    </Card>
  );
}
