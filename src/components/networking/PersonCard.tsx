'use client';

import { useTranslations } from 'next-intl';
import { Bookmark, Star, X } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { PersonAvatar, TierBadge, focusRing } from './primitives';
import { ChipRow, ReasonLines, Subline } from './PersonParts';
import type { LabelFn } from '@/lib/networkingTaxonomy';
import type { NetworkingCard, ProfileFields } from '@/services/gql/networking';

export interface CardActionHandlers {
  onPass?: (handle: string) => void;
  onSkip?: (handle: string) => void;
  /** Present only while the interests backend is released. */
  onInterested?: (handle: string) => void;
  busy?: boolean;
}

export function personHref(eventId: string, handle: string): string {
  return `/events/${eventId}/networking/people/${encodeURIComponent(handle)}`;
}

const btn = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-medium disabled:opacity-50';

export function CardButtons({ card, actions, size = 'md' }: { card: NetworkingCard; actions: CardActionHandlers; size?: 'sm' | 'md' }) {
  const t = useTranslations('networking.actions');
  const pad = size === 'sm' ? 'flex-1' : 'flex-1';
  return (
    <div className="flex flex-wrap gap-2" data-testid="card-actions">
      {actions.onPass && (
        <button type="button" disabled={actions.busy} onClick={() => actions.onPass?.(card.handle)} className={`${btn} ${pad} border-border-danger text-text-danger hover:bg-surface-danger ${focusRing}`}>
          <X className="size-4" aria-hidden />{t('pass')}
        </button>
      )}
      {actions.onSkip && (
        <button type="button" disabled={actions.busy} onClick={() => actions.onSkip?.(card.handle)} className={`${btn} ${pad} border-border-subtle text-text-primary hover:bg-surface-subtle ${focusRing}`}>
          <Bookmark className="size-4" aria-hidden />{t('skip')}
        </button>
      )}
      {actions.onInterested && (
        <button type="button" disabled={actions.busy} onClick={() => actions.onInterested?.(card.handle)} className={`${btn} ${pad} border-border-brand bg-surface-brand text-text-white hover:opacity-90 ${focusRing}`}>
          <Star className="size-4" aria-hidden />{t('interested')}
        </button>
      )}
    </div>
  );
}

/** Compact card: "People you may want to meet", "People you may also like", directory rows. */
export default function PersonCard({
  eventId,
  card,
  me,
  labelOf,
  actions,
}: {
  eventId: string;
  card: NetworkingCard;
  me: ProfileFields | null;
  labelOf: LabelFn;
  actions?: CardActionHandlers;
}) {
  const t = useTranslations('networking.actions');
  return (
    <article data-testid="person-card" data-handle={card.handle} aria-label={card.displayName ?? undefined} className="flex h-full min-w-0 flex-col gap-3 rounded-2xl border border-border-subtle bg-surface-default p-4">
      <div className="flex items-start gap-3">
        <PersonAvatar name={card.displayName} url={card.avatarUrl} className="size-14" />
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-text-primary">
            <Link href={personHref(eventId, card.handle)} className={`hover:underline ${focusRing}`}>{card.displayName}</Link>
          </h3>
          <Subline card={card} />
        </div>
      </div>
      <TierBadge tier={card.tier} mutualFit={card.mutualFit} />
      <ReasonLines card={card} me={me} labelOf={labelOf} limit={2} />
      {card.needs.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold text-text-primary">{t('lookingFor')}</p>
          <ChipRow codes={card.needs} labelOf={labelOf} max={3} />
        </div>
      )}
      <div className="mt-auto space-y-2 pt-1">
        {actions && <CardButtons card={card} actions={actions} size="sm" />}
        <Link href={personHref(eventId, card.handle)} className={`inline-flex min-h-6 text-sm font-medium text-text-brand hover:underline ${focusRing}`}>{t('view')}</Link>
      </div>
    </article>
  );
}
