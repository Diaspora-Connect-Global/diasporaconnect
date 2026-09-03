'use client';

// `NetworkStatus` lives in the core entry point, not `/react` — Apollo Client
// v4's hooks package does not re-export the enum.
import { NetworkStatus } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { ArrowLeft, ScrollText, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ChainVerdictBanner,
  DecisionsTable,
  chainVerdict,
  isDecided,
  isMembershipMotion,
} from '@/components/circles/history';
import { SegmentedControl } from '@/components/circles/primitives';
import { ButtonType1 } from '@/components/custom/button';
import { EmptyState, ErrorState } from '@/components/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { useCircleUsers } from '@/hooks/useCircleUsers';
import { useRouter } from '@/i18n/navigation';
import { CIRCLE_COLUMN_CLASS } from '@/lib/feedColumnLayout';
import { CIRCLE_MOTIONS } from '@/services/gql/circles';
import { CIRCLE_AUDIT_TRAIL } from '@/services/gql/circles-governance';
import type {
  CircleMotionsData,
  CircleMotionsVariables,
} from '@/services/gql/types/circles';
import type {
  CircleAuditTrailData,
  CircleAuditTrailVariables,
} from '@/services/gql/types/circles-governance';

/**
 * Motions per request. circle-service defaults to 25 and the gRPC layer clamps
 * at 100, so 50 is a full page either way and covers most circles' whole
 * history in one round trip.
 */
const PAGE_SIZE = 50;

