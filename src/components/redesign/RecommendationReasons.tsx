'use client';

import { useTranslations } from 'next-intl';
import { knownReasons } from '@/services/gql/recommendations';

/**
 * "Why am I seeing this?" in a few words under a recommended card. The codes
 * come from a fixed list and never name another person; unknown codes are
 * dropped rather than shown raw. At most two, so the line stays one line.
 */
export function RecommendationReasons({ codes, max = 2 }: { codes?: readonly string[] | null; max?: number }) {
  const t = useTranslations('recommendationReasons');
  const shown = knownReasons(codes).slice(0, max);
  if (shown.length === 0) return null;
  return (
    <p className="mt-1.5 truncate text-xs text-muted-foreground" data-testid="recommendation-reasons">
      {shown.map((c) => t(c)).join(' · ')}
    </p>
  );
}
