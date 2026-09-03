'use client';

import { useEffect, useState } from 'react';
import { CombinedGraphQLErrors } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { Check, CircleCheck, CircleX, Loader2, Minus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { formatChatTimestamp, formatDateOnly } from '@/macros/time';
import {
  CAST_CIRCLE_VOTE_AND_TALLY,
  CIRCLE_MOTION_TALLY,
} from '@/services/gql/circles';
import type {
  CastCircleVoteAndTallyData,
  CastCircleVoteInput,
  CircleVoteChoice,
} from '@/services/gql/types/circles';

/**
 * Resting colours per choice. The selected state adds a 2px border in the
 * choice's own text token — `border-success` / `border-danger` are NOT usable
 * here, because every one of those border tokens resolves to red.
 *
 * The border is always present at `transparent` so selecting one does not
 * resize the row.
 */
const CHOICE_STYLE: Record<
  CircleVoteChoice,
  { surface: string; selectedBorder: string }
> = {
  YES: {
    surface: 'bg-surface-success text-text-success',
    selectedBorder: 'border-text-success',
  },
  NO: {
    surface: 'bg-surface-danger text-text-danger',
    selectedBorder: 'border-text-danger',
  },
  ABSTAIN: {
    surface: 'bg-surface-subtle text-text-primary',
    selectedBorder: 'border-text-primary',
  },
};

/**
 * Has the pinned deadline passed on the viewer's own clock?
 *
 * Always `false` for the server render and the first client render, so it can
 * never cause a hydration mismatch, then settles after mount. A single timeout
 * fires at the deadline itself so a page left open through the close disables
 * its own buttons instead of accepting a vote the server will refuse.
 */
function useIsPastDeadline(deadline?: string | null): boolean {
  const [past, setPast] = useState(false);

  useEffect(() => {
    if (!deadline) return;
    const target = new Date(deadline).getTime();
    if (Number.isNaN(target)) return;

    const remaining = target - Date.now();
    if (remaining <= 0) {
      setPast(true);
      return;
    }

    setPast(false);
    const id = window.setTimeout(() => setPast(true), remaining + 250);
    return () => window.clearTimeout(id);
  }, [deadline]);

  return past;
}

/**
 * Flatten whatever the mutation rejected with into matchable text.
 *
 * Apollo 4 wraps GraphQL errors in `CombinedGraphQLErrors`, whose own
 * `message` summarises rather than carrying every entry — and the refusal we
 * need to recognise is in the entries.
 */
function errorText(error: unknown): string {
  if (CombinedGraphQLErrors.is(error)) {
    return error.errors.map((e) => e.message).join(' ');
  }
  return error instanceof Error ? error.message : '';
}

interface VoteButtonProps {
  choice: CircleVoteChoice;
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  disabled: boolean;
  pending: boolean;
  onSelect: (choice: CircleVoteChoice) => void;
}

function VoteButton({
  choice,
  label,
  icon,
  selected,
  disabled,
  pending,
  onSelect,
}: VoteButtonProps) {
  const style = CHOICE_STYLE[choice];

  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onSelect(choice)}
      className={cn(
        'label-medium flex flex-1 cursor-pointer flex-col items-center justify-center gap-1.5',
        'rounded-xl border-2 border-transparent px-3 py-4 transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand',
        'disabled:cursor-not-allowed disabled:opacity-50',
        style.surface,
        selected && style.selectedBorder,
        '[&_svg]:size-6 [&_svg]:shrink-0',
      )}
    >
      {pending ? <Loader2 className="animate-spin" /> : icon}
      {label}
    </button>
  );
}

export interface VotePanelProps {
  circleId: string;
  motionId: string;
  /** The motion's own status. `OPEN` is necessary but not sufficient — see `closesAt`. */
  isOpen: boolean;
  /** The motion's PINNED `closesAt`, never the circle's current voting window. */
  closesAt?: string | null;
  /**
   * Positive evidence that the viewer sits outside this motion's pinned
   * electorate — they joined after it opened. Absence of evidence is not
   * evidence of absence: when this is `false` the buttons are shown and
   * circle-service stays the authority.
   */
  isOutsideElectorate: boolean;
  /** The motion's pinned `opensAt`, for the not-an-elector explanation. */
  opensAt?: string | null;
  /** When the viewer's own membership started — the other half of that explanation. */
  memberJoinedAt?: string | null;
}

/**
 * The vote itself.
 *
 * Three things this panel deliberately does NOT do:
 *
 *  1. It never claims the viewer has not voted. There is no query for a
 *     member's own ballot — individual ballots are never published, only the
 *     aggregate tally — so a fresh page load genuinely does not know. It shows
 *     a selection only once it has watched one being cast, and says nothing
 *     otherwise rather than guessing "you have not voted yet".
 *
 *  2. It does not disable a button it merely suspects will be refused. Only a
 *     positive `isOutsideElectorate` replaces the buttons, and it explains why
 *     instead of leaving three dead controls on screen.
 *
 *  3. It does not treat a cast vote as final. Votes stay changeable until the
 *     pinned `closesAt`, so the buttons stay live after a cast and the current
 *     choice simply shows as selected.
 */
