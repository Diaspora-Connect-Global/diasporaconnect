import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserBadge } from "../custom/userBadge";
import {  PencilSimpleIcon, UsersThreeIcon } from "@phosphor-icons/react";

interface ProfileHeaderProps {
  data: {
    name: string;
    friendCount: number;
    bio: string;
    avatarUrl?: string;
  };
  onEditAvatar?: () => void; // Optional click handler
}

export function ProfileHeader({ data, onEditAvatar }: ProfileHeaderProps) {
  const initials = data.name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2); // Limit to 2 chars

  return (
    <Card className="lg:h-[14rem]">
      <CardContent className="p-4">
        <div className="flex items-start  space-x-4">
          {/* Avatar with Edit Icon */}
          <div className="relative group">
            <Avatar className="h-25 w-25 ring-4 ring-background">
              <AvatarImage src={data.avatarUrl} alt={data.name} />
              <AvatarFallback className="text-lg font-medium">{initials}</AvatarFallback>
            </Avatar>

            {/* Edit Icon (Bottom-Right, Overlap) */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="absolute bottom-0 right-0 flex items-center justify-center bg-surface-brand h-6 w-6 rounded-full transition-all group-hover:scale-110 shadow-md cursor-pointer"
                    onClick={onEditAvatar}
                  >
                    <PencilSimpleIcon size={32} className="h-3.5 w-3.5 text-text-white" />


                    <span className="sr-only">Edit profile picture</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Change profile picture</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* User Info */}
          <div className="mt-auto">
            <div className="flex items-center justify-center space-x-2">
              <h1 className="text-2xl font-bold ">{data.name} </h1>
              <UserBadge tier="starter" size="sm" />
            </div>
            <div className="flex items-center font-label-large justify-center space-x-2 text-text-brand">
              <UsersThreeIcon size={20} />
              <p >{data.friendCount} friends</p>
            </div>
          </div>
        </div>
        <p className="mt-2 text-sm">{data.bio}</p>
      </CardContent>
    </Card>
  );
}