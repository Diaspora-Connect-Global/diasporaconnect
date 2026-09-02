'use client';

import { useLocale, useTranslations } from 'next-intl';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/feedback';
import { cn } from '@/lib/utils';
import type {
  CircleContribution,
  CircleProjectGoal,
} from '@/services/gql/types/circles';
import { circleUserDisplayName, type CircleUser } from '@/hooks/useCircleUsers';

import { formatGoalValue } from './metric';

/**
 * "Today" for anything logged today, "2 Sep 2025" otherwise.
 *
 * Same-day is compared on the rendered calendar date rather than an elapsed-ms
 * threshold, so a contribution logged at 00:30 still reads "Today" at 09:00.
 */
function formatContributionDate(
  iso: string | null | undefined,
  locale: string,
  todayLabel: string,
): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const day = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return day.format(date) === day.format(new Date())
    ? todayLabel
    : day.format(date);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (
    parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

export interface ContributionListProps {
  contributions: CircleContribution[];
  /** Resolved identities from `useCircleUsers` — rows render regardless. */
  usersById: Record<string, CircleUser>;
  /** The goal these contributions belong to; decides money vs metric formatting. */
  goal: CircleProjectGoal | null;
  /** Id of the signed-in viewer, so their own rows read "You". */
  currentUserId?: string | null;
  loading?: boolean;
}

/**
 * The append-only contribution ledger for one goal.
 *
 * Rows are ledger ENTRIES, not people: the same member appears once per
 * contribution, and a correction appears as its own NEGATIVE row rather than
 * editing the row it corrects. Negative rows are tinted so a ledger that has
 * been corrected reads as corrected instead of looking like a data glitch.
 *
 * This list is never summed — `GoalProgressPanel` reads the authoritative total
 * from `circleGoalProgress`. See that file for why.
 */
export function ContributionList({
  contributions,
  usersById,
  goal,
  currentUserId,
  loading = false,
}: ContributionListProps) {
  const t = useTranslations('circles');
  const locale = useLocale();

  if (loading && contributions.length === 0) {
    return (
      <ul className="divide-y divide-border-subtle">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex items-center gap-3 py-3">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-28" />
            <div className="ml-auto flex flex-col items-end gap-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (contributions.length === 0) {
    return (
      <EmptyState
        size="sm"
        title={t('empty.contributions.title')}
        description={t('empty.contributions.description')}
      />
    );
  }

  return (
    <ul className="divide-y divide-border-subtle">
      {contributions.map((contribution) => {
        const user = usersById[contribution.contributorUserId];
        const isMe =
          Boolean(currentUserId) &&
          contribution.contributorUserId === currentUserId;

        // An unresolved profile still gets a row — dropping the person would
        // silently shorten a ledger that is supposed to account for everything.
        const name = isMe
          ? t('common.you')
          : circleUserDisplayName(user, t('common.loading'));

        const value = formatGoalValue(contribution.value, goal, locale);
        const isCorrection = Number(contribution.value) < 0;

        return (
          <li
            key={contribution.id}
            className="flex items-center gap-3 py-3"
          >
            <Avatar className="size-9 shrink-0 border border-border-subtle">
              <AvatarImage src={user?.avatarUrl ?? undefined} alt="" />
              <AvatarFallback className="caption-small bg-surface-subtle text-text-primary">
                {initials(name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="label-small truncate text-text-primary">{name}</p>
              {contribution.note && (
                <p className="caption-small truncate text-text-secondary">
                  {contribution.note}
                </p>
              )}
            </div>

            <div className="shrink-0 text-right">
              {value && (
                <p
                  className={cn(
                    'label-small',
                    isCorrection ? 'text-text-danger' : 'text-text-primary',
                  )}
                >
                  {value}
                </p>
              )}
              <p className="caption-small text-text-secondary">
                {formatContributionDate(
                  contribution.createdAt,
                  locale,
                  t('common.today'),
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
