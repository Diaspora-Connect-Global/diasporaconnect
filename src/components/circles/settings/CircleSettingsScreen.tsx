'use client';

import { useQuery } from '@apollo/client/react';
import { ArrowLeft, Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { EmptyState, ErrorState } from '@/components/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from '@/i18n/navigation';
import { FEED_COLUMN_CLASS } from '@/lib/feedColumnLayout';
import { CIRCLE, MY_CIRCLE_MEMBERSHIP } from '@/services/gql/circles';
import type {
  CircleData,
  CircleVariables,
  MyCircleMembershipData,
  MyCircleMembershipVariables,
} from '@/services/gql/types/circles';
import type { CircleSettingsPermissions } from '@/services/gql/types/circles-settings';

import { CircleArchiveSection } from './CircleArchiveSection';
import { CircleDiscoverySection } from './CircleDiscoverySection';
import { CircleProfileSection } from './CircleProfileSection';
import { isCircleLive } from './liveness';

/**
 * Circle settings.
 *
 * ── TWO QUERIES, BECAUSE THERE ARE TWO QUESTIONS ────────────────────────────
 * `circle` answers *what is configured*; `myCircleMembership` answers *what may
 * this viewer change*. The second cannot be derived from the first — role and
 * `canPropose` live only on the membership check — and the gateway resolvers
 * split this screen across BOTH of its gates, so a single `isLead` boolean
 * would be wrong for three of the four controls. See
 * `types/circles-settings.ts` for the full gate map.
 *
 * Both are fail-closed by construction: `myCircleMembership` returns
 * "not a member" when circle-service is unreachable rather than erroring, so a
 * transport failure hides controls instead of offering ones the server will
 * refuse.
 *
 * ── WHY `network-only` ──────────────────────────────────────────────────────
 * A settings screen must open on the CURRENT configuration. Apollo's default
 * `cache-first` would happily serve a `Circle` normalised by the circle-home
 * screen minutes ago, so a lead who changed the join mode on another device
 * would edit a stale form and silently reverse their own change. The cost is
 * one round trip on a screen nobody opens in a loop.
 *
 * ── REFETCH RATHER THAN CACHE SURGERY ───────────────────────────────────────
 * Every mutation returns the full `Circle`, so Apollo's normalised cache
 * updates itself by id and the sections re-render from server truth. `refetch`
 * on top of that is belt-and-braces for the fields a write can change
 * indirectly — archiving stamps `archivedAt` and moves `status` — and it keeps
 * this component free of hand-written cache writers, which are the usual place
 * a stale settings screen comes from.
 */
export interface CircleSettingsScreenProps {
  circleId: string;
}

function SettingsSkeleton() {
  return (
    <div className="space-y-4 py-4">
      {[0, 1, 2].map((index) => (
        <div key={index} className="rounded-lg border border-border-subtle p-4 sm:p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-3 w-64" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CircleSettingsScreen({ circleId }: CircleSettingsScreenProps) {
  const t = useTranslations('circles.settings');
  const tCommon = useTranslations('circles.common');
  const tErrors = useTranslations('circles.errors');
  const tGlobal = useTranslations('common');
  const router = useRouter();

  const {
    data: circleData,
    loading: circleLoading,
    error: circleError,
    refetch: refetchCircle,
  } = useQuery<CircleData, CircleVariables>(CIRCLE, {
    variables: { circleId },
    skip: !circleId,
    fetchPolicy: 'network-only',
  });

  const {
    data: membershipData,
    loading: membershipLoading,
    refetch: refetchMembership,
  } = useQuery<MyCircleMembershipData, MyCircleMembershipVariables>(
    MY_CIRCLE_MEMBERSHIP,
    {
      variables: { circleId },
      skip: !circleId,
      fetchPolicy: 'network-only',
    },
  );

  const circle = circleData?.circle ?? null;
  const membership = membershipData?.myCircleMembership ?? null;
  const loading = circleLoading || membershipLoading;

  /*
   * `isLead` and `canPropose` are read straight off the membership check rather
   * than recomputed. They are circle-service's verdicts; deriving `isLead` from
   * `role === 'LEAD'` here would add a second spelling of a decision the service
   * already made — and the enum casing note in `types/circles.ts` exists
   * precisely because that kind of duplicated comparison has denied every
   * member of every circle before.
   *
   * EVERY control on this screen needs LEAD, including the three whose gateway
   * resolver only checks `assertCircleMember` — each of those command handlers
   * calls `requireLead` inside circle-service. See the gate map in
   * `types/circles-settings.ts`; gating at MEMBER here would show a member three
   * controls that always fail.
   *
   * Status is the second precondition and is NOT on the membership check, so it
   * has to come from the circle. Archive takes a different status test from the
   * other two — see `canArchive`.
   */
  const isLive = isCircleLive(circle?.status);
  const isLead = Boolean(membership?.isLead);
  const permissions: CircleSettingsPermissions = {
    isMember: Boolean(membership?.isMember),
    isLive,
    canEditProfile: isLead && isLive,
    canChangeDiscovery: isLead && isLive,
    // Not `isLive`: `Circle.archive()` skips `assertUsable` and the transition
    // table allows SUSPENDED → ARCHIVED, so a suspended circle can still be
    // archived. Only ARCHIVED (a no-op) and DISSOLVED (no outbound transitions)
    // are out.
    canArchive:
      isLead && circle?.status !== 'ARCHIVED' && circle?.status !== 'DISSOLVED',
    canPropose: Boolean(membership?.canPropose),
  };

  /**
   * Why the circle is read-only, when it is. `null` on a live circle.
   *
   * Only these three statuses can reach it: `isLive` covers ACTIVE and DORMANT,
   * and `CircleStatus` has exactly five members, so the mapping is total
   * without a fallback branch that could go stale.
   */
  const frozenReason =
    circle && !isLive
      ? ((
          {
            SUSPENDED: t('statusNotice.suspended'),
            ARCHIVED: t('statusNotice.archived'),
            DISSOLVED: t('statusNotice.dissolved'),
          } as Record<string, string>
        )[circle.status] ?? null)
      : null;

  const refresh = () => {
    void refetchCircle();
    void refetchMembership();
  };

  const header = (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={() => router.push(`/circles/${circleId}`)}
        /*
         * A generic label, not the page title: calling it "Settings" would
         * announce a link TO the page the user is already on. Same choice as
         * the members screen.
         */
        aria-label={tGlobal('previousPage')}
        className="cursor-pointer rounded-full p-1.5 text-text-primary transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
      >
        <ArrowLeft className="size-5" />
      </button>
      <h1 className="label-large text-text-primary">{t('title')}</h1>
    </div>
  );

  const body = () => {
    if (loading && !circle) return <SettingsSkeleton />;

    if (circleError && !circle) {
      return (
        <div className="flex flex-1 items-center justify-center">
          <ErrorState
            size="lg"
            description={tErrors('loadCircle')}
            retryLabel={tCommon('retry')}
            onRetry={refresh}
          />
        </div>
      );
    }

    /*
     * `circle` is null for a non-member — the gateway returns `CirclePublicCard`
     * to outsiders and nothing at all here — and `myCircleMembership` is
     * fail-closed, so this branch also catches an unreachable circle-service.
     * Both mean the same thing to the user: this screen is not theirs to open.
     * The existing `noAccess` copy says exactly that.
     */
    if (!circle || !permissions.isMember) {
      return (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            size="lg"
            icon={Lock}
            title={tErrors('noAccess.title')}
            description={t('notAMember')}
          />
        </div>
      );
    }

    return (
      <div className="space-y-4 py-4">
        {/*
         * Said once, at the top, rather than repeated inside each section: the
         * reason every control is read-only is a property of the CIRCLE, not of
         * three independent settings. `surface-brand-light` is the same light
         * blue in both themes and so is legible only against `text-text-brand`.
         */}
        {frozenReason && (
          <p
            role="status"
            className="body-small rounded-lg bg-surface-brand-light p-4 text-text-brand"
          >
            {frozenReason}
          </p>
        )}

        <CircleProfileSection circle={circle} canEdit={permissions.canEditProfile} />
        <CircleDiscoverySection
          circle={circle}
          canEdit={permissions.canChangeDiscovery}
          canPropose={permissions.canPropose}
          onChanged={refresh}
        />
        <CircleArchiveSection
          circle={circle}
          canArchive={permissions.canArchive}
          canPropose={permissions.canPropose}
          onArchived={refresh}
        />
      </div>
    );
  };

  return (
    <div className="h-app-inner flex overflow-hidden">
      <div className={FEED_COLUMN_CLASS}>
        {header}
        {body()}
      </div>
    </div>
  );
}
