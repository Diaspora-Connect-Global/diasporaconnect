'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function CreatePostLoading() {
  return (
    <div className="lg:w-[60vw] h-app-inner overflow-y-auto scrollbar-hide py-4 flex justify-center mx-auto">
      <div className="w-full max-w-3xl mb-2">
        {/* Main Composer Card Skeleton */}
        <div className="bg-surface-default/80 backdrop-blur-md rounded-2xl border border-border-subtle shadow-xl">
          {/* User Header Skeleton */}
          <div className="p-6 pb-0">
            <div className="flex items-start justify-between mb-6">
              <div className="flex gap-4">
                {/* Avatar Skeleton */}
                <div className="relative">
                  <Skeleton className="w-14 h-14 rounded-full ring-4 ring-primary/20" />
                  <Skeleton className="absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-surface-default" />
                </div>
                
                {/* Visibility Dropdown Skeleton */}
                <div className="flex flex-col gap-1">
                  <Skeleton className="w-32 h-8 rounded-lg" />
                </div>
              </div>

              {/* Post Button Skeleton */}
              <Skeleton className="w-28 h-10 rounded-full" />
            </div>
          </div>

          {/* Text Area Skeleton */}
          <div className="px-6 py-6 space-y-3">
            <Skeleton className="w-3/4 h-4" />
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-5/6 h-4" />
            <Skeleton className="w-2/3 h-4" />
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-4/5 h-4" />
            <Skeleton className="w-1/2 h-4" />
          </div>

          {/* Action Bar Skeleton */}
          <div className="px-6 py-4 bg-surface-subtle/30 border-t border-border-subtle rounded-b-2xl">
            <div className="flex items-center justify-between">
              {/* Left Actions Skeleton */}
              <div className="flex items-center gap-2">
                {/* Mobile - Single button */}
                <div className="md:hidden">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                </div>

                {/* Desktop - Multiple buttons */}
                <div className="hidden md:flex items-center gap-2">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <Skeleton className="w-10 h-10 rounded-lg" />
                </div>

                {/* Secondary actions skeleton */}
                <div className="hidden md:flex items-center gap-2 ml-2 pl-2 border-l border-border-subtle">
                  <Skeleton className="w-9 h-9 rounded-lg" />
                  <Skeleton className="w-9 h-9 rounded-lg" />
                  <Skeleton className="w-9 h-9 rounded-lg" />
                  <Skeleton className="w-9 h-9 rounded-lg" />
                </div>
              </div>

              {/* Character Count Skeleton */}
              <div className="hidden md:flex items-center gap-2">
                <Skeleton className="w-2 h-2 rounded-full" />
                <Skeleton className="w-20 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Pro Tips Section Skeleton */}
        <div className="my-6 p-5 bg-gradient-to-r from-surface-brand/5 to-surface-brand/10 border border-surface-brand/20 rounded-xl">
          <div className="flex items-start gap-4">
            {/* Icon Skeleton */}
            <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
            
            {/* Text Skeleton */}
            <div className="flex-1 space-y-2">
              <Skeleton className="w-24 h-5" />
              <div className="space-y-1.5">
                <Skeleton className="w-full h-3" />
                <Skeleton className="w-5/6 h-3" />
                <Skeleton className="w-3/4 h-3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}