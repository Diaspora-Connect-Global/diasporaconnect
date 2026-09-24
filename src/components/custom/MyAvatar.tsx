'use client';

import Image from 'next/image';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { useUserStore } from '@/store/useUserStore';
import { useImageFallback } from '@/components/ui/ImageWithFallback';

export function MyAvatar() {
  const url = useUserStore((s) => s.user?.avatarUrl);
  const { src: avatarSrc, onError: onAvatarError } = useImageFallback(url, '/PROFILE.png');

  return (
    <Avatar>
      {url ? (
        // Plain <img> so the browser can serve cached images instantly without
        // Radix's JS-managed loading state, which briefly shows the fallback
        // every time this component mounts (e.g. when the dropdown opens).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarSrc}
          alt="Profile"
          className="aspect-square size-full rounded-full object-cover"
          onError={onAvatarError}
        />
      ) : (
        <AvatarFallback>
          <Image width={32} height={32} src="/PROFILE.png" alt="Profile" />
        </AvatarFallback>
      )}
    </Avatar>
  );
}
