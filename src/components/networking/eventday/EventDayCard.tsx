'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarCheck, ExternalLink, Loader2, MapPin, MapPinned, MessageCircle, UserRound, Video } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { TONE_CLASS } from '@/components/more/MoreLinkCard';
import { btnPrimary, btnQuiet, useIsClient } from '../meetings/parts';
import { personHref } from '../PersonCard';
import { formatTimeInZone } from '@/lib/eventCalendar';
import { isHttpsUrl } from '@/lib/meetingTime';
import { profileUrl } from '@/lib/profileUrl';
import { allowsArrivalAndLocation, formatCountdown, mapsAddressUrl, mapsPointUrl, remainingMs, showsEventDayCard, wholeMinutesLeft } from '@/lib/eventDay';
import type { Meeting } from '@/services/gql/networkingMeetings';
import type { EventDayState } from '@/services/gql/networkingEventDay';
import { browserLocate, locateReason, type Locate, type LocateFailureReason } from './locate';
import { useClockNow, type Clock } from './useClock';
import ShareLocationDialog from './ShareLocationDialog';
import type { EventDayApi, EventDayOutcome } from './useEventDay';

const POLL_ACTIVE_MS = 15_000;
const POLL_IDLE_MS = 60_000;
const MIN_REFETCH_GAP_MS = 5_000;
/** A "can't find you" older than this no longer needs a banner. */
const CANT_FIND_FRESH_MS = 10 * 60_000;
/** After one of these the state can never improve on its own: stop asking. */
const FINAL_FAILURES = new Set(['featureUnavailable', 'notFound', 'windowClosed', 'notConfirmed', 'notParticipant']);

export interface EventDayConfig {
  api: EventDayApi;
  /** Time source; the real card uses `Date.now`. */
  clock?: Clock;
  /** Location source; the real card uses the browser. Only ever called after consent. */
  locate?: Locate;
}

const realClock: Clock = () => Date.now();

/**
 * The event-day card of one CONFIRMED meeting: from 30 minutes before it starts to 15
 * minutes after it ends. In person: where to meet, "I've arrived", "I can't find you" and a
 * consent-gated, 15-minute location pin. Online: only the join link. Outside the window it
 * renders nothing at all, and nothing is requested from the server.
 */
export default function EventDayCard({ meeting, eventId, config }: { meeting: Meeting; eventId: string; config: EventDayConfig }) {
  const clock = config.clock ?? realClock;
  const client = useIsClient();
  const now = useClockNow(clock, 30_000);
  if (!client || !showsEventDayCard(meeting, now)) return null;
  return allowsArrivalAndLocation(meeting)
    ? <InPerson meeting={meeting} eventId={eventId} config={config} clock={clock} />
    : <OnlineDay meeting={meeting} />;
}

