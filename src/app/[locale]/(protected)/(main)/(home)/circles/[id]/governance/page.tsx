'use client';

import { useQuery } from '@apollo/client/react';
import { ArrowLeft, Scale } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import {
  PinnedRuleNotice,
  RuleCard,
  RuleHistory,
  liveRules,
  versionsForKind,
} from '@/components/circles/governance';
import { EmptyState, ErrorState } from '@/components/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from '@/i18n/navigation';
import { FEED_COLUMN_CLASS } from '@/lib/feedColumnLayout';
import { CIRCLE, CIRCLE_GOVERNANCE_RULES } from '@/services/gql/circles';
import { CIRCLE_GOVERNANCE_RULE_HISTORY } from '@/services/gql/circles-governance';
import type {
  CircleData,
  CircleGovernanceRulesData,
  CircleGovernanceRulesVariables,
} from '@/services/gql/types/circles';
import type {
  CircleGovernanceRuleHistoryData,
  CircleGovernanceRuleHistoryVariables,
} from '@/services/gql/types/circles-governance';

function GovernanceSkeleton() {
  return (
    <div className="flex flex-col gap-4 py-4">
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      {[...Array(4)].map((_, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-xl border border-border-subtle p-4">
          <Skeleton className="h-5 w-40" />
          {[...Array(4)].map((__, row) => (
            <div key={row} className="flex items-center justify-between gap-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * The circle's governance rules — its own constitution, in plain language.
 *
 * ── WHAT THIS SCREEN IS FOR ─────────────────────────────────────────────────
 * Answering "what would happen if I proposed this?" before someone proposes it.
 * So every value is a sentence rather than a fraction in a settings row, and
 * the mechanics that the raw numbers actively mislead about — abstentions count
 * toward quorum but not toward the majority; a tie never passes on its own —
 * are stated once at the top rather than left to be inferred fourteen times.
 *
 * ── IT SHOWS TODAY'S RULES AND MUST NOT IMPLY OTHERWISE ─────────────────────
 * A motion carries its OWN rule, pinned when it opened, and is tallied against
 * that copy forever. `PinnedRuleNotice` says so in as many words. Without it a
 * member checking why an open vote needs a threshold this screen does not show
 * would reasonably conclude the count is wrong — when in fact the pinning is
 * the guarantee that amending a rule cannot retroactively flip a vote already
 * under way.
 *
 * ── TWO QUERIES, TWO QUESTIONS ──────────────────────────────────────────────
 * `circleGovernanceRules` answers "what binds a NEW motion" and is the source
 * for the cards. `circleGovernanceRuleHistory` answers "how did we get here"
 * and backs the per-rule version view. The history query could technically
 * serve both (live rows are the ones nothing superseded), but keeping each
 * query to its documented meaning means a failure in the secondary one costs
 * only the secondary view — the constitution still renders.
 *
 * ── MEMBER-GATED, NOT LEAD-GATED ────────────────────────────────────────────
 * The gateway calls `assertCircleMember` on both queries. The rules a circle is
 * governed by belong to everyone governed by them, not just whoever facilitates.
 */
export default function CircleGovernancePage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('circles.governance');
  const tCommon = useTranslations('circles.common');
  const tGlobal = useTranslations('common');

  const circleId = typeof params.id === 'string' ? params.id : '';
  const [expandedKind, setExpandedKind] = useState<string | null>(null);

  const { data, loading, error, refetch } = useQuery<
    CircleGovernanceRulesData,
    CircleGovernanceRulesVariables
  >(CIRCLE_GOVERNANCE_RULES, {
    variables: { circleId },
    skip: !circleId,
  });

  /*
   * Secondary. A failure here must not take the constitution down with it, so
   * it is read independently and its absence simply hides the history
   * affordance — the gateway already degrades this rpc to an empty list.
   */
  const { data: historyData } = useQuery<
    CircleGovernanceRuleHistoryData,
    CircleGovernanceRuleHistoryVariables
  >(CIRCLE_GOVERNANCE_RULE_HISTORY, {
    variables: { circleId },
    skip: !circleId,
  });

  /*
   * Read only for the "which is N people right now" aside on quorum. Served
   * cache-first because circle home issues the identical query and a member
   * count is not worth a second round trip; when it is missing the aside is
   * simply omitted rather than guessed.
   */
  const { data: circleData } = useQuery<CircleData>(CIRCLE, {
    variables: { circleId },
    skip: !circleId,
    fetchPolicy: 'cache-first',
  });

  const rules = useMemo(
    () => liveRules(data?.circleGovernanceRules ?? []),
    [data],
  );
  const history = useMemo(
    () => historyData?.circleGovernanceRuleHistory ?? [],
    [historyData],
  );

  const memberCount = circleData?.circle?.memberCount ?? null;

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

  if (loading && rules.length === 0) {
    return (
      <div className="h-app-inner flex overflow-hidden">
        <div className={FEED_COLUMN_CLASS}>
          {header}
          <GovernanceSkeleton />
        </div>
      </div>
    );
  }

  if (error && rules.length === 0) {
    return (
      <div className="h-app-inner flex overflow-hidden">
        <div className={FEED_COLUMN_CLASS}>
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
      <div className={FEED_COLUMN_CLASS}>
        {header}

        <div className="flex flex-col gap-4 py-4">
          <p className="body-small text-text-secondary">{t('intro')}</p>

          <PinnedRuleNotice />

          {rules.length === 0 ? (
            <EmptyState
              icon={Scale}
              title={t('empty.title')}
              description={t('empty.description')}
            />
          ) : (
            <>
              {/* The mechanics, stated once. Repeating them on fourteen cards
                  would bury them; leaving them out entirely means the numbers
                  below are read as "how many must agree", which for quorum is
                  simply wrong. */}
              <section className="rounded-xl bg-surface-subtle px-4 py-3">
                <h2 className="label-medium text-text-primary">{t('howItWorks.title')}</h2>
                <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-4">
                  <li className="body-small text-text-primary">{t('howItWorks.quorum')}</li>
                  <li className="body-small text-text-primary">{t('howItWorks.majority')}</li>
                  <li className="body-small text-text-primary">{t('howItWorks.tie')}</li>
                  <li className="body-small text-text-primary">{t('howItWorks.silence')}</li>
                </ul>
              </section>

              <div className="flex flex-col gap-3">
                {rules.map((rule) => {
                  const versions = versionsForKind(history, rule.motionKind);
                  const expanded = expandedKind === rule.motionKind;

                  return (
                    <div key={rule.id} className="flex flex-col gap-2">
                      <RuleCard
                        rule={rule}
                        memberCount={memberCount}
                        versionCount={versions.length}
                        historyExpanded={expanded}
                        onShowHistory={
                          versions.length > 1
                            ? () => setExpandedKind(expanded ? null : rule.motionKind)
                            : undefined
                        }
                      />
                      {expanded ? (
                        <div className="px-4">
                          <h4 className="caption-small mb-1.5 text-text-secondary">
                            {t('history.title')}
                          </h4>
                          <RuleHistory circleId={circleId} versions={versions} />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
