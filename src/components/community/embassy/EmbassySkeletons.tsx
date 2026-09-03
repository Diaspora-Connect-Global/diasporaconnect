/**
 * Presentational loading skeletons for the embassy tabs. Dependency-free —
 * plain `animate-pulse` + `bg-surface-subtle` blocks mirroring the app's
 * skeleton style (see `src/components/skeleton/`).
 */

/** Single service card placeholder: circle + two lines + a button bar. */
function ServiceCardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col items-center rounded-xl border border-border-subtle p-4 text-center">
      <span className="mb-3 size-14 rounded-full bg-surface-subtle" />
      <span className="mb-2 h-3 w-3/4 rounded bg-surface-subtle" />
      <span className="mb-3 h-3 w-1/2 rounded bg-surface-subtle" />
      <span className="mt-auto h-7 w-full rounded-lg bg-surface-subtle" />
    </div>
  );
}

/** Grid of service card placeholders matching the Services grid layout. */
export function ServiceGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <ServiceCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Single post-card placeholder: avatar circle + header lines + text lines. */
function FeedItemSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border-subtle p-4">
      <div className="flex items-center gap-3">
        <span className="size-10 flex-shrink-0 rounded-full bg-surface-subtle" />
        <div className="min-w-0 flex-1 space-y-2">
          <span className="block h-3 w-32 rounded bg-surface-subtle" />
          <span className="block h-3 w-20 rounded bg-surface-subtle" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <span className="block h-3 w-full rounded bg-surface-subtle" />
        <span className="block h-3 w-5/6 rounded bg-surface-subtle" />
        <span className="block h-3 w-2/3 rounded bg-surface-subtle" />
      </div>
    </div>
  );
}

/** A few post-card placeholders for the feed list. */
export function FeedListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <FeedItemSkeleton key={i} />
      ))}
    </div>
  );
}

export default { ServiceGridSkeleton, FeedListSkeleton };
