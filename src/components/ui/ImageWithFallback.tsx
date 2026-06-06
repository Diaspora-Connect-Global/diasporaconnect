"use client";

import { useCallback, useEffect, useState } from "react";

const DEFAULT_FALLBACK = "/PROFILE.png";

export interface ImageWithFallbackProps
  extends Omit<React.ComponentProps<"img">, "src"> {
  src?: string | null;
  fallbackSrc?: string;
  alt: string;
}

/**
 * Returns the resolved image src plus an onError handler that swaps to the
 * fallback once. Resets when the `src` prop changes.
 */
export function useImageFallback(
  src?: string | null,
  fallbackSrc: string = DEFAULT_FALLBACK
): { src: string | undefined; onError: () => void; failed: boolean } {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const onError = useCallback(() => {
    setFailed(true);
  }, []);

  const resolved = failed ? fallbackSrc : src ?? fallbackSrc;

  return { src: resolved, onError, failed };
}

export function ImageWithFallback({
  src,
  fallbackSrc = DEFAULT_FALLBACK,
  alt,
  ...props
}: ImageWithFallbackProps): React.JSX.Element {
  const { src: resolvedSrc, onError } = useImageFallback(src, fallbackSrc);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={resolvedSrc} alt={alt} onError={onError} {...props} />
  );
}
