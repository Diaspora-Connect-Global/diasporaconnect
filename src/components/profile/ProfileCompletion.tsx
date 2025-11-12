// components/ProfileCompletion.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useTranslations } from 'next-intl';

interface ProfileCompletionProps {
    percentage: number;
    
    onCompleteProfile?: () => void;
}

export function ProfileCompletion({ percentage, onCompleteProfile }: ProfileCompletionProps) {
    const t = useTranslations('profile.profileCompletion');
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        const timer = setTimeout(() => setProgress(percentage), 500)
        return () => clearTimeout(timer)
    }, [percentage])

    return (
        <Card className="h-full ">
            <CardContent className=" h-full flex flex-col">
                <h2 className="text-lg font-semibold ">{t('title')}</h2>
                <div className="flex-1 min-h-0 flex flex-col justify-between">
                    <div className="space-y-2">
                        <Progress value={progress} className="w-full [&>div]:bg-text-success [&>div]:rounded-2xl" />
                        <div className="flex items-center justify-between">
                            <span className="text-sm">{percentage}% {t('complete')}</span>
                        </div>
                    </div>
                    <div
                        onClick={onCompleteProfile}
                        className="flex items-center justify-between cursor-pointer text-text-brand mt-2 pt-2  border-border-subtle"
                    >
                        <p className="text-sm">{t('completeProfile')}</p>
                        <ChevronRight className="text-text-brand w-4 h-4" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}