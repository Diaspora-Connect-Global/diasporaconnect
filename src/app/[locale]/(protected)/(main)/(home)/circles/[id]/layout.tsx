/**
 * Pass-through layout for one circle.
 *
 * Two layouts are already applied above this file: `(home)/layout.tsx` supplies
 * the centred content column, and `circles/layout.tsx` passes it through
 * untouched. Re-declaring either here would nest a second frame inside it.
 *
 * It exists as the segment's extension point — per-circle `generateMetadata`
 * belongs here, the way `(home)/post/[id]/layout.tsx` fetches a post's OG tags.
 * Do not add chrome: the chat, the member screens and the artefact screens each
 * draw their own header, and a shared one here would sit above every one of
 * them.
 *
 * The one thing it does draw is no box at all: `display: contents` wrapper that
 * darkens the secondary text colour for the circle screens. The app-wide
 * `--text-secondary` (#a7a7a7 light, #757575 dark) is about 2.3:1 and 3.9:1
 * against the page background, below the 4.5:1 WCAG 2.2 AA asks of body text,
 * and these screens carry real explanations (rules, hints, dates) in that
 * colour. Custom properties inherit through `display: contents`, so nothing in
 * the layout moves. The fix belongs in the global token; this keeps the circle
 * screens readable until it changes.
 */
export default function CircleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="contents [--text-secondary:#666666] dark:[--text-secondary:#9b9b9b]">
      {children}
    </div>
  );
}
