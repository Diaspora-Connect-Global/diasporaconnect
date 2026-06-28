'use client';

import Image from 'next/image';
import { useState } from 'react';

interface AvatarProps {
  /** Avatar URL (e.g. a CDN/GCS profile picture). Falsy → fallback. */
  src?: string | null;
  alt: string;
  /** Square size in px (sets both width and height for the optimizer). */
  size: number;
  /** Display classes (kept verbatim from the call site, e.g. `w-10 h-10 rounded-full ...`). */
  className?: string;
  onClick?: () => void;
  /** Shown when src is empty or fails to load. Local asset by default. */
  fallbackSrc?: string;
}

/**
 * User/entity avatar rendered through Next/Image instead of a raw `<img>`.
 *
 * Why: a raw `<img src="https://cdn.diaspoplug.net/...">` makes the *browser*
 * fetch the CDN host directly, so it breaks for any client whose DNS hasn't
 * resolved the CDN subdomain (e.g. ERR_NAME_NOT_RESOLVED on a stale resolver),
 * and ships the full-size original (often several MB). Routing through
 * Next/Image means the optimizer fetches the source server-side and serves a
 * tiny, resized thumbnail from our own origin — so avatars load for every user
 * regardless of their DNS, and a 10 MB upload becomes a few KB.
 *
 * `className` is passed through unchanged so layout matches the previous markup.
 */
export default function Avatar({
  src,
  alt,
  size,
  className,
  onClick,
  fallbackSrc = '/PROFILE.png',
}: AvatarProps) {
  const [errored, setErrored] = useState(false);
  const resolved = !src || errored ? fallbackSrc : src;

  return (
    <Image
      src={resolved}
      alt={alt}
      width={size}
      height={size}
      sizes={`${size}px`}
      loading="lazy"
      onError={() => setErrored(true)}
      onClick={onClick}
      className={className}
    />
  );
}
