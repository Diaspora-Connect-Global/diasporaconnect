'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import PageLoader from '@/components/custom/PageLoader';
import PageFrame from './PageFrame';
import GateMessage from './GateMessage';
import RecommendedView from './RecommendedView';
import { NetworkingHeader } from './NetworkingShell';
import { InlineNotice } from './primitives';
import { RevealConfirmDialog } from './InterestParts';
import { useDecide, useInterestFlow, useNetworkingBase, usePagedCards, useReportRefusal } from './useNetworking';
import { hasFailure } from '@/lib/networkingRefusal';
import { NETWORKING_FEATURES } from '@/lib/networkingFeatures';
import { NETWORKING_DECK, NETWORKING_MUTATION, NETWORKING_RECONSIDER_PASSED, NETWORKING_REVIEW_LATER } from '@/services/gql/networking';

export default function NetworkingRecommended({ eventId }: { eventId: string }) {
  const t = useTranslations('networking');
  const router = useRouter();
  const base = useNetworkingBase(eventId);
  const report = useReportRefusal();
  const features = NETWORKING_FEATURES;
  const ready = base.gate === 'ready' || base.gate === 'paused';
  const [mode, setMode] = useState<'deck' | 'saved'>('deck');
  const decide = useDecide(eventId);
  const flow = useInterestFlow(eventId, base.mine?.participation?.visibility);
  const [reconsider] = useMutation(NETWORKING_RECONSIDER_PASSED, NETWORKING_MUTATION);

  const deck = usePagedCards(NETWORKING_DECK, 'eventNetworkingDeck', { eventId }, ready && mode === 'deck', 10);
  const saved = usePagedCards(NETWORKING_REVIEW_LATER, 'eventNetworkingReviewLater', { eventId }, ready && mode === 'saved', 10);
  const q = mode === 'deck' ? deck : saved;

  if (base.gate === 'loading') return <PageLoader />;
  if (!ready) {
    return (
      <PageFrame>
        <NetworkingHeader event={base.context} />
        <GateMessage state={base.gate as never} eventId={eventId} onRetry={() => void base.refetchMine()} onRejoin={() => router.push(`/events/${eventId}/networking/setup`)} />
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <RevealConfirmDialog open={Boolean(flow.pending)} name={flow.pending?.name} sending={flow.sending} onConfirm={() => void flow.confirm()} onCancel={flow.cancel} />
      {base.gate === 'paused' && <InlineNotice tone="warning" testId="paused-banner">{t('hub.pausedBanner')}</InlineNotice>}
      {q.refusal && q.refusal.kind !== 'notFound' && <InlineNotice tone="warning" testId="deck-refusal">{t(`errors.${q.refusal.key}`)}</InlineNotice>}
      <RecommendedView
        event={base.context}
        features={features}
        completeness={base.mine?.participation?.profile?.completeness ?? 0}
        mode={mode}
        onMode={setMode}
        onReconsider={async () => {
          const r = await reconsider({ variables: { eventId } });
          if (hasFailure(r)) report(r);
          else { toast.success(t('deck.reconsidered')); deck.reload(); }
        }}
        eventId={eventId}
        cards={q.cards}
        me={base.me}
        labelOf={base.labelOf}
        hasMore={q.hasMore}
        loading={q.loading || !q.loaded}
        refreshing={q.refreshing}
        reviewingSkipped={q.reviewingSkipped}
        onDecide={decide}
        onInterested={features.interests ? (h) => flow.express(h, mode === 'saved' ? 'REVIEW_LATER' : 'DECK', q.cards.find((c) => c.handle === h)?.displayName ?? '') : undefined}
        onBlocked={features.interests ? q.remove : undefined}
        onNeedMore={q.loadMore}
      />
    </PageFrame>
  );
}
