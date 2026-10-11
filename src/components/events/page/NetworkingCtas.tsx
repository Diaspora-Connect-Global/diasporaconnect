'use client';

import { useTranslations } from 'next-intl';
import { CalendarDays, ChevronRight, UserPlus, UsersRound } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { NETWORKING_FEATURES } from '@/lib/networkingFeatures';
import type { EventNetworkingView } from './useEventNetworking';

/**
 * The two networking actions of the rail. Both are shown ONLY when the
 * networking status says the feature is open for this event (signed in, enabled
 * by the organiser, released to this person): otherwise there is nothing real
 * to point at. They go to the networking page, where joining stays an explicit
 * step of its own.
 */
export default function NetworkingCtas({ eventId, networking }: { eventId: string; networking: EventNetworkingView }) {
  const t = useTranslations('eventPage.cta');
  if (!networking.available) return null;
  const href = `/events/${eventId}/networking`;
  const joined = networking.participation === 'ACTIVE' || networking.participation === 'PAUSED';
  const hint =
    joined
      ? t('networkingJoinedSub')
      : networking.eligibility === 'CONFIRMED'
        ? t('networkingSub')
        : networking.eligibility === 'PENDING'
          ? t('networkingPendingSub')
          : networking.eligibility === 'INELIGIBLE'
            ? t('networkingIneligibleSub')
            : t('networkingRegisterSub');
  return (
    <div className="space-y-3" data-testid="networking-ctas">
      <Link
        href={href}
        data-testid="cta-join-networking"
        className="flex min-h-16 items-center gap-3 rounded-2xl bg-surface-brand p-4 text-text-white hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
      >
        <UsersRound className="size-7 shrink-0" strokeWidth={1.5} aria-hidden />
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{joined ? t('networkingOpen') : t('networkingJoin')}</span>
          <span className="block text-xs opacity-90">{hint}</span>
        </span>
      </Link>
      <Link
        href={href}
        data-testid="cta-connect"
        className="flex min-h-16 items-center gap-3 rounded-2xl border border-border-subtle bg-surface-default p-4 hover:border-border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-info text-text-brand"><UserPlus className="size-5" aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-text-primary">{t('connectTitle')}</span>
          <span className="block text-xs text-text-secondary">{t('connectSub')}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-text-secondary" aria-hidden />
      </Link>
      {NETWORKING_FEATURES.meetings && joined && (
        <Link
          href={`/events/${eventId}/schedule`}
          data-testid="cta-schedule"
          className="flex min-h-16 items-center gap-3 rounded-2xl border border-border-subtle bg-surface-default p-4 hover:border-border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-info text-text-brand"><CalendarDays className="size-5" aria-hidden /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-text-primary">{t('scheduleTitle')}</span>
            <span className="block text-xs text-text-secondary">{t('scheduleSub')}</span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-text-secondary" aria-hidden />
        </Link>
      )}
    </div>
  );
}
