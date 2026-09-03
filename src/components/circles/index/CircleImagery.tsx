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
  /**
   * Circle name. Supplying it makes the empty banner render the circle's
   * initial instead of a bare grey block.
   *
   * The index card no longer carries a separate avatar, so the banner is the
   * card's only image. A circle that never uploaded one would otherwise be
   * indistinguishable from its neighbour at a glance. Omit `name` where a
   * glyph would be noise — the create-form picker draws its own affordance
   * over the same component.
   */
  name?: string;
  className?: string;
}

export function CircleBanner({ src, name, className }: CircleBannerProps) {
  const { onError, failed } = useImageFallback(src);
  const showImage = Boolean(src) && !failed;

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-surface-subtle',
        className,
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
          alt=""
          onError={onError}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : name ? (
        <span
          // The name is always rendered directly beneath this, so announcing
          // the initial as well would read it twice.
          aria-hidden="true"
          // `text-text-primary` on `surface-subtle`, matching `CircleAvatar` —
          // in dark mode `surface-subtle` (#545454) and `text-secondary`
          // (#757575) are near-identical greys and a tertiary glyph would be
          // invisible on exactly the cards that need it most.
          className="heading-medium absolute inset-0 flex items-center justify-center text-text-primary"
        >
          {circleInitial(name)}
        </span>
      ) : null}
    </div>
  );
}
