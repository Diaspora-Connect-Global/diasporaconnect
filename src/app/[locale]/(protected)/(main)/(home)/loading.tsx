import { Skeleton } from "@/components/ui/skeleton";
import { FEED_COLUMN_CLASS } from "@/lib/feedColumnLayout";

export default function HomeLoading() {
  return (
    <div className="mx-auto lg:flex items-center justify-center min-h-full">
      {/* Sidebar Skeleton - Hidden on mobile */}
      <div className="hidden lg:block lg:sticky lg:w-[20vw] top-[4rem] h-full scrollbar-hide">
        <div className="p-4 space-y-4">
          {/* Sidebar items */}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="min-w-0">
        <div className="h-app-inner flex overflow-hidden">
          {/* Main Feed Skeleton */}
          <div className={FEED_COLUMN_CLASS}>
            {/* Discover Section Header */}
            <div className="flex justify-between mb-4 shrink-0">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>

            {/* Communities Carousel Skeleton */}
            <div className="relative mb-6">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 shrink-0">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex-none">
                    <div className="w-[280px] rounded-lg border border-border-default p-4">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-20 mb-4" />
                      <Skeleton className="h-9 w-full rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feed Posts Skeleton */}
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="mb-2 rounded-lg border border-border-default p-4">
                  {/* Post Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-8 w-16 rounded-md" />
                  </div>

                  {/* Post Content */}
                  <div className="space-y-2 mb-3">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>

                  {/* Post Images - Conditional based on index */}
                  {i === 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <Skeleton className="h-32 w-full rounded-md" />
                      <Skeleton className="h-32 w-full rounded-md" />
                      <Skeleton className="h-32 w-full rounded-md" />
                    </div>
                  )}
                  {i === 1 && (
                    <Skeleton className="h-48 w-full rounded-md mb-3" />
                  )}

                  {/* Post Actions */}
                  <div className="flex items-center gap-4 pt-3 border-t border-border-default">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar (People You May Know) Skeleton - Hidden on mobile */}
          <div className="hidden lg:block min-w-0 overflow-y-auto py-4 px-4">
            <div className="space-y-4">
              <Skeleton className="h-6 w-40 mb-4" />
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 pb-4">
                  <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}