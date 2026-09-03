/**
 * Pass-through layout for the Circles route.
 *
 * `circles/` sits inside the `(home)` route group, so the sidebar shell from
 * `(home)/layout.tsx` (the `HomeSidebar` + main column split) is ALREADY applied
 * to everything here. Re-declaring that shell in this file would mount
 * `HomeSidebar` twice and render two 20vw sidebars side by side on desktop.
 *
 * This file therefore only exists as the segment's extension point — the same
 * shape as `(home)/post/[id]/layout.tsx`, which likewise returns `children`
 * untouched and adds metadata rather than chrome. Add route-level `metadata` /
 * `generateMetadata` here when the Circles pages need it; do not re-add the
 * sidebar.
 */
export default function CirclesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
