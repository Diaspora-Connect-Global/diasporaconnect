import { Skeleton } from '@/components/ui/skeleton';
import { FEED_COLUMN_CLASS } from '@/lib/feedColumnLayout';

/**
 * Loading skeleton for "Create a Circle".
 *
 * Sits inside `(home)/layout.tsx`, so the sidebar is already on screen — only
 * the form column is mirrored here.
 */
export default function CreateCircleLoading() {
  return (
    <div className="h-app-inner flex overflow-hidden">
      <div className={FEED_COLUMN_CLASS}>
        <div className="mx-auto w-full max-w-md">
          {/* Back control */}
          <Skeleton className="mb-4 size-9 rounded-full" />

          {/* Title + subtitle */}
          <div className="mb-6 flex flex-col items-center gap-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>

          {/* Circle name */}
          <div className="mb-6 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>

          {/* Banner */}
          <div className="mb-6 space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-32 w-full rounded-md" />
          </div>

          {/* Two questions, each a heading + help line + radio cards */}
          {[0, 1].map((i) => (
            <div key={i} className="mb-6 space-y-3">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-3 w-64" />
              <Skeleton className="h-[74px] w-full rounded-lg" />
              <Skeleton className="h-[74px] w-full rounded-lg" />
            </div>
          ))}

          {/* Note callout + submit */}
          <Skeleton className="mb-6 h-16 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
