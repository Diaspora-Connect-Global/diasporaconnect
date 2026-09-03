'use client';

// `NetworkStatus` lives in the core entry point, not `/react` — Apollo Client
// v4's hooks package does not re-export the enum.
import { NetworkStatus } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { ArrowLeft, ScrollText, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  ChainVerdictBanner,
  DecisionLog,
  DecisionsTable,
  HistoryTabs,
  chainVerdict,
  isDecided,
  isMembershipMotion,
  nextCursor,
  specFor,
} from '@/components/circles/history';
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
 * Rows per request, for both records this screen pages.
 *
 * Motions: circle-service defaults to 25 and the gRPC layer clamps at 100.
 * Audit trail: circle-service defaults to 50 and clamps at 200. 50 is a full
 * page of either and covers most circles' whole history in one round trip.
 *
 * Shared deliberately — the two pagers below both compare a returned page
 * against it to decide "was that the last page?", and a constant that meant
 * different things per record would make that comparison silently wrong.
 */
const PAGE_SIZE = 50;

/**
 * The three views. `MOTIONS` and `MEMBERSHIP` are two filters over ONE record
 * (`circleMotions`); `ACTIVITY` is a different record entirely
 * (`circleAuditTrail`). Everything below that pages, empties or errors is
 * therefore chosen per tab rather than shared — see `pager`.
 */
type HistoryTab = 'MOTIONS' | 'MEMBERSHIP' | 'ACTIVITY';

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

