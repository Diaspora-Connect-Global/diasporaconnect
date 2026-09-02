'use client';

import { useState } from 'react';
import { toCdnUrl } from '@/lib/cdn';
import { cn } from '@/lib/utils';

export interface AvatarGroupUser {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export type AvatarGroupSize = 'sm' | 'md' | 'lg';

/**
 * `sm` is the default because it matches the existing stacked-avatar idiom in
 * the app (`size-6` + `border-2 border-surface-default`).
 */
const SIZE_CLASS: Record<AvatarGroupSize, string> = {
  sm: 'size-6 caption-small',
  md: 'size-8 caption-small',
  lg: 'size-10 caption-large',
};

export interface AvatarGroupProps {
  users: AvatarGroupUser[];
  /** Avatars shown before collapsing the rest into a `+N` chip. */
  max?: number;
  size?: AvatarGroupSize;
  className?: string;
}

/**
 * At `sm` the inner circle is only 20px across, so two characters would spill
 * out of it — one initial is all that fits legibly.
 */
function initials(name: string, size: AvatarGroupSize): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0].charAt(0).toUpperCase();
  if (size === 'sm' || parts.length === 1) return first;
  return first + parts[parts.length - 1].charAt(0).toUpperCase();
}

function GroupAvatar({
  user,
  size,
}: {
  user: AvatarGroupUser;
  size: AvatarGroupSize;
}) {
  const [failed, setFailed] = useState(false);
  const src = toCdnUrl(user.avatarUrl);
  const showImage = Boolean(src) && !failed;

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        'border-2 border-surface-default bg-surface-subtle text-text-primary',
        SIZE_CLASS[size],
      )}
    >
      {showImage ? (
        // Plain <img>: these are arbitrary remote avatars rendered at ~24px, so
        // next/image's optimiser buys nothing and its JS-managed loading state
        // flashes the fallback on every mount (see MyAvatar in custom/header).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initials(user.name, size)
      )}
    </span>
  );
}

/**
 * Overlapping avatar stack with a `+N` overflow chip.
 *
 * Every avatar is `aria-hidden`; the full roster is announced once from the
 * container's `aria-label`, so the `+N` chip needs no translated string.
 */
export function AvatarGroup({
  users,
  max = 4,
  size = 'sm',
  className,
}: AvatarGroupProps) {
  if (users.length === 0) return null;

  const cap = Math.max(1, max);
  const visible = users.slice(0, cap);
  const overflow = users.length - visible.length;

  return (
    <div
      role="group"
      aria-label={users.map((u) => u.name).join(', ')}
      className={cn('flex -space-x-2', className)}
    >
      {visible.map((user) => (
        <GroupAvatar key={user.id} user={user} size={size} />
      ))}

      {overflow > 0 && (
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-full',
            'border-2 border-surface-default bg-surface-subtle text-text-primary',
            SIZE_CLASS[size],
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
