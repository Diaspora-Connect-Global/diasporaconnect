'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarPlus, Download, ExternalLink, Loader2, MapPin, MessageCircle, Video } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PersonAvatar } from '../primitives';
import { personHref } from '../PersonCard';
import { SlotPicker, SlotText, StatusChip, ZoneNote, btnDanger, btnPrimary, btnQuiet, fieldClass } from './parts';
import { buildGoogleCalendarUrl, downloadIcs } from '@/lib/eventCalendar';
import { isHttpsUrl } from '@/lib/meetingTime';
import { profileUrl } from '@/lib/profileUrl';
import type { MeetingOutcome, MeetingsApi } from './useMeetings';
import EventDaySlot from '../eventday/EventDaySlot';
import type { EventDayConfig } from '../eventday/EventDayCard';
import FeedbackEntry, { type FeedbackConfig } from '../feedback/FeedbackEntry';
import { EVENT_DAY_UI_ENABLED, FEEDBACK_UI_ENABLED } from '@/lib/networkingFeatures';
import { MEETING_MAX_PROPOSALS, type Meeting, type MeetingSlot, type MeetingSlotSuggestions } from '@/services/gql/networkingMeetings';

type Panel = null | 'propose' | 'reschedule';

/**
 * One meeting: status, time in the event clock (and the viewer's own when it differs), place or
 * link (the link only ever reaches the two participants), and every action the server says is
 * allowed. All writes go through `api`; the meeting shown is always the server's latest answer.
 */