export function VotePanel({
  circleId,
  motionId,
  isOpen,
  closesAt,
  isOutsideElectorate,
  opensAt,
  memberJoinedAt,
}: VotePanelProps) {
  const t = useTranslations('circles.motion');
  const tMembers = useTranslations('circles.members');
  const tErrors = useTranslations('circles.errors');
  const locale = useLocale();

  /*
   * `circles.motion.notElector` is not in the message catalogue yet — the
   * namespace is owned by the i18n pass and this string was not part of it.
   * Rather than print a key path, or (far worse) leave three live-looking
   * buttons that circle-service will refuse, the panel falls back to stating
   * the two PINNED facts that decide enfranchisement: when the motion opened,
   * and when this member joined. Delete the guard once the sentence lands.
   */
  const hasNotElectorCopy = t.has('notElector');

  const [choice, setChoice] = useState<CircleVoteChoice | null>(null);
  const [pendingChoice, setPendingChoice] = useState<CircleVoteChoice | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pastDeadline = useIsPastDeadline(closesAt);
  const votingClosed = !isOpen || pastDeadline;

  const [castVote] = useMutation<
    CastCircleVoteAndTallyData,
    { circleId: string; input: CastCircleVoteInput }
  >(CAST_CIRCLE_VOTE_AND_TALLY, {
    /*
     * The client's global default is `errorPolicy: 'all'`, under which a
     * GraphQL error RESOLVES the promise instead of rejecting it. That default
     * suits reads, where a partial result is still worth rendering; it is wrong
     * for a ballot, where a partial result means the vote may or may not have
     * been recorded and the UI would show a confirmation either way.
     */
    errorPolicy: 'none',
    // `castCircleVoteAndTally` exists precisely so the fresh tally arrives with
    // the write. Refetching `circleMotionTally` here would spend the round trip
    // this mutation was chosen to save, so the result is written into the cache
    // the tally query already reads from.
    update(cache, { data }) {
      const tally = data?.castCircleVoteAndTally;
      if (!tally) return;
      cache.writeQuery({
        query: CIRCLE_MOTION_TALLY,
        variables: { circleId, motionId },
        data: { circleMotionTally: tally },
      });
    },
  });

  async function handleSelect(next: CircleVoteChoice) {
    if (votingClosed || pendingChoice) return;

    setPendingChoice(next);
    setErrorMessage(null);

    try {
      const result = await castVote({
        variables: { circleId, input: { motionId, choice: next } },
      });
      // A resolved mutation with no tally is not a recorded vote. Showing the
      // confirmation anyway would be the worst failure this screen has: a
      // member believing they voted when the ballot never landed.
      if (!result.data?.castCircleVoteAndTally) {
        throw new Error('castCircleVoteAndTally returned no tally');
      }
      setChoice(next);
      toast.success(t('voteRecorded'));
    } catch (error) {
      // circle-service refuses a vote for exactly two reasons worth naming: the
      // window closed under the viewer, or they are not in the pinned
      // electorate. Both are matched on the domain error's own wording
      // (`MotionClosedError` / `NotAnElectorError`); anything else is a
      // transient failure and gets the retryable message.
      const raw = errorText(error);
      if (/pinned electorate|not an elector/i.test(raw)) {
        setErrorMessage(
          hasNotElectorCopy ? t('notElector') : tErrors('vote'),
        );
      } else if (/voting is closed|no longer open/i.test(raw)) {
        setErrorMessage(tErrors('votingClosed'));
      } else {
        setErrorMessage(tErrors('vote'));
      }
    } finally {
      setPendingChoice(null);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="label-large text-text-primary">{t('voteTitle')}</h2>

      {isOutsideElectorate && !votingClosed ? (
        /*
         * Someone who joined after this motion opened is deliberately not an
         * elector: quorum is a fraction of a denominator fixed at open time, so
         * enfranchising them mid-window would move the bar on a vote already
         * under way. Say that, rather than showing three buttons that cannot work.
         */
        <div className="rounded-xl bg-surface-subtle px-4 py-3">
          {hasNotElectorCopy ? (
            <p className="body-small text-text-primary">{t('notElector')}</p>
          ) : (
            <div className="flex flex-col gap-1">
              {opensAt && (
                <p className="body-small text-text-primary">
                  <span className="text-text-secondary">{t('opened')} </span>
                  {formatChatTimestamp(opensAt, { locale })}
                </p>
              )}
              {memberJoinedAt && (
                <p className="body-small text-text-primary">
                  {tMembers('joinedOn', {
                    date: formatDateOnly(memberJoinedAt, { locale }),
                  })}
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-stretch gap-3">
          <VoteButton
            choice="YES"
            label={t('voteYes')}
            icon={<CircleCheck />}
            selected={choice === 'YES'}
            disabled={votingClosed || pendingChoice !== null}
            pending={pendingChoice === 'YES'}
            onSelect={handleSelect}
          />
          <VoteButton
            choice="NO"
            label={t('voteNo')}
            icon={<CircleX />}
            selected={choice === 'NO'}
            disabled={votingClosed || pendingChoice !== null}
            pending={pendingChoice === 'NO'}
            onSelect={handleSelect}
          />
          <VoteButton
            choice="ABSTAIN"
            label={t('voteAbstain')}
            icon={<Minus />}
            selected={choice === 'ABSTAIN'}
            disabled={votingClosed || pendingChoice !== null}
            pending={pendingChoice === 'ABSTAIN'}
            onSelect={handleSelect}
          />
        </div>
      )}

      {votingClosed && (
        <p className="caption-small text-text-secondary">
          {tErrors('votingClosed')}
        </p>
      )}

      {choice && !votingClosed && (
        <p className="label-small flex items-center gap-1.5 text-text-success">
          <Check className="size-4 shrink-0" aria-hidden="true" />
          {t('voteRecorded')}
        </p>
      )}

      {errorMessage && (
        <p role="alert" className="body-small text-text-danger">
          {errorMessage}
        </p>
      )}
    </section>
  );
}
