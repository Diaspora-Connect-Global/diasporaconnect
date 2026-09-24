"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserBadge } from "../custom/userBadge";
import {
  CameraIcon,
  DotsThreeIcon,
  EyeIcon,
  GearSixIcon,
  LinkSimpleIcon,
  MapPinIcon,
  PencilSimpleIcon,
  ShareNetworkIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { Loader2 } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useRouter as useLocaleRouter } from "@/i18n/navigation";
import CustomDialog from "../custom/customDialog";
import FriendListModal from "./FriendListModal";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FriendType, TypeOfFriend } from "../friends/TypeOfFriend";
import { Profile } from "@/services/gql/profile";
import { mapTrustScoreToTier } from "@/lib/userTier";
import { toCdnUrl } from "@/lib/cdn";
import { countryLookup } from "@/macros/countryLookup";
import { absoluteProfileUrl, profileUrl as profilePath } from "@/lib/profileUrl";

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

const OUTLINE_BUTTON =
  "inline-flex items-center justify-center gap-2 h-10 rounded-xl border border-[#E7ECF5] bg-surface-default text-sm font-medium text-[#1B2A5E] dark:text-text-primary hover:bg-[#F3F6FC] dark:hover:bg-surface-hover transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5FD6] focus-visible:ring-offset-2";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
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
  const tHeader = useTranslations('profile.header');
  const tHome = useTranslations('home.header');
  const searchParams = useSearchParams();
  const router = useRouter();
  const localeRouter = useLocaleRouter();
  const userTier = mapTrustScoreToTier(userData?.trustScore);
  const isOwnProfile = !showFriendActions;

  const initials = (userData?.firstName ?? '')
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const fullName = [userData?.firstName, userData?.middleName, userData?.lastName]
    .filter(Boolean)
    .join(' ');

  const residence = userData?.residenceCountry;
  const residenceName = residence
    ? countryLookup[residence.slice(0, 2).toUpperCase()]?.name || residence
    : '';

  const username = userData?.username ?? null;
  const profileUrl = () =>
    absoluteProfileUrl({ username, userId: userData?.userId ?? userId });

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

  /** "Edit profile" opens the About tab, where every section is editable in place. */
  const openAboutTab = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'about');
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const copyProfileLink = async () => {
    if (await copyText(profileUrl())) toast.success(tHeader('linkCopied'));
    else toast.error(tHeader('copyFailed'));
  };

  const shareProfile = async () => {
    const url = profileUrl();
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: fullName || undefined, url });
        return;
      } catch (err) {
        // The user dismissing the share sheet is not an error worth a fallback.
        if ((err as { name?: string })?.name === 'AbortError') return;
      }
    }
    await copyProfileLink();
  };

  /** The public view of this profile — the same page everyone else sees. */
  const viewAsOthers = () => {
    localeRouter.push(profilePath({ username, userId: userData?.userId ?? userId }));
  };

  return (
    <Card className="gap-0 py-0 rounded-2xl border-[#E7ECF5] shadow-none">
      <CardContent className="p-4 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4 lg:gap-5 min-w-0">
            {/* Avatar with camera button */}
            <div className="relative shrink-0">
              <Avatar className="h-25 w-25 lg:h-28 lg:w-28 ring-4 ring-background">
                <AvatarImage src={toCdnUrl(userData?.avatarUrl) || undefined} alt={fullName || 'Profile'} />
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

              {isOwnProfile && (
                <button
                  type="button"
                  onClick={onEditAvatar}
                  aria-label={t('changeProfilePicture')}
                  title={t('changeProfilePicture')}
                  className="absolute bottom-0.5 right-0.5 flex h-8 w-8 lg:h-9 lg:w-9 items-center justify-center rounded-full bg-[#1F5FD6] text-white ring-[3px] ring-surface-default shadow-sm cursor-pointer transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-[#1F5FD6]/40 focus-visible:ring-4"
                >
                  <CameraIcon weight="fill" className="h-4 w-4 lg:h-[18px] lg:w-[18px]" aria-hidden />
                </button>
              )}
            </div>

            {/* User info */}
            <div className="min-w-0 pt-1 lg:pt-2">
              <div className="flex items-center gap-2">
                <h1 className="text-[#1B2A5E] dark:text-text-primary text-xl sm:text-2xl lg:text-[28px] font-bold leading-tight line-clamp-2 break-words">
                  {fullName}
                </h1>
                {userTier ? <UserBadge tier={userTier} size="md" className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" /> : null}
              </div>
              {username ? (
                <p className="mt-0.5 text-sm text-[#5B6BA8] dark:text-text-secondary">@{username}</p>
              ) : null}

              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                {isOwnProfile ? (
                  <button
                    type="button"
                    onClick={openFriendList}
                    className="inline-flex items-center gap-1.5 text-[#1F5FD6] font-medium cursor-pointer rounded-md hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5FD6]"
                  >
                    <UsersThreeIcon size={20} aria-hidden />
                    <span>{userData?.connectionCount ?? 0} {t('friends')}</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[#1F5FD6] font-medium">
                    <UsersThreeIcon size={20} aria-hidden />
                    <span>{userData?.connectionCount ?? 0} {t('friends')}</span>
                  </span>
                )}
                {residenceName && (
                  <span className="inline-flex items-center gap-1 text-text-secondary">
                    <MapPinIcon size={18} aria-hidden />
                    <span>{residenceName}</span>
                  </span>
                )}
              </div>

              {userData?.bio && (
                <p className="mt-2 text-sm text-text-secondary whitespace-pre-line break-words hidden lg:block">
                  {userData.bio}
                </p>
              )}
            </div>
          </div>

          {/* Bio sits under the avatar row on phones, next to the name on desktop */}
          {userData?.bio && (
            <p className="text-sm text-text-secondary whitespace-pre-line break-words lg:hidden">
              {userData.bio}
            </p>
          )}

          {isOwnProfile && (
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" onClick={openAboutTab} className={`${OUTLINE_BUTTON} px-4`}>
                <PencilSimpleIcon size={18} aria-hidden />
                {tHeader('editProfile')}
              </button>
              <button type="button" onClick={shareProfile} className={`${OUTLINE_BUTTON} px-4`}>
                <ShareNetworkIcon size={18} aria-hidden />
                {tHeader('shareProfile')}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={tHeader('moreActions')}
                    title={tHeader('moreActions')}
                    className={`${OUTLINE_BUTTON} w-10`}
                  >
                    <DotsThreeIcon size={22} weight="bold" aria-hidden />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[220px] rounded-xl p-1.5">
                  <DropdownMenuItem onSelect={copyProfileLink} className="gap-2.5 rounded-lg px-3 py-2 cursor-pointer">
                    <LinkSimpleIcon size={18} aria-hidden />
                    {tHeader('copyProfileLink')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={viewAsOthers} className="gap-2.5 rounded-lg px-3 py-2 cursor-pointer">
                    <EyeIcon size={18} aria-hidden />
                    {tHeader('viewAsOthers')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => localeRouter.push('/settings')}
                    className="gap-2.5 rounded-lg px-3 py-2 cursor-pointer"
                  >
                    <GearSixIcon size={18} aria-hidden />
                    {tHome('settingsPrivacy')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Someone else's profile: connect / message actions instead */}
          {showFriendActions && friendType && (
            <div className="flex items-end justify-end shrink-0">
              <TypeOfFriend
                userId={userId}
                type={friendType}
                connectionId={connectionId}
                onConnectionAction={onConnectionAction}
              />
            </div>
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