export default function MeetingDetail({
  meeting: initial,
  eventId,
  eventTitle,
  api,
  onChanged,
  eventDay,
  feedback,
}: {
  meeting: Meeting;
  eventId: string;
  eventTitle: string;
  api: MeetingsApi;
  onChanged?: (meeting: Meeting) => void;
  /** M7 (dev harness only): a fixture-backed event-day config. Real pages rely on EVENT_DAY_UI_ENABLED. */
  eventDay?: EventDayConfig;
  /** M7 (dev harness only): a fixture-backed feedback config. Real pages rely on FEEDBACK_UI_ENABLED. */
  feedback?: FeedbackConfig;
}) {
  const t = useTranslations('networking.meetings');
  const te = useTranslations('networking.errors');
  const tp = useTranslations('networking.meetings.purpose');
  const [meeting, setMeeting] = useState(initial);
  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const [link, setLink] = useState('');
  useEffect(() => setMeeting(initial), [initial]);

  const cp = meeting.counterpart;
  const name = cp?.displayName?.trim() || t('thisPerson');
  const tz = meeting.timezone || 'UTC';
  const theirs = meeting.openProposals.filter((p) => !p.proposedByMe);
  const mine = meeting.openProposals.filter((p) => p.proposedByMe);
  const isReschedule = meeting.status === 'RESCHEDULE_PROPOSED';
  const answering = meeting.awaitingMe && (meeting.status === 'ALT_PROPOSED' || isReschedule) && theirs.length > 0;
  const linkOk = Boolean(meeting.onlineUrl) && isHttpsUrl(meeting.onlineUrl as string);
  const chosenStart = answering ? (pick ?? (theirs.length === 1 ? theirs[0].slot.startAt : null)) : null;

  const run = async (fn: () => Promise<MeetingOutcome>, said: string) => {
    setBusy(true);
    setError(null);
    const out = await fn();
    setBusy(false);
    if (out.ok) {
      setMeeting(out.meeting);
      setPanel(null);
      setPick(null);
      setAnnounce(said);
      onChanged?.(out.meeting);
    } else {
      setError(out.key);
    }
    return out.ok;
  };

  const calendar = meeting.slot && (meeting.status === 'CONFIRMED' || meeting.status === 'RESCHEDULE_PROPOSED')
    ? {
        uid: meeting.meetingId,
        title: t('calendar.title', { name, event: eventTitle }),
        description: meeting.note ?? null,
        location: meeting.meetingPoint?.name ?? (linkOk ? meeting.onlineUrl : null),
        startIso: meeting.slot.startAt,
        endIso: meeting.slot.endAt,
      }
    : null;
  const username = (cp?.username ?? '').trim();

  return (
    <div data-testid="meeting-detail" data-status={meeting.status} className="space-y-5">
      <div className="flex items-start gap-3">
        <PersonAvatar name={cp?.displayName} url={cp?.avatarUrl} className="size-14" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-text-primary">
            {cp && cp.available ? <Link href={personHref(eventId, cp.handle)} className="hover:underline">{name}</Link> : name}
          </h3>
          {cp?.headline && <p className="truncate text-sm text-muted-foreground">{cp.headline}</p>}
          {cp && !cp.available && <p className="text-xs text-muted-foreground">{t('detail.unavailable')}</p>}
        </div>
      </div>

      <div aria-live="polite" aria-atomic="true" className="flex flex-wrap items-center gap-2">
        <StatusChip status={meeting.status} awaitingMe={meeting.awaitingMe} />
        <span className="sr-only" data-testid="meeting-announce">{announce}</span>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {meeting.slot && (
          <Row label={isReschedule ? t('detail.currentTime') : t('detail.time')}>
            <SlotText slot={meeting.slot} timezone={tz} />
            <span className="block text-xs text-muted-foreground">{t('detail.duration', { count: meeting.durationMinutes })}</span>
          </Row>
        )}
        {meeting.format && <Row label={t('detail.format')}>{t(`format.${meeting.format}`)}</Row>}
        {meeting.format === 'IN_PERSON' && meeting.meetingPoint && (
          <Row label={t('detail.place')}>
            <span className="inline-flex items-start gap-1.5"><MapPin className="mt-0.5 size-4 shrink-0 text-text-brand" aria-hidden /><span>{meeting.meetingPoint.name}{meeting.meetingPoint.directions ? <span className="block text-xs text-muted-foreground">{meeting.meetingPoint.directions}</span> : null}</span></span>
          </Row>
        )}
        {meeting.format === 'ONLINE' && linkOk && (
          <Row label={t('detail.link')}>
            <a href={meeting.onlineUrl as string} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-6 items-center gap-1.5 break-all text-text-brand underline" data-testid="meeting-link">
              <Video className="size-4 shrink-0" aria-hidden />{meeting.onlineUrl}<ExternalLink className="size-3.5 shrink-0" aria-hidden /><span className="sr-only">{t('detail.opensNewTab')}</span>
            </a>
          </Row>
        )}
        {meeting.purpose && <Row label={t('detail.purpose')}>{tp(meeting.purpose)}</Row>}
        {meeting.note && <Row label={t('detail.note')}><span className="whitespace-pre-wrap">{meeting.note}</span></Row>}
      </dl>
      <ZoneNote timezone={tz} atIso={meeting.slot?.startAt} />
      {meeting.status === 'CONFIRMED' && (eventDay || EVENT_DAY_UI_ENABLED) && <EventDaySlot meeting={meeting} eventId={eventId} config={eventDay} />}

      {answering && (
        <fieldset data-testid="proposals" className="space-y-2">
          <legend className="text-sm font-semibold text-text-primary">{isReschedule ? t('detail.rescheduleLegend', { name }) : t('detail.altLegend', { name })}</legend>
          <SlotPicker slots={theirs.map((p) => p.slot)} timezone={tz} mode="single" value={chosenStart ? [chosenStart] : []} onChange={(v) => setPick(v[0] ?? null)} legend={t('detail.pickOne')} name="answer-slot" />
        </fieldset>
      )}
      {!meeting.awaitingMe && mine.length > 0 && (
        <div data-testid="my-proposals" className="space-y-1">
          <p className="text-sm font-semibold text-text-primary">{t('detail.yourProposals')}</p>
          <ul className="space-y-1 text-sm">{mine.map((p) => <li key={p.slot.startAt}><SlotText slot={p.slot} timezone={tz} /></li>)}</ul>
        </div>
      )}

      {!meeting.awaitingMe && (meeting.status === 'REQUESTED' || meeting.status === 'ALT_PROPOSED' || isReschedule) && (
        <p className="text-sm text-muted-foreground" data-testid="waiting-note">{t('detail.waitingFor', { name })}</p>
      )}
      {(meeting.status === 'CANCELLED' || meeting.status === 'DECLINED' || meeting.status === 'EXPIRED') && (
        <p className="text-sm text-muted-foreground" data-testid="ended-note">
          {meeting.status === 'EXPIRED' ? t('detail.expired') : meeting.status === 'DECLINED' ? t('detail.declined') : meeting.cancelledBy === 'ME' ? t('detail.cancelledByMe') : meeting.cancelledBy === 'COUNTERPART' ? t('detail.cancelledByThem', { name }) : t(`detail.cancelReason.${meeting.cancelReason ?? 'BY_PARTICIPANT'}`)}
        </p>
      )}

      {meeting.awaitingMe && meeting.format === 'ONLINE' && meeting.canAccept && !meeting.onlineUrl && (
        <div>
          <label htmlFor="accept-link" className="mb-1 block text-sm font-semibold text-text-primary">{t('detail.addLink')}</label>
          <input id="accept-link" type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" className={fieldClass} maxLength={500} data-testid="accept-link" aria-describedby="accept-link-hint" />
          <p id="accept-link-hint" className="mt-1 text-xs text-muted-foreground">{link.trim() && !isHttpsUrl(link) ? t('request.urlInvalid') : t('detail.addLinkHint', { name })}</p>
        </div>
      )}

      <div aria-live="assertive">
        {error && <p role="alert" data-testid="detail-error" data-error={error} className="rounded-xl border border-border-danger bg-surface-danger px-4 py-3 text-sm text-text-primary">{te(error)}</p>}
      </div>

      <div className="flex flex-wrap gap-2" data-testid="detail-actions">
        {meeting.canAccept && (
          <button
            type="button"
            disabled={busy || (answering && !chosenStart) || (link.trim() !== '' && !isHttpsUrl(link))}
            onClick={() => void run(() => api.respond({ meetingId: meeting.meetingId, action: 'ACCEPT', startAt: chosenStart ?? undefined, onlineUrl: link.trim() && isHttpsUrl(link) ? link.trim() : undefined }), t('announce.accepted'))}
            className={btnPrimary}
            data-testid="meeting-accept"
          >
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}{answering && theirs.length > 1 ? t('detail.acceptChosen') : t('detail.accept')}
          </button>
        )}
        {meeting.canDecline && (
          <button type="button" disabled={busy} onClick={() => void run(() => api.respond({ meetingId: meeting.meetingId, action: 'DECLINE' }), isReschedule ? t('announce.kept') : t('announce.declined'))} className={btnQuiet} data-testid="meeting-decline">
            {isReschedule ? t('detail.keepOriginal') : t('detail.decline')}
          </button>
        )}
        {meeting.canPropose && !isReschedule && (
          <button type="button" disabled={busy} onClick={() => setPanel(panel === 'propose' ? null : 'propose')} aria-expanded={panel === 'propose'} className={btnQuiet} data-testid="meeting-propose">{t('detail.propose')}</button>
        )}
        {meeting.canReschedule && (
          <button type="button" disabled={busy} onClick={() => setPanel(panel === 'reschedule' ? null : 'reschedule')} aria-expanded={panel === 'reschedule'} className={btnQuiet} data-testid="meeting-reschedule">{t('detail.reschedule')}</button>
        )}
        {meeting.canCancel && (
          <button type="button" disabled={busy} onClick={() => setConfirmCancel(true)} className={btnDanger} data-testid="meeting-cancel">{t('detail.cancel')}</button>
        )}
      </div>

      {panel && cp && (
        <ProposePanel
          key={panel}
          kind={panel}
          meeting={meeting}
          name={name}
          handle={cp.handle}
          api={api}
          busy={busy}
          onSubmit={(starts) =>
            run(
              () => (panel === 'reschedule' ? api.proposeReschedule(meeting.meetingId, starts) : api.respond({ meetingId: meeting.meetingId, action: 'PROPOSE_ALTERNATIVE', proposedStarts: starts })),
              panel === 'reschedule' ? t('announce.rescheduleSent') : t('announce.proposed'),
            )
          }
          onCancel={() => setPanel(null)}
        />
      )}

      {(feedback || FEEDBACK_UI_ENABLED) && <FeedbackEntry meeting={meeting} eventId={eventId} config={feedback} />}

      {(calendar || username) && (
        <div className="flex flex-wrap gap-2 border-t border-border-subtle pt-4" data-testid="detail-links">
          {calendar && (
            <>
              <a href={buildGoogleCalendarUrl(calendar)} target="_blank" rel="noopener noreferrer" className={btnQuiet} data-testid="calendar-google"><CalendarPlus className="size-4" aria-hidden />{t('detail.addGoogle')}<span className="sr-only">{t('detail.opensNewTab')}</span></a>
              <button type="button" onClick={() => downloadIcs(calendar)} className={btnQuiet} data-testid="calendar-ics"><Download className="size-4" aria-hidden />{t('detail.addIcs')}</button>
            </>
          )}
          {username && <Link href={profileUrl({ username })} className={btnQuiet} data-testid="meeting-message"><MessageCircle className="size-4" aria-hidden />{t('detail.message', { name })}</Link>}
        </div>
      )}

      <Dialog open={confirmCancel} onOpenChange={(o) => { if (!busy) setConfirmCancel(o); }}>
        <DialogContent data-testid="cancel-confirm">
          <DialogHeader>
            <DialogTitle>{t('cancelDialog.title')}</DialogTitle>
            <DialogDescription>{meeting.status === 'CONFIRMED' || isReschedule ? t('cancelDialog.bodyConfirmed', { name }) : t('cancelDialog.bodyPending', { name })}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <button type="button" disabled={busy} onClick={() => setConfirmCancel(false)} className={btnQuiet} data-testid="cancel-keep">{t('cancelDialog.keep')}</button>
            <button type="button" disabled={busy} onClick={() => void run(() => api.cancel(meeting.meetingId), t('announce.cancelled')).then((ok) => { if (ok) setConfirmCancel(false); })} className={btnDanger} data-testid="cancel-confirm-yes">{t('cancelDialog.confirm')}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-text-primary">{children}</dd>
    </div>
  );
}

