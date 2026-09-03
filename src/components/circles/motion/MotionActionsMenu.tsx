'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Gavel, History, MoreHorizontal, Scale, Undo2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  readCircleWrite,
  refusalMessageKey,
  type CircleWriteRefusal,
} from '@/components/circles/governance/mutationOutcome';
import { ButtonType3, ButtonType4Pill } from '@/components/custom/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Link } from '@/i18n/navigation';
import {
  ENACT_CIRCLE_MOTION,
  WITHDRAW_CIRCLE_MOTION,
} from '@/services/gql/circles';
import type {
  CircleMotion,
  EnactCircleMotionData,
  EnactCircleMotionVariables,
  WithdrawCircleMotionData,
  WithdrawCircleMotionVariables,
} from '@/services/gql/types/circles';

import { useMotionRefusalMessage } from './motionRefusal';

export interface MotionActionsMenuProps {
  circleId: string;
  motion: CircleMotion;
  /** The viewer proposed this motion. The only person who may withdraw it. */
  isProposer: boolean;
  /**
   * Re-read the motion after an action. Required, not optional: enactment can
   * fail in a way that returns a GraphQL error while still having persisted
   * `ENACTMENT_FAILED` + `enactmentError`, so the reason is only reachable by
   * re-reading — see `handleEnact`.
   */
  onChanged: () => void;
}

/**
 * The motion screen's overflow menu.
 *
 * ── WHAT IS DELIBERATELY NOT IN HERE ────────────────────────────────────────
 * Nothing that decides the motion. There is no "close early", no "override",
 * no "count it now" and no way for a lead to reach past a vote — a circle
 * governs itself and the platform supplies the machinery without adjudicating.
 * The two writes offered are the two that are NOT judgements:
 *
 *   Withdraw  the proposer taking back their own proposal. Not a verdict:
 *             circle-service permits it only for the proposer and only while
 *             OPEN, and a LEAD is explicitly not an exception.
 *
 *   Apply     mechanical execution of a decision the circle already made.
 *             Enactment is gated on the motion having PASSED, so this button
 *             cannot change an outcome — only carry one out. That is why it is
 *             offered to any member rather than to leads: it is not a
 *             discretionary act, and reserving it to a lead would invent a
 *             veto that the governance model does not have.
 *
 * ── THE GATES HERE ONLY HIDE, THEY NEVER GRANT ──────────────────────────────
 * Every condition below is also checked by the gateway and again by
 * circle-service's own aggregate. Getting one wrong here can only hide an
 * action from someone entitled to it; it can never let anybody perform one.
 * That is why the menu leans on facts the page already holds (`proposedBy`,
 * `status`) rather than fetching more to be sure.
 */
