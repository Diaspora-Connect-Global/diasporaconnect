import { Skeleton } from '@/components/ui/skeleton';
import { CIRCLE_COLUMN_CLASS } from '@/lib/feedColumnLayout';

/**
 * Loading skeleton for the decision history.
 *
 * The boundary sits INSIDE `(home)/layout.tsx`, so the real `HomeSidebar` is
 * already on screen — only the main column is mirrored here, the same split
 * `circles/loading.tsx` documents for the index.
 *
 * The tall block below the header stands in for the chain-verdict callout, so
 * the table does not jump upward when the verdict lands. Deliberately drawn as
 * a neutral grey block rather than a tinted one: a placeholder must not imply
 * an outcome, least of all on the one element of this screen that carries a
 * verdict about the integrity of the record. The same rule applies to the
 * outcome column — its placeholder is grey, never green.
 */
export default function CircleHistoryLoading() {
  return (
    <div className="h-app-inner flex overflow-hidden">
      <div className={CIRCLE_COLUMN_CLASS}>
        {/* Back arrow + heading + subtitle */}
        <div className="flex shrink-0 items-start gap-2">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>

        <div className="flex flex-col gap-4 py-4">
          {/* Chain verdict callout */}
          <Skeleton className="h-20 w-full rounded-xl" />

          {/* Motions / Membership changes tabs */}
          <Skeleton className="h-9 w-full max-w-sm rounded-full" />

          {/* Column headings */}
          <Skeleton className="h-3 w-full" />

          {/* Rows: motion + proposer, outcome, decided, rules at the time */}
          <div className="flex flex-col gap-4">
            {[...Array(7)].map((_, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
                <Skeleton className="h-3 w-24 shrink-0" />
                <Skeleton className="h-3 w-40 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
