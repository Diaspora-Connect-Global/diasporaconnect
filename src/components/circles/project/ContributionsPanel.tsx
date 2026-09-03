'use client';

import { useTranslations } from 'next-intl';

import { ButtonType1 } from '@/components/custom/button';
import { cn } from '@/lib/utils';
import type {
  CircleContribution,
  CircleProjectGoal,
} from '@/services/gql/types/circles';
import type { CircleUser } from '@/hooks/useCircleUsers';

import { ContributeForm } from './ContributeForm';
import { ContributionList } from './ContributionList';

export interface ContributionsPanelProps {
  circleId: string;
  /** One page of the append-only ledger, newest first. */
  contributions: CircleContribution[];
  usersById: Record<string, CircleUser>;
  /** The goal the ledger belongs to. Null → no ledger and no Contribute CTA. */
  goal: CircleProjectGoal | null;
  currentUserId?: string | null;
  loading?: boolean;
  /** True when the page came back full, so more rows may exist behind it. */
  hasMore?: boolean;
  onSeeAll?: () => void;
  className?: string;
}

/**
 * The Contributions rail: the ledger, its count, and the Contribute CTA.
 *
 * ## The count is only shown when it is actually the count
 *
 * The footer reads "6 contributions", and there is no count field on the API —
 * `circleGoalProgress` exposes a summed value and a per-member breakdown, but
 * never a row count. The only number available is how many rows this page
 * returned, which equals the total only once the ledger has been read to its
 * end. So the footer says "6 contributions" when the last page came back short
 * — that IS the whole ledger — and "Showing 25 so far" when it came back full,
 * because a bare "25 contributions" over a ledger that has more silently means
 * "25, for now" and the reader has no way to spot the difference.
 *
 * On desktop this is a fixed rail whose CTA stays put while the ledger scrolls
 * under it; on mobile it is simply the last block of the page and scrolls with
 * everything else.
 */
export function ContributionsPanel({
  circleId,
  contributions,
  usersById,
  goal,
  currentUserId,
  loading = false,
  hasMore = false,
  onSeeAll,
  className,
}: ContributionsPanelProps) {
  const t = useTranslations('circles');

  /*
   * `contributions.length` is the TOTAL only once the ledger has been read to
   * its end; until then it is just how much has been loaded. The two are given
   * different sentences rather than one number that quietly changes meaning.
   */
  const loaded = contributions.length;
  const countLabel = hasMore
    ? t('project.contributionCountPartial', { count: loaded })
    : t('project.contributionCount', { count: loaded });

  return (
    <section
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-default',
        className,
      )}
      aria-label={t('project.contributionsTitle')}
    >
      <h2 className="label-medium shrink-0 border-b border-border-subtle px-4 py-3 text-text-primary">
        {t('project.contributionsTitle')}
      </h2>

      {/* The ledger is the only part that scrolls; the CTA below never leaves. */}
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide px-4">
        <ContributionList
          contributions={contributions}
          usersById={usersById}
          goal={goal}
          currentUserId={currentUserId}
          loading={loading}
        />

        {hasMore && (
          <div className="flex justify-center py-3">
            <ButtonType1 onClick={onSeeAll} disabled={loading}>
              {t('common.seeAll')}
            </ButtonType1>
          </div>
        )}
      </div>

      {/*
        With no goal there is nothing to contribute to and nothing to count, so
        the footer is omitted entirely rather than drawn as an empty bordered
        bar — a chrome-only strip reads as something that failed to load.
      */}
      {(goal || loaded > 0) && (
        <div className="shrink-0 border-t border-border-subtle px-4 py-3">
          {loaded > 0 && (
            <p className="caption-small mb-3 text-text-secondary">
              {countLabel}
            </p>
          )}

          <ContributeForm circleId={circleId} goal={goal} />
        </div>
      )}
    </section>
  );
}
