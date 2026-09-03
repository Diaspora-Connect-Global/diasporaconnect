/**
 * Main feed column on home (`/`), `/feed`, and `/post/[id]`.
 * `flex-1` + `w-full` + `min-w-0` fills width up to `lg:max-w-[40vw]` beside the sidebar.
 */
export const FEED_COLUMN_CLASS =
  'w-full min-w-0 flex-1 lg:max-w-[40vw] overflow-y-auto scrollbar-hide mx-4 py-4 flex flex-col';

/**
 * Post detail (`/post/[id]`): fixed width on large screens so the column does not grow/shrink
 * when the right rail loads or changes intrinsic width. Pair the sibling rail with `lg:flex-1 lg:min-w-0`.
 */
export const FEED_COLUMN_POST_PAGE_CLASS =
  'w-full min-w-0 flex-1 lg:flex-none lg:grow-0 lg:shrink-0 lg:w-[40vw] lg:min-w-[40vw] lg:max-w-[40vw] overflow-x-hidden overflow-y-auto scrollbar-hide mx-4 py-4 flex flex-col';

/**
 * Circles screens (`/circles` and everything under it).
 *
 * Identical to `FEED_COLUMN_CLASS` except it does NOT cap at `lg:max-w-[40vw]`.
 * The `(home)` shell is `lg:flex items-center justify-center`, so a capped
 * column leaves 20vw sidebar + 40vw content as a 60vw block that the shell
 * CENTRES — which reads as the sidebar sitting in the middle of the page rather
 * than at its edge. The feed pages live with that because their column width is
 * a deliberate reading measure; Circles has no such constraint, so letting
 * `flex-1` take the remaining width pins the sidebar to the side where it
 * belongs.
 *
 * Used by every Circles route so the sidebar does not shift position as you
 * move between them.
 */
export const CIRCLE_COLUMN_CLASS =
  'w-full min-w-0 flex-1 overflow-y-auto scrollbar-hide mx-4 py-4 flex flex-col';
