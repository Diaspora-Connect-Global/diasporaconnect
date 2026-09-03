'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { ButtonType2, ButtonType3 } from '@/components/custom/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CANCEL_CIRCLE_SUBSCRIPTION } from '@/services/gql/circles-billing';
import type {
  CancelCircleSubscriptionData,
  CancelCircleSubscriptionVariables,
} from '@/services/gql/types/circles-billing';

/**
 * Moving a circle back to the free plan.
 *
 * ── THIS IS A MOVE, NOT A CANCELLATION ──────────────────────────────────────
 * The mutation is called `cancelCircleSubscription`, but a circle always has
 * exactly one ACTIVE subscription — cancelling drops it onto the DEFAULT FREE
 * plan rather than leaving it with none. Titling this "Cancel subscription"
 * would import every association people have from cancelling anything else
 * online: losing access, losing data, the thing shutting down. None of that
 * happens. So the screen says "move back to the free plan" throughout, and the
 * body says plainly that members, projects, challenges and chat all stay.
 *
 * ── ONLY NEW ADDITIONS ARE HELD ─────────────────────────────────────────────
 * If the circle ends up over a free-plan cap, that cap locks: nothing is
 * evicted, the circle just gains no new ones until it is under. There is no
 * eviction path in the backend for this to trigger.
 */

export interface CancelToFreeDialogProps {
  circleId: string;
  open: boolean;
  /** ISO-8601. When present, running to the end of the period is a real option. */
  currentPeriodEnd?: string | null;
  onOpenChange: (open: boolean) => void;
  onCancelled: () => void;
}

export function CancelToFreeDialog({
  circleId,
  open,
  currentPeriodEnd,
  onOpenChange,
  onCancelled,
}: CancelToFreeDialogProps) {
  const t = useTranslations('circles.plan.cancel');
  const locale = useLocale();

  const [failed, setFailed] = useState(false);
  /*
   * WHICH action is in flight, not merely whether one is. Both buttons submit
   * the same mutation, so a single `loading` flag would put the spinner on
   * "Move now" while the person was waiting on "Stay until …" — which reads as
   * the wrong action having fired, on the one screen where that would be
   * alarming.
   */
  const [pending, setPending] = useState<'now' | 'later' | null>(null);

  const [cancelSubscription, { loading }] = useMutation<
    CancelCircleSubscriptionData,
    CancelCircleSubscriptionVariables
  >(CANCEL_CIRCLE_SUBSCRIPTION);

  const periodEndDate = (() => {
    if (!currentPeriodEnd) return null;
    const date = new Date(currentPeriodEnd);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
  })();

  async function handleCancel(atPeriodEnd: boolean) {
    if (loading) return;
    setFailed(false);
    setPending(atPeriodEnd ? 'later' : 'now');

    const { data } = await cancelSubscription({
      variables: { circleId, atPeriodEnd },
    });
    setPending(null);

    /*
     * Mutations run with `errorPolicy: 'all'`, so a GraphQL failure resolves
     * with `data: null` instead of throwing; a try/catch would never fire. The
     * global error link shows only a generic toast, so the localised reason
     * belongs here.
     */
    if (!data?.cancelCircleSubscription) {
      setFailed(true);
      return;
    }

    toast.success(atPeriodEnd && periodEndDate ? t('successLater') : t('successNow'));
    onCancelled();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (loading) return;
        if (!next) {
          setFailed(false);
          setPending(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent showCloseButton={!loading}>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('body')}</DialogDescription>
        </DialogHeader>

        <p className="body-small text-text-primary">{t('locksNotEvicts')}</p>

        {failed && <p className="caption-small text-text-danger">{t('error')}</p>}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {/*
            Two named actions rather than a checkbox: "move now" and "run to the
            end of what's already paid for" are different decisions, and a
            checkbox above a single confirm button hides the second one.
            Offered only when there is a real period to run to.
          */}
          {periodEndDate && (
            <ButtonType3
              className="w-full"
              onClick={() => void handleCancel(true)}
              disabled={loading}
            >
              {pending === 'later' ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  {t('submitting')}
                </span>
              ) : (
                t('stayUntil', { date: periodEndDate })
              )}
            </ButtonType3>
          )}

          <ButtonType2
            className="w-full"
            onClick={() => void handleCancel(false)}
            disabled={loading}
          >
            {pending === 'now' ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                {t('submitting')}
              </span>
            ) : (
              t('confirmNow')
            )}
          </ButtonType2>

          <ButtonType3
            className="w-full"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t('keep')}
          </ButtonType3>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
