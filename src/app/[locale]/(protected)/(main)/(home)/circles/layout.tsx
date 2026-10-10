/**
 * Pass-through layout for the Circles route.
 *
 * `circles/` sits inside the `(home)` route group, so the centred content
 * column from `(home)/layout.tsx` is ALREADY applied to everything here.
 * Re-declaring a shell in this file would nest a second frame inside the first.
 *
 * This file therefore only exists as the segment's extension point — the same
 * shape as `(home)/post/[id]/layout.tsx`, which likewise returns `children`
 * untouched and adds metadata rather than chrome. Add route-level `metadata` /
 * `generateMetadata` here when the Circles pages need it; do not add chrome.
 */
export default function CirclesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
