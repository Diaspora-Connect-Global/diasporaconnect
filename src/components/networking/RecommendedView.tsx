'use client';

import { useTranslations } from 'next-intl';
import { Bookmark } from 'lucide-react';
import DeckView, { type DeckProps } from './DeckView';
import { NetworkingHeader, NetworkingTabs, type NetworkingEventContext } from './NetworkingShell';
import { CompletenessCard, ManagePreferencesCard, QuickFiltersCard, SmartMatchingCard } from './RailCards';
import { focusRing } from './primitives';

export interface RecommendedViewProps extends DeckProps {
  event: NetworkingEventContext;
  features: { interests: boolean; circles: boolean };
  completeness: number;
  mode: 'deck' | 'saved';
  onMode: (m: 'deck' | 'saved') => void;
  onReconsider: () => void;
}

/** Single-person deck (mockup: large card, three actions, "People you may also like", rail). No sidebar. */
export default function RecommendedView({ event, features, completeness, mode, onMode, onReconsider, ...deck }: RecommendedViewProps) {
  const t = useTranslations('networking.deck');
  return (
    <>
      <NetworkingHeader event={event} title={t('pageTitle')} />
      <NetworkingTabs eventId={event.id} active="recommended" interests={features.interests} circles={features.circles} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-5">
          <div role="group" aria-label={t('sourceLabel')} className="inline-flex rounded-full border border-border-subtle bg-surface-default p-1">
            {(['deck', 'saved'] as const).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => onMode(m)} className={`min-h-9 rounded-full px-4 text-sm font-medium ${mode === m ? 'bg-surface-brand text-text-white' : 'text-text-primary'} ${focusRing}`}>{t(`source.${m}`)}</button>
            ))}
          </div>
          <DeckView key={mode} {...deck} eventId={event.id} />
          <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-border-subtle bg-surface-brand-subtle p-4" aria-label={t('notReadyTitle')}>
            <Bookmark className="size-6 text-text-brand" aria-hidden />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-text-primary">{t('notReadyTitle')}</h2>
              <p className="text-xs text-muted-foreground">{t('notReadyBody')}</p>
            </div>
            <button type="button" onClick={() => onMode('saved')} className={`min-h-11 rounded-full border border-border-brand bg-surface-default px-5 text-sm font-medium text-text-brand ${focusRing}`}>{t('viewSaved')}</button>
            <button type="button" onClick={onReconsider} data-testid="reconsider" className={`min-h-11 rounded-full border border-border-subtle bg-surface-default px-5 text-sm text-text-primary ${focusRing}`}>{t('reconsider')}</button>
          </section>
        </div>
        <aside className="space-y-4" aria-label={t('rail')}>
          <SmartMatchingCard />
          <CompletenessCard value={completeness} eventId={event.id} />
          <QuickFiltersCard eventId={event.id} />
          <ManagePreferencesCard eventId={event.id} />
        </aside>
      </div>
    </>
  );
}
