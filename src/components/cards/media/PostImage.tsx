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
  /** Tiny base64 LQIP from the backend; enables Next/Image blur-up when present. */
  blurDataUrl?: string;
}

/**
 * Post image rendered through Next/Image so we get automatic WebP/AVIF,
 * responsive srcset, and lazy loading — replacing the previous plain `<img>`.
 *
 * While the bitmap decodes it shows a shimmer (or a backend `blurDataUrl`
 * blur-up when available) so the card never flashes blank — the Facebook/
 * Instagram loading treatment. Falls back to a neutral tile if the image fails.
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
  blurDataUrl,
}: PostImageProps) {
  const [errored, setErrored] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (errored || !src) {
    return (
      <div className="w-full h-full min-h-[6rem] flex items-center justify-center bg-surface-alt text-text-tertiary text-xs">
        {alt || 'image'}
      </div>
    );
  }

  // Shimmer shown until the image decodes (skipped when a blur-up is available).
  const shimmer =
    !loaded && !blurDataUrl ? (
      <div className="absolute inset-0 bg-surface-alt animate-pulse" aria-hidden />
    ) : null;

  const blurProps = blurDataUrl
    ? ({ placeholder: 'blur', blurDataURL: blurDataUrl } as const)
    : {};

  if (fit === 'contain') {
    return (
      <span className="relative block w-full">
        {shimmer}
        <Image
          src={src}
          alt={alt}
          width={0}
          height={0}
          sizes={sizes ?? '(max-width: 768px) 100vw, 600px'}
          className={`w-full h-auto object-contain transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          {...blurProps}
        />
      </span>
    );
  }

  return (
    <>
      {shimmer}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes ?? '(max-width: 768px) 50vw, 300px'}
        className={`object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        {...blurProps}
      />
    </>
  );
}
