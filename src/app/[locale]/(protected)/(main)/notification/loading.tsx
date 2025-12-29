import { Skeleton } from "@/components/ui/skeleton";
import { Check, Settings } from "lucide-react";

export default function NotificationLoadingSkeleton() {
  return (
    <div className="lg:max-w-[63rem] mx-2 lg:mx-auto h-app-inner py-4">
      <div className="h-[30%] lg:h-[20%]">
        {/* Header */}
        <div className="lg:flex justify-between items-center mb-4">
          <Skeleton className="h-8 w-40" />

          <div className="flex items-center gap-4 mt-2 lg:mt-0">
            <div className="flex items-center gap-2 opacity-50">
              <Check size={16} className="text-gray-400" />
              <Skeleton className="h-4 w-20" />
            </div>

            <div className="w-px h-4 bg-border-subtle"></div>

            <div className="flex items-center gap-2 opacity-50">
              <Settings size={16} className="text-gray-400" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <Skeleton className="h-10 w-32 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
          <Skeleton className="h-10 w-24 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
      </div>

      {/* Notification Cards */}
      <div className="bg-surface-default rounded-md lg:p-6 h-[70%] lg:h-[80%] overflow-y-auto scrollbar-hide space-y-3">
        {[...Array(6)].map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-lg p-4 border border-border-subtle"
          >
            <div className="flex items-start gap-3">
              {/* Icon placeholder */}
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />

              <div className="flex-1 space-y-2">
                {/* Title */}
                <Skeleton className="h-5 w-3/4" />

                {/* Description */}
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />

                {/* Time */}
                <Skeleton className="h-3 w-20 mt-2" />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 flex-shrink-0">
                <Skeleton className="w-8 h-8 rounded" />
                <Skeleton className="w-8 h-8 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}