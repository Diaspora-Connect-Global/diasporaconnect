'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bookmark, Loader2, MapPin, Star, X } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Chip, InlineNotice, PersonAvatar, TierBadge, focusRing } from './primitives';
import { ChipRow, ReasonLines } from './PersonParts';
import PersonCard, { personHref } from './PersonCard';
import { sharedCodes } from '@/lib/networkingReasons';
import type { LabelFn } from '@/lib/networkingTaxonomy';
import type { NetworkingCard, NetworkingDecision, ProfileFields } from '@/services/gql/networking';

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    if (!mq) return;
    setReduced(mq.matches);
    const on = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

const SWIPE_PX = 90;

export interface DeckProps {
  eventId: string;
  cards: NetworkingCard[];
  me: ProfileFields | null;
  labelOf: LabelFn;
  hasMore: boolean;
  loading: boolean;
  refreshing?: boolean;
  reviewingSkipped?: boolean;
  /** Resolves true when the decision was saved. */
  onDecide: (handle: string, decision: NetworkingDecision) => Promise<boolean>;
  /** Only passed while the interests backend is released. */
  onInterested?: (handle: string) => Promise<boolean>;
  onNeedMore?: () => void;
}

/**
 * One person at a time. Buttons are the primary control; arrow keys and (on
 * touch, unless the person prefers reduced motion) a horizontal swipe are
 * shortcuts to the same actions. Nothing moves on its own.
 */