export function MotionActionsMenu({
  circleId,
  motion,
  isProposer,
  onChanged,
}: MotionActionsMenuProps) {
  const t = useTranslations('circles.motion');
  const tCommon = useTranslations('circles.common');
  const tActions = useTranslations('circles.actions');
  const tGovernance = useTranslations('circles.governance');
  const tHistory = useTranslations('circles.history');
  const motionRefusalMessage = useMotionRefusalMessage();

  const [confirmOpen, setConfirmOpen] = useState(false);

  const [withdrawMotion, { loading: withdrawing }] = useMutation<
    WithdrawCircleMotionData,
    WithdrawCircleMotionVariables
  >(WITHDRAW_CIRCLE_MOTION);

  const [enactMotion, { loading: enacting }] = useMutation<
    EnactCircleMotionData,
    EnactCircleMotionVariables
  >(ENACT_CIRCLE_MOTION);

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

  // Only the proposer, and only while the window is open. Both are enforced by
  // the aggregate (`Motion.withdraw`), which refuses every other status.
  const canWithdraw = isProposer && motion.status === 'OPEN';

  /*
   * ── THIS IS AN ACCELERATOR, NOT THE ONLY PATH ────────────────────────────
   * A leader-locked sweeper enacts PASSED motions on its own every few
   * minutes, so most decisions land without anyone pressing anything. Racing
   * it is safe: an already-enacted motion returns SUCCESS rather than an
   * error, so the worst case is a redundant toast.
   *
   * `ENACTMENT_FAILED` is deliberately included, and it is the case that
   * actually needs this item. The sweeper retries only a fixed number of
   * times and then stops for good, and `enactmentAttempts` is not exposed —
   * so a motion sitting in that state may be one the platform has permanently
   * given up on, with no automatic path left. A manual apply is the only way
   * out once the cause has been cleared (a cap freed, a member rejoined).
   * The circle's decision stands throughout; only its application failed.
   */
  const canEnact =
    motion.status === 'PASSED' || motion.status === 'ENACTMENT_FAILED';

  const busy = withdrawing || enacting;

  async function handleWithdraw() {
    if (busy) return;
    try {
      const result = await withdrawMotion({
        variables: { circleId, motionId: motion.id },
      });

      // `data`, not the absence of a throw — the app's global
      // `errorPolicy: 'all'` resolves refusals. See `governance/mutationOutcome`.
      const outcome = readCircleWrite(result, (d) => d.withdrawCircleMotion);
      if (!outcome.ok) {
        toast.error(refusalCopy(outcome.message, outcome.refusal));
        return;
      }

      setConfirmOpen(false);
      toast.success(t('withdrawn'));
      onChanged();
    } catch (error) {
      const outcome = readCircleWrite({ error }, () => null);
      toast.error(refusalCopy(outcome.message, outcome.refusal));
    }
  }

  async function handleEnact() {
    if (busy) return;
    try {
      const result = await enactMotion({
        variables: { circleId, motionId: motion.id },
      });

      const outcome = readCircleWrite(result, (d) => d.enactCircleMotion);
      if (!outcome.ok) {
        toast.error(refusalCopy(outcome.message, outcome.refusal));
        return;
      }

      toast.success(t('enacted'));
    } catch (error) {
      const outcome = readCircleWrite({ error }, () => null);
      toast.error(refusalCopy(outcome.message, outcome.refusal));
    } finally {
      /*
       * Re-read on EVERY path, including refusal.
       *
       * When enactment fails, circle-service has already persisted the motion
       * as `ENACTMENT_FAILED` with `enactmentError` set — but the gateway's
       * `assertOk` throws before mapping it, so the mutation hands back an
       * error and no motion. The toast can only say "that didn't work"; the
       * reason exists solely on the freshly persisted row, and `MotionHeader`
       * renders it once we re-read. Skipping the refetch here would throw away
       * the only explanation the circle is ever given.
       */
      onChanged();
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ButtonType3
            aria-label={tCommon('moreOptions')}
            disabled={busy}
            className="p-1.5 text-text-primary hover:bg-surface-subtle"
          >
            <MoreHorizontal aria-hidden="true" className="size-5" />
          </ButtonType3>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="min-w-[220px] bg-surface-default"
        >
          {canWithdraw && (
            <DropdownMenuItem
              onSelect={() => setConfirmOpen(true)}
              className="body-medium text-text-primary"
            >
              <Undo2 aria-hidden="true" className="size-4" />
              {t('menu.withdraw')}
            </DropdownMenuItem>
          )}

          {canEnact && (
            <DropdownMenuItem
              onSelect={() => void handleEnact()}
              className="body-medium text-text-primary"
            >
              <Gavel aria-hidden="true" className="size-4" />
              {t('menu.enact')}
            </DropdownMenuItem>
          )}

          {(canWithdraw || canEnact) && <DropdownMenuSeparator />}

          {/*
            The two screens that put this motion in context: the rule it was
            opened under, and the ledger it will end up in. Both are the routes
            a member reaches for from here, and neither is linked from anywhere
            else on this page.
          */}
          <DropdownMenuItem asChild className="body-medium text-text-primary">
            <Link href={`/circles/${circleId}/governance`}>
              <Scale aria-hidden="true" className="size-4" />
              {tGovernance('title')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="body-medium text-text-primary">
            <Link href={`/circles/${circleId}/history`}>
              <History aria-hidden="true" className="size-4" />
              {tHistory('title')}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/*
        Withdrawal gets a confirmation and enactment does not, which is not an
        inconsistency: withdrawing ENDS a vote other people are still casting
        and cannot be undone — `WITHDRAWN` is terminal, there is no reopen —
        while enacting carries out a decision the circle has already taken and
        is idempotent on the server. Friction belongs on the irreversible one.
      */}
      <Dialog
        open={confirmOpen}
        onOpenChange={(next) => {
          // Never dismissable mid-flight: the proposer would be left unsure
          // whether the vote they just stopped is actually stopped.
          if (withdrawing) return;
          setConfirmOpen(next);
        }}
      >
        <DialogContent
          showCloseButton={!withdrawing}
          className="bg-surface-default"
        >
          <DialogHeader>
            <DialogTitle className="text-text-primary">
              {t('withdrawDialog.title')}
            </DialogTitle>
            <DialogDescription className="text-text-secondary">
              {t('withdrawDialog.description')}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <ButtonType3
              onClick={() => setConfirmOpen(false)}
              disabled={withdrawing}
              className="border border-border-subtle text-text-primary hover:bg-surface-subtle"
            >
              {tCommon('cancel')}
            </ButtonType3>
            <ButtonType4Pill
              onClick={() => void handleWithdraw()}
              disabled={withdrawing}
            >
              {withdrawing
                ? t('withdrawDialog.working')
                : t('withdrawDialog.confirm')}
            </ButtonType4Pill>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
