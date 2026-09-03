import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoadingSkeleton() {
  return (
    <div className="lg:flex space-x-5 my-2 mx-2">
      {/* Left Column */}
      <div className="lg:w-[50vw] space-y-2">
        {/* Profile Header Skeleton */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <Skeleton className="w-20 h-20 rounded-full flex-shrink-0" />
            
            <div className="flex-1 space-y-3">
              {/* Name */}
              <Skeleton className="h-6 w-48" />
              
              {/* Username */}
              <Skeleton className="h-4 w-32" />
              
              {/* Action buttons */}
              <div className="flex gap-2 mt-4">
                <Skeleton className="h-10 w-32 rounded-full" />
                <Skeleton className="h-10 w-32 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Skeleton */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="flex border-b gap-2 p-2">
            <Skeleton className="h-12 w-24 rounded-t" />
            <Skeleton className="h-12 w-24 rounded-t" />
            <Skeleton className="h-12 w-24 rounded-t" />
          </div>
          
          {/* Content area */}
          <div className="p-6 space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="lg:w-[25vw] space-y-2 mb-4 mt-2 lg:mt-0">
        {/* Personal Details Skeleton */}
        <div className="bg-white rounded-lg p-6 shadow-sm space-y-4">
          <Skeleton className="h-5 w-32 mb-4" />
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>

        {/* Trust Score Skeleton */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <Skeleton className="h-5 w-28 mb-4" />
          
          {/* Circular progress */}
          <div className="flex justify-center my-6">
            <Skeleton className="w-32 h-32 rounded-full" />
          </div>
          
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      </div>
    </div>
  );
}