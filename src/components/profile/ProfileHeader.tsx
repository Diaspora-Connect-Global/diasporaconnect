// components/ProfileHeader.tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

interface ProfileHeaderProps {
  data: {
    name: string;
    friendCount: number;
    bio: string;
    avatarUrl?: string;
  };
}

export function ProfileHeader({ data }: ProfileHeaderProps) {
  const initials = data.name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase();

  return (
    <Card className=" lg:h-[14rem]">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={data.avatarUrl} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{data.name}</h1>
            <p className="text-muted-foreground">{data.friendCount} friends</p>
            <p className="mt-2 text-sm">{data.bio}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}