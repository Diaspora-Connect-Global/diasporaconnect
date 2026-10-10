'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CalendarPlus, Download, Ticket } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { ButtonType1, ButtonType3 } from '@/components/custom/button';
import { ConfirmationModal } from '@/components/custom/confirmationModal';
import { CANCEL_REGISTRATION, type CancelRegistrationData } from '@/services/gql/events';
import type { EventPageEvent } from '@/services/gql/eventsM2';
import { buildGoogleCalendarUrl, downloadIcs, formatInZone, timezoneLabel, type CalendarEvent } from '@/lib/eventCalendar';
import { eventRefusal, hasErrors } from '@/lib/eventRefusal';
import type { RegistrationUiState } from '@/lib/eventRegistrationState';
import { JoinOutcomeNotice } from './OrganiserCard';
import type { OrganiserView } from './organiser';
import type { RegistrationResult } from './RegisterTab';

/** "My event": what was just submitted, the standing, the ticket, the calendar, and cancelling. */
export default function MyEventTab({
  event,
  state,
  organiser,
  lastResult,
  calendar,
  onChanged,
}: {
  event: EventPageEvent;
  state: RegistrationUiState;
  organiser: OrganiserView | null;
  lastResult: RegistrationResult | null;
  calendar: CalendarEvent;
  onChanged: () => void | Promise<void>;
}) {
  const t = useTranslations('eventPage.myEvent');
  const tStates = useTranslations('eventPage.rail.states');
  const tErr = useTranslations('eventPage.errors');
  const tReg = useTranslations('eventPage.register.result');
  const locale = useLocale();
  const [cancel, { loading }] = useMutation<CancelRegistrationData>(CANCEL_REGISTRATION);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const registrationId = event.myRegistrationId;
  const zone = timezoneLabel(event.startAt, locale, event.timezone);

  const doCancel = async () => {
    if (!registrationId) return;
    try {
      const res = await cancel({ variables: { registrationId } });
      if (!res.data?.cancelRegistration || hasErrors(res)) {
        toast.error(tErr(eventRefusal(res).key));
        return;
      }
      toast.success(t('cancelled'));
      setConfirmOpen(false);
      await onChanged();
    } catch (err) {
      toast.error(tErr(eventRefusal(err).key));
    }
  };

  const headline = state === 'waitlisted' && lastResult?.waitlistPosition
    ? tStates('waitlistedPos', { position: lastResult.waitlistPosition })
    : tStates(state, { date: '' });

  const submittedKey =
    lastResult == null
      ? null
      : lastResult.status === 'CONFIRMED'
        ? 'confirmed'
        : lastResult.status === 'PENDING_APPROVAL'
          ? 'pendingApproval'
          : lastResult.status === 'WAITLISTED'
            ? 'waitlisted'
            : 'received';

  return (
    <div className="space-y-4" data-testid="my-event-tab">
      {lastResult && submittedKey && (
        <div className="space-y-2" aria-live="polite">
          <div role="status" data-testid="registration-result" className="rounded-xl bg-surface-brand-subtle p-3 text-sm text-text-primary">
            <p className="font-medium">{tReg(submittedKey)}</p>
            {lastResult.waitlistPosition ? <p>{tReg('waitlistedPos', { position: lastResult.waitlistPosition })}</p> : null}
            {lastResult.paymentFailed && <p className="mt-1 text-text-warning">{tReg('paymentNotCompleted')}</p>}
          </div>
          {/* Its own notice: a failed join is not a failed registration. */}
          {lastResult.networkingDraft && (
            <p role="status" data-testid="networking-draft-outcome" className="rounded-xl bg-surface-subtle p-3 text-sm text-text-primary">
              {lastResult.networkingDraft === 'saved' ? tReg('draftSaved') : lastResult.networkingDraft === 'unavailableYet' ? tReg('draftUnavailableYet') : tReg('draftFailed')}
            </p>
          )}
          {lastResult.join && organiser && <JoinOutcomeNotice outcome={lastResult.join} organiser={organiser} />}
        </div>
      )}

      <section className="space-y-3 rounded-2xl border border-border-subtle bg-surface-default p-4" aria-labelledby="my-event-status">
        <h2 id="my-event-status" className="font-semibold text-text-primary">{t('status')}</h2>
        <p className="text-text-primary" data-testid="my-event-headline">{headline}</p>
        <p className="text-sm text-text-secondary">
          {formatInZone(event.startAt, locale, event.timezone)}
          {zone ? ` (${zone})` : ''}
        </p>

        <div className="flex flex-wrap gap-2">
          {state === 'confirmed' && (
            <>
              <Link href={`/events/${event.id}/ticket`} className="contents">
                <ButtonType1 className="flex items-center gap-2"><Ticket className="size-4" aria-hidden />{t('ticket')}</ButtonType1>
              </Link>
              <a href={buildGoogleCalendarUrl(calendar)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-primary hover:bg-surface-hover">
                <CalendarPlus className="size-4" aria-hidden />{t('googleCalendar')}
              </a>
              <button type="button" onClick={() => downloadIcs(calendar)} className="inline-flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-primary hover:bg-surface-hover">
                <Download className="size-4" aria-hidden />{t('icsFile')}
              </button>
            </>
          )}
          {registrationId && (state === 'confirmed' || state === 'pendingApproval' || state === 'waitlisted' || state === 'awaitingPayment') && (
            <ButtonType3 onClick={() => setConfirmOpen(true)} className="text-text-danger">{t('cancel')}</ButtonType3>
          )}
        </div>
      </section>

      <ConfirmationModal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={doCancel}
        title={t('cancelTitle')}
        description={t('cancelBody')}
        confirmText={t('cancelConfirm')}
        cancelText={t('keep')}
        confirmVariant="destructive"
        isLoading={loading}
      />
    </div>
  );
}
