'use client';

import { useCallback, useState } from 'react';
import Image from 'next/image';
import { useQuery, useLazyQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Users,
  UsersRound,
  MessageSquare,
  Star,
  ShieldCheck,
  Check,
  ChevronRight,
  UserPlus,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GET_COMMUNITY_MEMBERS } from '@/services/gql/community';
import {
  EMBASSY_GUIDELINES,
  type EmbassyProfile,
} from '../embassyMock';
import type { EmbassyViewProps } from '../types';

/** How many members to request per page in the "See All" dialog. */
const MEMBERS_PAGE_SIZE = 20;

/* ── Right-rail backend response shapes ─────────────────────────────────── */
interface CommunityMember {
  userId: string;
  role: string;
  status: string;
  joinedAt?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}

interface CommunityMembersData {
  listCommunityMembers: {
    members: CommunityMember[];
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
  const t = useTranslations('community.embassy.community');

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

  /* ── Community Guidelines ──────────────────────────────────────────────
   * The community may expose `communityRules` (a longer-form guidelines text);
   * when it is missing we fall back to the generic platform guidelines that the
   * card already lists (EMBASSY_GUIDELINES). The optional field is not part of
   * the shared EmbassyCommunity type, so we read it defensively. */
  const communityRules = (community as { communityRules?: string | null }).communityRules;
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);

  /* ── "See All" members dialog → paginated listCommunityMembers ─────────
   * Fetched lazily (only when the dialog opens) with a larger page size. Rows
   * are accumulated in local state and "Load more" re-runs the loader with a
   * growing offset — mirroring the lazy-query pagination used elsewhere
   * (useFeed) rather than relying on fetchMore/updateQuery. */
  const [membersOpen, setMembersOpen] = useState(false);
  const [allMemberRows, setAllMemberRows] = useState<CommunityMember[]>([]);
  const [allMemberTotal, setAllMemberTotal] = useState(0);
  const [loadAllMembers, { loading: allMembersLoading }] =
    useLazyQuery<CommunityMembersData>(GET_COMMUNITY_MEMBERS, {
      fetchPolicy: 'network-only',
    });
  const hasMoreMembers = allMemberRows.length < allMemberTotal;

  const fetchMembersPage = useCallback(
    async (offset: number) => {
      const { data } = await loadAllMembers({
        variables: { communityId: community.id, limit: MEMBERS_PAGE_SIZE, offset },
      });
      const page = data?.listCommunityMembers;
      if (!page) return;
      setAllMemberTotal(page.total ?? 0);
      setAllMemberRows((prev) => {
        if (offset === 0) return page.members;
        const seen = new Set(prev.map((m) => m.userId));
        return [...prev, ...page.members.filter((m) => !seen.has(m.userId))];
      });
    },
    [loadAllMembers, community.id],
  );

  const openMembersDialog = useCallback(() => {
    setMembersOpen(true);
    setAllMemberRows([]);
    setAllMemberTotal(0);
    void fetchMembersPage(0);
  }, [fetchMembersPage]);

  const handleLoadMoreMembers = useCallback(() => {
    if (allMembersLoading) return;
    void fetchMembersPage(allMemberRows.length);
  }, [allMembersLoading, fetchMembersPage, allMemberRows.length]);

  /* ── Invite Friends → copy / native-share the community URL ────────────
   * Mirrors the lightweight share logic from SharePostModal: prefer the native
   * share sheet, fall back to the clipboard + a sonner toast. SSR-guarded. */
  const handleInvite = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const url =
      typeof window.location !== 'undefined'
        ? window.location.href
        : `/community/${community.id}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ url, title: community.name });
        return;
      } catch {
        // user cancelled or share unavailable — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('inviteCopied'));
    } catch {
      toast.error(t('inviteCopyFailed'));
    }
  }, [community.id, community.name, t]);

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
            <button
              type="button"
              onClick={() => setGuidelinesOpen(true)}
              className="label-medium mt-3 inline-flex items-center gap-1 text-text-brand"
            >
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
              <button
                type="button"
                onClick={openMembersDialog}
                className="caption-medium text-text-brand"
              >
                See All
              </button>
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
              onClick={handleInvite}
              className="label-medium mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border-brand py-2 text-text-brand"
            >
              <UserPlus className="size-4" aria-hidden />
              Invite Friends
            </button>
          </CardContent>
        </Card>
      </aside>

      {/* ── Full Guidelines dialog ─────────────────────────────────────── */}
      <Dialog open={guidelinesOpen} onOpenChange={setGuidelinesOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="heading-xsmall flex items-center gap-2 text-text-primary">
              <ShieldCheck className="size-5 text-text-success" aria-hidden />
              {t('guidelinesTitle')}
            </DialogTitle>
            <DialogDescription className="caption-medium text-text-secondary">
              {t('guidelinesSubtitle')}
            </DialogDescription>
          </DialogHeader>
          {communityRules ? (
            <p className="caption-large whitespace-pre-line text-text-primary">
              {communityRules}
            </p>
          ) : (
            <ul className="space-y-2">
              {EMBASSY_GUIDELINES.map((g) => (
                <li
                  key={g}
                  className="caption-large flex items-start gap-2 text-text-primary"
                >
                  <Check className="mt-0.5 size-4 flex-shrink-0 text-text-success" aria-hidden />
                  {g}
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      {/* ── All members dialog ─────────────────────────────────────────── */}
      <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="heading-xsmall text-text-primary">
              {t('membersTitle')}
            </DialogTitle>
            <DialogDescription className="caption-medium text-text-secondary">
              {t('membersCount', { count: allMemberTotal })}
            </DialogDescription>
          </DialogHeader>

          {allMemberRows.length === 0 && allMembersLoading ? (
            <div className="flex items-center justify-center py-8 text-text-secondary">
              <Loader2 className="size-5 animate-spin" aria-hidden />
            </div>
          ) : allMemberRows.length === 0 ? (
            <p className="caption-large py-6 text-center text-text-secondary">
              {t('membersEmpty')}
            </p>
          ) : (
            <ul className="space-y-1">
              {allMemberRows.map((m) => (
                <li key={m.userId} className="flex items-center gap-3 py-2">
                  {m.avatarUrl ? (
                    <Image
                      src={m.avatarUrl}
                      alt={m.displayName ?? ''}
                      width={40}
                      height={40}
                      className="size-10 flex-shrink-0 rounded-full border border-border-subtle object-cover"
                    />
                  ) : (
                    <span className="size-10 flex-shrink-0 rounded-full border border-border-subtle bg-surface-subtle" />
                  )}
                  <div className="min-w-0">
                    <p className="label-medium truncate text-text-primary">
                      {m.displayName ?? t('memberFallbackName')}
                    </p>
                    <p className="caption-small capitalize text-text-secondary">
                      {m.role.toLowerCase()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {hasMoreMembers && (
            <button
              type="button"
              onClick={handleLoadMoreMembers}
              disabled={allMembersLoading}
              className="label-medium mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border-brand py-2 text-text-brand disabled:opacity-50"
            >
              {allMembersLoading && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {t('loadMore')}
            </button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EmbassyCommunityTab;
