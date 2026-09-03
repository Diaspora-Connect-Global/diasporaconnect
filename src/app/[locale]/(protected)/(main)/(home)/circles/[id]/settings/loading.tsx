import { Skeleton } from '@/components/ui/skeleton';
import { FEED_COLUMN_CLASS } from '@/lib/feedColumnLayout';

/**
 * Loading skeleton for circle settings.
 *
 * The boundary sits INSIDE `(home)/layout.tsx`, so the real `HomeSidebar` is
 * already on screen — only the main column is mirrored here, the same split
 * `circles/loading.tsx` documents for the index.
 *
 * It draws the header row and three section cards so the column does not jump
 * when the data lands. Kept in step with `CircleSettingsScreen` by hand rather
 * than importing it: a route-level `loading.tsx` must not pull in the client
 * component it is standing in for.
 */
export default function CircleSettingsLoading() {
  return (
    <div className="h-app-inner flex overflow-hidden">
      <div className={FEED_COLUMN_CLASS}>
        {/* Back arrow + title */}
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-5 w-24" />
        </div>

        <div className="space-y-4 py-4">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="rounded-lg border border-border-subtle p-4 sm:p-5"
            >
              {/* Section title + description */}
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-2 h-3 w-64" />

              {/* Controls */}
              <div className="mt-4 space-y-3">
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