/** Pick up to three of the times both people can make. Used for "Propose other times" and "Reschedule". */
function ProposePanel({
  kind,
  meeting,
  name,
  handle,
  api,
  busy,
  onSubmit,
  onCancel,
}: {
  kind: 'propose' | 'reschedule';
  meeting: Meeting;
  name: string;
  handle: string;
  api: MeetingsApi;
  busy: boolean;
  onSubmit: (starts: string[]) => Promise<boolean>;
  onCancel: () => void;
}) {
  const t = useTranslations('networking.meetings');
  const te = useTranslations('networking.errors');
  const [data, setData] = useState<MeetingSlotSuggestions | null>(null);
  const [failKey, setFailKey] = useState<string | null>(null);
  const [starts, setStarts] = useState<string[]>([]);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let live = true;
    void api.suggest(handle, meeting.durationMinutes, meeting.meetingPoint?.id ?? null).then((r) => {
      if (!live) return;
      if (r.ok) setData(r.data);
      else setFailKey(r.key);
    });
    headingRef.current?.focus();
    return () => { live = false; };
  }, [api, handle, meeting.durationMinutes, meeting.meetingPoint?.id]);

  const slots: MeetingSlot[] = (data?.slots ?? []).filter((s) => s.startAt !== meeting.slot?.startAt);
  return (
    <section aria-labelledby="propose-title" data-testid="propose-panel" className="space-y-3 rounded-2xl border border-border-subtle bg-surface-subtle p-4">
      <h4 id="propose-title" ref={headingRef} tabIndex={-1} className="text-sm font-semibold text-text-primary focus:outline-none">{kind === 'reschedule' ? t('propose.rescheduleTitle', { name }) : t('propose.title', { name })}</h4>
      {failKey ? (
        <p role="alert" className="text-sm text-text-danger">{te(failKey)}</p>
      ) : !data ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden />{t('request.loadingSlots')}</p>
      ) : slots.length === 0 ? (
        <p data-testid="no-slots" className="text-sm text-muted-foreground">{t('request.noSlots', { name })}</p>
      ) : (
        <SlotPicker slots={slots} timezone={data.timezone} mode="multi" max={MEETING_MAX_PROPOSALS} value={starts} onChange={setStarts} legend={t('propose.legend', { max: MEETING_MAX_PROPOSALS })} name="propose-slot" />
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={onCancel} className={btnQuiet}>{t('propose.close')}</button>
        <button type="button" disabled={busy || starts.length === 0} onClick={() => void onSubmit(starts)} className={btnPrimary} data-testid="propose-send">{t('propose.send', { count: starts.length })}</button>
      </div>
    </section>
  );
}

