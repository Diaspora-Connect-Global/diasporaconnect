'use client';

import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ButtonType2 } from '@/components/custom/button';

export default function Step3() {
    const t = useTranslations('home.events.payment.success');
    
    return (
        <div className="w-full flex flex-col items-center text-center space-y-8 ">
            {/* Success Icon */}
            <CheckCircle className="w-16 h-16 text-text-success" />

            {/* Success Message */}
            <h2 className="text-2xl font-medium text-text-primary">
                {t('title')}
            </h2>

            {/* Primary Action */}
            <ButtonType2 size="lg" className="w-full max-w-xs">
                {t('viewTicket')}
            </ButtonType2>

            {/* Secondary Action */}
            <Link
                href="/events"
                className="text-surface-brand font-medium hover:underline focus:outline-none focus:underline"
            >
                {t('browseMore')}
            </Link>
        </div>
    );
}