function Header({ title, subtitle, icon }: { title: string; subtitle?: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`grid size-11 shrink-0 place-items-center rounded-full ${TONE_CLASS.brand}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <h4 className="text-base font-semibold text-text-primary">{title}</h4>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

const cardClass = 'space-y-4 rounded-2xl border border-border-brand/40 bg-surface-brand-subtle/40 p-4';

function OnlineDay({ meeting }: { meeting: Meeting }) {
  const t = useTranslations('networkingEventDay.day');
  const url = meeting.onlineUrl && isHttpsUrl(meeting.onlineUrl) ? meeting.onlineUrl : null;
  return (
    <section data-testid="eventday-card" data-mode="online" aria-label={t('title')} className={cardClass}>
      <Header title={t('online.title')} subtitle={t('online.body')} icon={<Video className="size-5" aria-hidden />} />
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className={btnPrimary} data-testid="eventday-join">
          <Video className="size-4" aria-hidden />{t('online.join')}<ExternalLink className="size-3.5" aria-hidden /><span className="sr-only">{t('opensNewTab')}</span>
        </a>
      )}
    </section>
  );
}

type Busy = null | 'arrive' | 'cantfind' | 'share' | 'stop';

function InPerson({ meeting, eventId, config, clock }: { meeting: Meeting; eventId: string; config: EventDayConfig; clock: Clock }) {
  const t = useTranslations('networkingEventDay');
  const td = useTranslations('networkingEventDay.day');
  const locale = useLocale();
  const { api } = config;
  const locate = config.locate ?? browserLocate;
  const meetingId = meeting.meetingId;
  const cp = meeting.counterpart;
  const name = cp?.displayName?.trim() || td('thisPerson');
  const tz = meeting.timezone || 'UTC';

  const [day, setDay] = useState<EventDayState | null>(null);
  const [loadKey, setLoadKey] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [geo, setGeo] = useState<LocateFailureReason | null>(null);
  const [consent, setConsent] = useState(false);
  const [announce, setAnnounce] = useState('');
  // From a refused press: when I may press again (retryAfterSeconds), or that no presses are left.
  const [pressAgainAt, setPressAgainAt] = useState<string | null>(null);
  const [noPressesLeft, setNoPressesLeft] = useState(false);

  const sharingUntil = day?.mySharingExpiresAt ?? null;
  const stateCooldown = day?.cantFindAvailableAt ?? null;
  const cooldownUntil = pressAgainAt && (!stateCooldown || Date.parse(pressAgainAt) > Date.parse(stateCooldown)) ? pressAgainAt : stateCooldown;
  // One-second ticks only while something visibly counts down.
  const probe = clock();
  const ticking = remainingMs(sharingUntil, probe) > 0 || remainingMs(cooldownUntil, probe) > 0;
  const nowMs = useClockNow(clock, ticking ? 1000 : null);
  const sharingLeft = remainingMs(sharingUntil, nowMs);
  const sharing = sharingUntil !== null && sharingLeft > 0;
  const cooldownLeft = remainingMs(cooldownUntil, nowMs);
  const pin = day?.counterpartPin && remainingMs(day.counterpartPin.expiresAt, nowMs) > 0 ? day.counterpartPin : null;

  const clockRef = useRef(clock);
  clockRef.current = clock;
  const apiRef = useRef(api);
  apiRef.current = api;
  const sharingRef = useRef(false);
  sharingRef.current = sharing;
  const activeRef = useRef(false);
  activeRef.current = sharing || Boolean(pin);

  const apply = useCallback((out: EventDayOutcome, said?: string) => {
    if (out.ok) {
      setDay(out.state);
      setErrorKey(null);
      if (said) setAnnounce(said);
      setNoPressesLeft(false);
    } else if (out.key === 'cantFindCooldown' && typeof out.retryAfterSeconds === 'number') {
      // Not an error to show: the button counts down (or says there are no presses left).
      setErrorKey(null);
      if (out.retryAfterSeconds > 0) setPressAgainAt(new Date(clockRef.current() + out.retryAfterSeconds * 1000).toISOString());
      else setNoPressesLeft(true);
    } else {
      setErrorKey(out.key);
    }
    return out.ok;
  }, []);

  // Read the state: now, again when the tab comes back, and on a slow timer (15 s while anyone shares).
  // Hidden tabs ask for nothing.
  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let last = 0;
    let stopped = false;
    const load = async () => {
      if (!live || stopped) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      last = Date.now();
      const out = await apiRef.current.state(meetingId);
      if (!live) return;
      if (out.ok) {
        setDay(out.state);
        setLoadKey(null);
      } else {
        setLoadKey(out.key);
        if (FINAL_FAILURES.has(out.key)) stopped = true;
      }
    };
    const schedule = () => {
      timer = setTimeout(async () => {
        await load();
        if (live && !stopped) schedule();
      }, activeRef.current ? POLL_ACTIVE_MS : POLL_IDLE_MS);
    };
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < MIN_REFETCH_GAP_MS) return;
      void load();
    };
    void load();
    schedule();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      live = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [meetingId]);

  // Leaving the card (or the meeting day ending) while sharing ends the share. The server's 15-minute
  // expiry is only the backstop.
  useEffect(() => () => {
    if (sharingRef.current) void apiRef.current.stop(meetingId);
  }, [meetingId]);

  // The share ran out: say so and clear it (the server has already dropped the pin).
  const expiredFor = useRef<string | null>(null);
  useEffect(() => {
    if (!sharingUntil || sharingLeft > 0 || expiredFor.current === sharingUntil) return;
    expiredFor.current = sharingUntil;
    void apiRef.current.stop(meetingId);
    setDay((d) => (d ? { ...d, mySharingExpiresAt: null } : d));
    setAnnounce(td('expired'));
  }, [sharingUntil, sharingLeft, meetingId, td]);

  // One calm sentence per minute for screen readers; the visible timer itself is silent.
  const minutes = wholeMinutesLeft(sharingLeft);
  const [spoken, setSpoken] = useState('');
  useEffect(() => {
    if (sharing) setSpoken(td('sharingAnnounce', { count: minutes }));
    else setSpoken('');
  }, [sharing, minutes, td]);

  const run = async (kind: Exclude<Busy, null>, fn: () => Promise<EventDayOutcome>, said: string) => {
    setBusy(kind);
    setErrorKey(null);
    try {
      apply(await fn(), said);
    } finally {
      setBusy(null);
    }
  };

  const startShare = async () => {
    setConsent(false);
    setGeo(null);
    setBusy('share');
    setErrorKey(null);
    try {
      // First (and only) place the browser is asked for a position: after the person said yes.
      const position = await locate();
      apply(await api.share(meetingId, position), td('sharingStarted'));
    } catch (err) {
      setGeo(locateReason(err));
    } finally {
      setBusy(null);
    }
  };

  const stopShare = () => void run('stop', () => api.stop(meetingId), td('stopped'));

  const place = meeting.meetingPoint;
  const venueUrl = mapsAddressUrl(day?.venueAddress);
  const pinUrl = pin ? mapsPointUrl(pin.latitude, pin.longitude) : null;
  const username = (cp?.username ?? '').trim();
  const time = (iso: string) => formatTimeInZone(iso, locale, tz);
  const cantFindFresh = day?.counterpartCantFindAt && nowMs - Date.parse(day.counterpartCantFindAt) < CANT_FIND_FRESH_MS && !day.myArrivedAt;
  const startLabel = meeting.slot ? td('startsAt', { time: time(meeting.slot.startAt) }) : undefined;

  return (
    <section data-testid="eventday-card" data-mode="in-person" aria-label={td('title')} className={cardClass}>
      <Header title={td('title')} subtitle={startLabel} icon={<CalendarCheck className="size-5" aria-hidden />} />

      <div>
        <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{td('where')}</h5>
        <p className="mt-1 flex items-start gap-1.5 text-sm text-text-primary" data-testid="eventday-place">
          <MapPin className="mt-0.5 size-4 shrink-0 text-text-brand" aria-hidden />
          {place ? (
            <span>{place.name}{place.directions ? <span className="block text-xs text-muted-foreground">{place.directions}</span> : null}</span>
          ) : (
            <span>{td('noPoint', { name })}</span>
          )}
        </p>
        {venueUrl && (
          <a href={venueUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-6 items-center gap-1 text-sm text-text-brand underline" data-testid="eventday-venue-map">
            {td('openVenueMap')}<ExternalLink className="size-3.5" aria-hidden /><span className="sr-only">{td('opensNewTab')}</span>
          </a>
        )}
      </div>

      <div aria-live="polite" aria-atomic="false" className="space-y-1.5 text-sm text-text-primary" data-testid="eventday-status">
        {day?.myArrivedAt && <p data-testid="eventday-my-arrival">{td('arrivedAt', { time: time(day.myArrivedAt) })}</p>}
        {day?.counterpartArrivedAt && <p data-testid="eventday-their-arrival">{td('otherArrivedAt', { name, time: time(day.counterpartArrivedAt) })}</p>}
        {cantFindFresh && <p data-testid="eventday-cant-find-notice" className="rounded-xl bg-surface-warning px-3 py-2">{td('cantFindNotice', { name })}</p>}
        <span className="sr-only" data-testid="eventday-announce">{announce}</span>
      </div>

      {loadKey && !day && <p role="alert" data-testid="eventday-load-error" className="text-sm text-text-danger">{t(`errors.${loadKey}`)}</p>}
      {errorKey && <p role="alert" data-testid="eventday-error" data-error={errorKey} className="rounded-xl border border-border-danger bg-surface-danger px-4 py-3 text-sm text-text-primary">{t(`errors.${errorKey}`)}</p>}

      <div className="flex flex-wrap gap-2" data-testid="eventday-actions">
        {cp?.available && <Link href={personHref(eventId, cp.handle)} className={btnQuiet} data-testid="eventday-profile"><UserRound className="size-4" aria-hidden />{td('viewProfile')}</Link>}
        {username && <Link href={profileUrl({ username })} className={btnQuiet} data-testid="eventday-message"><MessageCircle className="size-4" aria-hidden />{td('message')}</Link>}
        {!day?.myArrivedAt && (
          <button type="button" disabled={busy !== null} onClick={() => void run('arrive', () => api.arrived(meetingId), td('arrivedSaid'))} className={btnPrimary} data-testid="eventday-arrived">
            {busy === 'arrive' && <Loader2 className="size-4 animate-spin" aria-hidden />}{td('arrived')}
          </button>
        )}
        <button
          type="button"
          disabled={busy !== null || cooldownLeft > 0 || noPressesLeft}
          onClick={() => void run('cantfind', () => api.cantFind(meetingId), td('cantFindSent', { name }))}
          className={btnQuiet}
          data-testid="eventday-cant-find"
          aria-describedby="eventday-cant-find-hint"
        >
          {busy === 'cantfind' && <Loader2 className="size-4 animate-spin" aria-hidden />}{td('cantFind')}
        </button>
      </div>
      <p id="eventday-cant-find-hint" className="-mt-2 text-xs text-muted-foreground" data-testid="eventday-cant-find-hint">
        {noPressesLeft ? td('cantFindNone') : cooldownLeft > 0 ? td('cantFindCooldown', { time: formatCountdown(cooldownLeft) }) : td('cantFindHint', { name })}
      </p>

      <div className="space-y-3 border-t border-border-subtle pt-4">
        <div className="flex items-start gap-3">
          <span className={`grid size-9 shrink-0 place-items-center rounded-full ${TONE_CLASS.info}`}><MapPinned className="size-4" aria-hidden /></span>
          <div className="min-w-0 flex-1">
            <h5 className="text-sm font-semibold text-text-primary">{td('locationTitle')}</h5>
            <p className="text-xs text-muted-foreground">{td('locationBody', { name })}</p>
          </div>
        </div>

        {sharing ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-info px-4 py-3" data-testid="eventday-sharing">
            <p className="min-w-0 flex-1 text-sm text-text-primary">
              {td('sharing')}{' '}
              <span role="timer" aria-live="off" className="font-semibold tabular-nums" data-testid="share-countdown">{formatCountdown(sharingLeft)}</span>
            </p>
            <button type="button" disabled={busy !== null} onClick={stopShare} className={btnQuiet} data-testid="eventday-stop">
              {busy === 'stop' && <Loader2 className="size-4 animate-spin" aria-hidden />}{td('stop')}
            </button>
          </div>
        ) : (
          <button type="button" disabled={busy !== null} onClick={() => { setGeo(null); setConsent(true); }} className={btnQuiet} data-testid="eventday-share">
            {busy === 'share' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <MapPinned className="size-4" aria-hidden />}
            {busy === 'share' ? td('locating') : td('share')}
          </button>
        )}
        <p aria-live="polite" className="sr-only" data-testid="share-spoken">{spoken}</p>

        {geo && (
          <div role="alert" data-testid="eventday-geo-error" data-reason={geo} className="rounded-xl border border-border-danger bg-surface-danger px-4 py-3 text-sm text-text-primary">
            <p>{td(`geo.${geo}`, { name })}</p>
            {geo !== 'denied' && geo !== 'unsupported' && (
              <button type="button" onClick={() => setConsent(true)} className={`${btnQuiet} mt-2`} data-testid="eventday-geo-retry">{td('geo.retry')}</button>
            )}
          </div>
        )}

        {pin && pinUrl && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-success px-4 py-3" data-testid="eventday-their-pin">
            <p className="min-w-0 flex-1 text-sm text-text-primary">{td('otherSharing', { name })}</p>
            <a href={pinUrl} target="_blank" rel="noopener noreferrer" className={btnQuiet} data-testid="eventday-open-pin">
              <ExternalLink className="size-4" aria-hidden />{td('openPin', { name })}<span className="sr-only">{td('opensNewTab')}</span>
            </a>
          </div>
        )}
      </div>

      <ShareLocationDialog open={consent} name={name} onConfirm={() => void startShare()} onCancel={() => setConsent(false)} />
    </section>
  );
}
