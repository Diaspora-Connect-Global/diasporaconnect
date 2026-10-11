'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Check, Loader2, MessageCircle, UserPlus } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import PersonCard from './PersonCard';
import { Chip, focusRing } from './primitives';
import { useConnect, useRespondToInterest, useWithdrawInterest, type MatchItem, type Paged } from './useNetworking';
import { profileUrl } from '@/lib/profileUrl';
import type { LabelFn } from '@/lib/networkingTaxonomy';
import type { ConnectionStatus, InterestEntry, NetworkingCard, ProfileFields } from '@/services/gql/networking';

const btn = `inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-medium disabled:opacity-50 ${focusRing}`;
const brand = `${btn} border-border-brand bg-surface-brand text-text-white hover:opacity-90`;
const quiet = `${btn} border-border-subtle text-text-primary hover:bg-surface-subtle`;

interface Common {
  eventId: string;
  me: ProfileFields | null;
  labelOf: LabelFn;
}

function Shell({ kind, loading, hasMore, onLoadMore, empty, children }: { kind: string; loading: boolean; hasMore: boolean; onLoadMore: () => void; empty: boolean; children: React.ReactNode }) {
  const t = useTranslations('networking.interestsPanel');
  return (
    <div data-testid={`panel-${kind}`} className="space-y-4">
      <p className="text-sm text-muted-foreground">{t(`${kind}.intro`)}</p>
      {empty && !loading ? (
        <p className="rounded-2xl border border-dashed border-border-subtle bg-surface-default p-8 text-center text-sm text-muted-foreground">{t(`${kind}.empty`)}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</ul>
      )}
      {loading && <Loader2 className="mx-auto size-5 animate-spin text-text-brand" aria-label={t('loading')} />}
      {hasMore && !loading && (
        <div className="text-center">
          <button type="button" onClick={onLoadMore} className={`min-h-11 rounded-full border border-border-brand px-6 text-sm font-medium text-text-brand ${focusRing}`}>{t('loadMore')}</button>
        </div>
      )}
    </div>
  );
}

/** "Interested in you": Accept (a match) or Not now (the sender is never told). */
export function InterestedInYouPanel({ eventId, me, labelOf, cards, loading, hasMore, onLoadMore, onRemove }: Common & { cards: NetworkingCard[]; loading: boolean; hasMore: boolean; onLoadMore: () => void; onRemove: (handle: string) => void }) {
  const t = useTranslations('networking.interestsPanel');
  const respond = useRespondToInterest(eventId);
  const [busy, setBusy] = useState<string | null>(null);
  const answer = async (card: NetworkingCard, accept: boolean) => {
    setBusy(card.handle);
    const r = await respond(card.handle, accept);
    setBusy(null);
    if (!r) return;
    // The decline copy is for the recipient only: nothing here suggests the sender is told.
    if (accept) toast.success(t('interested.accepted', { name: card.displayName ?? '' }));
    else toast(t('interested.dismissed'));
    onRemove(card.handle);
  };
  return (
    <Shell kind="interested" loading={loading} hasMore={hasMore} onLoadMore={onLoadMore} empty={cards.length === 0}>
      {cards.map((c) => (
        <li key={c.handle}>
          <PersonCard
            eventId={eventId}
            card={c}
            me={me}
            labelOf={labelOf}
            onBlocked={onRemove}
            footer={
              <div className="flex flex-wrap gap-2" data-testid="inbox-actions">
                <button type="button" disabled={busy === c.handle} onClick={() => void answer(c, false)} className={quiet} data-testid="inbox-not-now">{t('interested.notNow')}</button>
                <button type="button" disabled={busy === c.handle} onClick={() => void answer(c, true)} className={brand} data-testid="inbox-accept"><Check className="size-4" aria-hidden />{t('interested.accept')}</button>
              </div>
            }
          />
        </li>
      ))}
    </Shell>
  );
}

