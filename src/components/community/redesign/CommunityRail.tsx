'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useFormatter, useTranslations } from 'next-intl';
import { Flame, Hash, SquarePen } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { RailCard } from '@/components/redesign/RailCard';
import { useFriendActions } from '@/hooks/friends/useFriendActions';
import { GET_TRENDING_HASHTAGS, RECOMMENDED_PEOPLE } from '@/services/gql/postsFeed';
import type { RecommendedPeopleData } from '@/services/gql/types/recommendation';
import { LIST_EVENTS, getEventLocationDisplay, type Event, type ListEventsData } from '@/services/gql/events';
import { useImageFallback } from '@/components/ui/ImageWithFallback';
import { displayName } from '@/lib/displayName';
import { toCdnUrl } from '@/lib/cdn';

const SILENT = { context: { silentErrors: true } } as const;

function PersonAvatar({ src }: { src?: string | null }) {
  const { src: resolved, onError } = useImageFallback(src ? toCdnUrl(src) : undefined, '/PROFILE.png');
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={resolved || '/PROFILE.png'} alt="" width={40} height={40} loading="lazy" onError={onError} className="size-10 shrink-0 rounded-full border border-border-subtle object-cover" />;
}

function SuggestedPeople() {
  const t = useTranslations('communityPage.rail');
  const tAll = useTranslations('redesign');
  const tIdentity = useTranslations('common.identity');
  const { addFriend } = useFriendActions();
  const { data } = useQuery<RecommendedPeopleData>(RECOMMENDED_PEOPLE, { variables: { limit: 4 }, fetchPolicy: 'cache-and-network', ...SILENT });
  const [sent, setSent] = useState<Set<string>>(new Set());
  const people = (data?.recommendedPeople?.items ?? []).filter((p) => p?.profile?.userId).slice(0, 4);
  if (people.length === 0) return null;
  const connect = async (userId: string) => {
    setSent((p) => new Set(p).add(userId));
    const ok = await addFriend(userId);
    if (!ok) setSent((p) => { const n = new Set(p); n.delete(userId); return n; });
  };
  return (
    <RailCard id="community-people-title" title={t('people')} href="/people" viewAllLabel={tAll('viewAll')} testId="community-people">
      <ul className="space-y-3">
        {people.map(({ profile }) => {
          const name = displayName(profile, tIdentity('unknownUser'));
          const headline = profile.headline || profile.sector || '';
          return (
            <li key={profile.userId} className="flex items-center gap-3">
              <PersonAvatar src={profile.avatarUrl} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-text-primary">{name}</span>
                {headline && <span className="block truncate text-xs text-muted-foreground">{headline}</span>}
              </span>
              <button
                type="button"
                disabled={sent.has(profile.userId)}
                onClick={() => connect(profile.userId)}
                className="shrink-0 rounded-full border border-border-brand px-3 py-1 text-xs font-semibold text-text-brand transition-colors hover:bg-surface-brand-subtle disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
              >
                {sent.has(profile.userId) ? t('sentLabel') : t('connect')}
              </button>
            </li>
          );
        })}
      </ul>
    </RailCard>
  );
}

/** Trending hashtags (shared by the rail card and the phone drawer). */
export function useTrendingTags() {
  const { data } = useQuery<{ trendingHashtags?: { id: string; tag: string; usageCount?: number | null }[] | null }>(GET_TRENDING_HASHTAGS, { variables: { input: { limit: 5, timeRange: '7d' } }, fetchPolicy: 'cache-first', ...SILENT });
  return (data?.trendingHashtags ?? []).filter((h) => h && h.tag).slice(0, 5);
}

function TrendingTopics() {
  const t = useTranslations('communityPage.rail');
  const tags = useTrendingTags();
  if (tags.length === 0) return null;
  return (
    <RailCard id="community-topics-title" title={t('topics')} testId="community-topics">
      <ul className="space-y-2.5">
        {tags.map((h, i) => (
          <li key={h.id ?? h.tag}>
            <Link href={`/search?q=${encodeURIComponent(`#${h.tag}`)}`} prefetch={false} className="flex items-center gap-3 rounded-lg p-1 hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-warning text-text-warning">{i === 0 ? <Flame className="size-4" aria-hidden /> : <Hash className="size-4" aria-hidden />}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-text-primary">#{h.tag}</span>
                {typeof h.usageCount === 'number' && h.usageCount > 0 && <span className="block text-xs text-muted-foreground">{t('topicUses', { count: h.usageCount })}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </RailCard>
  );
}

/** The next three upcoming public events (shared by the rail card and the phone drawer). */
export function useUpcomingPublicEvents(): Event[] {
  const { data } = useQuery<ListEventsData>(LIST_EVENTS, { variables: { input: { limit: 20, offset: 0 } }, fetchPolicy: 'cache-first', ...SILENT });
  return useMemo(() => {
    const now = Date.now();
    return (data?.listEvents?.events ?? [])
      .filter((e): e is Event => !!e && !!e.id && !!e.startAt)
      .filter((e) => !['cancelled', 'draft'].includes(String(e.status).toLowerCase()) && new Date(e.endAt || e.startAt).getTime() > now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 3);
  }, [data]);
}

function UpcomingEvents() {
  const t = useTranslations('communityPage.rail');
  const tAll = useTranslations('redesign');
  const format = useFormatter();
  const events = useUpcomingPublicEvents();
  if (events.length === 0) return null;
  return (
    <RailCard id="community-events-title" title={t('events')} href="/events" viewAllLabel={tAll('viewAll')} testId="community-events">
      <ul className="space-y-3">
        {events.map((e) => {
          const d = new Date(e.startAt);
          return (
            <li key={e.id}>
              <Link href={`/events/${encodeURIComponent(e.id)}`} prefetch={false} className="flex items-center gap-3 rounded-lg p-1 hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
                <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg bg-surface-danger text-text-danger">
                  <span className="text-[10px] font-semibold uppercase leading-none">{format.dateTime(d, { month: 'short' })}</span>
                  <span className="text-lg font-bold leading-tight">{format.dateTime(d, { day: 'numeric' })}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-text-primary">{e.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{getEventLocationDisplay(e)} · {format.dateTime(d, { timeStyle: 'short' })}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </RailCard>
  );
}

/**
 * Community right rail. Each card queries for itself and renders nothing when its source is empty.
 * `communities` is the page's "Communities to join" card (the page owns the join flow).
 */
export function CommunityRail({ communities }: { communities?: React.ReactNode } = {}) {
  const t = useTranslations('communityPage.rail');
  return (
    <div className="space-y-4" data-testid="community-rail">
      <SuggestedPeople />
      <TrendingTopics />
      <UpcomingEvents />
      {communities}
      <section className="rounded-2xl border border-border-subtle bg-surface-brand-subtle p-4 shadow-sm">
        <h2 className="text-sm font-bold text-text-primary">{t('createTitle')}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t('createBody')}</p>
        <Link href="/create-post" prefetch={false} className="mt-3 inline-flex items-center gap-2 rounded-full bg-surface-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2">
          <SquarePen className="size-4" aria-hidden />
          {t('createCta')}
        </Link>
      </section>
    </div>
  );
}