type HistoryTab = 'MOTIONS' | 'MEMBERSHIP';

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-4 py-4">
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-9 w-64 rounded-full" />
      <Skeleton className="h-3 w-full" />
      {[...Array(6)].map((_, index) => (
        <div key={index} className="flex items-start gap-4">
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
          <Skeleton className="h-3 w-24 shrink-0" />
          <Skeleton className="h-3 w-40 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * The circle's decision history.
 *
 * ── WHAT THIS SCREEN IS ─────────────────────────────────────────────────────
 * A log of how the circle decides things: every settled motion, what the circle
 * decided, when, and — the column that matters most — the rule it was decided
 * under AT THE TIME.
 *
 * It is also a legal asset. If a removed member claims the PLATFORM ejected
 * them, this is the record showing the circle voted, on terms it had set for
 * itself beforehand. That is why the chain verdict is stated at the top in
 * words rather than as a tick in a corner.
 *
 * It is deliberately not a surveillance feed. It records decisions, not
 * presence: nothing here says who read what, who was online, or who voted which
 * way.
 *
 * ── ROWS COME FROM THE MOTION RECORD, AND THAT IS NOT AN OPTIMISATION ───────
 * `circleMotions` returns each motion with the block pinned into its opening
 * INSERT — `ruleId`, `ruleVersion`, quorum and majority fractions, `tieBreaksTo`
 * and `electorateSize` — which is the only source that can answer "what
 * threshold was this actually decided under?". `circleGovernanceRules` answers
 * a different question (what a NEW motion would be bound by) and rendering it
 * here would restate every past decision under today's rule the moment a circle
 * amended one: a history that looks legitimate and is false. See
 * `RulesAtTheTime`.
 *
 * ── TWO TABS, ONE RECORD ────────────────────────────────────────────────────
 * A membership change in a circle is not an administrative act; it is a motion
 * the circle voted on, of kind ADMIT_MEMBER / REMOVE_MEMBER / APPOINT_LEAD /
 * REMOVE_LEAD. So the second tab is a filter over the same decisions, showing
 * the same four columns — the answer to "why was I removed?" is a vote and its
 * terms, and it belongs beside the rule that authorised it.
 *
 * ── NO BALLOT ROSTER, NOT EVEN INDIRECTLY ───────────────────────────────────
 * Individual votes are never published. There is no column for them and no
 * query behind one: the product exposes an aggregate tally and offers no
 * per-member vote lookup, deliberately.
 *
 * ── MEMBER-GATED, NOT LEAD-GATED ────────────────────────────────────────────
 * The gateway calls `assertCircleMember`. A circle's own record of how it
 * decided things belongs to everyone in it. A non-member gets an empty,
 * unverified page rather than a distinct refusal — the same quiet failure a
 * motion gives, which is what stops this screen confirming a private circle
 * exists.
 */
export default function CircleHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('circles.history');
  const tCommon = useTranslations('circles.common');
  const tGlobal = useTranslations('common');

  const circleId = typeof params.id === 'string' ? params.id : '';

  const [tab, setTab] = useState<HistoryTab>('MOTIONS');

  /*
   * `circleMotions` returns a bare list — the gateway drops circle-service's
   * `total` — so "is there more?" can only be inferred from page fullness. A
   * short page proves the end; a full one proves nothing either way, which is
   * why the flag is only ever set on the way back from a `fetchMore`.
   */
  const [exhausted, setExhausted] = useState(false);
  useEffect(() => {
    setExhausted(false);
  }, [circleId]);

  const { data, error, fetchMore, networkStatus, refetch } = useQuery<
    CircleMotionsData,
    CircleMotionsVariables
  >(CIRCLE_MOTIONS, {
    variables: { circleId, limit: PAGE_SIZE, offset: 0 },
    skip: !circleId,
    notifyOnNetworkStatusChange: true,
  });

  /*
   * The chain verdict, read separately and cheaply (`limit: 1`).
   *
   * `chainVerified` is a verdict on the circle's WHOLE trail, recomputed
   * server-side from seq 1, so one row is enough to carry it. It is read from
   * the audit trail rather than from the motions because the motion rows are
   * the circle's decisions while the trail is the sealed record OF those
   * decisions — a break in it is the one finding that undermines everything on
   * this page, and losing that warning would be a worse regression than the
   * extra request is a cost.
   *
   * `errorPolicy: 'all'` so an unreachable circle-service degrades to
   * "not verified" rather than taking the page down; `chainVerdict` keeps
   * "we could not check" distinct from "this is broken".
   */
  const { data: trailData, loading: trailLoading } = useQuery<
    CircleAuditTrailData,
    CircleAuditTrailVariables
  >(CIRCLE_AUDIT_TRAIL, {
    variables: { circleId, limit: 1 },
    skip: !circleId,
    errorPolicy: 'all',
  });

  const motions = useMemo(() => data?.circleMotions ?? [], [data]);

  const isInitialLoading = networkStatus === NetworkStatus.loading && !data;
  const isFetchingMore = networkStatus === NetworkStatus.fetchMore;

  /*
   * Open motions are excluded: they have no outcome and no decision date, and a
   * vote still in progress is not history. Everything else — including a status
   * a newer gateway might add — is a settled fact about this circle and stays.
   */
  const decisions = useMemo(() => motions.filter((m) => isDecided(m.status)), [motions]);

  const rows = useMemo(
    () => (tab === 'MEMBERSHIP' ? decisions.filter((m) => isMembershipMotion(m.kind)) : decisions),
    [decisions, tab],
  );

  /*
   * Identities for the proposers actually named. `useCircleUsers` issues one
   * request per id and is documented as safe only for a bounded list; a page is
   * 50 rows and a circle's motions come from a small set of people, which
   * Apollo dedupes to one request each.
   *
   * Keyed off `decisions` rather than `rows` so switching tabs does not tear
   * the resolved names down and rebuild them — the second tab is a subset of
   * the first, and a name flickering back to "a member" mid-read would look
   * like the record had changed.
   */
  const proposerIds = useMemo(
    () => decisions.map((motion) => (motion.proposedBy ?? '').trim()).filter(Boolean),
    [decisions],
  );
  const { usersById } = useCircleUsers(proposerIds);

  /*
   * Paging is an OFFSET over the server's own `created_at DESC` scan, so the
   * cursor is how many rows are held — including the open ones filtered out of
   * the table. Passing the filtered count instead would ask the server to
   * re-send rows already on screen and, worse, skip the ones between.
   */
  const loadMore = useCallback(() => {
    if (exhausted || isFetchingMore) return;

    /*
     * Counted inside the merge but APPLIED after it resolves. `updateQuery`
     * runs during Apollo's cache write, and calling `setExhausted` from there
     * would be a React state update inside what is meant to be a pure merge
     * function. Recording the page size in a local and acting on it in `.then`
     * keeps the merge pure and the state update where React expects one.
     */
    let incomingCount = 0;

    void fetchMore({
      variables: { circleId, limit: PAGE_SIZE, offset: motions.length },
      updateQuery: (prev, { fetchMoreResult }) => {
        const incoming = fetchMoreResult?.circleMotions;
        incomingCount = incoming?.length ?? 0;
        if (!incoming || incoming.length === 0) return prev;

        /*
         * Deduped by id even though an offset scan should not repeat itself: a
         * motion opened between two pages shifts the window by one and would
         * otherwise re-appear. A duplicated row in a record of decisions reads
         * as two decisions.
         */
        const seen = new Set((prev?.circleMotions ?? []).map((motion) => motion.id));
        const merged = [...(prev?.circleMotions ?? [])];
        for (const motion of incoming) {
          if (seen.has(motion.id)) continue;
          seen.add(motion.id);
          merged.push(motion);
        }

        return { circleMotions: merged };
      },
    })
      // A short page is the end of the record; a full one proves nothing, so
      // the flag is only ever set, never cleared, on the way back from a fetch.
      .then(() => {
        if (incomingCount < PAGE_SIZE) setExhausted(true);
      })
      // A failed "load older" stays a failed load: the button re-enables and
      // the rows already on screen are untouched. Swallowed rather than thrown
      // so a network blip cannot take down a record someone may be relying on.
      .catch(() => undefined);
  }, [circleId, exhausted, fetchMore, isFetchingMore, motions.length]);

  const hasMore = !exhausted && motions.length >= PAGE_SIZE;

  /*
   * Back arrow, heading and subtitle. The arrow is icon-only and carries a
   * generic accessible name rather than the title: labelling it "Decision
   * history" would announce it as a link TO this page, which is where the user
   * already is.
   */
  const header = (
    <div className="flex shrink-0 items-start gap-2">
      <button
        type="button"
        onClick={() => router.push(`/circles/${circleId}`)}
        aria-label={tGlobal('previousPage')}
        className="mt-0.5 cursor-pointer rounded-full p-1.5 text-text-primary transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
      >
        <ArrowLeft className="size-5" />
      </button>
      <div className="min-w-0">
        <h1 className="heading-xsmall text-text-primary">{t('title')}</h1>
        <p className="body-small mt-0.5 text-text-secondary">{t('subtitle')}</p>
      </div>
    </div>
  );

  if (isInitialLoading) {
    return (
      <div className="h-app-inner flex overflow-hidden">
        <div className={CIRCLE_COLUMN_CLASS}>
          {header}
          <HistorySkeleton />
        </div>
      </div>
    );
  }

  if (error && motions.length === 0) {
    return (
      <div className="h-app-inner flex overflow-hidden">
        <div className={CIRCLE_COLUMN_CLASS}>
          {header}
          <div className="flex flex-1 items-center justify-center">
            <ErrorState
              size="lg"
              description={t('error.load')}
              retryLabel={tCommon('retry')}
              onRetry={() => void refetch()}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-app-inner flex overflow-hidden">
      <div className={CIRCLE_COLUMN_CLASS}>
        {header}

        <div className="flex flex-col gap-4 py-4">
          {/* Stated even on an empty record: "nothing recorded yet, and we
              verified that" is a different claim from "we could not check". */}
          {trailLoading ? null : (
            <ChainVerdictBanner verdict={chainVerdict(trailData?.circleAuditTrail)} />
          )}

          <SegmentedControl<HistoryTab>
            aria-label={t('tabs.label')}
            value={tab}
            onChange={setTab}
            className="w-full max-w-sm"
            options={[
              { value: 'MOTIONS', label: t('tabs.motions') },
              { value: 'MEMBERSHIP', label: t('tabs.membership') },
            ]}
          />

          {rows.length === 0 ? (
            /*
             * Two different emptinesses. "This circle has decided nothing yet"
             * is a fact about the circle; "no membership decisions in what we
             * have loaded" is a fact about this tab, and while `hasMore` is
             * true the Load more button below is the honest next step rather
             * than a claim that there is nothing.
             */
            <EmptyState
              icon={decisions.length === 0 ? ScrollText : Users}
              title={decisions.length === 0 ? t('empty.title') : t('empty.membership.title')}
              description={
                decisions.length === 0
                  ? t('empty.description')
                  : t('empty.membership.description')
              }
            />
          ) : (
            <>
              <DecisionsTable circleId={circleId} motions={rows} usersById={usersById} />

              {/*
                The caveat the table cannot be read safely without. Two motions
                on this page can legitimately show different thresholds — one
                opened before an amendment, one after — and without this line
                that looks like an inconsistency rather than the guarantee it
                is.
              */}
              <p className="caption-small text-text-secondary">{t('rules.note')}</p>
            </>
          )}

          {hasMore ? (
            <div className="flex justify-center pt-1">
              <ButtonType1 onClick={loadMore} disabled={isFetchingMore}>
                {isFetchingMore ? tCommon('loading') : t('loadMore')}
              </ButtonType1>
            </div>
          ) : rows.length > 0 ? (
            /* Reaching the end of the scan means the whole record is on screen
               — worth saying, since "the list stopped" and "there is no more"
               look identical otherwise. */
            <p className="caption-small pt-1 text-center text-text-secondary">{t('beginning')}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
