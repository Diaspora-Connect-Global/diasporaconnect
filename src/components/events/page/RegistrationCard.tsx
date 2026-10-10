'use client';

import { useLocale, useTranslations } from 'next-intl';
import { CalendarCheck, CheckCircle2, Clock, Hourglass, Info, Users, XCircle } from 'lucide-react';
import { ButtonType1, ButtonType2 } from '@/components/custom/button';
import { formatInZone } from '@/lib/eventCalendar';
import { REGISTERED_STATES, canStartRegistration, type RegistrationUiState } from '@/lib/eventRegistrationState';
import type { EventPageEvent } from '@/services/gql/eventsM2';

const ICONS: Record<RegistrationUiState, typeof Info> = {
  confirmed: CheckCircle2,
  awaitingPayment: Clock,
  pendingApproval: Hourglass,
  waitlisted: Users,
  rejected: XCircle,
  eventCancelled: XCircle,
  ended: CalendarCheck,
  notYetOpen: Clock,
  closed: Info,
  full: Users,
  open: Info,
};

const TONE: Partial<Record<RegistrationUiState, string>> = {
  confirmed: 'text-text-success',
  rejected: 'text-text-danger',
  eventCancelled: 'text-text-danger',
  awaitingPayment: 'text-text-warning',
  pendingApproval: 'text-text-warning',
};

/**
 * The viewer's registration standing in words, with the one next step.
 * `waitlistPosition` is only known right after registering (the gateway does
 * not expose it later), so it is shown when we have it and never invented.
 */
export default function RegistrationCard({
  event,
  state,
  waitlistPosition,
  signedIn,
  onOpenTab,
}: {
  event: EventPageEvent;
  state: RegistrationUiState;
  waitlistPosition?: number | null;
  signedIn: boolean;
  onOpenTab: (tab: 'register') => void;
}) {
  const t = useTranslations('eventPage.rail');
  const locale = useLocale();
  const Icon = ICONS[state];
  const opens = event.registrationOpensAt ? formatInZone(event.registrationOpensAt, locale, event.timezone) : '';
  const closes = event.registrationClosesAt ? formatInZone(event.registrationClosesAt, locale, event.timezone) : '';
  const closesInFuture = event.registrationClosesAt ? new Date(event.registrationClosesAt).getTime() > Date.now() : false;

  const headline =
    state === 'waitlisted' && waitlistPosition ? t('states.waitlistedPos', { position: waitlistPosition }) : t(`states.${state}`, { date: opens });

  const hint =
    state === 'pendingApproval'
      ? t('hints.pendingApproval')
      : state === 'waitlisted'
        ? t('hints.waitlisted')
        : state === 'awaitingPayment'
          ? t('hints.awaitingPayment')
          : state === 'rejected'
            ? t('hints.rejected')
            : (state === 'open' || state === 'full') && closes && closesInFuture
              ? t('hints.closesOn', { date: closes })
              : null;

  return (
    <section aria-labelledby="registration-card-title" data-testid="registration-card" data-state={state} className="space-y-3 rounded-2xl border border-border-subtle bg-surface-default p-4">
      <h2 id="registration-card-title" className="text-base font-semibold text-text-primary">{t('title')}</h2>
      <p className={`flex items-start gap-2 text-sm font-medium ${TONE[state] ?? 'text-text-primary'}`}>
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span data-testid="registration-headline">{headline}</span>
      </p>
      {hint && <p className="text-sm text-text-secondary">{hint}</p>}
      {event.requiresApproval && canStartRegistration(state) && <p className="text-xs text-text-secondary">{t('hints.needsApproval')}</p>}

      {canStartRegistration(state) && (
        signedIn ? (
          <ButtonType2 onClick={() => onOpenTab('register')} className="w-full" size="lg">
            {state === 'full' ? t('cta.joinWaitlist') : t('cta.register')}
          </ButtonType2>
        ) : (
          <ButtonType2 onClick={() => onOpenTab('register')} className="w-full" size="lg">{t('cta.signInToRegister')}</ButtonType2>
        )
      )}
      {REGISTERED_STATES.has(state) && (
        <ButtonType1 onClick={() => onOpenTab('register')} className="w-full" size="lg">{t('cta.myEvent')}</ButtonType1>
      )}
    </section>
  );
}
