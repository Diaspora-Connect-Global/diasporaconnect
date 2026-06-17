'use client';

import { useQuery } from '@apollo/client/react';
import {
  Users,
  UsersRound,
  MessageSquare,
  Star,
  ShieldCheck,
  Check,
  ChevronRight,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { GET_COMMUNITY_MEMBERS } from '@/services/gql/community';
import {
  EMBASSY_GUIDELINES,
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

const TONES: Record<string, { tile: string; ring: string; fg: string }> = {
  blue: { tile: 'bg-blue-50', ring: 'bg-blue-100', fg: 'text-blue-600' },
  green: { tile: 'bg-green-50', ring: 'bg-green-100', fg: 'text-green-600' },
  orange: { tile: 'bg-orange-50', ring: 'bg-orange-100', fg: 'text-orange-500' },
  purple: { tile: 'bg-purple-50', ring: 'bg-purple-100', fg: 'text-purple-600' },
};

const fmtCount = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K` : String(n);

interface EmbassyCommunityTabProps {
  props: EmbassyViewProps;
  profile: EmbassyProfile;
}

export function EmbassyCommunityTab({ props }: EmbassyCommunityTabProps) {
  const { community, posts, displayMemberCount } = props;

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
