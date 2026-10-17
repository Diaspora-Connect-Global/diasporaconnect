'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Compass, SquarePen, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ButtonType3 } from '@/components/custom/button';
import { EmptyState } from '@/components/feedback';
import { MY_INTEREST_PROFILE } from '@/services/gql/postsFeed';
import type { MyInterestProfileData } from '@/services/gql/types/recommendation';
import { InterestsPromptCard, INTERESTS_PROMPT_DISMISSED_KEY } from '@/components/home/InterestsPromptCard';
import type { FeedSlotContext } from '@/components/community/redesign/CommunityFeed';

const THIN_FEED_THRESHOLD = 5;

/**
 * Home-only content above the shared feed list: the cold-start "Set your
 * interests" card (C4) and the lighter chronological-fallback nudge (C1).
 * Both belong to the personalised "For you" feed only.
 */
export function HomeFeedTop({ ctx }: { ctx: FeedSlotContext }) {
  const tHome = useTranslations('home');
  const forYou = ctx.tab === 'forYou' && !ctx.category;
  const { data } = useQuery<MyInterestProfileData>(MY_INTEREST_PROFILE, {
    fetchPolicy: 'cache-and-network',
    skip: !forYou,
  });
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(INTERESTS_PROMPT_DISMISSED_KEY) === '1');
    } catch {
      setDismissed(true); // storage unavailable: never nag
    }
  }, []);

  const isColdStart = data?.myInterestProfile?.coldStart === true;
  const isThin = ctx.isChronoFallback || ctx.posts.length < THIN_FEED_THRESHOLD;
  const showPrompt = forYou && isColdStart && isThin && !dismissed;

  if (showPrompt) return <InterestsPromptCard onDismiss={() => setDismissed(true)} />;
  if (forYou && ctx.isChronoFallback) {
    return (
      <div className="mb-3 flex items-start gap-3 rounded-xl border border-border-subtle bg-surface-subtle p-3">
        <Compass className="mt-0.5 h-5 w-5 shrink-0 text-text-brand" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary">{tHome('chronoFallback.title')}</p>
          <p className="mt-0.5 text-sm text-text-secondary">{tHome('chronoFallback.description')}</p>
          <button
            type="button"
            onClick={() => setDismissed(false)}
            className="mt-2 text-sm font-medium text-text-brand hover:underline"
          >
            {tHome('chronoFallback.cta')}
          </button>
        </div>
      </div>
    );
  }
  return null;
}

/** Home-only empty states: Following (C2) points at discovery, For you invites a first post. */
export function HomeFeedEmpty({ ctx }: { ctx: FeedSlotContext }) {
  const tHome = useTranslations('home');
  if (ctx.tab === 'following') {
    return (
      <EmptyState
        icon={Users}
        title={tHome('followingEmpty.title')}
        description={tHome('followingEmpty.description')}
        action={
          <div className="flex flex-col items-center gap-2 sm:flex-row">
            <Link href="/community" prefetch={false}>
              <ButtonType3 className="border border-text-brand px-4 py-2 text-sm">{tHome('followingEmpty.discover')}</ButtonType3>
            </Link>
            <button type="button" onClick={() => ctx.setTab('forYou')} className="text-sm font-medium text-text-brand hover:underline">
              {tHome('followingEmpty.switchToYou')}
            </button>
          </div>
        }
      />
    );
  }
  if (ctx.tab === 'forYou') {
    return (
      <EmptyState
        icon={SquarePen}
        title={tHome('youEmpty.title')}
        description={tHome('youEmpty.description')}
        action={
          <Link href="/create-post" prefetch={false}>
            <ButtonType3 className="inline-flex items-center gap-2 border border-text-brand px-4 py-2 text-sm">
              <SquarePen className="h-4 w-4" />
              {tHome('youEmpty.createPost')}
            </ButtonType3>
          </Link>
        }
      />
    );
  }
  return null;
}
