'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { makeLabeler } from '@/lib/networkingTaxonomy';
import { suggestOffline } from '@/lib/networkingSuggest';
import { useLocale, useTranslations } from 'next-intl';
import PageFrame from '../PageFrame';
import HubView from '../HubView';
import SetupWizard from '../SetupWizard';
import RecommendedView from '../RecommendedView';
import PersonView, { PersonNotFound } from '../PersonView';
import DirectoryView from '../DirectoryView';
import { InterestedInYouPanel, MatchesPanel, MyInterestsPanel } from '../InterestsPanel';
import type { InterestEntry } from '@/services/gql/networking';
import type { Paged } from '../useNetworking';
import GateMessage from '../GateMessage';
import { NetworkingHeader, NetworkingTabs, type NetworkingTab } from '../NetworkingShell';
import { CirclesDiscovery, CircleRoom } from '../CirclesParts';
import { draftFromParticipation, emptyDraft, type NetworkingDraft, type SuggestFn } from '../draft';
import { eventDays } from '@/lib/networkingAvailability';
import { CARDS, CIRCLES, CIRCLE_DETAIL, CIRCLE_MESSAGES, EVENT, ME, TAXONOMY } from './fixtures';
import type { DirectoryFilter, MyParticipation, NetworkingCard } from '@/services/gql/networking';

function fakePaged<T extends { handle: string }>(items: T[]): Paged<T> {
  return { items, loading: false, hasMore: false, refusal: null, reviewingSkipped: false, refreshing: false, loaded: true, loadMore: () => {}, reload: () => {}, remove: () => {} };
}

const ALL_ON = { interests: true, circles: true };

function useLabeler() {
  const t = useTranslations('networking');
  const locale = useLocale();
  return useMemo(() => makeLabeler(t as unknown as Parameters<typeof makeLabeler>[0], locale), [t, locale]);
}

function Banner() {
  return <p data-testid="harness-banner" className="rounded-xl border border-dashed border-border-warning bg-surface-warning px-4 py-2 text-xs text-text-primary">Dev harness: fixture data, no backend. Interests and Circles are shown on here even though they are switched off in production.</p>;
}

const initialMine = (over: Partial<NonNullable<MyParticipation['participation']>> = {}): MyParticipation => ({
  participation: {
    status: 'ACTIVE', visibility: 'RECOMMENDED', fieldFlags: { organization: true, location: true, availability: true, needsNote: true, offersNote: true },
    acceptsInterests: true, openToMeetings: true, inCircleDiscovery: true, aiAssistConsent: false, handle: 'h-me', version: 1, hasProfile: true,
    snapshot: { displayName: 'Ama Mensah', avatarUrl: null, username: 'ama' }, availability: [],
    profile: { fields: ME, isDraft: false, completeness: 68 }, ...over,
  },
  networkingEnabled: true, windowState: 'OPEN', allowedVisibilityModes: ['RECOMMENDED', 'OPEN', 'LIMITED', 'HIDDEN'], eligibility: 'CONFIRMED', featureAvailable: true,
});

function useFakeSuggest(consent: boolean): SuggestFn {
  return async (kind, text) => {
    const prefix = kind === 'NEEDS' || kind === 'OFFERS' ? ['capability.'] : kind === 'INTERESTS' ? ['interest.'] : kind === 'ROLES' ? ['role.'] : ['market.'];
    const codes = suggestOffline(text, TAXONOMY, prefix);
    return { codes, source: consent ? 'ai' : 'offline' };
  };
}

export function HubHarness() {
  const labelOf = useLabeler();
  const search = useSearchParams();
  const tab = (search.get('tab') as NetworkingTab) || 'discover';
  const [draft, setDraft] = useState<NetworkingDraft>(draftFromParticipation(initialMine()));
  const [paused, setPaused] = useState(search.get('paused') === '1');
  const [ai, setAi] = useState(false);
  const [filter, setFilter] = useState<DirectoryFilter>({});
  const [cards, setCards] = useState<NetworkingCard[]>(CARDS);
  const suggest = useFakeSuggest(ai);
  const days = eventDays(EVENT.startAt!, EVENT.endAt, EVENT.timezone!);
  const interestCards = cards.slice(0, 3);
  const tabContent =
    tab === 'people' ? (
      <DirectoryView eventId={EVENT.id} cards={cards} me={ME} labelOf={labelOf} taxonomy={TAXONOMY} filter={filter} onFilter={setFilter} hasMore={false} loading={false} onLoadMore={() => {}} />
    ) : tab === 'interested' ? (
      <InterestedInYouPanel eventId={EVENT.id} me={ME} labelOf={labelOf} cards={interestCards} loading={false} hasMore={false} onLoadMore={() => {}} onRemove={() => {}} />
    ) : tab === 'matches' ? (
      <MatchesPanel eventId={EVENT.id} me={ME} labelOf={labelOf} paged={fakePaged(interestCards.map((card) => ({ handle: card.handle, card, matchedAt: null })))} />
    ) : tab === 'interests' ? (
      <MyInterestsPanel eventId={EVENT.id} me={ME} labelOf={labelOf} paged={fakePaged<InterestEntry>(interestCards.map((card, i) => ({ handle: card.handle, card, status: (['PENDING', 'MUTUAL', 'EXPIRED'] as const)[i % 3], personAvailable: true })))} />
    ) : tab === 'circles' ? (
      <CirclesDiscovery eventId={EVENT.id} circles={CIRCLES} interestsLabels={draft.interests.map(labelOf)} />
    ) : null;
  return (
    <PageFrame shell={false}>
      <Banner />
      <HubView
        event={EVENT} tab={tab} features={ALL_ON} tabContent={tabContent} draft={draft} onDraft={setDraft} taxonomy={TAXONOMY} labelOf={labelOf}
        suggest={suggest} aiConsent={ai} onEnableAi={() => setAi(true)} days={days} timeZone={EVENT.timezone!} allowedVisibility={['RECOMMENDED', 'OPEN', 'LIMITED', 'HIDDEN']}
        me={ME} completeness={68} paused={paused} onTogglePause={() => setPaused((p) => !p)} onSave={() => toast.success('Saved (fixture)')} saving={false} dirty
        deckCards={cards.slice(0, 4)} deckLoading={false}
        deckActions={() => ({ onPass: (h) => setCards((c) => c.filter((x) => x.handle !== h)), onSkip: (h) => setCards((c) => c.filter((x) => x.handle !== h)), onInterested: (h) => toast(`Interested in ${h}`) })}
      />
    </PageFrame>
  );
}

