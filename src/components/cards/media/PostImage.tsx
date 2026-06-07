'use client';

import Image from 'next/image';
import { useState } from 'react';

interface PostImageProps {
  src: string;
  alt: string;
  /**
   * `cover` fills a sized parent (grid cells with a fixed height / aspect-square).
   * `contain` sizes responsively to the image's intrinsic ratio (single image),
   * capped by any `max-h-*` passed in `className`.
   */
  fit?: 'cover' | 'contain';
  className?: string;
  /** Responsive `sizes` hint for srcset selection. */
  sizes?: string;
}

/**
 * Post image rendered through Next/Image so we get automatic WebP/AVIF,
 * responsive srcset, and lazy loading — replacing the previous plain `<img>`.
 * Falls back to a neutral placeholder tile if the bitmap fails to load.
 *
 * `cover` mode uses `fill` and requires a positioned, sized parent (the grid
 * cells already provide one). `contain` mode uses the documented
 * `width={0} height={0}` responsive pattern so a lone image keeps its intrinsic
 * aspect ratio while still emitting a srcset.
 */
export default function PostImage({
  src,
  alt,
  fit = 'cover',
  className = '',
  sizes,
}: PostImageProps) {
  const [errored, setErrored] = useState(false);

  if (errored || !src) {
    return (
      <div className="w-full h-full min-h-[6rem] flex items-center justify-center bg-surface-alt text-text-tertiary text-xs">
        {alt || 'image'}
      </div>
    );
  }

  if (fit === 'contain') {
    return (
      <Image
        src={src}
        alt={alt}
        width={0}
        height={0}
        sizes={sizes ?? '(max-width: 768px) 100vw, 600px'}
        className={`w-full h-auto object-contain ${className}`}
        onError={() => setErrored(true)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes ?? '(max-width: 768px) 50vw, 300px'}
      className={`object-cover ${className}`}
      onError={() => setErrored(true)}
    />
  );
}
