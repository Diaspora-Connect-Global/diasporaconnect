'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useQuery } from '@apollo/client/react';
import {
  Users,
  UsersRound,
  MessageSquare,
  Star,
  ShieldCheck,
  Check,
  Flame,
  ThumbsUp,
  MessageCircle,
  Share2,
  Bookmark,
  Globe,
  ChevronRight,
  ChevronDown,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateProximity } from '@/macros/time';
import { GET_COMMUNITY_MEMBERS } from '@/services/gql/community';
import { GET_TRENDING_HASHTAGS } from '@/services/gql/postsFeed';
import {
  EMBASSY_GUIDELINES,
  EMBASSY_TRENDING_TOPICS,
  EMBASSY_DISCUSSION_FILTERS,
  type EmbassyProfile,
} from '../embassyMock';
import type { EmbassyViewProps } from '../types';

/* ── Right-rail backend response shapes ─────────────────────────────────── */
interface CommunityMembersData {
  listCommunityMembers: {
    members: Array<{
      userId: string;
      role: string;
      status: string;
      joinedAt?: string | null;
      displayName?: string | null;
      avatarUrl?: string | null;
    }>;
    total: number;
  };
}
interface TrendingHashtagsData {
  trendingHashtags: Array<{ id: string; tag: string; usageCount: number }>;
}

const TONES: Record<string, { tile: string; ring: string; fg: string }> = {
  blue: { tile: 'bg-blue-50', ring: 'bg-blue-100', fg: 'text-blue-600' },
  green: { tile: 'bg-green-50', ring: 'bg-green-100', fg: 'text-green-600' },
  orange: { tile: 'bg-orange-50', ring: 'bg-orange-100', fg: 'text-orange-500' },
  purple: { tile: 'bg-purple-50', ring: 'bg-purple-100', fg: 'text-purple-600' },
};

const FALLBACK_AVATAR = '/GLOBE.png';

