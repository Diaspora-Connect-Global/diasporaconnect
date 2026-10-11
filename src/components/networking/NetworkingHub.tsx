'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery } from '@apollo/client/react';
import { toast } from 'sonner';
import PageLoader from '@/components/custom/PageLoader';
import PageFrame from './PageFrame';
import HubView from './HubView';
import GateMessage from './GateMessage';
import DirectoryView, { isValidFilterField, type FilterField } from './DirectoryView';
import InterestsPanel from './InterestsPanel';
import { CirclesDiscovery } from './CirclesParts';
import { NetworkingHeader, type NetworkingTab } from './NetworkingShell';
import { draftFromParticipation, preferencesInput, profileInput, type NetworkingDraft } from './draft';
import { useDecide, useExpressInterest, useNetworkingBase, usePagedCards, useReportRefusal, useSuggest } from './useNetworking';
import { eventDays } from '@/lib/networkingAvailability';
import { hasFailure } from '@/lib/networkingRefusal';
import { NETWORKING_FEATURES } from '@/lib/networkingFeatures';
import {
  NETWORKING_CIRCLES,
  NETWORKING_CIRCLE_JOIN,
  NETWORKING_CONTEXT,
  NETWORKING_MUTATION,
  NETWORKING_DECK,
  NETWORKING_DIRECTORY,
  NETWORKING_INTERESTED_IN_ME,
  NETWORKING_MY_INTERESTS,
  NETWORKING_MY_MATCHES,
  NETWORKING_PAUSE,
  NETWORKING_RESUME,
  NETWORKING_SET_AVAILABILITY,
  NETWORKING_SET_VISIBILITY,
  NETWORKING_UPDATE_PROFILE,
  NETWORKING_WITHDRAW_INTEREST,
  type CircleSummary,
  type DirectoryFilter,
} from '@/services/gql/networking';

const TABS: NetworkingTab[] = ['discover', 'people', 'interested', 'matches', 'interests', 'circles'];

function parseTab(raw: string | null, f: { interests: boolean; circles: boolean }): NetworkingTab {
  const tab = (TABS as string[]).includes(raw ?? '') ? (raw as NetworkingTab) : 'discover';
  if ((tab === 'interested' || tab === 'matches' || tab === 'interests') && !f.interests) return 'discover';
  if (tab === 'circles' && !f.circles) return 'discover';
  return tab;
}

