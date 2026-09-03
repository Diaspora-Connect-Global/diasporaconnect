/**
 * Client-side image resize + recompress, run at upload time before the
 * signed-URL PUT.
 *
 * Uploaded images are frequently full-size (~10 MB), which causes slow decode
 * and visible pop-in. This decodes the image, draws it onto a canvas scaled so
 * the longest side is at most `maxDimension`, and re-encodes it as WebP at the
 * requested quality. The same canvas is reused to derive a tiny LQIP blur-up so
 * we avoid a second decode of the file.
 *
 * Reuses the canvas helpers from `./lqip` (`loadImage`, `scaleToFit`).
 *
 * Designed to NEVER throw into the upload flow: on SSR, non-image input,
 * animated GIFs, or any failure it returns the original file unchanged with
 * `width: 0, height: 0`.
 */

import { loadImage, scaleToFit } from './lqip';

/** Longest-side target for the LQIP blur-up bitmap, in pixels. */
const BLUR_DIMENSION = 32;

interface ResizeImageOptions {
  /** Longest-side target in pixels. Images are never upscaled. Default 1600. */
  maxDimension?: number;
  /** WebP encoding quality (0–1). Default 0.8. */
  quality?: number;
}

interface ResizeImageResult {
  /** The resized WebP File, or the original file (as a File) on failure / skip. */
  file: File;
  /** Natural-scaled output width, or 0 when the original was returned unchanged. */
  width: number;
  /** Natural-scaled output height, or 0 when the original was returned unchanged. */
  height: number;
  /** Tiny base64 LQIP blur-up derived from the same canvas (undefined on failure). */
  blurDataUrl?: string;
}

/** Coerce a File | Blob into a File without re-encoding (wraps a Blob if needed). */
function asFile(input: File | Blob, fallbackName: string): File {
  if (input instanceof File) return input;
  return new File([input], fallbackName, {
    type: input.type || 'application/octet-stream',
  });
}

/** Derive a `.webp` file name from an original file/blob name. */
function toWebpName(input: File | Blob): string {
  const original = input instanceof File && input.name ? input.name : 'image';
  const base = original.replace(/\.[^/.]+$/, '');
  return `${base || 'image'}.webp`;
}

/**
 * Resize and recompress an image to WebP.
 *
 * @param file The image File/Blob to optimize.
 * @param opts maxDimension (default 1600) and quality (default 0.8).
 * @returns The optimized `{ file, width, height, blurDataUrl }`. On SSR,
 *          non-image input, animated GIFs, or any failure, returns the original
 *          file (as a File) with `width: 0, height: 0` and no blurDataUrl.
 */
export async function resizeImage(
  file: File | Blob,
  opts?: ResizeImageOptions,
): Promise<ResizeImageResult> {
  const maxDimension = opts?.maxDimension ?? 1600;
  const quality = opts?.quality ?? 0.8;

  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return { file: asFile(file, 'image'), width: 0, height: 0 };
    }
    // Not an image, or an animated GIF (canvas would flatten to a single frame):
    // pass through untouched.
    if (!file || !file.type || !file.type.startsWith('image/') || file.type === 'image/gif') {
      return { file: asFile(file, 'image'), width: 0, height: 0 };
    }

    const img = await loadImage(file);
    if (!img) return { file: asFile(file, 'image'), width: 0, height: 0 };

    const naturalW = img.naturalWidth || img.width;
    const naturalH = img.naturalHeight || img.height;
    if (!naturalW || !naturalH) {
      return { file: asFile(file, 'image'), width: 0, height: 0 };
    }

    // Compute the target size, but never upscale: if the longest side already
    // fits within maxDimension, keep the natural dimensions.
    const longest = Math.max(naturalW, naturalH);
    const { width, height } =
      longest <= maxDimension
        ? { width: naturalW, height: naturalH }
        : scaleToFit(naturalW, naturalH, maxDimension);

    if (!width || !height) {
      return { file: asFile(file, 'image'), width: 0, height: 0 };
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { file: asFile(file, 'image'), width: 0, height: 0 };

    ctx.drawImage(img, 0, 0, width, height);

    // Encode to WebP. Fall back to the original file if the browser can't
    // encode WebP (toBlob returns null or a non-webp type).
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/webp', quality);
    });

    if (!blob || blob.type !== 'image/webp') {
      return { file: asFile(file, 'image'), width: 0, height: 0 };
    }

    const resizedFile = new File([blob], toWebpName(file), { type: 'image/webp' });

    // Derive the LQIP blur-up from the SAME canvas (no second decode).
    let blurDataUrl: string | undefined;
    try {
      const blur = scaleToFit(width, height, BLUR_DIMENSION);
      if (blur.width && blur.height) {
        const blurCanvas = document.createElement('canvas');
        blurCanvas.width = blur.width;
        blurCanvas.height = blur.height;
        const blurCtx = blurCanvas.getContext('2d');
        if (blurCtx) {
          blurCtx.drawImage(canvas, 0, 0, blur.width, blur.height);
          const webp = blurCanvas.toDataURL('image/webp', 0.5);
          if (webp && webp.startsWith('data:image/webp')) {
            blurDataUrl = webp;
          } else {
            const jpeg = blurCanvas.toDataURL('image/jpeg', 0.5);
            if (jpeg && jpeg.startsWith('data:image/jpeg')) blurDataUrl = jpeg;
          }
        }
      }
    } catch {
      // Blur-up is best-effort; never block the optimized upload.
      blurDataUrl = undefined;
    }

    return { file: resizedFile, width, height, blurDataUrl };
  } catch {
    // Never break the upload flow.
    return { file: asFile(file, 'image'), width: 0, height: 0 };
  }
}