export default function DeckView({ eventId, cards, me, labelOf, hasMore, loading, refreshing, reviewingSkipped, onDecide, onInterested, onNeedMore }: DeckProps) {
  const t = useTranslations('networking.deck');
  const ta = useTranslations('networking.actions');
  const [done, setDone] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [announce, setAnnounce] = useState('');
  const [dx, setDx] = useState(0);
  const reduced = usePrefersReducedMotion();
  const start = useRef<{ x: number; y: number } | null>(null);

  const queue = useMemo(() => cards.filter((c) => !done.has(c.handle) && !c.isSelf), [cards, done]);
  const current = queue[0];
  const position = done.size + (current ? 1 : 0);
  const total = done.size + queue.length;

  useEffect(() => {
    if (queue.length <= 3 && hasMore && !loading) onNeedMore?.();
  }, [queue.length, hasMore, loading, onNeedMore]);

  useEffect(() => {
    if (current) setAnnounce(t('live.current', { name: current.displayName ?? '', position, total: hasMore ? `${total}+` : total }));
  }, [current?.handle]); // eslint-disable-line react-hooks/exhaustive-deps

  const decide = useCallback(
    async (handle: string, decision: NetworkingDecision) => {
      if (busy) return;
      setBusy(true);
      const name = cards.find((c) => c.handle === handle)?.displayName ?? '';
      const ok = await onDecide(handle, decision);
      setBusy(false);
      if (ok) {
        setDone((d) => new Set(d).add(handle));
        setAnnounce(t(decision === 'PASS' ? 'live.passed' : 'live.saved', { name }));
      }
    },
    [busy, cards, onDecide, t],
  );

  const interested = useCallback(
    async (handle: string) => {
      if (!onInterested || busy) return;
      setBusy(true);
      const name = cards.find((c) => c.handle === handle)?.displayName ?? '';
      const ok = await onInterested(handle);
      setBusy(false);
      if (ok) {
        setDone((d) => new Set(d).add(handle));
        setAnnounce(t('live.interested', { name }));
      }
    },
    [busy, cards, onInterested, t],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!current || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); void decide(current.handle, 'PASS'); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); void decide(current.handle, 'SKIP'); }
    else if (e.key === 'ArrowRight' && onInterested) { e.preventDefault(); void interested(current.handle); }
  };

  const swipeOn = !reduced;
  const onPointerDown = (e: React.PointerEvent) => {
    if (!swipeOn || e.pointerType === 'mouse') return;
    start.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const mx = e.clientX - start.current.x;
    const my = e.clientY - start.current.y;
    if (Math.abs(mx) > Math.abs(my)) setDx(Math.max(-140, Math.min(140, mx)));
  };
  const onPointerEnd = () => {
    const s = start.current;
    start.current = null;
    const moved = dx;
    setDx(0);
    if (!s || !current) return;
    if (moved <= -SWIPE_PX) void decide(current.handle, 'PASS');
    else if (moved >= SWIPE_PX) { if (onInterested) void interested(current.handle); else void decide(current.handle, 'SKIP'); }
  };

  const also = queue.slice(1, 5);
  const big = 'inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 text-base font-semibold disabled:opacity-50';

  return (
    <div data-testid="deck" className="space-y-5">
      <p role="status" aria-live="polite" data-testid="deck-live" className="sr-only">{announce}</p>

      {refreshing && <InlineNotice testId="deck-refreshing">{t('refreshing')}</InlineNotice>}
      {reviewingSkipped && queue.length > 0 && <InlineNotice testId="deck-reviewing">{t('reviewingSkipped')}</InlineNotice>}

      {!current ? (
        <section data-testid="deck-empty" className="rounded-2xl border border-dashed border-border-subtle bg-surface-default p-8 text-center">
          {loading ? <Loader2 className="mx-auto size-6 animate-spin text-text-brand" aria-label={t('loading')} /> : (
            <>
              <h2 className="text-lg font-semibold text-text-primary">{t('emptyTitle')}</h2>
              <p className="mt-1 text-sm text-text-secondary">{t('emptyBody')}</p>
              <Link href={`/events/${eventId}/networking?tab=people`} className={`mt-4 inline-flex min-h-11 items-center rounded-full border border-border-brand px-5 text-sm font-medium text-text-brand ${focusRing}`}>{t('browsePeople')}</Link>
            </>
          )}
        </section>
      ) : (
        <section
          role="group"
          aria-roledescription={t('roleDescription')}
          aria-label={t('groupLabel', { name: current.displayName ?? '' })}
          tabIndex={0}
          onKeyDown={onKeyDown}
          className={`rounded-2xl border border-border-subtle bg-surface-default p-4 sm:p-6 ${focusRing}`}
        >
          <div
            data-testid="deck-card"
            data-handle={current.handle}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            style={{ touchAction: 'pan-y', transform: swipeOn && dx ? `translateX(${dx}px) rotate(${dx / 40}deg)` : undefined, transition: dx ? 'none' : undefined }}
            className="grid gap-5 sm:grid-cols-[14rem_minmax(0,1fr)]"
          >
            <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl bg-surface-brand-subtle">
              {current.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={current.avatarUrl} alt="" className="size-full object-cover" />
              ) : (
                <PersonAvatar name={current.displayName} className="size-32 text-3xl" />
              )}
              {current.attendanceFormat && current.attendanceFormat !== 'EITHER' && (
                <span className="absolute bottom-3 left-3 rounded-full bg-black/65 px-3 py-1 text-xs font-medium text-white">{ta(`format.${current.attendanceFormat}`)}</span>
              )}
            </div>
            <div className="min-w-0 space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-text-primary">
                  <Link href={personHref(eventId, current.handle)} className={`hover:underline ${focusRing}`}>{current.displayName}</Link>
                </h2>
                <p className="text-sm text-text-secondary">{[current.headline, current.organization].filter(Boolean).join(' · ')}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {current.locationLabel && <Chip><MapPin className="mr-1 size-3" aria-hidden />{current.locationLabel}</Chip>}
                  <TierBadge tier={current.tier} mutualFit={current.mutualFit} />
                </div>
              </div>
              {current.needs.length > 0 && (
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-text-primary">{ta('lookingFor')}</h3>
                  <ChipRow codes={current.needs} labelOf={labelOf} max={5} tone="brand" />
                </div>
              )}
              {current.offers.length > 0 && (
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-text-primary">{ta('canOffer')}</h3>
                  <ChipRow codes={current.offers} labelOf={labelOf} max={5} tone="brand" />
                </div>
              )}
              {(current.reasons?.length ?? 0) > 0 && (
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-text-primary">{t('whyYouMatch')}</h3>
                  <ReasonLines card={current} me={me} labelOf={labelOf} limit={4} />
                </div>
              )}
              {sharedCodes(current, me).length > 0 && (
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-text-primary">{t('sharedInterests')}</h3>
                  <ChipRow codes={sharedCodes(current, me)} labelOf={labelOf} max={6} />
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="button" disabled={busy} onClick={() => void decide(current.handle, 'PASS')} data-testid="deck-pass" className={`${big} border-border-danger text-text-danger hover:bg-surface-danger ${focusRing}`}>
              <X className="size-5" aria-hidden />{ta('pass')}
            </button>
            <button type="button" disabled={busy} onClick={() => void decide(current.handle, 'SKIP')} data-testid="deck-skip" className={`${big} border-border-subtle text-text-primary hover:bg-surface-subtle ${focusRing}`}>
              <Bookmark className="size-5" aria-hidden />{ta('skipLong')}
            </button>
            {onInterested && (
              <button type="button" disabled={busy} onClick={() => void interested(current.handle)} data-testid="deck-interested" className={`${big} border-border-brand bg-surface-brand text-text-white hover:opacity-90 ${focusRing}`}>
                <Star className="size-5" aria-hidden />{ta('interested')}
              </button>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-text-secondary" data-testid="deck-position">
            {t('position', { position, total: hasMore ? `${total}+` : total })}
          </p>
          <p className="mt-1 text-center text-xs text-text-tertiary">{onInterested ? t('keysWithInterest') : t('keys')}</p>
        </section>
      )}

      {also.length > 0 && (
        <section aria-labelledby="also-like" className="rounded-2xl border border-border-subtle bg-surface-default p-4 sm:p-5">
          <h2 id="also-like" className="text-lg font-semibold text-text-primary">{t('alsoLike')}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {also.map((c) => (
              <li key={c.handle}>
                <PersonCard
                  eventId={eventId}
                  card={c}
                  me={me}
                  labelOf={labelOf}
                  actions={{ busy, onPass: (h) => void decide(h, 'PASS'), onInterested: onInterested ? (h) => void interested(h) : undefined }}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
