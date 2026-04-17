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
