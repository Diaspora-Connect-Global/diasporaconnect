/**
 * Client-side LQIP (Low-Quality Image Placeholder) generation.
 *
 * Produces a tiny base64 data-URL from an image File/Blob at upload time so it
 * can be sent alongside the upload and later used directly as a Next/Image
 * `blurDataURL` for a smooth blur-up while the full image loads.
 *
 * Uses only the canvas API (no extra dependencies). It draws the decoded image
 * onto a ~32px canvas (longest side 32px, aspect ratio preserved) and exports
 * a WebP data-URL (falling back to JPEG where WebP encoding is unsupported).
 *
 * Designed to NEVER throw into the upload flow: returns `undefined` for
 * non-image inputs, decode/encode failures, or when run outside a browser.
 */

/** Longest-side target for the placeholder bitmap, in pixels. */
const MAX_DIMENSION = 32;

/**
 * Generate a tiny blur-up data-URL for an image file.
 *
 * @param file The image File/Blob being uploaded.
 * @returns A `data:image/webp;base64,...` (or jpeg) string, or `undefined` on
 *          failure / non-image input.
 */
export async function generateBlurDataUrl(file: File | Blob): Promise<string | undefined> {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;
    if (!file || !file.type || !file.type.startsWith('image/')) return undefined;

    const img = await loadImage(file);
    if (!img) return undefined;

    const { width, height } = scaleToFit(img.naturalWidth || img.width, img.naturalHeight || img.height);
    if (!width || !height) return undefined;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    ctx.drawImage(img, 0, 0, width, height);

    // Prefer WebP (smaller); fall back to JPEG if the browser can't encode WebP.
    const webp = canvas.toDataURL('image/webp', 0.5);
    if (webp && webp.startsWith('data:image/webp')) return webp;

    const jpeg = canvas.toDataURL('image/jpeg', 0.5);
    if (jpeg && jpeg.startsWith('data:image/jpeg')) return jpeg;

    return undefined;
  } catch {
    // Never break the upload flow.
    return undefined;
  }
}

/** Decode an image File/Blob into an HTMLImageElement, revoking the blob URL after. */
function loadImage(file: File | Blob): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    img.src = objectUrl;
  });
}

/** Scale (w, h) so the longest side is at most MAX_DIMENSION, preserving ratio. */
function scaleToFit(w: number, h: number): { width: number; height: number } {
  if (!w || !h) return { width: 0, height: 0 };
  const longest = Math.max(w, h);
  if (longest <= MAX_DIMENSION) {
    return { width: Math.round(w), height: Math.round(h) };
  }
  const scale = MAX_DIMENSION / longest;
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  };
}
