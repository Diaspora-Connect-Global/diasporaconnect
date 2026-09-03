import { Skeleton } from "@/components/ui/skeleton";
import { CIRCLE_COLUMN_CLASS } from "@/lib/feedColumnLayout";

/**
 * Loading skeleton for the Circles index.
 *
 * This boundary sits INSIDE `(home)/layout.tsx`, so the real `HomeSidebar` is
 * already on screen while this renders — unlike `(home)/loading.tsx`, which
 * replaces the whole subtree and therefore has to draw its own sidebar
 * skeleton. Only the main column is mirrored here.
 */
export default function CirclesLoading() {
  return (
    <div className="h-app-inner flex overflow-hidden">
      <div className={CIRCLE_COLUMN_CLASS}>
        {/* "My Circles" heading */}
        <Skeleton className="h-7 w-32 mb-4 shrink-0" />

        {/* Circle banner cards */}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border-default overflow-hidden"
            >
              {/* Banner image */}
              <Skeleton className="h-28 w-full rounded-none" />

              <div className="p-4">
                {/* Avatar overlapping the banner + name */}
                <div className="flex items-start gap-3 -mt-10 mb-3">
                  <Skeleton className="h-14 w-14 rounded-full shrink-0 border-4 border-surface-default" />
                </div>

                {/* Circle name + member count */}
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-3 w-24 mb-4" />

                {/* Status pill row */}
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-14 rounded-full" />
                  <Skeleton className="h-6 w-28 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* "Discover Circles" header + "See all" */}
        <div className="flex justify-between items-center mt-8 mb-4 shrink-0">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-14" />
        </div>

        {/* Discover rows */}
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border-default p-4"
            >
              <div className="flex items-start gap-3 mb-3">
                <Skeleton className="h-11 w-11 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-44" />
                </div>
              </div>
              <Skeleton className="h-9 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
