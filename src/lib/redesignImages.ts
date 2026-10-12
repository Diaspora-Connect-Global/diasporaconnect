/**
 * Every photo the redesign uses, in one place.
 *
 * These are free-licensed placeholders (Unsplash License; sources and
 * photographers in `public/images/redesign/CREDITS.md`). They are swapped for
 * brand photography before any production release — change the path here and
 * nowhere else. `width`/`height` are the files' intrinsic sizes, for next/image.
 */
export type RedesignImage = { src: string; width: number; height: number };

export const REDESIGN_IMAGES = {
  /** Independence Arch, Accra — More page hero. */
  moreHero: { src: '/images/redesign/independence-arch-wide.webp', width: 1280, height: 902 },
  /** Independence Arch star close-up — Discover hero. */
  discoverHero: { src: '/images/redesign/independence-arch-star.webp', width: 1280, height: 854 },
  /** Home hero (the same Independence Arch photo as the More page, darkened for white text). */
  homeHero: { src: '/images/redesign/independence-arch-wide.webp', width: 1280, height: 902 },
  /** Community hero. */
  communityHero: { src: '/images/redesign/independence-arch-wide.webp', width: 1280, height: 902 },
} as const satisfies Record<string, RedesignImage>;

const cat = (name: string, height = 480): RedesignImage => ({ src: `/images/redesign/cat-${name}.webp`, width: 720, height });

/** Stand-in photo per listing category, used only when the item has no photo of its own. */
export const CATEGORY_PHOTOS = {
  property: cat('property'),
  job: cat('job'),
  service: cat('service', 477),
  product: cat('product'),
  investment: cat('investment', 405),
  event: cat('event'),
  legal: cat('legal'),
} as const satisfies Record<string, RedesignImage>;

export type CategoryPhotoKey = keyof typeof CATEGORY_PHOTOS;

const CIRCLE_COVERS: RedesignImage[] = [cat('team', 472), cat('villa'), cat('markets')];

/** A stable placeholder cover for a circle with no image (same circle, same photo). */
export function circleCoverPlaceholder(seed: string): RedesignImage {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return CIRCLE_COVERS[h % CIRCLE_COVERS.length];
}
