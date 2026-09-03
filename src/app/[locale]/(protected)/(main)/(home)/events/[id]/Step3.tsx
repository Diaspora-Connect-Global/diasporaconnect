'use client';

import React from 'react';
import { CheckCircle, Clock } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ButtonType2 } from '@/components/custom/button';

interface Step3Props {
  ticketHref?: string;
  waitlistPosition?: number | null;
}

export default function Step3({ ticketHref, waitlistPosition }: Step3Props) {
  const t = useTranslations('home.events.payment.success');

  if (waitlistPosition != null) {
    return (
      <div className="w-full flex flex-col items-center text-center space-y-6">
        <Clock className="w-16 h-16 text-text-brand" />
        <div className="space-y-2">
          <h2 className="text-2xl font-medium text-text-primary">You&apos;re on the waitlist!</h2>
          <p className="text-text-secondary">
            You&apos;re <span className="font-semibold text-text-primary">#{waitlistPosition}</span> on the waitlist.
          </p>
          <p className="text-text-secondary text-sm">
            We&apos;ll notify you automatically if a spot opens up.
          </p>
        </div>
        <Link href="/events" className="text-surface-brand font-medium hover:underline">
          Browse more events
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center text-center space-y-8">
      <CheckCircle className="w-16 h-16 text-text-success" />

      <h2 className="text-2xl font-medium text-text-primary">
        {t('title')}
      </h2>

      {ticketHref ? (
        <Link href={ticketHref} className="w-full max-w-xs">
          <ButtonType2 size="lg" className="w-full">
            {t('viewTicket')}
          </ButtonType2>
        </Link>
      ) : (
        <ButtonType2 size="lg" className="w-full max-w-xs">
          {t('viewTicket')}
        </ButtonType2>
      )}

      <Link
        href="/events"
        className="text-surface-brand font-medium hover:underline focus:outline-none focus:underline"
      >
        {t('browseMore')}
      </Link>
    </div>
  );
}