export default function NetworkingHub({ eventId }: { eventId: string }) {
  const t = useTranslations('networking');
  const router = useRouter();
  const search = useSearchParams();
  const features = NETWORKING_FEATURES;
  const tab = parseTab(search.get('tab'), features);
  const focusFilter = isValidFilterField(search.get('filter')) ? (search.get('filter') as FilterField) : null;

  const base = useNetworkingBase(eventId);
  const report = useReportRefusal();
  const ready = base.gate === 'ready' || base.gate === 'paused';

  const [draft, setDraft] = useState<NetworkingDraft | null>(null);
  const [baseline, setBaseline] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<DirectoryFilter>({});

  const mineVersion = base.mine?.participation?.version ?? 0;
  useEffect(() => {
    if (!ready) return;
    const d = draftFromParticipation(base.mine);
    setDraft(d);
    setBaseline(JSON.stringify(d));
  }, [ready, mineVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Not joined yet: the wizard is the front door. (Not for a gate that has its own message.)
  useEffect(() => {
    if (base.gate === 'needsSetup') router.replace(`/events/${eventId}/networking/setup`);
  }, [base.gate, eventId, router]);

  const aiConsent = base.mine?.participation?.aiAssistConsent ?? false;
  const { suggest, enableAi } = useSuggest(eventId, base.taxonomy, aiConsent);

  const [updateProfile] = useMutation(NETWORKING_UPDATE_PROFILE, NETWORKING_MUTATION);
  const [setVisibility] = useMutation(NETWORKING_SET_VISIBILITY, NETWORKING_MUTATION);
  const [setAvailability] = useMutation(NETWORKING_SET_AVAILABILITY, NETWORKING_MUTATION);
  const [pause, pauseState] = useMutation(NETWORKING_PAUSE, NETWORKING_MUTATION);
  const [resume, resumeState] = useMutation(NETWORKING_RESUME, NETWORKING_MUTATION);

  const timeZone = base.event?.timezone || 'UTC';
  const days = useMemo(() => (base.event?.startAt ? eventDays(base.event.startAt, base.event.endAt, timeZone) : []), [base.event?.startAt, base.event?.endAt, timeZone]);

  // Queries behind a tab only run while that tab is the one showing.
  const deck = usePagedCards(NETWORKING_DECK, 'eventNetworkingDeck', { eventId }, ready && tab === 'discover', 4);
  const directory = usePagedCards(NETWORKING_DIRECTORY, 'eventNetworkingDirectory', { eventId, filters: filter }, ready && tab === 'people', 12);
  const inbound = usePagedCards(NETWORKING_INTERESTED_IN_ME, 'eventNetworkingInterestedInMe', { eventId }, ready && features.interests && tab === 'interested');
  const matches = usePagedCards(NETWORKING_MY_MATCHES, 'eventNetworkingMyMatches', { eventId }, ready && features.interests && tab === 'matches');
  const outbound = usePagedCards(NETWORKING_MY_INTERESTS, 'eventNetworkingMyInterests', { eventId }, ready && features.interests && tab === 'interests');
  const circlesQ = useQuery<{ networkingCircles: CircleSummary[] | null }>(NETWORKING_CIRCLES, { variables: { eventId }, skip: !(ready && features.circles && tab === 'circles'), ...NETWORKING_CONTEXT });
  const [joinCircle, joinState] = useMutation(NETWORKING_CIRCLE_JOIN, NETWORKING_MUTATION);

  const decide = useDecide(eventId);
  const interest = useExpressInterest(eventId);
  const [withdrawInterest] = useMutation(NETWORKING_WITHDRAW_INTEREST, NETWORKING_MUTATION);

  if (base.gate === 'loading' || base.gate === 'needsSetup' || (ready && !draft)) return <PageLoader />;
  if (!ready) {
    const state = base.gate as Exclude<typeof base.gate, 'loading' | 'ready' | 'paused'>;
    return (
      <PageFrame>
        <NetworkingHeader event={base.context} />
        <GateMessage state={state} eventId={eventId} onRetry={() => void base.refetchMine()} onRejoin={() => router.push(`/events/${eventId}/networking/setup`)} />
      </PageFrame>
    );
  }

  const current = draft as NetworkingDraft;
  const paused = base.gate === 'paused';
  const dirty = JSON.stringify(current) !== baseline;

  const save = async () => {
    setSaving(true);
    try {
      const r1 = await updateProfile({ variables: { eventId, profile: profileInput(current) } });
      if (hasFailure(r1)) return report(r1);
      const r2 = await setVisibility({ variables: { eventId, preferences: preferencesInput(current) } });
      if (hasFailure(r2)) return report(r2);
      const before = JSON.stringify(base.mine?.participation?.availability ?? []);
      if (before !== JSON.stringify(current.availability)) {
        const r3 = await setAvailability({ variables: { eventId, slots: current.availability } });
        if (hasFailure(r3)) return report(r3);
      }
      toast.success(t('hub.saved'));
      setBaseline(JSON.stringify(current));
      await base.refetchMine();
    } catch (err) {
      report(err);
    } finally {
      setSaving(false);
    }
  };

  const togglePause = async () => {
    const res = paused ? await resume({ variables: { eventId } }) : await pause({ variables: { eventId } });
    if (hasFailure(res)) report(res);
    else await base.refetchMine();
  };

  const onDecide = async (handle: string, d: 'PASS' | 'SKIP') => {
    if (await decide(handle, d)) deck.remove(handle);
  };
  const interestAction = features.interests
    ? async (handle: string) => {
        if (await interest(handle)) deck.remove(handle);
      }
    : undefined;

  const tabContent =
    tab === 'people' ? (
      <DirectoryView
        eventId={eventId}
        cards={directory.cards}
        me={base.me}
        labelOf={base.labelOf}
        taxonomy={base.taxonomy}
        filter={filter}
        onFilter={setFilter}
        hasMore={directory.hasMore}
        loading={directory.loading}
        onLoadMore={directory.loadMore}
        focusField={focusFilter}
        actionsFor={(c) => ({
          onPass: (h) => void decide(h, 'PASS').then((ok) => ok && directory.remove(h)),
          onSkip: (h) => void decide(h, 'SKIP').then((ok) => ok && directory.remove(h)),
          onInterested: features.interests ? (h) => void interest(h) : undefined,
        })}
      />
    ) : tab === 'interested' || tab === 'matches' || tab === 'interests' ? (
      (() => {
        const q = tab === 'interested' ? inbound : tab === 'matches' ? matches : outbound;
        return (
          <InterestsPanel
            kind={tab}
            eventId={eventId}
            cards={q.cards}
            me={base.me}
            labelOf={base.labelOf}
            loading={q.loading}
            hasMore={q.hasMore}
            onLoadMore={q.loadMore}
            actionsFor={(c) =>
              tab === 'interested'
                ? { onPass: (h) => void decide(h, 'PASS').then((ok) => ok && q.remove(h)), onInterested: (h) => void interest(h).then((ok) => ok && q.reload()) }
                : tab === 'interests'
                  ? { onPass: (h) => void withdrawInterest({ variables: { eventId, handle: h } }).then((r) => (hasFailure(r) ? report(r) : q.remove(h))) }
                  : undefined
            }
          />
        );
      })()
    ) : tab === 'circles' ? (
      <CirclesDiscovery
        eventId={eventId}
        circles={circlesQ.data?.networkingCircles ?? []}
        busy={joinState.loading}
        interestsLabels={current.interests.map(base.labelOf)}
        onJoin={async (circleId) => {
          const r = await joinCircle({ variables: { eventId, circleId } });
          if (hasFailure(r)) report(r);
          else void circlesQ.refetch();
        }}
      />
    ) : null;

  return (
    <PageFrame>
      <HubView
        event={base.context}
        tab={tab}
        features={features}
        tabContent={tabContent}
        draft={current}
        onDraft={setDraft}
        taxonomy={base.taxonomy}
        labelOf={base.labelOf}
        suggest={suggest}
        aiConsent={aiConsent}
        onEnableAi={() => void enableAi().then((ok) => ok && base.refetchMine())}
        days={days}
        timeZone={timeZone}
        allowedVisibility={base.mine?.allowedVisibilityModes ?? []}
        me={base.me}
        completeness={base.mine?.participation?.profile?.completeness ?? 0}
        paused={paused}
        pauseBusy={pauseState.loading || resumeState.loading}
        onTogglePause={() => void togglePause()}
        onSave={() => void save()}
        saving={saving}
        dirty={dirty}
        deckCards={deck.cards}
        deckLoading={deck.loading || !deck.loaded}
        deckActions={() => ({ onPass: (h) => void onDecide(h, 'PASS'), onSkip: (h) => void onDecide(h, 'SKIP'), onInterested: interestAction })}
      />
    </PageFrame>
  );
}
