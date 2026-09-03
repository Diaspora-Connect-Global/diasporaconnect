'use client';

import { useMemo, useState } from 'react';
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
import { CHANGE_CIRCLE_PLAN, pickCirclePlanPrice } from '@/services/gql/circles-billing';
import type {
  ChangeCirclePlanData,
  ChangeCirclePlanVariables,
} from '@/services/gql/types/circles-billing';
import type { CirclePlan } from '@/services/gql/types/circles';

import { circleAllowancesLockedBy, type CircleAllowance } from './allowances';

/**
 * Confirming a plan change.
 *
 * ── WHAT THIS DIALOG IS FOR ─────────────────────────────────────────────────
 * Not to warn. To make the mechanism visible before it is chosen, so that a
 * lead can see there is nothing to be afraid of. A circle that ends up over a
 * cap keeps every member, project and challenge it has; it simply gains no new
 * ones until it is back under. That is a genuinely safe design and the copy has
 * to convey the safety, or a lead will read the change as destructive and never
 * make it.
 *
 * So the dialog names the caps that WOULD be full — concretely, with the real
 * numbers — immediately alongside the sentence saying nothing is removed.
 * Vague warnings ("some limits may be affected") are worse than useless here:
 * they invite the reader to imagine the loss.
 *
 * ── AND NOT AN UPGRADE ──────────────────────────────────────────────────────
 * No copy in here says up or down. Entitlements are admin-defined per plan, so
 * a plan can raise one allowance while lowering another and there is no
 * direction to name.
 */

/** One attempt gets one key, so a retry is recognised as the SAME change. */
function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `circle-plan-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface ChangePlanDialogProps {
  circleId: string;
  /** The plan being switched to; `null` closes the dialog. */
  plan: CirclePlan | null;
  /** The circle's current allowances, for the "would be full" preview. */
  currentAllowances: CircleAllowance[];
  /** Keeps a free-plan move in the currency the circle already uses. */
  currentCurrency?: string | null;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful change so the screen can refetch entitlements. */
  onChanged: () => void;
}

export function ChangePlanDialog({
  circleId,
  plan,
  currentAllowances,
  currentCurrency,
  onOpenChange,
  onChanged,
}: ChangePlanDialogProps) {
  const t = useTranslations('circles.plan.change');
  const tAllowance = useTranslations('circles.plan.allowance');
  const locale = useLocale();

  const [failed, setFailed] = useState(false);

  const [changePlan, { loading }] = useMutation<
    ChangeCirclePlanData,
    ChangeCirclePlanVariables
  >(CHANGE_CIRCLE_PLAN);

  /*
   * Regenerated per plan the dialog is opened for — closing sets `plan` to null,
   * which changes this dependency, so a second look at the same plan is a new
   * attempt. Generating it inside the submit handler instead would give a
   * retry-after-a-timeout a fresh key and defeat the whole point of sending one.
   *
   * Keyed on the ID rather than on `plan` deliberately: a refetch hands back a
   * fresh object for the same plan, and depending on that identity would mint a
   * new key mid-dialog for no reason. Lifting the id out first keeps the
   * dependency list honest instead of silencing the exhaustive-deps rule.
   */
  const planId = plan?.id ?? null;
  const idempotencyKey = useMemo(() => (planId ? newIdempotencyKey() : null), [planId]);

  const willLock = useMemo(
    () => (plan ? circleAllowancesLockedBy(plan.entitlements, currentAllowances) : []),
    [plan, currentAllowances],
  );

  async function handleConfirm() {
    if (!plan || loading) return;
    setFailed(false);

    // `currency` / `interval` SELECT one of the plan's prices. They convert
    // nothing — the platform runs no FX — and both are optional, so an absent
    // price row correctly leaves circle-service to resolve its own default.
    const price = pickCirclePlanPrice(plan, currentCurrency);

    const { data } = await changePlan({
      variables: {
        input: {
          circleId,
          planId: plan.id,
          currency: price?.currency,
          interval: price?.interval,
          idempotencyKey: idempotencyKey ?? undefined,
        },
      },
    });

    /*
     * The client is configured with `errorPolicy: 'all'` for mutations, so a
     * GraphQL failure RESOLVES with `data: null` rather than throwing — a
     * try/catch here would never fire. The global error link toasts a generic
     * message and deliberately never shows the backend's own text, so this
     * renders its own localised line rather than leaving the dialog looking
     * like nothing happened.
     */
    if (!data?.changeCirclePlan) {
      setFailed(true);
      return;
    }

    toast.success(t('success', { plan: plan.name }));
    onChanged();
    onOpenChange(false);
  }

  const formatNumber = (key: string, value: number) => {
    const formatted = new Intl.NumberFormat(locale).format(value);
    return key === 'STORAGE_MB' ? tAllowance('megabytes', { value: formatted }) : formatted;
  };

  return (
    <Dialog
      open={plan !== null}
      onOpenChange={(next) => {
        if (loading) return;
        if (!next) setFailed(false);
        onOpenChange(next);
      }}
    >
      <DialogContent showCloseButton={!loading}>
        <DialogHeader>
          <DialogTitle>{t('title', { plan: plan?.name ?? '' })}</DialogTitle>
          <DialogDescription>{t('noDirection')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <p className="body-small text-text-primary">{t('increases')}</p>
          <p className="body-small text-text-primary">{t('decreases')}</p>

          {willLock.length > 0 && (
            <div className="rounded-xl border border-border-subtle p-3">
              <p className="label-small text-text-primary">{t('willLockHeading')}</p>
              <ul className="mt-2 flex flex-col gap-1">
                {willLock.map((row) => (
                  <li key={row.key} className="caption-small text-text-secondary">
                    {t('willLockRow', {
                      name: tAllowance(`name.${row.key}`),
                      current: formatNumber(row.key, row.current),
                      limit: formatNumber(row.key, row.limit),
                    })}
                  </li>
                ))}
              </ul>
              {/* Restated right where the numbers are, not only in the paragraph above. */}
              <p className="caption-small mt-2 text-text-secondary">
                {t('willLockReassurance')}
              </p>
            </div>
          )}

          {failed && <p className="caption-small text-text-danger">{t('error')}</p>}
        </div>

        <DialogFooter>
          <ButtonType3 onClick={() => onOpenChange(false)} disabled={loading}>
            {t('back')}
          </ButtonType3>
          <ButtonType2 onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                {t('submitting')}
              </span>
            ) : (
              t('confirm')
            )}
          </ButtonType2>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
