/**
 * Pass-through layout for one circle.
 *
 * Two shells are already applied above this file: `(home)/layout.tsx` supplies
 * the `HomeSidebar` + main-column split, and `circles/layout.tsx` passes it
 * through untouched. Re-declaring either here would mount a second sidebar
 * beside the first.
 *
 * It exists as the segment's extension point — per-circle `generateMetadata`
 * belongs here, the way `(home)/post/[id]/layout.tsx` fetches a post's OG tags.
 * Do not add chrome: the chat, the member screens and the artefact screens each
 * draw their own header, and a shared one here would sit above every one of
 * them.
 */
export default function CircleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
