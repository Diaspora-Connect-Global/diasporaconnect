// components/PersonalDetails.tsx
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from 'next-intl';

interface PersonalDetailsProps {
    data?: string | null; // allow undefined or null
}

export function PersonalDetails({ data }: PersonalDetailsProps) {
    const t = useTranslations('profile.personalDetails');

    // Safely parse the date
    let formattedDate = '';
    if (data) {
        const date = new Date(data);
        if (!isNaN(date.getTime())) {
            formattedDate = new Intl.DateTimeFormat('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            }).format(date);
        }
    }

    return (
        <Card className="h-full">
            <CardContent className="h-full flex flex-col">
                <div className="flex-1 min-h-0 flex flex-col justify-center">
                    <h2 className="text-lg font-semibold mb-2">{t('whenJoined')}</h2>
                    <p className="text-sm text-text-secondary">
                        {formattedDate || t('unknown')}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
