'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, CheckCircle2, ExternalLink, Link2, MapPin, QrCode, Share2, Sparkles, UsersRound } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from '@/i18n/navigation';
import { ButtonType1 } from '@/components/custom/button';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import { EVENT_PLACEHOLDER_IMAGE, getEventCoverImage, getEventLocationDisplay, getEventVenueLines } from '@/services/gql/events';
import { SIMILAR_EVENTS, type EventPageEvent } from '@/services/gql/eventsM2';
import { canStartRegistration, type RegistrationUiState } from '@/lib/eventRegistrationState';
import type { OrganiserView } from './organiser';

/** Absolute page URL with an attribution tag, so a registration can say how the person arrived. */
function pageUrl(locale: string, eventId: string, source: 'SHARE_LINK' | 'QR_CODE'): string {
  return `${window.location.origin}/${locale}/events/${eventId}?source=${source}`;
}

/** QR code of the event page (attribution `QR_CODE`) as a data URL; lazily imported, null until ready or on failure. */
export function useEventQr(eventId: string, enabled = true, width = 224): string | null {
  const locale = useLocale();
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    import('qrcode')
      .then((m) => m.toDataURL(pageUrl(locale, eventId, 'QR_CODE'), { margin: 1, width, color: { dark: '#0f172a', light: '#ffffff' } }))
      .then((url) => {
        if (!cancelled) setQr(url);
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId, locale, enabled, width]);
  return qr;
}

/**
 * Share link + QR. The URL is copied or handed to the share sheet, never printed
 * in the UI. `qrcode` is imported lazily so it is not in the page's first bundle;
 * the code is only generated once someone asks for it.
 */
export function ShareCard({ eventId, title }: { eventId: string; title: string }) {
  const t = useTranslations('eventPage.share');
  const locale = useLocale();
  const [showQr, setShowQr] = useState(false);
  const qr = useEventQr(eventId, showQr);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl(locale, eventId, 'SHARE_LINK'));
      toast.success(t('copied'));
    } catch {
      toast.error(t('failed'));
    }
  };
  const onShare = async () => {
    const url = pageUrl(locale, eventId, 'SHARE_LINK');
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* cancelled: fall back to copying */
      }
    }
    await onCopy();
  };

  return (
    <section aria-labelledby="share-card-title" data-testid="share-card" className="space-y-3 rounded-2xl border border-border-subtle bg-surface-default p-4">
      <div>
        <h2 id="share-card-title" className="text-base font-semibold text-text-primary">{t('title')}</h2>
        <p className="text-xs text-text-secondary">{t('sub')}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ButtonType1 onClick={onShare} className="flex items-center justify-center gap-2"><Share2 className="size-4" aria-hidden />{t('inviteLink')}</ButtonType1>
        <ButtonType1 onClick={() => setShowQr((v) => !v)} aria-expanded={showQr} className="flex items-center justify-center gap-2"><QrCode className="size-4" aria-hidden />{t('qr')}</ButtonType1>
      </div>
      {showQr && qr && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qr} alt={t('qrAlt')} width={144} height={144} className="mx-auto rounded-lg border border-border-subtle bg-white p-1" data-testid="event-qr" />
      )}
    </section>
  );
}

/** Closing nudge toward the organiser community; only for someone who is not in it yet. */
export function GrowNetworkCard({ organiser }: { organiser: OrganiserView | null }) {
  const t = useTranslations('eventPage.grow');
  if (!organiser || organiser.standing !== 'none') return null;
  return (
    <Link
      href={organiser.href}
      data-testid="grow-network"
      className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-gradient-to-br from-surface-info to-surface-default p-4 hover:border-border-brand"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-default text-text-brand"><UsersRound className="size-5" aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-text-primary">{t('title')}</span>
        <span className="block text-xs text-text-secondary">{t('body', { name: organiser.entity.name })}</span>
      </span>
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-brand text-text-white"><ArrowRight className="size-4" aria-hidden /></span>
    </Link>
  );
}

/**
 * Right rail of the Register tab. Every block is real: the venue is the event's,
 * the highlights are its own tags, and "what's included" is not shown at all because
 * events carry no such list. The QR + link block hands the page over to a phone.
 */
