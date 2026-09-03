import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors the two-column layout of the profile page:
 *   Left  — ProfileHeader card + NavigationTabs card
 *   Right — ProfileCompletion, KYCVerification, PersonalDetails, TrustScore cards
 */
export function ProfileLoadingSkeleton() {
    return (
        <div className="flex flex-col lg:flex-row lg:space-x-5 my-2 space-y-2 lg:space-y-0 h-app-inner mx-2">
            {/* Left column */}
            <div className="lg:w-[50vw] order-1 lg:order-none space-y-2 flex flex-col">
                {/* ProfileHeader skeleton */}
                <Card className="lg:min-h-[10rem] p-1">
                    <CardContent className="p-4">
                        <div className="flex items-start space-x-4">
                            {/* Avatar circle */}
                            <Skeleton className="h-[6.25rem] w-[6.25rem] rounded-full flex-shrink-0" />
                            {/* Name + friend count */}
                            <div className="mt-auto space-y-2 flex-1">
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                        </div>
                        {/* Bio lines */}
                        <div className="mt-3 space-y-2">
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-3/4" />
                        </div>
                    </CardContent>
                </Card>

                {/* NavigationTabs skeleton — desktop only (mirrors hidden lg:block) */}
                <div className="hidden lg:block lg:order-none">
                    <Card className="p-0 mb-6">
                        <CardContent className="p-0">
                            {/* Tab bar */}
                            <div className="flex border-b bg-surface-subtle rounded-t-lg px-2">
                                {[72, 56, 88].map((w, i) => (
                                    <div key={i} className="px-4 py-3">
                                        <Skeleton className={`h-4 w-${w === 72 ? 18 : w === 56 ? 14 : 22}`} style={{ width: w }} />
                                    </div>
                                ))}
                            </div>
                            {/* Tab content area */}
                            <div className="p-4 space-y-3">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-5/6" />
                                <Skeleton className="h-4 w-4/6" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/5" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* NavigationTabs skeleton — mobile only (order-3) */}
            <div className="order-3 lg:hidden">
                <Card className="p-0 mb-6">
                    <CardContent className="p-0">
                        <div className="flex border-b bg-surface-subtle rounded-t-lg px-2">
                            {[72, 56, 88].map((w, i) => (
                                <div key={i} className="px-4 py-3">
                                    <Skeleton style={{ height: 16, width: w }} />
                                </div>
                            ))}
                        </div>
                        <div className="p-4 space-y-3">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                            <Skeleton className="h-4 w-4/6" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Right column — order-2 matches the real layout */}
            <div className="lg:w-[25vw] space-y-2 mb-4 order-2 lg:order-none">
                {/* ProfileCompletion skeleton */}
                <Card className="h-full">
                    <CardContent className="flex flex-col gap-3">
                        <Skeleton className="h-5 w-36" />
                        <Skeleton className="h-2 w-full rounded-2xl" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-32 mt-1" />
                    </CardContent>
                </Card>

                {/* KYCVerification skeleton */}
                <Card className="h-full">
                    <CardContent className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-4 w-4" />
                        </div>
                        <Skeleton className="h-4 w-20" />
                    </CardContent>
                </Card>

                {/* PersonalDetails skeleton */}
                <Card className="h-full">
                    <CardContent className="flex flex-col gap-2">
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="h-4 w-36" />
                    </CardContent>
                </Card>

                {/* TrustScore skeleton */}
                <Card className="h-full p-0">
                    <CardContent className="p-4 flex flex-col gap-3">
                        <Skeleton className="h-5 w-24" />
                        {/* Level gauge placeholder */}
                        <Skeleton className="h-10 w-full rounded-md" />
                        {/* Info banner */}
                        <Skeleton className="h-12 w-full rounded-md" />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
