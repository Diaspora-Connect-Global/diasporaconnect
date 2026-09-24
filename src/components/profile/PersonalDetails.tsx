// components/PersonalDetails.tsx
import { Card, CardContent } from "@/components/ui/card";
import { CalendarBlankIcon } from "@phosphor-icons/react";
import { useLocale, useTranslations } from 'next-intl';

interface PersonalDetailsProps {
    data?: string | null; // allow undefined or null
}

export function PersonalDetails({ data }: PersonalDetailsProps) {
    const t = useTranslations('profile.personalDetails');
    const locale = useLocale();

    // Safely parse the date
    let formattedDate = '';
    if (data) {
        const date = new Date(data);
        if (!isNaN(date.getTime())) {
            formattedDate = new Intl.DateTimeFormat(locale, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            }).format(date);
        }
    }

    return (
        <Card className="h-full gap-0 py-0 rounded-2xl border-[#E7ECF5] shadow-none">
            <CardContent className="p-5">
                <h2 className="flex items-center gap-2 text-base font-semibold text-[#1B2A5E] dark:text-text-primary">
                    <CalendarBlankIcon size={20} className="text-[#1F5FD6]" aria-hidden />
                    {t('whenJoined')}
                </h2>
                <p className="mt-2 text-sm text-text-secondary">
                    {formattedDate ? (
                        <time dateTime={data ?? undefined}>{formattedDate}</time>
                    ) : (
                        t('joinedUnknown')
                    )}
                </p>
            </CardContent>
        </Card>
    );
}
