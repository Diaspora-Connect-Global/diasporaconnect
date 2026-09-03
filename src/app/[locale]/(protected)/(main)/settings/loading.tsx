import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Shield, Eye, Globe, Palette } from "lucide-react";

export default function SettingsLoadingSkeleton() {
  return (
    <div className="flex flex-col overflow-auto scrollbar-hide h-app-inner bg-background">
      {/* Main Content */}
      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Notifications Section */}
          <div className="bg-surface-default border border-border-subtle rounded-lg p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-gray-400" />
              <Skeleton className="h-6 w-32" />
            </div>

            <div className="space-y-4">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-surface-default border border-border-subtle rounded-lg p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-gray-400" />
              <Skeleton className="h-6 w-24" />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-72" />
                </div>
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-4 w-56" />
                </div>
                <Skeleton className="h-9 w-24 rounded-md" />
              </div>
            </div>
          </div>

          {/* Privacy Section */}
          <div className="bg-surface-default border border-border-subtle rounded-lg p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-gray-400" />
              <Skeleton className="h-6 w-20" />
            </div>

            <div className="space-y-4">
              {[...Array(2)].map((_, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-44" />
                    <Skeleton className="h-4 w-80" />
                  </div>
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Language Section */}
          <div className="bg-surface-default border border-border-subtle rounded-lg p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-gray-400" />
              <Skeleton className="h-6 w-28" />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-10 w-[180px] rounded-md" />
            </div>
          </div>

          {/* Theme Section */}
          <div className="bg-surface-default border border-border-subtle rounded-lg p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-gray-400" />
              <Skeleton className="h-6 w-20" />
            </div>

            <div className="space-y-4">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-56" />
                  </div>
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}