'use client';

import { useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ButtonType1 } from '@/components/custom/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GET_EVENT_REGISTRATIONS, type EventRegistration, type GetEventRegistrationsData, type RegistrationFormField } from '@/services/gql/events';
import { resolveCircleUsers } from '@/hooks/useCircleUsers';
import { csvSlugFilename, downloadCsv, toCsv } from '@/lib/csv';
import { answerText, builtinOf, parseResponses } from '@/lib/eventRegistrationForm';

const PAGE = 100;
/** A hard stop so a misbehaving server can never keep this loop running forever (50 000 rows). */
const MAX_PAGES = 500;

/** The label to show for a question: translated for a default field, the organiser's own words otherwise. */
export function useFieldLabel(): (f: Pick<RegistrationFormField, 'id' | 'label' | 'builtin'>) => string {
  const td = useTranslations('eventForm.defaults');
  return (f) => {
    const b = builtinOf(f);
    return b ? td(b) : f.label;
  };
}

/** One registrant's answers, question by question. Names only; no ids anywhere. */
export function AnswersDialog({
  open,
  onClose,
  name,
  registration,
  fields,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  registration: EventRegistration | null;
  fields: RegistrationFormField[];
}) {
  const t = useTranslations('eventForm.answers');
  const tf = useTranslations('eventForm.form');
  const labelOf = useFieldLabel();
  const stored = parseResponses(registration?.formResponsesJson);
  const rows = fields
    .map((f) => ({ f, text: answerText(f, stored[f.id], tf('yes'), tf('no')) }))
    .filter((r) => r.text !== '');
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg" data-testid="answers-dialog">
        <DialogHeader>
          <DialogTitle className="break-words">{t('title')}</DialogTitle>
          <DialogDescription className="break-words">{name}</DialogDescription>
        </DialogHeader>
        {fields.length === 0 ? (
          <p className="text-sm text-text-secondary">{t('noQuestions')}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-text-secondary">{t('none')}</p>
        ) : (
          <dl className="space-y-3">
            {rows.map(({ f, text }) => (
              <div key={f.id} className="min-w-0">
                <dt className="break-words text-xs font-medium text-text-secondary">{labelOf(f)}</dt>
                <dd className="whitespace-pre-wrap break-words text-sm text-text-primary">{text}</dd>
              </div>
            ))}
          </dl>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Builds the CSV from EVERY registration (not just the page on screen): pages of 100,
 * one after another. Columns: attendee, status, ticket, quantity, registered on, then one
 * per current question. Ticket names come from the event, attendee names from their
 * profiles; no user id, registration id or ticket id is ever written.
 */
export function DownloadCsvButton({
  eventId,
  eventTitle,
  fields,
  tickets,
  unknownName,
}: {
  eventId: string;
  eventTitle: string;
  fields: RegistrationFormField[];
  tickets: Array<{ id: string; name: string }>;
  unknownName: string;
}) {
  const t = useTranslations('eventForm.answers');
  const tc = useTranslations('eventForm.csv');
  const tf = useTranslations('eventForm.form');
  const labelOf = useFieldLabel();
  const client = useApolloClient();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const all: EventRegistration[] = [];
      for (let page = 0; page < MAX_PAGES; page++) {
        const { data, error } = await client.query<GetEventRegistrationsData>({
          query: GET_EVENT_REGISTRATIONS,
          variables: { eventId, limit: PAGE, offset: page * PAGE },
          // no-cache: attendee answers never go into the (persisted) Apollo cache from a bulk export.
          fetchPolicy: 'no-cache',
          errorPolicy: 'all',
        });
        const list = data?.getEventRegistrations;
        if (error || !list) throw new Error('page');
        all.push(...list.registrations);
        if (!list.hasMore || list.registrations.length === 0) break;
      }
      const users = await resolveCircleUsers(client, all.map((r) => r.userId));
      const ticketName = new Map(tickets.map((x) => [x.id, x.name]));
      const header = [tc('attendee'), tc('status'), tc('ticket'), tc('quantity'), tc('registered'), ...fields.map(labelOf)];
      const rows = all.map((r) => {
        const answers = parseResponses(r.formResponsesJson);
        return [
          users[r.userId]?.name?.trim() || unknownName,
          r.status,
          (r.ticketId && ticketName.get(r.ticketId)) || '',
          r.quantity,
          r.registeredAt ? new Date(r.registeredAt).toISOString().slice(0, 10) : '',
          ...fields.map((f) => answerText(f, answers[f.id], tf('yes'), tf('no'))),
        ];
      });
      downloadCsv(csvSlugFilename(eventTitle, 'registrations'), toCsv([header, ...rows], { bom: true }));
      toast.success(t('ready'));
    } catch {
      toast.error(t('failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ButtonType1 onClick={run} disabled={busy} className="flex items-center gap-2" data-testid="download-csv">
      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
      {busy ? t('preparing') : t('download')}
    </ButtonType1>
  );
}
