import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for the plan screen.
 *
 * The boundary sits inside `(home)/layout.tsx`, so the real `HomeSidebar` is
 * already on screen and only the main column is mirrored here — the same split
 * the sibling `circles/[id]/loading.tsx` documents.
 *
 * The column geometry (`CIRCLE_COLUMN_CLASS`) is inlined rather than imported so
 * this file pulls in nothing but the skeleton primitive; a route-level
 * `loading.tsx` should not drag the client module graph it is standing in for.
 * Keep it in step with `@/lib/feedColumnLayout` by hand.
 *
 * It draws the three bands of the real screen — current plan, the allowance
 * list, the catalogue — so the layout does not jump when the data lands.
 */
const FEED_COLUMN = 'w-full min-w-0 flex-1 lg:max-w-[40vw] mx-4 py-4 flex flex-col';

export default function CirclePlanLoading() {
  return (
    <div className="flex h-app-inner overflow-hidden">
      <div className={FEED_COLUMN}>
        {/* Back arrow + title */}
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </div>

        <div className="flex flex-col gap-6 py-4">
          {/* Current plan card */}
          <Skeleton className="h-40 w-full rounded-2xl" />

          {/* Allowance list */}
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-44" />
            {[...Array(4)].map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-xl" />
            ))}
          </div>

          {/* Catalogue */}
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
