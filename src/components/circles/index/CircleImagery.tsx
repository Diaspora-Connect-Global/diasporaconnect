'use client';

import { useImageFallback } from '@/components/ui/ImageWithFallback';
import { cn } from '@/lib/utils';

/**
 * A circle's avatar and banner.
 *
 * Both fall back to a token-coloured placeholder rather than to
 * `ImageWithFallback`'s default `/PROFILE.png`: that asset is a person
 * silhouette, and a circle is not a person — stretched across a banner it reads
 * as a bug. `useImageFallback` is still the source of the failed/reset
 * behaviour so the "swap once, reset when `src` changes" rule stays in one
 * place.
 *
 * These are plain `<img>` elements, matching `AvatarGroup`: the URLs are
 * arbitrary remote media and `next/image` is configured with narrow
 * `remotePatterns`, so a host outside them would raise rather than degrade.
 */

/** First letter of the circle's name, shown when there is no usable avatar. */
function circleInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

export interface CircleAvatarProps {
  name: string;
  /** Already CDN-rewritten. Falsy renders the initial. */
  src?: string | null;
  /** Size and border utilities, e.g. `size-14 border-4 border-surface-default`. */
  className?: string;
}

export function CircleAvatar({ name, src, className }: CircleAvatarProps) {
  const { onError, failed } = useImageFallback(src);
  const showImage = Boolean(src) && !failed;

  return (
    <span
      // The circle's name is always rendered next to this, so announcing the
      // avatar too would just read the name twice.
      aria-hidden="true"
      className={cn(
        'label-medium inline-flex shrink-0 items-center justify-center overflow-hidden',
        'rounded-full bg-surface-subtle text-text-primary',
        className,
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
          alt=""
          onError={onError}
          className="h-full w-full object-cover"
        />
      ) : (
        circleInitial(name)
      )}
    </span>
  );
}

export interface CircleBannerProps {
  /** Already CDN-rewritten. Falsy or broken leaves the plain surface behind it. */
  src?: string | null;
  className?: string;
}

export function CircleBanner({ src, className }: CircleBannerProps) {
  const { onError, failed } = useImageFallback(src);
  const showImage = Boolean(src) && !failed;

  return (
    <div className={cn('relative w-full bg-surface-subtle', className)}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
          alt=""
          onError={onError}
          sizes="(max-width: 1024px) 100vw, 40vw"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
    </div>
  );
}
