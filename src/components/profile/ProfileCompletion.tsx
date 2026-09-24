// components/ProfileCompletion.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";
import { ArrowRightIcon, UserIcon } from "@phosphor-icons/react";
import { useTranslations } from 'next-intl';

interface ProfileCompletionProps {
    percentage: number | undefined;

    onCompleteProfile?: () => void;
}

export function ProfileCompletion({ percentage, onCompleteProfile }: ProfileCompletionProps) {
    const t = useTranslations('profile.profileCompletion');
    const [progress, setProgress] = useState(0)
    const value = percentage ?? 0;

    useEffect(() => {
        const timer = setTimeout(() => setProgress(value), 500)
        return () => clearTimeout(timer)
    }, [value])

    return (
        <Card className="h-full gap-0 py-0 rounded-2xl border-[#E7ECF5] shadow-none">
            <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="flex items-center gap-2 text-base font-semibold text-[#1B2A5E] dark:text-text-primary">
                        <UserIcon size={20} className="text-[#1F5FD6]" aria-hidden />
                        {t('title')}
                    </h2>
                    <span className="text-xs text-text-secondary whitespace-nowrap">
                        {value}% {t('complete')}
                    </span>
                </div>
                <Progress
                    value={progress}
                    aria-label={t('title')}
                    className="mt-4 h-2 w-full bg-[#EEF2F8] dark:bg-surface-subtle [&>div]:bg-text-success [&>div]:rounded-full"
                />
                {value < 100 && onCompleteProfile && (
                    <button
                        type="button"
                        onClick={onCompleteProfile}
                        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#1F5FD6] cursor-pointer rounded-md hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5FD6]"
                    >
                        {t('completeYourProfile')}
                        <ArrowRightIcon size={16} aria-hidden />
                    </button>
                )}
            </CardContent>
        </Card>
    );
}
