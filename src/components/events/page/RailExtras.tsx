'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useLocale, useTranslations } from 'next-intl';
import { Link2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from '@/i18n/navigation';
import { ButtonType1 } from '@/components/custom/button';
import { getEventLocationDisplay } from '@/services/gql/events';
import { SIMILAR_EVENTS } from '@/services/gql/eventsM2';

/** Absolute page URL with an attribution tag, so a registration can say how the person arrived. */
function pageUrl(locale: string, eventId: string, source: 'SHARE_LINK' | 'QR_CODE'): string {
  return `${window.location.origin}/${locale}/events/${eventId}?source=${source}`;
}

/**
 * Share link + QR. The URL is copied or handed to the share sheet, never printed
 * in the UI. `qrcode` is already a dependency (the ticket page uses it); it is
 * imported lazily so it is not in the event page's first bundle.
 */
export function ShareCard({ eventId, title }: { eventId: string; title: string }) {
  const t = useTranslations('eventPage.share');
  const locale = useLocale();
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('qrcode')
      .then((m) => m.toDataURL(pageUrl(locale, eventId, 'QR_CODE'), { margin: 1, width: 224, color: { dark: '#0f172a', light: '#ffffff' } }))
      .then((url) => {
        if (!cancelled) setQr(url);
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId, locale]);

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
      <h2 id="share-card-title" className="text-base font-semibold text-text-primary">{t('title')}</h2>
      <div className="flex flex-wrap gap-2">
        <ButtonType1 onClick={onCopy} className="flex items-center gap-2"><Link2 className="size-4" aria-hidden />{t('copy')}</ButtonType1>
        <ButtonType1 onClick={onShare} className="flex items-center gap-2"><Share2 className="size-4" aria-hidden />{t('share')}</ButtonType1>
      </div>
      {qr && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qr} alt={t('qrAlt')} width={112} height={112} className="rounded-lg border border-border-subtle bg-white p-1" data-testid="event-qr" />
      )}
    </section>
  );
}

interface SimilarRow {
  id: string;
  title: string;
  startAt: string;
  eventCategory?: string | null;
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
      <h2 id="similar-title" className="text-base font-semibold text-text-primary">{t('title')}</h2>
      <ul className="space-y-3">
        {rows.map((e) => (
          <li key={e.id}>
            <Link href={`/events/${e.id}`} className="block rounded-lg p-1 -m-1 hover:bg-surface-hover">
              <p className="line-clamp-2 text-sm font-medium text-text-primary">{e.title}</p>
              <p className="text-xs text-text-secondary">
                {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(e.startAt))} · {getEventLocationDisplay(e as never)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
