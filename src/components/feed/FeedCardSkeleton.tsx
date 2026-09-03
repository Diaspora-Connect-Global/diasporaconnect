'use client';

/**
 * Placeholder shown below the feed while the next page is fetching.
 *
 * Holds layout space close to the average rendered card height (~480px) so
 * the next-page paint slides in seamlessly instead of pushing the list
 * down when the spinner unmounts. Two of these are mounted by the home
 * feed at the loadMore boundary.
 *
 * Pure CSS pulse — no JS work, no observers, no images. Cheaper to render
 * than the real card and stable in size, which is the whole point.
 */
export function FeedCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="mb-2 rounded-lg border border-border-subtle bg-surface-default p-4"
    >
      {/* Author row */}
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-full bg-surface-subtle animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 rounded bg-surface-subtle animate-pulse" />
          <div className="h-3 w-1/5 rounded bg-surface-subtle animate-pulse" />
        </div>
      </div>

      {/* Text */}
      <div className="space-y-2 mb-3">
        <div className="h-3 w-11/12 rounded bg-surface-subtle animate-pulse" />
        <div className="h-3 w-9/12 rounded bg-surface-subtle animate-pulse" />
      </div>

      {/* Media placeholder — matches the typical 4:5 portrait shot */}
      <div className="w-full aspect-[4/5] rounded-md bg-surface-subtle animate-pulse mb-3" />

      {/* Engagement row */}
      <div className="flex gap-4">
        <div className="h-4 w-12 rounded bg-surface-subtle animate-pulse" />
        <div className="h-4 w-12 rounded bg-surface-subtle animate-pulse" />
        <div className="h-4 w-12 rounded bg-surface-subtle animate-pulse" />
      </div>
    </div>
  );
}
