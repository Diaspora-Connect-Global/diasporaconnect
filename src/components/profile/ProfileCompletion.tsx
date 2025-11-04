// components/ProfileCompletion.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

interface ProfileCompletionProps {
    data: {
        percentage: number;
        joinDate: string;
    };
    onCompleteProfile?: () => void;
}

export function ProfileCompletion({ data, onCompleteProfile }: ProfileCompletionProps) {

    const [progress, setProgress] = useState(0)

    useEffect(() => {
        const timer = setTimeout(() => setProgress(data.percentage), 500)
        return () => clearTimeout(timer)
    }, [data.percentage])
    return (
        <Card className="lg:h-[10.25rem]">
            <CardContent className="space-y-4">
                <h2 className="text-lg font-semibold ">Profile completion</h2>
                <div className="space-y-1">
                    <Progress value={progress} className="w-full " />
                    <div className="flex items-center justify-between">
                        <span className="text-sm">{data.percentage}% complete</span>
                    </div>
                </div>
                <div onClick={onCompleteProfile} className="flex items-center justify-between cursor-pointer text-text-brand">
                    <p> Complete profile</p>
                    <ChevronRight className="text-text-brand" />
                </div>
            </CardContent>
        </Card>
    );
}