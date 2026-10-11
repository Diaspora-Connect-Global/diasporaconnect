'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarClock, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PersonAvatar } from '../primitives';
import { QuietNote, SlotPicker, SlotText, ZoneNote, btnPrimary, btnQuiet, fieldClass } from './parts';
import { isHttpsUrl } from '@/lib/meetingTime';
import type { MeetingsApi } from './useMeetings';
import {
  MEETING_NOTE_MAX,
  MEETING_PURPOSES,
  type Meeting,
  type MeetingFormat,
  type MeetingPoint,
  type MeetingPurpose,
  type MeetingSlot,
  type MeetingSlotSuggestions,
} from '@/services/gql/networkingMeetings';

export interface MeetingPerson {
  handle: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  headline?: string | null;
}

/** First guess for the length; the answer says which lengths the organiser allows. */
const FIRST_GUESS = [30, 15];

/**
 * "Request a meeting": length, a time both people can make (grouped by day, named in the EVENT
 * clock), format, meeting place with its capacity, purpose, note and, for a hidden sender, the
 * reveal confirmation. Talks only to `api`, so the dev harness runs it on fixtures.
 */
export default function MeetingRequestSheet({
  open,
  onOpenChange,
  person,
  api,
  hiddenSender,
  onRequested,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: MeetingPerson;
  api: MeetingsApi;
  /** The sender is HIDDEN: the other person will see their profile, so ask first. */
  hiddenSender: boolean;
  onRequested?: (meeting: Meeting) => void;
}) {
  const t = useTranslations('networking.meetings');
  const te = useTranslations('networking.errors');
  const tp = useTranslations('networking.meetings.purpose');
  const name = person.displayName?.trim() || t('thisPerson');
  const ids = { note: useId(), url: useId(), purpose: useId(), reveal: useId(), duration: useId(), format: useId(), point: useId() };

  const [suggestions, setSuggestions] = useState<MeetingSlotSuggestions | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [pointId, setPointId] = useState('');
  const [start, setStart] = useState<string[]>([]);
  const [format, setFormat] = useState<MeetingFormat | null>(null);
  const [purpose, setPurpose] = useState<MeetingPurpose | ''>('');
  const [note, setNote] = useState('');
  const [url, setUrl] = useState('');
  const [reveal, setReveal] = useState(false);
  const [needReveal, setNeedReveal] = useState(hiddenSender);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<Meeting | null>(null);
  const [triedSend, setTriedSend] = useState(false);
  const ticket = useRef(0);
  const errorRef = useRef<HTMLParagraphElement>(null);

  const load = useCallback(
    async (wanted: number | null, point: string) => {
      const mine = ++ticket.current;
      setLoading(true);
      setLoadError(null);
      let result = null as Awaited<ReturnType<MeetingsApi['suggest']>> | null;
      const tries = wanted ? [wanted] : FIRST_GUESS;
      for (const d of tries) {
        result = await api.suggest(person.handle, d, point || null);
        if (result.ok || result.code !== 'EVENT_NETWORKING_INVALID_ARGUMENT') break;
      }
      // The first guess may not be one of the organiser's lengths: ask again with a real one.
      if (result?.ok && !wanted && result.data.allowedDurations.length > 0 && !result.data.allowedDurations.includes(tries[0])) {
        result = await api.suggest(person.handle, result.data.allowedDurations[0], point || null);
      }
      if (mine !== ticket.current || !result) return;
      setLoading(false);
      if (!result.ok) {
        setSuggestions(null);
        setLoadError(result.key);
        return;
      }
      const data = result.data;
      setSuggestions(data);
      setDuration((cur) => cur ?? wanted ?? (data.allowedDurations.includes(tries[0]) ? tries[0] : data.allowedDurations[0] ?? tries[0]));
      setFormat((f) => (f && data.allowedFormats.includes(f) ? f : data.allowedFormats[0] ?? null));
      setStart((s) => s.filter((x) => data.slots.some((sl) => sl.startAt === x)));
    },
    [api, person.handle],
  );

  useEffect(() => {
    if (!open) return;
    setSuggestions(null);
    setDuration(null);
    setPointId('');
    setStart([]);
    setSent(null);
    setError(null);
    setTriedSend(false);
    setReveal(false);
    setNeedReveal(hiddenSender);
    void load(null, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pickDuration = (d: number) => {
    setDuration(d);
    setStart([]);
    void load(d, pointId);
  };
  const pickPoint = (id: string) => {
    setPointId(id);
    setStart([]);
    void load(duration, id);
  };

  const urlBad = format === 'ONLINE' && url.trim() !== '' && !isHttpsUrl(url);
  const chosenSlot: MeetingSlot | undefined = suggestions?.slots.find((s) => s.startAt === start[0]);
  const purposes = suggestions?.purposes?.length ? suggestions.purposes : MEETING_PURPOSES;
  const missing = !chosenSlot || !duration || !format || !purpose || urlBad || (needReveal && !reveal);

  const submit = async () => {
    setTriedSend(true);
    if (missing || !chosenSlot || !duration || !format || !purpose) {
      setError(null);
      return;
    }
    setSubmitting(true);
    setError(null);
    const out = await api.request({
      handle: person.handle,
      startAt: chosenSlot.startAt,
      durationMinutes: duration,
      format,
      meetingPointId: format === 'IN_PERSON' && pointId ? pointId : undefined,
      purpose,
      note: note.trim() || undefined,
      onlineUrl: format === 'ONLINE' && url.trim() ? url.trim() : undefined,
      acknowledgeProfileReveal: needReveal ? true : undefined,
    });
    setSubmitting(false);
    if (out.ok) {
      setSent(out.meeting);
      onRequested?.(out.meeting);
      return;
    }
    setError(out.key);
    if (out.code === 'EVENT_NETWORKING_REVEAL_CONFIRMATION_REQUIRED') setNeedReveal(true);
    // Someone took the time (or the place filled up) while the sheet was open: show fresh times.
    if (out.code === 'EVENT_NETWORKING_SLOT_TAKEN' || out.code === 'EVENT_NETWORKING_SLOT_UNAVAILABLE' || out.code === 'EVENT_NETWORKING_MEETING_POINT_UNAVAILABLE') {
      setStart([]);
      void load(duration, pointId);
    }
    requestAnimationFrame(() => errorRef.current?.focus());
  };

  const sentSlot = sent?.slot ?? chosenSlot;
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!submitting) onOpenChange(o); }}>
      <DialogContent data-testid="meeting-request-sheet" className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        {sent ? (
          <>
            <DialogHeader>
              <DialogTitle>{t('request.sentTitle')}</DialogTitle>
              <DialogDescription>{t('request.sentBody', { name })}</DialogDescription>
            </DialogHeader>
            <div role="status" data-testid="request-sent" className="rounded-xl bg-surface-subtle p-3 text-sm text-text-primary">
              {sentSlot ? <SlotText slot={sentSlot} timezone={sent.timezone || suggestions?.timezone || 'UTC'} /> : null}
            </div>
            <DialogFooter>
              <button type="button" onClick={() => onOpenChange(false)} className={btnPrimary} data-testid="request-done">{t('request.close')}</button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t('request.title', { name })}</DialogTitle>
              <DialogDescription>{t('request.intro', { name })}</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-3 rounded-xl bg-surface-subtle p-3">
              <PersonAvatar name={person.displayName} url={person.avatarUrl} className="size-10" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-primary">{name}</p>
                {person.headline && <p className="truncate text-xs text-muted-foreground">{person.headline}</p>}
              </div>
            </div>

            {loadError && !suggestions ? (
              <div className="space-y-2" data-testid="request-load-error">
                <p role="alert" className="text-sm text-text-danger">{te(loadError)}</p>
                <button type="button" onClick={() => void load(duration, pointId)} className={btnQuiet}>{t('request.retry')}</button>
              </div>
            ) : (
              <form
                className="space-y-5"
                onSubmit={(e) => { e.preventDefault(); void submit(); }}
                noValidate
              >
                {suggestions && suggestions.allowedDurations.length > 1 && (
                  <fieldset>
                    <legend className="mb-1 text-sm font-semibold text-text-primary">{t('request.durationLegend')}</legend>
                    <div role="radiogroup" aria-labelledby={ids.duration} className="flex flex-wrap gap-2" data-testid="duration-choice">
                      <span id={ids.duration} className="sr-only">{t('request.durationLegend')}</span>
                      {suggestions.allowedDurations.map((d) => (
                        <label key={d} className="relative inline-flex min-h-11 cursor-pointer items-center rounded-full border border-border-subtle px-4 text-sm font-medium text-text-primary has-[:checked]:border-border-brand has-[:checked]:bg-surface-brand-subtle has-[:checked]:text-text-brand has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-text-brand">
                          <input type="radio" name={ids.duration} className="absolute inset-0 size-full cursor-pointer opacity-0" checked={duration === d} onChange={() => pickDuration(d)} data-testid="duration-option" value={d} />
                          {t('request.minutes', { count: d })}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}

                {suggestions && suggestions.allowedFormats.length > 0 && (
                  <fieldset>
                    <legend className="mb-1 text-sm font-semibold text-text-primary">{t('request.formatLegend')}</legend>
                    <div className="flex flex-wrap gap-2" data-testid="format-choice">
                      {suggestions.allowedFormats.map((f) => (
                        <label key={f} className="relative inline-flex min-h-11 cursor-pointer items-center rounded-full border border-border-subtle px-4 text-sm font-medium text-text-primary has-[:checked]:border-border-brand has-[:checked]:bg-surface-brand-subtle has-[:checked]:text-text-brand has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-text-brand">
                          <input type="radio" name={ids.format} className="absolute inset-0 size-full cursor-pointer opacity-0" checked={format === f} onChange={() => { setFormat(f); }} data-testid="format-option" value={f} />
                          {t(`format.${f}`)}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}

                {format === 'IN_PERSON' && suggestions && suggestions.meetingPointOptions.length > 0 && (
                  <fieldset data-testid="point-picker">
                    <legend className="mb-1 text-sm font-semibold text-text-primary">{t('request.pointLegend')}</legend>
                    <ul className="grid gap-2">
                      <PointOption id={ids.point} value="" label={t('request.pointNone')} checked={pointId === ''} onPick={pickPoint} />
                      {suggestions.meetingPointOptions.map((p: MeetingPoint) => (
                        <PointOption
                          key={p.id}
                          id={ids.point}
                          value={p.id}
                          label={p.name}
                          detail={[p.directions, t('request.pointCapacity', { count: p.capacityPerSlot })].filter(Boolean).join(' · ')}
                          checked={pointId === p.id}
                          onPick={pickPoint}
                        />
                      ))}
                    </ul>
                  </fieldset>
                )}

                <div className="space-y-2">
                  {suggestions && <ZoneNote timezone={suggestions.timezone} atIso={suggestions.slots[0]?.startAt} />}
                  {loading ? (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status" data-testid="slots-loading"><Loader2 className="size-4 animate-spin" aria-hidden />{t('request.loadingSlots')}</p>
                  ) : suggestions && suggestions.slots.length === 0 ? (
                    <p data-testid="no-slots" className="rounded-xl border border-dashed border-border-subtle p-4 text-sm text-muted-foreground">{t('request.noSlots', { name })}</p>
                  ) : suggestions ? (
                    <SlotPicker slots={suggestions.slots} timezone={suggestions.timezone} mode="single" value={start} onChange={setStart} legend={t('request.timeLegend')} name="request-slot" />
                  ) : null}
                  {triedSend && !chosenSlot && !loading && suggestions && suggestions.slots.length > 0 && <p role="alert" className="text-sm text-text-danger">{t('request.chooseTime')}</p>}
                </div>

                {format === 'ONLINE' && (
                  <div>
                    <label htmlFor={ids.url} className="mb-1 block text-sm font-semibold text-text-primary">{t('request.urlLabel')}</label>
                    <input id={ids.url} type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" className={fieldClass} aria-invalid={urlBad} aria-describedby={`${ids.url}-hint`} maxLength={500} data-testid="online-url" />
                    <p id={`${ids.url}-hint`} className={`mt-1 text-xs ${urlBad ? 'text-text-danger' : 'text-muted-foreground'}`}>{urlBad ? t('request.urlInvalid') : t('request.urlHint', { name })}</p>
                  </div>
                )}

                <div>
                  <label htmlFor={ids.purpose} className="mb-1 block text-sm font-semibold text-text-primary">{t('request.purposeLabel')}</label>
                  <select id={ids.purpose} value={purpose} onChange={(e) => setPurpose(e.target.value as MeetingPurpose)} className={`${fieldClass} min-h-11`} data-testid="purpose-select" aria-invalid={triedSend && !purpose}>
                    <option value="">{t('request.purposePlaceholder')}</option>
                    {purposes.map((p) => <option key={p} value={p}>{tp(p)}</option>)}
                  </select>
                  {triedSend && !purpose && <p role="alert" className="mt-1 text-xs text-text-danger">{t('request.choosePurpose')}</p>}
                </div>

                <div>
                  <label htmlFor={ids.note} className="mb-1 block text-sm font-semibold text-text-primary">{t('request.noteLabel')}</label>
                  <textarea id={ids.note} value={note} onChange={(e) => setNote(e.target.value)} maxLength={MEETING_NOTE_MAX} rows={3} className={fieldClass} aria-describedby={`${ids.note}-hint`} data-testid="note-input" />
                  <p id={`${ids.note}-hint`} className="mt-1 text-xs text-muted-foreground">{t('request.noteHint', { count: note.length, max: MEETING_NOTE_MAX, name })}</p>
                </div>

                {needReveal && (
                  <div className="rounded-xl border border-border-warning bg-surface-warning p-3" data-testid="reveal-block">
                    <label htmlFor={ids.reveal} className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-text-primary">
                      <input id={ids.reveal} type="checkbox" checked={reveal} onChange={(e) => setReveal(e.target.checked)} className="mt-0.5 size-5 shrink-0" data-testid="reveal-check" />
                      <span><span className="block font-semibold">{t('request.revealTitle')}</span>{t('request.revealLabel', { name })}</span>
                    </label>
                  </div>
                )}

                <div aria-live="assertive">
                  {error && (
                    <p ref={errorRef} tabIndex={-1} role="alert" data-testid="request-error" data-error={error} className="rounded-xl border border-border-danger bg-surface-danger px-4 py-3 text-sm text-text-primary focus:outline-none">
                      {te(error)}
                    </p>
                  )}
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                  <button type="button" disabled={submitting} onClick={() => onOpenChange(false)} className={btnQuiet} data-testid="request-cancel">{t('request.cancel')}</button>
                  <button type="submit" disabled={submitting || loading} className={btnPrimary} data-testid="request-send" aria-disabled={missing && triedSend}>
                    {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CalendarClock className="size-4" aria-hidden />}
                    {submitting ? t('request.sending') : t('request.send')}
                  </button>
                </DialogFooter>
              </form>
            )}
            <QuietNote>{t('request.neverConnects')}</QuietNote>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PointOption({ id, value, label, detail, checked, onPick }: { id: string; value: string; label: string; detail?: string; checked: boolean; onPick: (v: string) => void }) {
  return (
    <li>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border-subtle px-3 py-2 text-sm text-text-primary has-[:checked]:border-border-brand has-[:checked]:bg-surface-subtle has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-text-brand">
        <input type="radio" name={`${id}-point`} value={value} checked={checked} onChange={() => onPick(value)} className="mt-0.5 size-4" data-testid="point-option" />
        <span><span className="block font-medium">{label}</span>{detail && <span className="block text-xs text-muted-foreground">{detail}</span>}</span>
      </label>
    </li>
  );
}
