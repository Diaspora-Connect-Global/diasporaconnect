'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Users } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import GoalsEditor from './GoalsEditor';
import { AboutEditor, AvailabilityEditor, HowToMeetEditor, PreferenceSummaryCards, VisibilityEditor, type PreferencePanel } from './PreferenceEditors';
import PersonCard, { type CardActionHandlers } from './PersonCard';
import { NetworkingHeader, NetworkingTabs, type NetworkingEventContext, type NetworkingTab } from './NetworkingShell';
import { CompletenessCard, QuickActionsCard, VisibilityPrompt } from './RailCards';
import { InlineNotice, SectionCard, focusRing } from './primitives';
import type { NetworkingDraft, SuggestFn } from './draft';
import type { LabelFn } from '@/lib/networkingTaxonomy';
import type { NetworkingCard, NetworkingVisibility, ProfileFields, TaxonomyItem } from '@/services/gql/networking';

export interface HubViewProps {
  event: NetworkingEventContext;
  tab: NetworkingTab;
  features: { interests: boolean; circles: boolean; meetings?: boolean; recap?: boolean };
  /** Content of every tab except Discover (People, interest lists, Circles). */
  tabContent?: React.ReactNode;
  draft: NetworkingDraft;
  onDraft: (d: NetworkingDraft) => void;
  taxonomy: TaxonomyItem[];
  labelOf: LabelFn;
  suggest?: SuggestFn;
  aiConsent: boolean;
  onEnableAi?: () => void;
  days: string[];
  timeZone: string;
  allowedVisibility: NetworkingVisibility[];
  me: ProfileFields | null;
  completeness: number;
  paused: boolean;
  pauseBusy?: boolean;
  onTogglePause: () => void;
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
  deckCards: NetworkingCard[];
  deckLoading: boolean;
  deckActions: (card: NetworkingCard) => CardActionHandlers;
  onDeckBlocked?: (handle: string) => void;
}

/** The Discover tab (mockup: goals editor + "People you may want to meet" + rail). */
export default function HubView(p: HubViewProps) {
  const t = useTranslations('networking.hub');
  const [panel, setPanel] = useState<PreferencePanel | null>(null);
  const { draft } = p;
  const eventId = p.event.id;

  const discover = (
    <>
      {p.paused && <InlineNotice tone="warning" testId="paused-banner">{t('pausedBanner')}</InlineNotice>}
      <section aria-label={t('goalsRegion')} className="rounded-2xl border border-border-subtle bg-surface-default p-4 sm:p-6">
        <GoalsEditor draft={draft} onChange={p.onDraft} taxonomy={p.taxonomy} labelOf={p.labelOf} suggest={p.suggest} aiConsent={p.aiConsent} onEnableAi={p.onEnableAi} />
        <div className="mt-6">
          <PreferenceSummaryCards draft={draft} active={panel} onOpen={(k) => setPanel(panel === k ? null : k)} />
        </div>
        {panel && (
          <div id="preference-panel" role="region" aria-label={t('preferencePanel')} className="mt-4 rounded-xl border border-border-subtle bg-surface-subtle p-4">
            {panel === 'meet' && <HowToMeetEditor draft={draft} onChange={p.onDraft} />}
            {panel === 'availability' && <AvailabilityEditor days={p.days} timeZone={p.timeZone} slots={draft.availability} onChange={(a) => p.onDraft({ ...draft, availability: a })} />}
            {panel === 'location' && <AboutEditor draft={draft} onChange={p.onDraft} />}
            {panel === 'visibility' && <VisibilityEditor draft={draft} onChange={p.onDraft} allowed={p.allowedVisibility} />}
          </div>
        )}
        <div className="mt-6 flex justify-center">
          <button type="button" onClick={p.onSave} disabled={p.saving || !p.dirty} data-testid="save-goals" className={`inline-flex min-h-11 items-center rounded-full bg-surface-brand px-8 text-sm font-semibold text-text-white disabled:opacity-50 ${focusRing}`}>
            {p.saving && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
            {t('save')}
          </button>
        </div>
      </section>

      <SectionCard
        id="people-to-meet"
        title={t('peopleTitle')}
        subtitle={t('peopleSubtitle')}
        icon={<Users className="size-5" aria-hidden />}
        action={<Link href={`/events/${eventId}/networking/recommended`} className={`inline-flex min-h-6 text-sm font-medium text-text-brand hover:underline ${focusRing}`}>{t('viewAll')}</Link>}
      >
        {p.deckLoading && p.deckCards.length === 0 ? (
          <Loader2 className="mx-auto size-5 animate-spin text-text-brand" aria-label={t('loading')} />
        ) : p.deckCards.length === 0 ? (
          <p data-testid="deck-preview-empty" className="text-sm text-muted-foreground">{t('peopleEmpty')}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4" data-testid="deck-preview">
            {p.deckCards.map((c) => (
              <li key={c.handle}>
                <PersonCard eventId={eventId} card={c} me={p.me} labelOf={p.labelOf} actions={p.deckActions(c)} onBlocked={p.onDeckBlocked} />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </>
  );

  return (
    <>
      <NetworkingHeader event={p.event} />
      <NetworkingTabs eventId={eventId} active={p.tab} interests={p.features.interests} circles={p.features.circles} meetings={p.features.meetings} recap={p.features.recap} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-5">{p.tab === 'discover' ? discover : p.tabContent}</div>
        <aside className="space-y-4" aria-label={t('rail')}>
          <CompletenessCard value={p.completeness} eventId={eventId} />
          <QuickActionsCard eventId={eventId} interests={p.features.interests} circles={p.features.circles} meetings={p.features.meetings} />
          <VisibilityPrompt paused={p.paused} busy={p.pauseBusy} onTogglePause={p.onTogglePause} />
        </aside>
      </div>
    </>
  );
}
