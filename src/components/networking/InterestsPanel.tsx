'use client';

import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import PersonCard, { type CardActionHandlers } from './PersonCard';
import { focusRing } from './primitives';
import type { LabelFn } from '@/lib/networkingTaxonomy';
import type { NetworkingCard, ProfileFields } from '@/services/gql/networking';

/**
 * Interested in you / My matches / My interests lists. Only mounted while the
 * interests backend is released (`INTERESTS_UI_ENABLED`); the dev harness
 * renders it with fixtures. A person's decline is never shown to the sender:
 * "My interests" has no "declined" state by design.
 */
export default function InterestsPanel({
  kind,
  eventId,
  cards,
  me,
  labelOf,
  loading,
  hasMore,
  onLoadMore,
  actionsFor,
}: {
  kind: 'interested' | 'matches' | 'interests';
  eventId: string;
  cards: NetworkingCard[];
  me: ProfileFields | null;
  labelOf: LabelFn;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  actionsFor?: (card: NetworkingCard) => CardActionHandlers | undefined;
}) {
  const t = useTranslations('networking.interestsPanel');
  return (
    <div data-testid={`panel-${kind}`} className="space-y-4">
      <p className="text-sm text-text-secondary">{t(`${kind}.intro`)}</p>
      {cards.length === 0 && !loading ? (
        <p className="rounded-2xl border border-dashed border-border-subtle bg-surface-default p-8 text-center text-sm text-text-secondary">{t(`${kind}.empty`)}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((c) => (
            <li key={c.handle}><PersonCard eventId={eventId} card={c} me={me} labelOf={labelOf} actions={actionsFor?.(c)} /></li>
          ))}
        </ul>
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
