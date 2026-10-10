'use client';

import { useTranslations } from 'next-intl';
import { MapPin } from 'lucide-react';
import { Chip } from './primitives';
import { reasonSentences } from '@/lib/networkingReasons';
import type { LabelFn } from '@/lib/networkingTaxonomy';
import type { NetworkingCard, ProfileFields } from '@/services/gql/networking';

/** Reasons as sentences ("Ama offers technology, which you are looking for."). */
export function ReasonLines({ card, me, labelOf, limit = 2, iconless = false }: { card: NetworkingCard; me: ProfileFields | null; labelOf: LabelFn; limit?: number; iconless?: boolean }) {
  const t = useTranslations('networking.reasons');
  const name = card.displayName?.trim() || t('someone');
  const lines = reasonSentences(card, me, limit);
  if (lines.length === 0) return null;
  return (
    <ul data-testid="reasons" className="space-y-1">
      {lines.map((l) => (
        <li key={l.code} className="text-sm leading-snug text-text-secondary">
          {!iconless && <span aria-hidden className="mr-1.5 text-text-brand">•</span>}
          {t(l.key, { name, labels: l.codes.map(labelOf).join(', ') })}
        </li>
      ))}
    </ul>
  );
}

export function ChipRow({ codes, labelOf, max = 4, tone = 'default' }: { codes: string[]; labelOf: LabelFn; max?: number; tone?: 'default' | 'brand' }) {
  const t = useTranslations('networking.person');
  if (codes.length === 0) return null;
  const shown = codes.slice(0, max);
  return (
    <ul className="flex flex-wrap gap-1.5">
      {shown.map((c) => (
        <li key={c}><Chip tone={tone}>{labelOf(c)}</Chip></li>
      ))}
      {codes.length > max && <li><Chip>{t('more', { count: codes.length - max })}</Chip></li>}
    </ul>
  );
}

export function Subline({ card }: { card: NetworkingCard }) {
  const parts = [card.headline, card.organization].filter(Boolean).join(' · ');
  return (
    <>
      {parts && <p className="text-sm text-text-secondary">{parts}</p>}
      {card.locationLabel && (
        <p className="mt-0.5 flex items-center gap-1 text-xs text-text-tertiary">
          <MapPin className="size-3" aria-hidden />
          {card.locationLabel}
        </p>
      )}
    </>
  );
}
