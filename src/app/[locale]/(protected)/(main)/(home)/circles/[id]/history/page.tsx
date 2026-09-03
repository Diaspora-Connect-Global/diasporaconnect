'use client';

// `NetworkStatus` lives in the core entry point, not `/react` — Apollo Client
// v4's hooks package does not re-export the enum.
import { NetworkStatus } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { ArrowLeft, ScrollText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import {
  ChainVerdictBanner,
  DecisionLog,
  chainVerdict,
  nextCursor,
  specFor,
} from '@/components/circles/history';
import { ButtonType1 } from '@/components/custom/button';
import { EmptyState, ErrorState } from '@/components/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { useCircleUsers } from '@/hooks/useCircleUsers';
import { useRouter } from '@/i18n/navigation';
import { CIRCLE_COLUMN_CLASS } from '@/lib/feedColumnLayout';
import { CIRCLE_AUDIT_TRAIL } from '@/services/gql/circles-governance';
import type {
  CircleAuditTrailData,
  CircleAuditTrailVariables,
} from '@/services/gql/types/circles-governance';

/** circle-service's own default. It clamps at 200; asking for more is silently trimmed. */
const PAGE_SIZE = 50;

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-4 py-4">
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-3 w-28" />
      {[...Array(6)].map((_, index) => (
        <div key={index} className="flex items-start justify-between gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-3 w-8 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * The circle's decision history.
 *
 * ── THIS IS A DECISION LOG, AND ALSO A LEGAL ASSET ──────────────────────────
 * Every row is something the circle decided or something the platform did to
 * it. If a removed member claims the PLATFORM ejected them, this trail — with
 * its hash chain intact — is the record showing the circle voted. That is why
 * the chain verdict sits at the very top rather than as a tick in a corner, and
 * why a broken chain is stated in words.
 *
 * It is deliberately not a surveillance feed. It records decisions, not
 * presence: nothing here says who read what, who was online, or who voted which
 * way.
 *
 * ── NO BALLOT ROSTER, NOT EVEN INDIRECTLY ───────────────────────────────────
 * `MOTION_VOTE_CAST` rows carry the voter and their choice, because the chain
 * needs a complete record. `AuditEntry` publishes neither, and this page does
 * not even RESOLVE those actors' identities — see the filter below. The product
 * exposes an aggregate tally and offers no per-member vote query on purpose;
 * reconstructing one out of the audit trail would be the same feature through a
 * side door.
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

  const { data, error, fetchMore, networkStatus, refetch } = useQuery<
    CircleAuditTrailData,
    CircleAuditTrailVariables
  >(CIRCLE_AUDIT_TRAIL, {
    variables: { circleId, limit: PAGE_SIZE },
    skip: !circleId,
    notifyOnNetworkStatusChange: true,
  });

  const page = data?.circleAuditTrail ?? null;
  const events = useMemo(() => page?.events ?? [], [page]);
  const verdict = chainVerdict(page);

  const isInitialLoading = networkStatus === NetworkStatus.loading && !page;
  const isFetchingMore = networkStatus === NetworkStatus.fetchMore;

  /*
   * Identities for the actors we actually name. `specFor(...).redacted` filters
   * out `MOTION_VOTE_CAST` — not merely as an optimisation, but because issuing
   * a profile lookup for each voter would build the very roster this screen
   * refuses to render.
   *
   * `useCircleUsers` issues one request per id and is documented as safe only
   * for a bounded list; a page is capped at 50 rows and most rows share a small
   * set of actors, which Apollo dedupes to one request each.
   */
  const actorIds = useMemo(
    () =>
      events
        .filter((event) => !specFor(event.eventType).redacted)
        .map((event) => (event.actorUserId ?? '').trim())
        .filter(Boolean),
    [events],
  );
  const { usersById } = useCircleUsers(actorIds);

  /*
   * `afterSeq` is a KEYSET ("events below this seq"), so the cursor is the
   * LOWEST seq held — never the number of rows held. Rows arrive `seq` DESC;
   * paging positionally over a descending scan would silently drop entries from
   * the middle of the trail, which for a record whose entire value is
   * completeness is the one bug that must not exist.
   *
   * `seq` is gap-free from 1, so a cursor of 1 means the whole chain is on
   * screen and there is nothing older to ask for.
   */
  const cursor = useMemo(() => nextCursor(events), [events]);

  const loadOlder = useCallback(() => {
    if (cursor === null || isFetchingMore) return;

    void fetchMore({
      variables: { circleId, afterSeq: cursor, limit: PAGE_SIZE },
      updateQuery: (prev, { fetchMoreResult }) => {
        const incoming = fetchMoreResult?.circleAuditTrail;
        if (!incoming) return prev;
        if (!prev?.circleAuditTrail) return fetchMoreResult;

        /*
         * An empty, unverified page is the gateway's fallback when
         * circle-service is unreachable. Merging it would drop `chainVerified`
         * to false over a list that still has rows in it — and `chainVerdict`
         * would then report BROKEN, accusing the circle of tampering because a
         * service restarted. A failed "load older" must stay a failed load.
         */
        if (incoming.events.length === 0 && !incoming.chainVerified) return prev;

        const seen = new Set(prev.circleAuditTrail.events.map((event) => event.id));
        const merged = [...prev.circleAuditTrail.events];
        for (const event of incoming.events) {
          if (seen.has(event.id)) continue;
          seen.add(event.id);
          merged.push(event);
        }

        return {
          circleAuditTrail: {
            ...incoming,
            events: merged,
            // The verdict covers the WHOLE chain, recomputed server-side on
            // every call, so the freshest one wins.
            chainVerified: incoming.chainVerified,
          },
        };
      },
    });
  }, [circleId, cursor, fetchMore, isFetchingMore]);

  /*
   * Back arrow + page title, matching the app's detail-screen chrome. The arrow
   * is icon-only and carries a generic accessible name rather than the title:
   * labelling it "Decision history" would announce it as a link TO this page,
   * which is where the user already is.
   */
  const header = (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={() => router.push(`/circles/${circleId}`)}
        aria-label={tGlobal('previousPage')}
        className="cursor-pointer rounded-full p-1.5 text-text-primary transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand"
      >
        <ArrowLeft className="size-5" />
      </button>
      <h1 className="label-large text-text-primary">{t('title')}</h1>
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

  if (error && events.length === 0) {
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
          <p className="body-small text-text-secondary">{t('intro')}</p>

          {/* Stated even on an empty trail: "nothing recorded yet, and we
              verified that" is a different claim from "we could not check". */}
          <ChainVerdictBanner verdict={verdict} />

          {events.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title={t('empty.title')}
              description={t('empty.description')}
            />
          ) : (
            <>
              <DecisionLog circleId={circleId} events={events} usersById={usersById} />

              {cursor !== null ? (
                <div className="flex justify-center pt-1">
                  <ButtonType1 onClick={loadOlder} disabled={isFetchingMore}>
                    {isFetchingMore ? tCommon('loading') : t('loadOlder')}
                  </ButtonType1>
                </div>
              ) : (
                /* The chain starts at seq 1 and is gap-free, so reaching it
                   means the reader has the complete record in front of them —
                   worth saying, since "the list stopped" and "there is no more"
                   look identical otherwise. */
                <p className="caption-small pt-1 text-center text-text-secondary">
                  {t('beginning')}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