export function RegisterRail({ event, state }: { event: EventPageEvent; state: RegistrationUiState }) {
  const t = useTranslations('eventPage.registerRail');
  const tState = useTranslations('eventPage.rail.states');
  const locale = useLocale();
  const qr = useEventQr(event.id, true, 200);
  const v = getEventVenueLines(event);
  const mapQuery = [v.venueName, ...v.addressLines].filter(Boolean).join(', ');
  const open = canStartRegistration(state);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl(locale, event.id, 'SHARE_LINK'));
      toast.success(t('copied'));
    } catch {
      toast.error(t('copyFailed'));
    }
  };
  return (
    <div className="space-y-4" data-testid="register-rail">
      <section className="space-y-2 rounded-2xl border border-border-subtle bg-surface-default p-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-success px-2.5 py-1 text-xs font-medium text-text-success">
          <CheckCircle2 className="size-3.5" aria-hidden />
          {open ? tState('open') : tState(state, { date: '' })}
        </span>
        <h2 className="text-base font-bold text-text-primary">{t('stepsTitle')}</h2>
        <p className="text-sm text-text-secondary">{t('stepsBody')}</p>
      </section>

      {event.tags && event.tags.length > 0 && (
        <section aria-labelledby="rr-highlights" className="rounded-2xl border border-border-subtle bg-surface-default p-4">
          <h2 id="rr-highlights" className="text-base font-bold text-text-primary">{t('highlights')}</h2>
          <ul className="mt-3 space-y-2.5">
            {event.tags.map((tag) => (
              <li key={tag} className="flex items-center gap-3 text-sm text-text-primary">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-info text-text-brand"><Sparkles className="size-4" aria-hidden /></span>
                {tag}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-border-subtle bg-surface-default p-4">
        <div className="flex items-center gap-3">
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt={t('qrAlt')} width={80} height={80} className="size-20 shrink-0 rounded-lg border border-border-subtle bg-white p-1" />
          )}
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-text-primary">{t('helpTitle')}</h2>
            <p className="mt-1 text-xs text-text-secondary">{t('helpBody')}</p>
            <button type="button" onClick={onCopy} className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-full border border-border-brand px-3 text-xs font-medium text-text-brand hover:bg-surface-info">
              <Link2 className="size-3.5" aria-hidden />{t('copyLink')}
            </button>
          </div>
        </div>
      </section>

      {(v.venueName || v.addressLines.length > 0) && (
        <section className="rounded-2xl border border-border-subtle bg-surface-default p-4" data-testid="register-rail-venue">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-text-brand" aria-hidden />
            <div className="min-w-0 text-sm">
              {v.venueName && <p className="font-medium text-text-primary">{v.venueName}</p>}
              {v.addressLines.map((l) => <p key={l} className="text-text-secondary">{l}</p>)}
            </div>
          </div>
          {mapQuery && (
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-text-brand hover:underline">
              {t('viewOnMap')} <ExternalLink className="size-3" aria-hidden />
            </a>
          )}
        </section>
      )}
    </div>
  );
}

interface SimilarRow {
  id: string;
  title: string;
  startAt: string;
  eventCategory?: string | null;
  coverImageUrl?: string | null;
  status?: string | null;
  visibility?: string | null;
  locationType: 'physical' | 'virtual' | 'hybrid';
  locationDetails?: { venueName?: string | null; city?: string | null; country?: string | null } | null;
}

/**
 * Future events in the same category. The gateway has no category filter yet, so
 * this searches by the category word and keeps only exact-category, public,
 * upcoming rows. No rows → the section is not rendered.
 */
export function SimilarEvents({ eventId, category }: { eventId: string; category?: string | null }) {
  const t = useTranslations('eventPage.similar');
  const locale = useLocale();
  const { data } = useQuery<{ searchEvents?: { events?: SimilarRow[] } | null }>(SIMILAR_EVENTS, {
    variables: { input: { searchTerm: category, status: 'published', limit: 30 } },
    skip: !category,
  });
  const rows = useMemo(() => {
    const now = Date.now();
    const wanted = String(category ?? '').trim().toLowerCase();
    return (data?.searchEvents?.events ?? [])
      .filter(
        (e) =>
          e.id !== eventId &&
          String(e.eventCategory ?? '').trim().toLowerCase() === wanted &&
          new Date(e.startAt).getTime() > now &&
          String(e.visibility ?? 'public').toLowerCase() === 'public',
      )
      .sort((a, b) => a.startAt.localeCompare(b.startAt))
      .slice(0, 4);
  }, [data, eventId, category]);

  if (rows.length === 0) return null;
  return (
    <section aria-labelledby="similar-title" data-testid="similar-events" className="space-y-3 rounded-2xl border border-border-subtle bg-surface-default p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="similar-title" className="text-base font-semibold text-text-primary">{t('title')}</h2>
        <Link href="/events" className="inline-flex items-center gap-1 text-xs font-medium text-text-brand hover:underline">{t('viewAll')} <ArrowRight className="size-3" aria-hidden /></Link>
      </div>
      <ul className="space-y-3">
        {rows.map((e) => (
          <li key={e.id}>
            <Link href={`/events/${e.id}`} className="-m-1 flex gap-3 rounded-lg p-1 hover:bg-surface-hover">
              <ImageWithFallback src={getEventCoverImage(e)} fallbackSrc={EVENT_PLACEHOLDER_IMAGE} alt="" className="size-14 shrink-0 rounded-lg bg-surface-subtle object-cover" />
              <span className="min-w-0">
                <span className="line-clamp-2 block text-sm font-medium text-text-primary">{e.title}</span>
                <span className="block text-xs text-text-secondary">
                  {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(e.startAt))} · {getEventLocationDisplay(e as never)}
                </span>
                {e.eventCategory && <span className="mt-1 inline-block rounded-full bg-surface-info px-2 py-0.5 text-[11px] text-text-brand">{e.eventCategory}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
