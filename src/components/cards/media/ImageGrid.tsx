'use client';

import React from 'react';
import PostImage from '@/components/cards/media/PostImage';

interface ImageGridProps {
  images: string[];
  /** Alt-text builder, per index. */
  alt: (index: number) => string;
  /** Open the lightbox at the given media index. */
  onOpen: (index: number) => void;
  /**
   * Hover overlay (like/comment buttons) rendered over each cell. Passed as a
   * node so each card keeps its own icon set; the `+N` overflow badge replaces
   * it on the last cell when there are more than 4 images.
   */
  overlay?: React.ReactNode;
  /**
   * Single-image rendering: `contain` (full feed card — letterboxed up to
   * 32rem) or `cover` (compact card — fixed 15rem crop).
   */
  singleVariant?: 'contain' | 'cover';
  /** Optional LQIP lookup by URL for blur-up; falls back to a shimmer. */
  blurFor?: (url: string) => string | undefined;
  /**
   * Optional intrinsic-dimension lookup by URL (mirrors {@link blurFor}). When it
   * returns a width/height for the SINGLE `contain` image, the cell reserves that
   * aspect ratio up front so the card height doesn't shift as the bitmap decodes.
   * Backward-compatible: when absent, the `min-h-[20rem]` placeholder is kept.
   */
  dimsFor?: (url: string) => { width?: number; height?: number } | undefined;
  /**
   * LCP hint: when true the FIRST image cell is rendered with Next/Image
   * `priority` (+ fetchPriority="high"). Used only for the first above-the-fold
   * feed image; all other cells stay lazy.
   */
  priority?: boolean;
}

/**
 * Shared post-image collage: 1 / 2 / 3 / 4+ Facebook-style layouts with a
 * `+N` overflow badge. Extracted from the (previously duplicated) `renderImages`
 * in FeedCardWithReply and FeedCardFiltered so image rendering lives in one
 * place. Uses {@link PostImage} (Next/Image + shimmer/blur-up) for every tile.
 */
export default function ImageGrid({
  images,
  alt,
  onOpen,
  overlay,
  singleVariant = 'contain',
  blurFor,
  dimsFor,
  priority = false,
}: ImageGridProps) {
  if (!images?.length) return null;

  const count = images.length;
  const maxDisplay = 4;
  const excess = count > maxDisplay ? count - maxDisplay : 0;
  const blur = (url: string) => blurFor?.(url);
  const dims = (url: string) => dimsFor?.(url);
  // Only the first tile of the first card gets the LCP priority hint.
  const cellPriority = (i: number) => priority && i === 0;

  return (
    <div className="mb-[1rem] flex flex-col gap-[0.5rem]">
      {count === 1 ? (
        singleVariant === 'cover' ? (
          <div
            className="group relative w-full h-[15rem] rounded-lg overflow-hidden cursor-pointer"
            onClick={() => onOpen(0)}
          >
            <PostImage src={images[0]} alt={alt(0)} fit="cover" blurDataUrl={blur(images[0])} priority={cellPriority(0)} />
            {overlay}
          </div>
        ) : (
          (() => {
            const d = dims(images[0]);
            const hasDims = !!d?.width && !!d?.height && d.width > 0 && d.height > 0;
            // With real dimensions, PostImage reserves the true aspect ratio up
            // front, so the `min-h-[20rem]` fallback is unnecessary (and would
            // fight a short/wide image). Without dimensions, keep `min-h-[20rem]`
            // to reserve layout space so the card height doesn't jump on decode.
            return (
              <div
                className={`group relative w-full ${hasDims ? '' : 'min-h-[20rem] '}max-h-[32rem] rounded-lg overflow-hidden cursor-pointer bg-surface-alt`}
                onClick={() => onOpen(0)}
              >
                <PostImage
                  src={images[0]}
                  alt={alt(0)}
                  fit="contain"
                  className="max-h-[32rem]"
                  blurDataUrl={blur(images[0])}
                  width={d?.width}
                  height={d?.height}
                  priority={cellPriority(0)}
                />
                {overlay}
              </div>
            );
          })()
        )
      ) : count === 2 ? (
        <div className="grid grid-cols-2 gap-[0.5rem]">
          {images.map((src, i) => (
            <div
              key={i}
              className="group relative h-[15rem] rounded-lg overflow-hidden cursor-pointer"
              onClick={() => onOpen(i)}
            >
              <PostImage src={src} alt={alt(i)} fit="cover" blurDataUrl={blur(src)} priority={cellPriority(i)} />
              {overlay}
            </div>
          ))}
        </div>
      ) : count === 3 ? (
        // 1 tall + 2 stacked (FB 3-photo collage).
        <div className="grid grid-cols-2 grid-rows-2 gap-2">
          <div
            className="group relative row-span-2 rounded-lg overflow-hidden cursor-pointer min-h-[10rem]"
            onClick={() => onOpen(0)}
          >
            <PostImage src={images[0]} alt={alt(0)} fit="cover" blurDataUrl={blur(images[0])} priority={cellPriority(0)} />
            {overlay}
          </div>
          <div
            className="group relative aspect-square min-h-0 rounded-lg overflow-hidden cursor-pointer"
            onClick={() => onOpen(1)}
          >
            <PostImage src={images[1]} alt={alt(1)} fit="cover" blurDataUrl={blur(images[1])} />
            {overlay}
          </div>
          <div
            className="group relative aspect-square min-h-0 rounded-lg overflow-hidden cursor-pointer"
            onClick={() => onOpen(2)}
          >
            <PostImage src={images[2]} alt={alt(2)} fit="cover" blurDataUrl={blur(images[2])} />
            {overlay}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-[0.5rem]">
          {images.slice(0, maxDisplay).map((src, i) => (
            <div
              key={i}
              className="group relative h-[15rem] rounded-lg overflow-hidden cursor-pointer"
              onClick={() => onOpen(i === maxDisplay - 1 && excess > 0 ? 0 : i)}
            >
              <PostImage src={src} alt={alt(i)} fit="cover" blurDataUrl={blur(src)} priority={cellPriority(i)} />
              {i === maxDisplay - 1 && excess > 0 ? (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-3xl font-semibold">+{excess}</span>
                </div>
              ) : (
                overlay
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