export function SetupHarness() {
  const labelOf = useLabeler();
  const search = useSearchParams();
  const [draft, setDraft] = useState<NetworkingDraft>({ ...emptyDraft() });
  const [ai, setAi] = useState(false);
  return (
    <PageFrame shell={false}>
      <Banner />
      <NetworkingHeader event={EVENT} title="Join networking" />
      <SetupWizard
        draft={draft} onDraft={setDraft} taxonomy={TAXONOMY} labelOf={labelOf} aiConsent={ai} onEnableAi={() => setAi(true)} suggest={useFakeSuggest(ai)}
        prefill={{ headline: 'Founder and CEO', organization: 'Kente Labs', locationLabel: 'Berlin', intro: null, skills: ['Payments'], unavailableFields: ['languages'], matchedCodes: [{ code: 'role.founder', kind: 'ROLE', source: 'occupation' }, { code: 'industry.financial_services', kind: 'INDUSTRY', source: 'sector' }, { code: 'capability.technology', kind: 'CAPABILITY', source: 'skill' }] }}
        allowedVisibility={['RECOMMENDED', 'OPEN', 'LIMITED', 'HIDDEN']} days={eventDays(EVENT.startAt!, EVENT.endAt, EVENT.timezone!)} timeZone={EVENT.timezone!}
        saving={false} onSaveLater={() => toast('Draft saved (fixture)')} onJoin={() => toast.success('Joined (fixture)')} initialStep={Number(search.get('step') ?? 0)}
      />
    </PageFrame>
  );
}

export function DeckHarness() {
  const labelOf = useLabeler();
  const search = useSearchParams();
  const withInterest = search.get('interest') !== '0';
  const [mode, setMode] = useState<'deck' | 'saved'>('deck');
  return (
    <PageFrame shell={false}>
      <Banner />
      <RecommendedView
        event={EVENT} features={ALL_ON} completeness={68} mode={mode} onMode={setMode} onReconsider={() => toast('Reconsidered (fixture)')}
        eventId={EVENT.id} cards={CARDS} me={ME} labelOf={labelOf} hasMore={false} loading={false}
        onDecide={async () => true} onInterested={withInterest ? async () => true : undefined} onBlocked={() => {}}
      />
    </PageFrame>
  );
}

export function PersonHarness() {
  const labelOf = useLabeler();
  const search = useSearchParams();
  if (search.get('missing') === '1') return <PageFrame shell={false}><Banner /><NetworkingHeader event={EVENT} /><PersonNotFound eventId={EVENT.id} /></PageFrame>;
  return (
    <PageFrame shell={false}>
      <Banner />
      <PersonView event={EVENT} features={ALL_ON} person={CARDS[0]} me={ME} labelOf={labelOf} onPass={() => toast('Pass')} onSkip={() => toast('Skip')} onInterested={() => toast('Interested')} onBlocked={() => {}} />
    </PageFrame>
  );
}

export function CirclesHarness() {
  return (
    <PageFrame shell={false}>
      <Banner />
      <NetworkingHeader event={EVENT} title="Networking Circles" />
      <NetworkingTabs eventId={EVENT.id} active="circles" interests circles />
      <CirclesDiscovery eventId={EVENT.id} circles={CIRCLES} interestsLabels={['Technology', 'Investment', 'Government partnerships']} />
    </PageFrame>
  );
}

export function CircleRoomHarness() {
  return (
    <PageFrame shell={false}>
      <Banner />
      <CircleRoom eventId={EVENT.id} circle={CIRCLE_DETAIL} messages={CIRCLE_MESSAGES} timeZone={EVENT.timezone} onSend={async () => {}} onLeave={() => toast('Left (fixture)')} />
    </PageFrame>
  );
}

export function GateHarness() {
  const search = useSearchParams();
  const state = (search.get('state') ?? 'unavailableYet') as 'unavailableYet';
  return (
    <PageFrame shell={false}>
      <Banner />
      <NetworkingHeader event={EVENT} />
      <GateMessage state={state} eventId={EVENT.id} />
    </PageFrame>
  );
}
