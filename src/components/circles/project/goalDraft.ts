import { toMinorUnits } from '@/types/money';
import type { AddCircleProjectGoalInput } from '@/services/gql/types/circles';
import type { CircleGoalDraft } from '@/services/gql/types/circles-actions';

/**
 * @fileoverview Validating a goal before Postgres has to.
 * @module components/circles/project/goalDraft
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  TWO RULES THAT FAIL UGLY IF THE CLIENT DOES NOT CHECK THEM
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ── 1. SHARED / INDIVIDUAL IS A CHECK CONSTRAINT ────────────────────────────
 * The migration carries `chk_circle_project_goal_scope`:
 *
 *     (scope='SHARED'     AND assignee_user_id IS NULL)
 *  OR (scope='INDIVIDUAL' AND assignee_user_id IS NOT NULL)
 *
 * circle-service has an in-domain twin (`GoalScope.assertAssignee`) that
 * refuses the mismatched shape in a sentence, and it exists precisely because
 * *"a CHECK violation reaches the member as an opaque Postgres error"*. This
 * file is the third copy, and it is the only one that can put the message
 * beside the field that is wrong — the other two arrive after a round trip,
 * in English, as a toast.
 *
 * Note which way each half fails: a SHARED goal must not merely leave the
 * assignee unset, it must not CARRY one. Switching the scope from INDIVIDUAL
 * back to SHARED without clearing the picker sends an assignee the server will
 * refuse, so `normaliseGoalDraft` clears it rather than trusting the form to.
 *
 * ── 2. `targetValue` IS REQUIRED, DESPITE BEING NULLABLE ────────────────────
 * `AddCircleProjectGoalInput.targetValue` is `String` and optional on the
 * GraphQL schema. It is NOT optional in practice: `AddProjectGoalHandler` runs
 *
 *     const targetValue = assertStorableMetric(Number(input.targetValue), 'targetValue');
 *
 * and `Number(undefined)` is `NaN`, which `assertStorableMetric` refuses with
 * "targetValue must be a finite number". The column also carries
 * `CHECK (target_value > 0)`. So an omitted target is a guaranteed refusal
 * dressed as an optional field, and the form treats it as required.
 *
 * `assertStorableMetric` additionally refuses a value that ROUNDS AWAY:
 * `NUMERIC(18,4)` stores four decimal places, so `0.00004` passes the "> 0"
 * check and then lands as `0.0000`. That is mirrored below rather than left to
 * the server, because the resulting message names a precision the member never
 * saw a hint of.
 *
 * ── AND THE ONE THAT FAILS SILENTLY: AMOUNT IS MONEY ────────────────────────
 * `metricKind: 'AMOUNT'` means `targetValue` is INTEGER MINOR UNITS and `unit`
 * is the ISO-4217 currency. Every other kind means a decimal metric and a plain
 * word. Getting it backwards does not error — it renders a marathon as
 * "GHS 42.20". The ×100 happens exactly once, here, at the input boundary,
 * matching what `./metric.ts` already does for contributions.
 */

/** A field-level validation failure, keyed for `circles.newGoal.errors.*`. */
export type GoalDraftError =
  | 'assigneeRequired'
  | 'targetRequired'
  | 'targetNotANumber'
  | 'targetNotPositive'
  | 'targetTooSmall'
  | 'unitRequired';

export interface GoalDraftValidation {
  /** Keyed by the field it belongs beside, so the message renders in place. */
  errors: Partial<Record<'assigneeUserId' | 'targetValue' | 'unit', GoalDraftError>>;
  valid: boolean;
}

/** `NUMERIC(18,4)` — the scale the ledger actually stores. */
const METRIC_SCALE = 4;
const METRIC_FACTOR = 10 ** METRIC_SCALE;

/** True when this goal's values are money in minor units. */
export function isMoneyDraft(draft: CircleGoalDraft): boolean {
  return draft.metricKind === 'AMOUNT';
}

/**
 * Clear the half of the scope/assignee pair that must be empty.
 *
 * Called on every scope change, not only at submit: the CHECK constraint reads
 * the pair, so a stale assignee left behind by a scope switch is a refusal the
 * member cannot see the cause of.
 */
export function normaliseGoalDraft(draft: CircleGoalDraft): CircleGoalDraft {
  if (draft.scope === 'SHARED' && draft.assigneeUserId) {
    return { ...draft, assigneeUserId: '' };
  }
  return draft;
}

export function validateGoalDraft(draft: CircleGoalDraft): GoalDraftValidation {
  const errors: GoalDraftValidation['errors'] = {};

  // The in-domain twin of the CHECK constraint's INDIVIDUAL half. The SHARED
  // half is not validated but ENFORCED, by `normaliseGoalDraft` above — there
  // is no message to show for it, because the member never asked for it.
  if (draft.scope === 'INDIVIDUAL' && !draft.assigneeUserId.trim()) {
    errors.assigneeUserId = 'assigneeRequired';
  }

  // An AMOUNT goal's `unit` IS its currency, and `formatMoney` would otherwise
  // silently fall back to GHS on every read of a goal denominated in something
  // else. A metric unit stays optional — "20" with no unit is a legible goal.
  if (isMoneyDraft(draft) && !draft.unit.trim()) {
    errors.unit = 'unitRequired';
  }

  const raw = draft.targetValue.trim();
  if (raw === '') {
    errors.targetValue = 'targetRequired';
  } else {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      errors.targetValue = 'targetNotANumber';
    } else if (parsed <= 0) {
      errors.targetValue = 'targetNotPositive';
    } else if (
      // Mirrors `assertStorableMetric`. Money is checked at its own scale: a
      // major-unit 0.001 is 0.1 minor units, which rounds away just the same.
      Math.round((isMoneyDraft(draft) ? toMinorUnits(parsed) : parsed) * METRIC_FACTOR) === 0
    ) {
      errors.targetValue = 'targetTooSmall';
    }
  }

  return { errors, valid: Object.keys(errors).length === 0 };
}

/**
 * Turn a validated draft into the mutation input.
 *
 * @throws never — call `validateGoalDraft` first. An invalid draft produces a
 *         value the server will refuse, which is the same outcome as before but
 *         without the field-level message.
 */
export function toAddGoalInput(
  projectId: string,
  draft: CircleGoalDraft,
): AddCircleProjectGoalInput {
  const raw = draft.targetValue.trim();

  return {
    projectId,
    scope: draft.scope,
    // Sent only for INDIVIDUAL. `undefined` rather than `''`: the gRPC loader
    // runs with `defaults: true`, so an empty string arrives as an empty string
    // and circle-service normalises it back to null — but only because it
    // remembers to. Not sending it at all cannot be got wrong.
    assigneeUserId:
      draft.scope === 'INDIVIDUAL' ? draft.assigneeUserId.trim() || undefined : undefined,
    metricKind: draft.metricKind,
    unit: draft.unit.trim() || undefined,
    // THE single major→minor conversion for an AMOUNT goal. A metric value is
    // passed through exactly as typed so "42.195" survives without a float
    // round-trip widening it.
    targetValue: isMoneyDraft(draft) ? String(toMinorUnits(Number(raw))) : raw,
    dueOn: draft.dueOn || undefined,
  };
}