/** Placeholder for the raw log, which loads only when its tab is first opened. */
function LogSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[...Array(6)].map((_, index) => (
        <div key={index} className="flex items-start justify-between gap-4">
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-3 w-10 shrink-0" />
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
 * ── THREE TABS, TWO RECORDS ─────────────────────────────────────────────────
 * A membership change in a circle is not an administrative act; it is a motion
 * the circle voted on, of kind ADMIT_MEMBER / REMOVE_MEMBER / APPOINT_LEAD /
 * REMOVE_LEAD. So the second tab is a filter over the same decisions, showing
 * the same four columns — the answer to "why was I removed?" is a vote and its
 * terms, and it belongs beside the rule that authorised it.
 *
 * The third tab is a DIFFERENT RECORD, not a third filter. Both motion tabs
 * read `circleMotions`, and plenty of what happens to a circle never becomes a
 * motion: the platform suspending or dissolving it, invite links minted,
 * revoked and redeemed, a governance rule amendment landing, a plan limit
 * refusing an action. Those exist only in `circleAuditTrail`, and with two
 * motion tabs and nothing else they would render NOWHERE in the product — the
 * hash-chained trail would be verified at the top of a screen that never showed
 * it. So the raw stream keeps a tab, in `seq` order, with the chain's own
 * sequence numbers on every row.
 *
 * That difference is load-bearing below: the two records page by different
 * mechanisms (motions by OFFSET, the trail by KEYSET on `seq`), empty for
 * different reasons and fail independently. `pager` picks per tab; nothing
 * about paging is shared between them.
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
   * The trail is fetched only once its tab has been opened, and then kept.
   *
   * A latch rather than `skip: tab !== 'ACTIVITY'`: with a plain comparison,
   * switching away would unmount the query and switching back would re-fetch
   * page one, silently discarding every older page the reader had loaded. It
   * also means the two motion tabs — which most readers never leave — cost
   * exactly what they cost before this tab existed.
   */
  const [activityOpened, setActivityOpened] = useState(false);
  const selectTab = useCallback((next: HistoryTab) => {
    setTab(next);
    if (next === 'ACTIVITY') setActivityOpened(true);
  }, []);

  /*
   * `circleMotions` returns a bare list — the gateway drops circle-service's
   * `total` — so "is there more?" can only be inferred from page fullness. A
   * short page proves the end; a full one proves nothing either way, which is
   * why the flag is only ever set on the way back from a `fetchMore`.
   */
  const [exhausted, setExhausted] = useState(false);

  /*
   * The trail's own end-of-record flag, and NOT the same fact as `exhausted`.
   * The keyset cursor usually proves the end by itself (holding seq 1 means
   * there is nothing older), but a trail with a gap in it — which is precisely
   * what tampering looks like — never reaches seq 1, so a short or empty page
   * has to stop the pager too.
   */
  const [activityExhausted, setActivityExhausted] = useState(false);

  useEffect(() => {
    setExhausted(false);
    setActivityExhausted(false);
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

  /*
   * The trail itself, for the third tab. A SECOND `circleAuditTrail` watch, not
   * a widening of the verdict query above: the two want different page sizes,
   * and the banner must stay a one-row read that lands with the first paint,
   * whether or not anyone opens this tab. Apollo keys a root field by its
   * arguments, so `limit: 1` and `limit: 50` are separate cache entries and
   * neither overwrites the other.
   *
   * `errorPolicy: 'all'` matches the banner and the app-wide default: an
   * unreachable circle-service resolves with no data rather than throwing, and
   * the tab renders its own error with a retry instead of taking the screen —
   * and the motion tabs — down with it.
   */
  const {
    data: activityData,
    error: activityError,
    fetchMore: fetchMoreActivity,
    loading: activityLoading,
    networkStatus: activityNetworkStatus,
    refetch: refetchActivity,
  } = useQuery<CircleAuditTrailData, CircleAuditTrailVariables>(CIRCLE_AUDIT_TRAIL, {
    variables: { circleId, limit: PAGE_SIZE },
    skip: !circleId || !activityOpened,
    notifyOnNetworkStatusChange: true,
    errorPolicy: 'all',
  });

  const motions = useMemo(() => data?.circleMotions ?? [], [data]);

  const activityEvents = useMemo(
    () => activityData?.circleAuditTrail?.events ?? [],
    [activityData],
  );

  const isInitialLoading = networkStatus === NetworkStatus.loading && !data;
  const isFetchingMore = networkStatus === NetworkStatus.fetchMore;

  const activityFetchingMore = activityNetworkStatus === NetworkStatus.fetchMore;
  // First open only: once a page is held, a background refetch must not replace
  // the record on screen with a skeleton.
  const activityInitialLoading = activityLoading && !activityData;

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
   * Identities for the trail's actors, resolved separately from the proposers
   * above so loading older entries cannot disturb the names in the decision
   * table, and so the motion tabs resolve nobody they do not name.
   *
   * Rows whose spec is `redacted` are excluded, and that is the ballot rule
   * again rather than a saving: `MOTION_VOTE_CAST` carries the voter in
   * `actorUserId`, `AuditEntry` prints "recorded — individual votes are never
   * published" for it and never reads this map, so resolving those ids would
   * fetch the profile of every voter to render a name the screen must not show.
   */
  const actorIds = useMemo(
    () =>
      activityEvents
        .filter((event) => !specFor(event.eventType).redacted)
        .map((event) => (event.actorUserId ?? '').trim())
        .filter(Boolean),
    [activityEvents],
  );
  const { usersById: actorsById } = useCircleUsers(actorIds);

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
   * The trail's cursor: the LOWEST `seq` held, or null once seq 1 is on screen.
   *
   * `afterSeq` is a keyset — "entries below this seq" — and rows arrive `seq`
   * DESC. Paging it by count, the way the motions above are paged, would walk
   * an offset over a descending scan and drop entries out of the middle of a
   * sequence whose whole value is that it has no gaps. The two records page by
   * different mechanisms because they ARE different; `nextCursor` keeps that
   * rule in one place.
   */
  const activityCursor = useMemo(() => nextCursor(activityEvents), [activityEvents]);

  const loadMoreActivity = useCallback(() => {
    if (activityExhausted || activityFetchingMore || activityCursor === null) return;

    // Same reason as above: counted inside the merge, applied after it resolves.
    let incomingCount = 0;

    void fetchMoreActivity({
      variables: { circleId, limit: PAGE_SIZE, afterSeq: activityCursor },
      updateQuery: (prev, { fetchMoreResult }) => {
        const page = fetchMoreResult?.circleAuditTrail;
        const incoming = page?.events;
        incomingCount = incoming?.length ?? 0;
        if (!page || !incoming || incoming.length === 0) return prev;

        const held = prev?.circleAuditTrail?.events ?? [];
        const seen = new Set(held.map((event) => event.id));
        const merged = [...held];
        for (const event of incoming) {
          if (seen.has(event.id)) continue;
          seen.add(event.id);
          merged.push(event);
        }

        /*
         * The incoming page's `chainVerified` wins. It is a verdict on the
         * WHOLE chain recomputed from seq 1, not on the rows in the page, so
         * the freshest one is the most truthful — and holding the older verdict
         * would keep asserting "verified" over a chain that has since broken.
         * Spread rather than rebuilt so `__typename` survives the cache write.
         */
        return { circleAuditTrail: { ...page, events: merged } };
      },
    })
      .then(() => {
        if (incomingCount < PAGE_SIZE) setActivityExhausted(true);
      })
      .catch(() => undefined);
  }, [
    activityCursor,
    activityExhausted,
    activityFetchingMore,
    circleId,
    fetchMoreActivity,
  ]);

  /*
   * A null cursor is a POSITIVE end-of-record: the trail is gap-free from 1, so
   * holding seq 1 means there is nothing older. `activityExhausted` is the
   * backstop for the trail that is NOT gap-free — see its declaration.
   */
  const activityHasMore = !activityExhausted && activityCursor !== null;

  /*
   * ── THE ONE THING THIS SCREEN MUST NOT GET WRONG ───────────────────────────
   * "Load more" pages the record the ACTIVE tab is showing. The two motion tabs
   * page `circleMotions` — including the membership tab, whose filter is
   * client-side over server pages, so it pages the underlying record and may
   * legitimately add no visible rows. The activity tab pages `circleAuditTrail`
   * instead. Wiring the button to the motions pager on every tab would leave it
   * loading motions nobody is looking at while the log below it never grew: a
   * button that appears to work and does nothing.
   */
  const pager =
    tab === 'ACTIVITY'
      ? {
          hasMore: activityHasMore,
          busy: activityFetchingMore,
          onLoadMore: loadMoreActivity,
          // The trail is walked backwards through a sequence, so it says what
          // it actually does rather than the vaguer "Load more".
          label: t('loadOlder'),
          /*
           * "That's the whole record" is claimed ONLY when seq 1 is on screen,
           * not merely when the pager stopped. The other way to stop is a page
           * that came back empty above seq 1 — a hole in a gap-free sequence,
           * which is what tampering looks like — and the banner at the top is
           * already calling that chain broken. Printing "back to the day this
           * circle started" underneath it would be the screen contradicting its
           * own finding, so it prints nothing and simply stops.
           */
          atEnd: activityEvents.length > 0 && activityCursor === null,
        }
      : {
          hasMore,
          busy: isFetchingMore,
          onLoadMore: loadMore,
          label: t('loadMore'),
          atEnd: rows.length > 0,
        };

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

  /*
   * The body for the active tab: rows, or the reason there are none.
   *
   * Errors are rendered HERE rather than as a full-page early return, because
   * the two records fail independently. A motions outage used to replace the
   * whole screen — which, now that a second tab reads a second service call,
   * would take away a trail that is loading perfectly well and leave no tabs to
   * switch back with. Each tab reports its own failure and retries its own
   * query; the chain verdict above stays, since it is a third read again.
   */
  let body: ReactNode;

  if (tab === 'ACTIVITY') {
    if (activityInitialLoading) {
      body = <LogSkeleton />;
    } else if (activityEvents.length > 0) {
      body = (
        <>
          <DecisionLog
            circleId={circleId}
            events={activityEvents}
            usersById={actorsById}
          />

          {/* What this tab is, said once. Without it a reader meets rows with
              no outcome and no rule — a vote recorded but not published, a
              plan limit, something the platform did — and reasonably reads the
              screen as broken rather than complete. */}
          <p className="caption-small text-text-secondary">{t('activity.note')}</p>
        </>
      );
    } else if (activityError) {
      body = (
        <ErrorState
          description={t('error.load')}
          retryLabel={tCommon('retry')}
          onRetry={() => void refetchActivity()}
        />
      );
    } else {
      body = (
        <EmptyState
          icon={ScrollText}
          title={t('empty.activity.title')}
          description={t('empty.activity.description')}
        />
      );
    }
  } else if (error && motions.length === 0) {
    body = (
      <ErrorState
        description={t('error.load')}
        retryLabel={tCommon('retry')}
        onRetry={() => void refetch()}
      />
    );
  } else if (rows.length === 0) {
    /*
     * Two different emptinesses. "This circle has decided nothing yet" is a
     * fact about the circle; "no membership decisions in what we have loaded"
     * is a fact about this tab, and while `hasMore` is true the Load more
     * button below is the honest next step rather than a claim that there is
     * nothing.
     */
    body = (
      <EmptyState
        icon={decisions.length === 0 ? ScrollText : Users}
        title={decisions.length === 0 ? t('empty.title') : t('empty.membership.title')}
        description={
          decisions.length === 0 ? t('empty.description') : t('empty.membership.description')
        }
      />
    );
  } else {
    body = (
      <>
        <DecisionsTable circleId={circleId} motions={rows} usersById={usersById} />

        {/*
          The caveat the table cannot be read safely without. Two motions on
          this page can legitimately show different thresholds — one opened
          before an amendment, one after — and without this line that looks
          like an inconsistency rather than the guarantee it is.
        */}
        <p className="caption-small text-text-secondary">{t('rules.note')}</p>
      </>
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

          {/* Three options, so not `primitives/SegmentedControl` — its type is
              an exact two-tuple and its sliding pill is hardcoded at 50%. See
              `HistoryTabs`. */}
          <HistoryTabs<HistoryTab>
            aria-label={t('tabs.label')}
            value={tab}
            onChange={selectTab}
            className="w-full max-w-xl"
            options={[
              { value: 'MOTIONS', label: t('tabs.motions') },
              { value: 'MEMBERSHIP', label: t('tabs.membership') },
              { value: 'ACTIVITY', label: t('tabs.activity') },
            ]}
          />

          {body}

          {pager.hasMore ? (
            <div className="flex justify-center pt-1">
              <ButtonType1 onClick={pager.onLoadMore} disabled={pager.busy}>
                {pager.busy ? tCommon('loading') : pager.label}
              </ButtonType1>
            </div>
          ) : pager.atEnd ? (
            /* Reaching the end of the record means the whole of it is on screen
               — worth saying, since "the list stopped" and "there is no more"
               look identical otherwise. */
            <p className="caption-small pt-1 text-center text-text-secondary">{t('beginning')}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
