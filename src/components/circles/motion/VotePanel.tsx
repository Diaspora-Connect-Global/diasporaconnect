'use client';

import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Check, CircleCheck, CircleX, Loader2, Minus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

/*
 * Imported from the MODULE, not from `@/components/circles/governance`.
 * That barrel re-exports `RuleCard`, which imports `requiredVotes` from
 * `@/components/circles/motion` — so going through the barrel would close a
 * cycle between the two index files. `mutationOutcome` itself depends on
 * nothing in either folder.
 */
import {
  readCircleWrite,
  refusalMessageKey,
  type CircleWriteRefusal,
} from '@/components/circles/governance/mutationOutcome';
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

import { MotionSection } from './MotionSection';
import { useMotionRefusalMessage } from './motionRefusal';

/**
 * Colour appears ONLY on the choice the viewer has actually selected.
 *
 * At rest all three buttons are neutral. That is the point: a permanently green
 * "Yes" and a permanently red "No" colour the OPTIONS, and a member scanning
 * the row reads the tint as a recommendation before they read the label. Tinting
 * only the selected one makes the colour mean "this is your ballot" — a state,
 * not a nudge — which is also the only thing on this screen worth colouring.
 *
 * `border-success` / `border-danger` are NOT usable for the selected ring:
 * every semantic border token resolves to the same red (`#e7000c`) in both
 * themes, so a "success border" would be a red border. The text tokens are the
 * real per-choice colours, and each is paired with its own surface — the same
 * pairing `StatusPill` uses, which is the app's documented both-theme pair.
 */
const CHOICE_SELECTED: Record<CircleVoteChoice, string> = {
  YES: 'bg-surface-success text-text-success border-text-success',
  NO: 'bg-surface-danger text-text-danger border-text-danger',
  // Abstain is neutral by design — it is a real, counted ballot, but it is not
  // an opinion, and giving it a colour of its own would invent one.
  ABSTAIN: 'bg-surface-subtle text-text-primary border-text-primary',
};

// `enabled:hover:` rather than `hover:` — a disabled button still matches
// `:hover`, so a plain hover class would light up the three dead controls while
// a vote is in flight and repaint whichever one is currently selected.
const CHOICE_RESTING =
  'bg-surface-default text-text-primary border-border-subtle enabled:hover:bg-surface-subtle';

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
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onSelect(choice)}
      className={cn(
        'label-medium flex flex-1 cursor-pointer flex-col items-center justify-center gap-2',
        // The border is 2px in BOTH states so selecting one does not resize the
        // row and shove its neighbours a pixel sideways.
        'rounded-xl border-2 px-3 py-4 transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand',
        'disabled:cursor-not-allowed disabled:opacity-50',
        selected ? CHOICE_SELECTED[choice] : CHOICE_RESTING,
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
 *     pinned `closesAt`, so the buttons stay live after a cast, the current
 *     choice shows as selected, and the panel says in words that it can still
 *     be changed. A confirmation that read as final would misstate the rule.
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
  const tActions = useTranslations('circles.actions');
  const motionRefusalMessage = useMotionRefusalMessage();
  const locale = useLocale();

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

  /** Motion-specific copy first, then the shared circles vocabulary. */
  function refusalCopy(
    raw: string | null,
    refusal: CircleWriteRefusal | null,
  ): string {
    return (
      motionRefusalMessage(raw) ??
      tActions(`writeErrors.${refusalMessageKey(refusal)}`)
    );
  }

  async function handleSelect(next: CircleVoteChoice) {
    if (votingClosed || pendingChoice) return;

    setPendingChoice(next);
    setErrorMessage(null);

    try {
      const result = await castVote({
        variables: { circleId, input: { motionId, choice: next } },
      });

      /*
       * The app's global `errorPolicy: 'all'` RESOLVES a refused mutation with
       * `data: null` — it does not throw — so `await` returning is not evidence
       * of anything. `readCircleWrite` gates on the root field actually coming
       * back, which is the only reliable signal, and classifies the refusal
       * otherwise. Showing the confirmation on a resolved-but-refused write is
       * the worst failure this screen has: a member believing they voted when
       * the ballot never landed.
       */
      const outcome = readCircleWrite(result, (d) => d.castCircleVoteAndTally);
      if (!outcome.ok) {
        setErrorMessage(refusalCopy(outcome.message, outcome.refusal));
        return;
      }

      setChoice(next);
      toast.success(t('voteRecorded'));
    } catch (error) {
      // A few failures genuinely do reject — a link-level throw, an aborted
      // request. Both paths converge on the same outcome shape.
      const outcome = readCircleWrite({ error }, () => null);
      setErrorMessage(refusalCopy(outcome.message, outcome.refusal));
    } finally {
      setPendingChoice(null);
    }
  }

  const buttonsDisabled = votingClosed || pendingChoice !== null;

  return (
    <MotionSection title={t('voteTitle')}>
      {isOutsideElectorate && !votingClosed ? (
        /*
         * Someone who joined after this motion opened is deliberately not an
         * elector: quorum is a fraction of a denominator fixed at open time, so
         * enfranchising them mid-window would move the bar on a vote already
         * under way. Say that, rather than showing three buttons that cannot work.
         */
        <div className="rounded-xl bg-surface-subtle px-4 py-3">
          <p className="body-small text-text-primary">{t('notElector')}</p>
          <div className="mt-2 flex flex-col gap-0.5">
            {opensAt && (
              <p className="caption-small text-text-secondary">
                {t('opened')} {formatChatTimestamp(opensAt, { locale })}
              </p>
            )}
            {memberJoinedAt && (
              <p className="caption-small text-text-secondary">
                {tMembers('joinedOn', {
                  date: formatDateOnly(memberJoinedAt, { locale }),
                })}
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-stretch gap-2.5 sm:gap-3">
            <VoteButton
              choice="YES"
              label={t('voteYes')}
              icon={<CircleCheck />}
              selected={choice === 'YES'}
              disabled={buttonsDisabled}
              pending={pendingChoice === 'YES'}
              onSelect={handleSelect}
            />
            <VoteButton
              choice="NO"
              label={t('voteNo')}
              icon={<CircleX />}
              selected={choice === 'NO'}
              disabled={buttonsDisabled}
              pending={pendingChoice === 'NO'}
              onSelect={handleSelect}
            />
            <VoteButton
              choice="ABSTAIN"
              label={t('voteAbstain')}
              icon={<Minus />}
              selected={choice === 'ABSTAIN'}
              disabled={buttonsDisabled}
              pending={pendingChoice === 'ABSTAIN'}
              onSelect={handleSelect}
            />
          </div>

          {/*
            Stated up front, not only after a vote lands: a member deciding
            whether to commit needs to know the commitment is reversible BEFORE
            they make it. It is dropped once voting closes, where it would be a
            promise the server no longer keeps.
          */}
          {!votingClosed && (
            <p className="caption-small text-text-secondary">
              {t('voteChangeable')}
            </p>
          )}
        </>
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
    </MotionSection>
  );
}
