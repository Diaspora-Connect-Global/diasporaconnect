'use client';

import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import RecapView from './RecapView';
import { useRecap } from './useRecap';
import { useFeedbackApi } from '../feedback/useFeedback';

/** The Recap tab of the networking hub, on real data. Only ever mounted while FEEDBACK_UI_ENABLED. */
export default function RecapPanel({ eventId }: { eventId: string }) {
  const t = useTranslations('networking');
  const te = useTranslations('networkingEventDay.recap');
  const api = useFeedbackApi(eventId);
  const { recap, loading, failureKey, reload } = useRecap(eventId, true);
  if (failureKey) {
    return <p role="alert" data-testid="recap-error" className="rounded-2xl border border-border-danger bg-surface-danger p-4 text-sm text-text-primary">{t(`errors.${failureKey}`)}</p>;
  }
  if (!recap) {
    return loading
      ? <Loader2 className="mx-auto size-5 animate-spin text-text-brand" aria-label={te('loading')} />
      : <p className="rounded-2xl border border-dashed border-border-subtle bg-surface-default p-8 text-center text-sm text-muted-foreground">{te('unavailable')}</p>;
  }
  return <RecapView recap={recap} api={api} onFeedbackSaved={reload} />;
}
