import { Skeleton } from '@/components/ui/skeleton';
import { FEED_COLUMN_CLASS } from '@/lib/feedColumnLayout';

/**
 * Loading skeleton for the governance rules view.
 *
 * The boundary sits INSIDE `(home)/layout.tsx`, so the real `HomeSidebar` is
 * already on screen — only the main column is mirrored here, the same split
 * `circles/loading.tsx` documents for the index.
 *
 * Two blocks precede the cards because two callouts do: the pinned-rule notice
 * and the "how a vote works" explainer. Reserving their height keeps the first
 * rule card from sliding down the page once the data lands.
 */
export default function CircleGovernanceLoading() {
  return (
    <div className="h-app-inner flex overflow-hidden">
      <div className={FEED_COLUMN_CLASS}>
        {/* Back arrow + title */}
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-5 w-44" />
        </div>

        <div className="flex flex-col gap-4 py-4">
          {/* Intro line */}
          <Skeleton className="h-3 w-3/4" />

          {/* Pinned-rule notice, then the "how a vote works" explainer */}
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />

          {/* Rule cards: a title and five labelled rows each */}
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, index) => (
              <div
                key={index}
                className="flex flex-col gap-2.5 rounded-xl border border-border-subtle px-4 py-3"
              >
                <Skeleton className="h-5 w-40" />
                {[...Array(5)].map((__, row) => (
                  <div key={row} className="flex items-center justify-between gap-4">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
