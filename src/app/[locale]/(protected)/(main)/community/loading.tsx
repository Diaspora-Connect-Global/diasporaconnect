import { Skeleton } from "@/components/ui/skeleton";

export default function CommunityLoading() {
  return (
    <div className="mx-2 md:mx-[15%] overflow-auto scrollbar-hide h-app-inner pb-1">
      {/* My Community Section */}
      <div className="my-5">
        <Skeleton className="h-8 w-48" />
      </div>

      <div className="bg-surface-default rounded-md p-6 overflow-auto scrollbar-hide max-h-[300px]">
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <div 
              key={index} 
              className="flex items-start gap-4 p-4 rounded-lg border border-border-default"
            >
              {/* Community Icon */}
              <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
              
              {/* Community Info */}
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>

              {/* Action Button */}
              <Skeleton className="h-9 w-24 rounded-md shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Discover More Section */}
      <div className="my-5">
        <Skeleton className="h-8 w-52" />
      </div>

      <div className="overflow-auto scrollbar-hide grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        {[...Array(6)].map((_, index) => (
          <div 
            key={index} 
            className="bg-surface-default rounded-lg p-5 border border-border-default space-y-4"
          >
            {/* Community Icon */}
            <Skeleton className="h-14 w-14 rounded-lg" />
            
            {/* Community Title */}
            <Skeleton className="h-5 w-3/4" />
            
            {/* Members Count */}
            <Skeleton className="h-4 w-24" />
            
            {/* Description */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            
            {/* Join Button */}
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}