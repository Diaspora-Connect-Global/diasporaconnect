import { CircleFrame } from '@/components/circles/shell';

/**
 * Pass-through layout for one circle.
 *
 * Two layouts are already applied above this file: `(home)/layout.tsx` supplies
 * the centred content column, and `circles/layout.tsx` passes it through
 * untouched. Re-declaring either here would nest a second frame inside it.
 *
 * It exists as the segment's extension point — per-circle `generateMetadata`
 * belongs here, the way `(home)/post/[id]/layout.tsx` fetches a post's OG tags.
 * It draws the one frame every circle screen shares (`CircleFrame`: Discover's
 * scroll area and measure, plus the circle's header and section navigation).
 * Each screen still owns its `h1`; the home draws its own hero in place of the
 * compact header.
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
export default async function CircleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="contents [--text-secondary:#666666] dark:[--text-secondary:#9b9b9b]">
      <CircleFrame circleId={id}>{children}</CircleFrame>
    </div>
  );
}