/** "My matches": Connect (already-connected is said plainly) and Message via the person's profile. */
export function MatchesPanel({ eventId, me, labelOf, paged }: Common & { paged: Paged<MatchItem> }) {
  const t = useTranslations('networking.interestsPanel');
  const connect = useConnect(eventId);
  const [busy, setBusy] = useState<string | null>(null);
  const [state, setState] = useState<Record<string, ConnectionStatus | 'ALREADY'>>({});
  const doConnect = async (card: NetworkingCard) => {
    setBusy(card.handle);
    const r = await connect(card.handle);
    setBusy(null);
    if (!r) return;
    if (r.preExisting) {
      setState((s) => ({ ...s, [card.handle]: 'ALREADY' }));
      toast(t('matches.alreadyConnected'));
    } else {
      setState((s) => ({ ...s, [card.handle]: r.connectionStatus ?? 'PENDING_SENT' }));
      toast.success(r.connectionStatus === 'CONNECTED' ? t('matches.nowConnected') : t('matches.requestSent'));
    }
  };
  return (
    <Shell kind="matches" loading={paged.loading} hasMore={paged.hasMore} onLoadMore={paged.loadMore} empty={paged.items.length === 0}>
      {paged.items.map(({ card }) => {
        const status = state[card.handle] ?? card.connectionStatus ?? null;
        const connected = status === 'CONNECTED' || status === 'ALREADY';
        const pending = status === 'PENDING_SENT';
        const username = (card.username ?? '').trim();
        return (
          <li key={card.handle}>
            <PersonCard
              eventId={eventId}
              card={card}
              me={me}
              labelOf={labelOf}
              onBlocked={paged.remove}
              footer={
                <div className="flex flex-wrap gap-2" data-testid="match-actions">
                  {connected ? (
                    <Chip tone="success">{status === 'ALREADY' ? t('matches.alreadyConnected') : t('matches.connected')}</Chip>
                  ) : (
                    <button type="button" disabled={busy === card.handle || pending} onClick={() => void doConnect(card)} className={brand} data-testid="match-connect">
                      <UserPlus className="size-4" aria-hidden />{pending ? t('matches.requested') : t('matches.connect')}
                    </button>
                  )}
                  {username && (
                    <Link href={profileUrl({ username })} className={quiet} data-testid="match-message"><MessageCircle className="size-4" aria-hidden />{t('matches.message')}</Link>
                  )}
                </div>
              }
            />
          </li>
        );
      })}
    </Shell>
  );
}

/**
 * "My interests": the sender's view. Only Pending / Mutual / Expired exist. There is
 * deliberately no declined wording or state anywhere: a "not now" reads as Pending.
 */
export function MyInterestsPanel({ eventId, me, labelOf, paged }: Common & { paged: Paged<InterestEntry> }) {
  const t = useTranslations('networking.interestsPanel');
  const withdraw = useWithdrawInterest(eventId);
  const [busy, setBusy] = useState<string | null>(null);
  const doWithdraw = async (handle: string) => {
    setBusy(handle);
    const ok = await withdraw(handle);
    setBusy(null);
    if (ok) {
      toast(t('interests.withdrawn'));
      paged.remove(handle);
    }
  };
  const status = (e: InterestEntry) => (
    <div className="flex flex-wrap items-center gap-2" data-testid="interest-status" data-status={e.status}>
      <Chip tone={e.status === 'MUTUAL' ? 'success' : 'default'}>{t(`interests.status.${e.status}`)}</Chip>
      {e.status === 'PENDING' && (
        <button type="button" disabled={busy === e.handle} onClick={() => void doWithdraw(e.handle)} className={`${quiet} flex-none`} data-testid="interest-withdraw">{t('interests.withdraw')}</button>
      )}
    </div>
  );
  return (
    <Shell kind="interests" loading={paged.loading} hasMore={paged.hasMore} onLoadMore={paged.loadMore} empty={paged.items.length === 0}>
      {paged.items.map((e) =>
        e.card && e.personAvailable ? (
          <li key={e.handle}>
            <PersonCard eventId={eventId} card={e.card} me={me} labelOf={labelOf} onBlocked={paged.remove} footer={status(e)} />
          </li>
        ) : (
          <li key={e.handle}>
            <article data-testid="interest-unavailable" className="flex h-full flex-col gap-3 rounded-2xl border border-border-subtle bg-surface-default p-4">
              <p className="text-sm text-muted-foreground">{t('interests.unavailable')}</p>
              {status(e)}
            </article>
          </li>
        ),
      )}
    </Shell>
  );
}
