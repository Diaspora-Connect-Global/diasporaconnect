'use client';

import { useTranslations } from 'next-intl';
import { ArrowRight, UsersRound } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type { EventNetworkingView } from './useEventNetworking';

/**
 * Networking and Circles tabs. They exist only while networking is available for
 * the event, and they hold no numbers (there is no public summary yet): they say
 * what the feature is and hand over to the networking page.
 */
export default function NetworkingPanel({
  eventId,
  networking,
  variant,
}: {
  eventId: string;
  networking: EventNetworkingView;
  variant: 'networking' | 'circles';
}) {
  const t = useTranslations(`eventPage.panels.${variant}`);
  const joined = networking.participation === 'ACTIVE' || networking.participation === 'PAUSED';
  const note =
    networking.eligibility === 'CONFIRMED'
      ? null
      : networking.eligibility === 'PENDING'
        ? t('pending')
        : networking.eligibility === 'INELIGIBLE'
          ? t('ineligible')
          : t('registerFirst');
  return (
    <section className="space-y-3 rounded-2xl border border-border-subtle bg-surface-default p-5" data-testid={`${variant}-tab`}>
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-info text-text-brand"><UsersRound className="size-5" aria-hidden /></span>
        <div>
          <h2 className="text-lg font-bold text-text-primary">{t('title')}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t('body')}</p>
        </div>
      </div>
      {note && <p className="rounded-lg bg-surface-subtle p-3 text-sm text-text-secondary">{note}</p>}
      <Link
        href={`/events/${eventId}/networking`}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-brand px-5 text-sm font-medium text-text-white"
      >
        {joined ? t('open') : t('join')} <ArrowRight className="size-4" aria-hidden />
      </Link>
    </section>
  );
}
