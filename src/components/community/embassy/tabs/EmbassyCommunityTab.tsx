'use client';

import { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import { useQuery, useLazyQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Users,
  MessageSquare,
  CalendarDays,
  ConciergeBell,
  ShieldCheck,
  BadgeCheck,
  Check,
  ChevronRight,
  UserPlus,
  Mail,
  Phone,
  MapPin,
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
import { GET_EVENTS_BY_OWNER } from '@/services/gql/events';
import {
  SERVICE_REQUEST_TYPES,
  type ServiceRequestTypesResponse,
} from '@/services/gql/embassyServices';
import {
  EMBASSY_GUIDELINES,
  type EmbassyProfile,
} from '../embassyMock';
import type { EmbassyViewProps } from '../types';
import { useIsEmbassy } from '@/components/community/embassy/communityVariant';

/** How many members to request per page in the "See All" dialog. */
const MEMBERS_PAGE_SIZE = 20;
/** How many members to fetch for the right-rail highlight. */
const HIGHLIGHT_LIMIT = 8;
/** How many avatars to show in the right-rail highlight stack. */
const HIGHLIGHT_SHOWN = 5;

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

interface EventsByOwnerData {
  getEventsByOwner: { total: number } | null;
}

const TONES: Record<string, { tile: string; ring: string; fg: string }> = {
  blue: { tile: 'bg-blue-50', ring: 'bg-blue-100', fg: 'text-blue-600' },
  green: { tile: 'bg-green-50', ring: 'bg-green-100', fg: 'text-green-600' },
  orange: { tile: 'bg-orange-50', ring: 'bg-orange-100', fg: 'text-orange-500' },
  purple: { tile: 'bg-purple-50', ring: 'bg-purple-100', fg: 'text-purple-600' },
};

const fmtCount = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K` : String(n);

/** Convert an ISO-3166 alpha-2 code (e.g. "FR") to a country name ("France").
 *  Non-code values (already a full name) are returned unchanged.
 *  (Mirrors the helper in EmbassyHeader.tsx.) */
function countryLabel(value?: string | null): string | undefined {
  if (!value) return undefined;
  const v = value.trim();
  if (/^[A-Za-z]{2}$/.test(v)) {
    try {
      return new Intl.DisplayNames(['en'], { type: 'region' }).of(v.toUpperCase()) ?? v;
    } catch {
      return v;
    }
  }
  return v;
}

/** Established year from an ISO timestamp, or undefined when unparseable. */
function establishedYear(createdAt?: string | null): string | undefined {
  if (!createdAt) return undefined;
  const d = new Date(createdAt);
  return Number.isNaN(d.getTime()) ? undefined : String(d.getFullYear());
}

interface EmbassyCommunityTabProps {
  props: EmbassyViewProps;
  profile: EmbassyProfile;
}

export function EmbassyCommunityTab({ props, profile }: EmbassyCommunityTabProps) {
  const { community, posts, displayMemberCount } = props;
  const t = useTranslations('community.embassy.community');
  const isEmbassy = useIsEmbassy();

  /* ── Right-rail member highlight → real community members ──────────────
   * listCommunityMembers exposes real names + avatar URLs; we render real
   * avatars (with a neutral placeholder when avatarUrl is null) and use the
   * real `total` for the "+N" overflow badge. Graceful when empty. */
  const { data: membersData } = useQuery<CommunityMembersData>(GET_COMMUNITY_MEMBERS, {
    variables: { communityId: community.id, limit: HIGHLIGHT_LIMIT, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });
  const memberRows = membersData?.listCommunityMembers?.members ?? [];
  const memberTotal = membersData?.listCommunityMembers?.total ?? 0;
  const shownMembers = memberRows.slice(0, HIGHLIGHT_SHOWN);
  const extraMembers = Math.max(memberTotal - shownMembers.length, 0);

  /* ── Real stat tiles ───────────────────────────────────────────────────
   * Events come from getEventsByOwner.total; Services from the count of active
   * serviceRequestTypes for this community. Members + Discussions come from the
   * already-supplied props (memberCount + the live community feed). */
  const { data: eventsData } = useQuery<EventsByOwnerData>(GET_EVENTS_BY_OWNER, {
    variables: { ownerId: community.id, ownerType: 'community', limit: 1, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });
  const eventsTotal = eventsData?.getEventsByOwner?.total ?? 0;

  const { data: servicesData } = useQuery<ServiceRequestTypesResponse>(SERVICE_REQUEST_TYPES, {
    variables: { ownerType: 'COMMUNITY', ownerEntityId: community.id },
    fetchPolicy: 'cache-and-network',
  });
  const servicesTotal = useMemo(
    () => (servicesData?.serviceRequestTypes ?? []).filter((s) => s.isActive !== false).length,
    [servicesData],
  );

  /* ── Community Guidelines ──────────────────────────────────────────────
   * The community may expose `communityRules` (longer-form guidelines text);
   * when it is missing we fall back to the generic platform guidelines that the
   * card already lists (EMBASSY_GUIDELINES). */
  const communityRules = community.communityRules;
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);

  /* ── About card meta ───────────────────────────────────────────────────*/
  const location = countryLabel(community.locationCountry) || community.address || profile.city;
  const year = establishedYear(community.createdAt);

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

  // All four tiles are now real: Members + Discussions from props, Events from
  // getEventsByOwner.total, Services from the active serviceRequestTypes count.
  const stats: Array<{
    key: string;
    icon: LucideIcon;
    tone: string;
    value: string;
    label: string;
    sub: string;
  }> = [
    {
      key: 'members',
      icon: Users,
      tone: 'blue',
      value: fmtCount(displayMemberCount),
      label: t('members'),
      sub: t('membersSub'),
    },
    {
      key: 'discussions',
      icon: MessageSquare,
      tone: 'green',
      value: fmtCount(posts.length),
      label: t('discussions'),
      sub: t('discussionsSub'),
    },
    {
      key: 'events',
      icon: CalendarDays,
      tone: 'orange',
      value: fmtCount(eventsTotal),
      label: t('events'),
      sub: t('eventsSub'),
    },
    {
      key: 'services',
      icon: ConciergeBell,
      tone: 'purple',
      value: fmtCount(servicesTotal),
      label: t('services'),
      sub: t('servicesSub'),
    },
  ];

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-3 py-6 lg:grid-cols-[1fr_22rem] lg:px-6">
      {/* ── Main column ─────────────────────────────────────────────── */}
      <div className="min-w-0 space-y-6">
        {/* About */}
        <Card className="border-border-subtle">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="heading-xsmall text-text-primary">{t('aboutTitle')}</h2>
              {profile.isOfficial && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 caption-small text-blue-600">
                  <BadgeCheck className="size-3.5" aria-hidden />
                  {isEmbassy ? t('officialVerified') : t('verifiedCommunity')}
                </span>
              )}
            </div>

            {(community.description || profile.tagline) && (
              <p className="caption-large text-text-secondary">
                {community.description || profile.tagline}
              </p>
            )}

            {/* Meta row */}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 caption-medium text-text-secondary">
              {location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4 flex-shrink-0" aria-hidden />
                  {location}
                </span>
              )}
              {year && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4 flex-shrink-0" aria-hidden />
                  {t('established', { year })}
                </span>
              )}
            </div>

            {/* Contact rows */}
            {(community.contactEmail || community.contactPhone) && (
              <div className="mt-4 space-y-2 border-t border-border-subtle pt-4">
                {community.contactEmail && (
                  <a
                    href={`mailto:${community.contactEmail}`}
                    className="label-medium inline-flex items-center gap-2 text-text-primary transition-colors hover:text-text-brand"
                  >
                    <Mail className="size-4 flex-shrink-0 text-text-secondary" aria-hidden />
                    {community.contactEmail}
                  </a>
                )}
                {community.contactPhone && (
                  <a
                    href={`tel:${community.contactPhone}`}
                    className="label-medium flex items-center gap-2 text-text-primary transition-colors hover:text-text-brand"
                  >
                    <Phone className="size-4 flex-shrink-0 text-text-secondary" aria-hidden />
                    {community.contactPhone}
                  </a>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Community Overview */}
        <Card className="border-border-subtle">
          <CardContent className="p-5">
            <h2 className="heading-xsmall mb-4 text-text-primary">{t('overview')}</h2>
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
              {t('guidelinesTitle')}
            </h3>
            <p className="caption-medium mt-1 text-text-secondary">{t('guidelinesSubtitle')}</p>

            {communityRules ? (
              <p className="caption-large mt-3 line-clamp-6 whitespace-pre-line text-text-primary">
                {communityRules}
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {EMBASSY_GUIDELINES.map((g) => (
                  <li key={g} className="caption-large flex items-center gap-2 text-text-primary">
                    <Check className="size-4 flex-shrink-0 text-text-success" aria-hidden />
                    {g}
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={() => setGuidelinesOpen(true)}
              className="label-medium mt-3 inline-flex items-center gap-1 text-text-brand"
            >
              {t('viewFullGuidelines')}
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </CardContent>
        </Card>

        {/* Member highlights */}
        <Card className="border-border-subtle">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="label-large text-text-primary">{t('membersHighlightTitle')}</h3>
              <button
                type="button"
                onClick={openMembersDialog}
                className="caption-medium text-text-brand"
              >
                {t('seeAll')}
              </button>
            </div>

            {shownMembers.length === 0 ? (
              <p className="caption-large text-text-secondary">{t('membersEmpty')}</p>
            ) : (
              <ul className="space-y-3">
                {shownMembers.map((m) => (
                  <li key={m.userId} className="flex items-center gap-3">
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
                {extraMembers > 0 && (
                  <li className="caption-medium pl-1 text-text-secondary">
                    {t('membersMore', { count: extraMembers })}
                  </li>
                )}
              </ul>
            )}

            <button
              type="button"
              onClick={handleInvite}
              className="label-medium mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border-brand py-2 text-text-brand"
            >
              <UserPlus className="size-4" aria-hidden />
              {t('inviteFriends')}
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
