import { Skeleton } from "@/components/ui/skeleton";

export default function ChatLoading() {
  return (
    <div className="flex w-full lg:w-[80vw] h-app-inner mx-auto">
      {/* Sidebar Skeleton */}
      <div className="w-full md:w-[350px] lg:w-[30vw] px-2 block">
        <div className="bg-surface-default rounded-md h-full p-4">
          {/* Search Bar */}
          <div className="mb-4">
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <Skeleton className="h-9 w-20 rounded-md" />
            <Skeleton className="h-9 w-20 rounded-md" />
          </div>

          {/* Chat List */}
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  {/* Online indicator for some items */}
                  {i % 3 === 0 && (
                    <Skeleton className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface-default" />
                  )}
                </div>

                {/* Chat Info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-40" />
                    {/* Unread badge for some items */}
                    {i % 2 === 0 && (
                      <Skeleton className="h-5 w-5 rounded-full" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area Skeleton */}
      <div className="flex-1 scrollbar-hide w-full lg:w-[50vw] h-app-inner px-2 rounded-md overflow-hidden">
        <div className="bg-surface-default rounded-md h-full flex flex-col">
          {/* Chat Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border-subtle">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 space-y-4 overflow-hidden">
            {/* Received message */}
            <div className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="space-y-2 max-w-[70%]">
                <Skeleton className="h-16 w-64 rounded-2xl rounded-tl-sm" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>

            {/* Sent message */}
            <div className="flex gap-3 justify-end">
              <div className="space-y-2 max-w-[70%] flex flex-col items-end">
                <Skeleton className="h-12 w-48 rounded-2xl rounded-tr-sm" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>

            {/* Received message */}
            <div className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="space-y-2 max-w-[70%]">
                <Skeleton className="h-20 w-72 rounded-2xl rounded-tl-sm" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>

            {/* Sent message */}
            <div className="flex gap-3 justify-end">
              <div className="space-y-2 max-w-[70%] flex flex-col items-end">
                <Skeleton className="h-14 w-56 rounded-2xl rounded-tr-sm" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>

            {/* Received message */}
            <div className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="space-y-2 max-w-[70%]">
                <Skeleton className="h-12 w-44 rounded-2xl rounded-tl-sm" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-border-subtle">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-12 flex-1 rounded-lg" />
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-10 w-20 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}