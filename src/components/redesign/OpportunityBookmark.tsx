'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Bookmark } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SAVE_OPPORTUNITY, UNSAVE_OPPORTUNITY } from '@/services/gql/opportunities';

/**
 * Save / unsave an opportunity with the platform's existing mutations. Optimistic;
 * a refused or failed write (Apollo resolves refusals with `data: null`) puts the
 * icon back, so it never claims a save that did not happen.
 */
const LOOK = {
  card: 'size-8 text-muted-foreground hover:bg-surface-subtle hover:text-text-brand focus-visible:ring-text-brand',
  // On a photo (the opportunity page hero): white on a dark glass circle, a 44px target.
  photo: 'size-11 bg-black/35 text-white backdrop-blur hover:bg-black/55 focus-visible:ring-white',
} as const;

export function OpportunityBookmark({ id, saved: initial, look = 'card' }: { id: string; saved: boolean; look?: keyof typeof LOOK }) {
  const t = useTranslations('redesign');
  const [saved, setSaved] = useState(initial);
  const [save] = useMutation<{ saveOpportunity?: boolean | null }>(SAVE_OPPORTUNITY, { context: { silentErrors: true } });
  const [unsave] = useMutation<{ unsaveOpportunity?: boolean | null }>(UNSAVE_OPPORTUNITY, { context: { silentErrors: true } });

  const toggle = async () => {
    const next = !saved;
    setSaved(next);
    try {
      const res = next ? await save({ variables: { id } }) : await unsave({ variables: { id } });
      const ok = next ? (res.data as { saveOpportunity?: boolean | null } | null | undefined)?.saveOpportunity : (res.data as { unsaveOpportunity?: boolean | null } | null | undefined)?.unsaveOpportunity;
      if (ok !== true) setSaved(!next);
    } catch {
      setSaved(!next);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? t('unsaveItem') : t('saveItem')}
      className={`grid place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 ${LOOK[look]}`}
    >
      <Bookmark className={`${look === 'photo' ? 'size-5' : 'size-4'} ${saved ? (look === 'photo' ? 'fill-current' : 'fill-current text-text-brand') : ''}`} aria-hidden />
    </button>
  );
}
