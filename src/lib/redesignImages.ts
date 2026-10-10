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
} as const satisfies Record<string, RedesignImage>;