const fmtCount = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K` : String(n);

interface EmbassyCommunityTabProps {
  props: EmbassyViewProps;
  profile: EmbassyProfile;
}

export function EmbassyCommunityTab({ props }: EmbassyCommunityTabProps) {
  const { community, posts, displayMemberCount } = props;
  const [activeFilter, setActiveFilter] = useState(EMBASSY_DISCUSSION_FILTERS[0]);
  const avatar = community.avatarUrl || FALLBACK_AVATAR;

  /* ── Recently Active Members → real community members ──────────────────
   * listCommunityMembers exposes name/avatar but they may be null, so we still
   * render neutral avatar placeholders for the fetched rows and use the real
   * `total` for the "+N" overflow badge. Graceful when empty. */
  const { data: membersData } = useQuery<CommunityMembersData>(GET_COMMUNITY_MEMBERS, {
    variables: { communityId: community.id, limit: 6, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });
  const memberRows = membersData?.listCommunityMembers?.members ?? [];
  const memberTotal = membersData?.listCommunityMembers?.total ?? 0;
  const shownMembers = memberRows.slice(0, 5);
  const extraMembers = Math.max(memberTotal - shownMembers.length, 0);

  /* ── Trending Topics → real trending hashtags ──────────────────────────
   * Global trending hashtags from post-feed-service. Falls back to the mock
   * topics when the gateway returns an empty list so the card never looks
   * broken. */
  const { data: trendingData } = useQuery<TrendingHashtagsData>(GET_TRENDING_HASHTAGS, {
    variables: { input: { limit: 5 } },
    fetchPolicy: 'cache-and-network',
  });
  const trendingTopics = useMemo(() => {
    const live = trendingData?.trendingHashtags ?? [];
    if (live.length > 0) {
      return live.map((h) => ({ tag: h.tag, posts: h.usageCount }));
    }
    return EMBASSY_TRENDING_TOPICS.map((t) => ({ tag: t.tag, posts: t.posts }));
  }, [trendingData]);

  /* ── Community Guidelines → no per-community backend source ─────────────
   * getCommunity / GET_COMMUNITY_DETAILS does not expose a community_rules /
   * communityRules field, so wiring real rules would require a backend change.
   * We keep the generic platform guidelines (EMBASSY_GUIDELINES) here. */

  // Members + Discussions come from the backend (community memberCount + the
  // community feed). Online Now / Featured Posts have no backend endpoint yet — mock.
  const stats: Array<{ key: string; icon: LucideIcon; tone: string; value: string; label: string; sub: string }> = [
    { key: 'members', icon: Users, tone: 'blue', value: fmtCount(displayMemberCount), label: 'Members', sub: 'Total members' },
    { key: 'discussions', icon: MessageSquare, tone: 'green', value: fmtCount(posts.length), label: 'Discussions', sub: 'In this community' },
    { key: 'online', icon: UsersRound, tone: 'orange', value: '42', label: 'Online Now', sub: 'Active members' },
    { key: 'featured', icon: Star, tone: 'purple', value: '18', label: 'Featured Posts', sub: 'Top this month' },
  ];

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-3 py-6 lg:grid-cols-[1fr_22rem] lg:px-6">
      {/* ── Main column ─────────────────────────────────────────────── */}
      <div className="min-w-0 space-y-6">
        {/* Community Overview */}
        <Card className="border-border-subtle">
          <CardContent className="p-5">
            <h2 className="heading-xsmall mb-4 text-text-primary">Community Overview</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {stats.map((s) => {
                const Icon = s.icon;
                const c = TONES[s.tone] ?? TONES.blue;
                return (
                  <div key={s.key} className={`rounded-xl ${c.tile} p-4`}>
                    <span className={`mb-2 flex size-9 items-center justify-center rounded-lg ${c.ring}`}>
                      <Icon className={`size-5 ${c.fg}`} aria-hidden />
                    </span>
                    <p className="heading-small text-text-primary">{s.value}</p>
                    <p className="label-medium text-text-primary">{s.label}</p>
                    <p className="caption-small text-text-secondary">{s.sub}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {EMBASSY_DISCUSSION_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setActiveFilter(f)}
                className={`label-medium rounded-full px-4 py-1.5 transition-colors ${
                  activeFilter === f
                    ? 'bg-surface-brand text-text-white'
                    : 'border border-border-subtle text-text-secondary hover:text-text-primary'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button type="button" className="caption-large inline-flex items-center gap-1 text-text-secondary">
            <ChevronDown className="size-4" aria-hidden /> Latest
          </button>
        </div>

        {/* Discussions */}
        {posts.length === 0 ? (
          <Card className="border-border-subtle">
            <CardContent className="py-10 text-center body-small text-text-secondary">
              No discussions yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              const [title, ...rest] = (post.text || '').split('\n').filter(Boolean);
              const body = rest.join(' ');
              return (
                <Card key={post.id} className="border-border-subtle">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <Image
                        src={avatar}
                        alt=""
                        width={40}
                        height={40}
                        className="size-10 flex-shrink-0 rounded-full object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="label-medium text-text-primary">{community.name}</span>
                          <span className="caption-small rounded-full bg-surface-success px-2 py-0.5 text-text-success">
                            Active Member
                          </span>
                          <span className="caption-small text-text-secondary">
                            · {formatDateProximity(post.createdAt)}
                          </span>
                          <Globe className="size-3.5 text-text-secondary" aria-hidden />
                        </div>
                      </div>
                    </div>

                    {post.categories?.[0] && (
                      <span className="caption-small mt-3 inline-block rounded bg-surface-info px-2 py-0.5 text-text-info">
                        {post.categories[0]}
                      </span>
                    )}
                    {title && <h3 className="label-large mt-2 text-text-primary">{title}</h3>}
                    {body && <p className="body-small mt-1 text-text-secondary">{body}</p>}

                    <div className="mt-4 flex items-center gap-6 border-t border-border-subtle pt-3">
                      <button
                        type="button"
                        onClick={() => props.onLike(post.id, !post.userEngagement.hasLiked)}
                        className={`caption-large inline-flex items-center gap-1.5 ${
                          post.userEngagement.hasLiked ? 'text-text-brand' : 'text-text-secondary'
                        }`}
                      >
                        <ThumbsUp className="size-4" aria-hidden /> {post.engagementCounts.likes}
                      </button>
                      <span className="caption-large inline-flex items-center gap-1.5 text-text-secondary">
                        <MessageCircle className="size-4" aria-hidden /> {post.engagementCounts.comments}
                      </span>
                      <button
                        type="button"
                        onClick={() => props.onShare(post.id)}
                        className="caption-large ml-auto inline-flex items-center gap-1.5 text-text-secondary"
                      >
                        <Share2 className="size-4" aria-hidden /> Share
                      </button>
                      <button
                        type="button"
                        onClick={() => props.onSave(post.id, !post.userEngagement.hasSaved)}
                        className={`caption-large inline-flex items-center gap-1.5 ${
                          post.userEngagement.hasSaved ? 'text-text-brand' : 'text-text-secondary'
                        }`}
                      >
                        <Bookmark className="size-4" aria-hidden /> Save
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Right rail ──────────────────────────────────────────────── */}
      <aside className="space-y-6">
        {/* Community Guidelines */}
        <Card className="border-border-subtle">
          <CardContent className="p-5">
            <h3 className="label-large flex items-center gap-2 text-text-primary">
              <ShieldCheck className="size-4 text-text-success" aria-hidden />
              Community Guidelines
            </h3>
            <p className="caption-medium mt-1 text-text-secondary">
              Please be respectful, helpful and follow our community guidelines.
            </p>
            <ul className="mt-3 space-y-2">
              {EMBASSY_GUIDELINES.map((g) => (
                <li key={g} className="caption-large flex items-center gap-2 text-text-primary">
                  <Check className="size-4 flex-shrink-0 text-text-success" aria-hidden />
                  {g}
                </li>
              ))}
            </ul>
            <button type="button" className="label-medium mt-3 inline-flex items-center gap-1 text-text-brand">
              View Full Guidelines
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </CardContent>
        </Card>

        {/* Trending Topics */}
        <Card className="border-border-subtle">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="label-large flex items-center gap-2 text-text-primary">
                <Flame className="size-4 text-orange-500" aria-hidden />
                Trending Topics
              </h3>
              <button type="button" className="caption-medium text-text-brand">See All</button>
            </div>
            <ul className="space-y-3">
              {trendingTopics.map((tp) => (
                <li key={tp.tag} className="flex items-center justify-between">
                  <span className="caption-large text-text-brand">#{tp.tag}</span>
                  <span className="caption-small text-text-secondary">{tp.posts} posts</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Recently Active Members */}
        <Card className="border-border-subtle">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="label-large text-text-primary">Recently Active Members</h3>
              <button type="button" className="caption-medium text-text-brand">See All</button>
            </div>
            <div className="flex items-center">
              {shownMembers.map((m) => (
                // No batch profile-by-id query exists in the gateway, so avatars
                // are neutral placeholders; rows + total come from getCommunityMembers.
                <span
                  key={m.userId}
                  className="-ml-2 size-9 rounded-full border-2 border-surface-default bg-surface-subtle first:ml-0"
                />
              ))}
              {extraMembers > 0 && (
                <span className="-ml-2 flex size-9 items-center justify-center rounded-full border-2 border-surface-default bg-surface-subtle caption-small text-text-secondary">
                  +{extraMembers}
                </span>
              )}
            </div>
            <p className="caption-medium mt-3 text-text-secondary">
              These members were active in the last 24 hours.
            </p>
            <button
              type="button"
              className="label-medium mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border-brand py-2 text-text-brand"
            >
              <UserPlus className="size-4" aria-hidden />
              Invite Friends
            </button>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

export default EmbassyCommunityTab;
