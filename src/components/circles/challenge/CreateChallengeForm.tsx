'use client';

import { useId, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';

import {
  ActionBlockedNotice,
  ActionRouteChoice,
  AllowanceNotice,
  type ChosenRoute,
} from '@/components/circles/governance/ActionGate';
import {
  ACTION_ENTITLEMENT_KEY,
  buildCircleActionPolicy,
  circleCanOpenMotions,
  circleIsLive,
} from '@/components/circles/governance/actionPolicy';
import { createChallengeMotionPayload } from '@/components/circles/governance/motionPayload';
import {
  readCircleWrite,
  refusalMessageKey,
} from '@/components/circles/governance/mutationOutcome';
import { RadioCard, RadioCardGroup } from '@/components/circles/primitives';
import { ButtonType1, ButtonType2 } from '@/components/custom/button';
import { TextInput } from '@/components/custom/input';
import { useRouter } from '@/i18n/navigation';
import {
  ACTIVATE_CIRCLE_CHALLENGE,
  CIRCLE,
  CIRCLE_ENTITLEMENTS,
  CIRCLE_GOVERNANCE_RULES,
  CREATE_CIRCLE_CHALLENGE,
  MY_CIRCLE_MEMBERSHIP,
  OPEN_CIRCLE_MOTION,
} from '@/services/gql/circles-actions';
import type {
  ActivateCircleChallengeData,
  ActivateCircleChallengeVariables,
  Circle,
  CircleChallengeCadence,
  CircleEntitlementsData,
  CircleGovernanceRulesData,
  CircleMembershipCheck,
  CreateCircleChallengeData,
  OpenCircleMotionData,
  OpenCircleMotionVariables,
} from '@/services/gql/types/circles';
import {
  CIRCLE_CHALLENGE_CADENCE_ORDER,
  CIRCLE_VERIFICATION_MODE_ORDER,
  type CircleChallengeDraft,
  type CreateCircleChallengeActionVariables,
  type CircleVerificationModeInput,
} from '@/services/gql/types/circles-actions';

/**
 * @fileoverview Start a challenge — and settle, once and for all, who confirms it.
 * @module components/circles/challenge/CreateChallengeForm
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  `verificationMode` IS A CONSTITUTIONAL DECISION, NOT A SETTING
 * ═══════════════════════════════════════════════════════════════════════════
 * It is chosen here and frozen the moment the challenge leaves DRAFT, which is
 * the `activateCircleChallenge` call this same form makes seconds later. After
 * that there is no path — not a handler, not an rpc, not an admin tool — that
 * changes it.
 *
 * The reason is worth stating in the UI rather than only in the code: the mode
 * *"is not a setting, it is the definition of what every already-recorded
 * 'verified' means"*. Flipping a circle-verified challenge to honour after
 * entries land rewrites the meaning of data already collected without touching
 * a byte of it — the same failure shape as retroactively lowering a motion's
 * majority. So this form presents it as a settled decision with three plain
 * options, not as a dropdown among the numeric fields.
 *
 * ── CREATE AND ACTIVATE ARE TWO WRITES, AND THE SECOND ONE CAN FAIL ─────────
 * A DRAFT occupies no `MAX_ACTIVE_CHALLENGES` slot — the cap counts ACTIVE and
 * JUDGING — so `createCircleChallenge` can succeed and the
 * `activateCircleChallenge` that follows it be refused. The check at create
 * time is described by circle-service as *"a fail-fast that stops a circle
 * drafting work it could not start"*; activation *"is the authoritative gate"*.
 *
 * That leaves a real third outcome this form must report honestly: the
 * challenge EXISTS, as a draft, and did not start. Reporting only "created" or
 * only "failed" would each be a lie about a row that is now in the database.
 *
 * The motion route has no such split — `motion-enactment.service.ts` calls
 * `challenge.activate()` in the same transaction it creates in, so a passed
 * motion lands the challenge ACTIVE.
 *
 * ── ⚠ TWO OF THE THREE MODES ARE REFUSED BY THE SERVER TODAY ────────────────
 * The direct mutation's `verificationMode` is a registered GraphQL enum whose
 * members come from `circle.proto` — `HONOUR | LEAD_CONFIRMS | CIRCLE_CONFIRMS`
 * — and the gateway forwards the chosen name to circle-service verbatim, where
 * the domain enum and the DB CHECK both accept only `HONOUR | LEAD | CIRCLE`.
 * So `LEAD_CONFIRMS` and `CIRCLE_CONFIRMS` are refused, and the bare spellings
 * cannot be sent because GraphQL rejects them first. Full detail in
 * `services/gql/types/circles-actions.ts`.
 *
 * All three are still OFFERED. Which mode a circle wants is the circle's
 * decision and silently removing two of them would redefine it on their behalf.
 * The refusal is caught and explained, and the motion route — whose
 * `payloadJson` is a plain string that no GraphQL enum validates, and which
 * therefore carries the bare value the domain wants — genuinely works for all
 * three today. That is what the error copy points at.
 */

interface CircleData {
  circle?: Circle | null;
}
interface MembershipData {
  myCircleMembership?: CircleMembershipCheck | null;
}

const EMPTY_DRAFT: CircleChallengeDraft = {
  title: '',
  description: '',
  // HONOUR leads: it needs nobody else to act before an entry counts, and it is
  // the one mode that works end-to-end today. See the header.
  verificationMode: 'HONOUR',
  cadence: 'ONE_OFF',
  pointsPerEntry: '',
  maxEntriesPerPeriod: '',
  startsAt: '',
  endsAt: '',
};

/** i18n key under `circles.challenge.verification` for each mode. */
const MODE_COPY: Record<CircleVerificationModeInput, { label: string; description: string }> =
  {
    HONOUR: { label: 'trustLabel', description: 'trustDescription' },
    LEAD_CONFIRMS: { label: 'leadLabel', description: 'leadDescription' },
    CIRCLE_CONFIRMS: { label: 'voteLabel', description: 'voteDescription' },
  };

export interface CreateChallengeFormProps {
  circleId: string;
  onDone?: () => void;
}

export function CreateChallengeForm({ circleId, onDone }: CreateChallengeFormProps) {
  const t = useTranslations('circles.newChallenge');
  const tVerification = useTranslations('circles.challenge.verification');
  const tActions = useTranslations('circles.actions');
  const tCommon = useTranslations('circles.common');
  const router = useRouter();

  const verificationLabelId = useId();
  const cadenceLabelId = useId();

  const [draft, setDraft] = useState<CircleChallengeDraft>(EMPTY_DRAFT);
  const [route, setRoute] = useState<ChosenRoute>('direct');
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);

  const { data: circleData } = useQuery<CircleData>(CIRCLE, {
    variables: { circleId },
    errorPolicy: 'all',
  });
  const { data: membershipData } = useQuery<MembershipData>(MY_CIRCLE_MEMBERSHIP, {
    variables: { circleId },
    errorPolicy: 'all',
  });
  const { data: rulesData } = useQuery<CircleGovernanceRulesData>(
    CIRCLE_GOVERNANCE_RULES,
    { variables: { circleId }, errorPolicy: 'all' },
  );
  const { data: entitlementsData } = useQuery<CircleEntitlementsData>(
    CIRCLE_ENTITLEMENTS,
    { variables: { circleId }, errorPolicy: 'all' },
  );

  const circle = circleData?.circle ?? null;
  const membership = membershipData?.myCircleMembership ?? null;

  const policy = useMemo(
    () =>
      buildCircleActionPolicy({
        kind: 'CREATE_CHALLENGE',
        rules: rulesData?.circleGovernanceRules,
        entitlements: entitlementsData?.circleEntitlements,
        entitlementKey: ACTION_ENTITLEMENT_KEY.CREATE_CHALLENGE,
        isMember: membership?.isMember ?? false,
        isLead: membership?.isLead ?? false,
        canPropose: membership?.canPropose ?? false,
        circleIsActive: circleCanOpenMotions(circle?.status),
        circleIsLive: circleIsLive(circle?.status),
      }),
    [rulesData, entitlementsData, membership, circle?.status],
  );

  const effectiveRoute: ChosenRoute = policy.canActDirectly
    ? policy.canOpenMotion
      ? route
      : 'direct'
    : 'motion';

  const [createChallenge] = useMutation<
    CreateCircleChallengeData,
    CreateCircleChallengeActionVariables
  >(CREATE_CIRCLE_CHALLENGE);

  const [activateChallenge] = useMutation<
    ActivateCircleChallengeData,
    ActivateCircleChallengeVariables
  >(ACTIVATE_CIRCLE_CHALLENGE, {
    refetchQueries: ['CircleChallenges', 'CircleEntitlements'],
    awaitRefetchQueries: true,
  });

  const [openMotion] = useMutation<OpenCircleMotionData, OpenCircleMotionVariables>(
    OPEN_CIRCLE_MOTION,
    { refetchQueries: ['CircleMotions'], awaitRefetchQueries: true },
  );

  const title = draft.title.trim();
  const canSubmit =
    title.length > 0 &&
    !submitting &&
    (effectiveRoute === 'direct' ? policy.canActDirectly : policy.canOpenMotion);

  function set<K extends keyof CircleChallengeDraft>(
    key: K,
    value: CircleChallengeDraft[K],
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  /**
   * `<input type="date">` gives `YYYY-MM-DD`; the wire wants ISO-8601, which
   * the gateway converts to a proto Timestamp. Widened at local midnight so
   * "starts on the 14th" means the 14th in the member's own calendar, matching
   * every date already rendered on the challenge screens.
   */
  function toIsoInstant(date: string): string | undefined {
    if (!date) return undefined;
    const parsed = new Date(`${date}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  }

  function numberOrUndefined(raw: string): number | undefined {
    const trimmed = raw.trim();
    if (trimmed === '') return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : undefined;
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);

    const key = idempotencyKey ?? crypto.randomUUID();
    if (idempotencyKey === null) setIdempotencyKey(key);

    try {
      if (effectiveRoute === 'motion') {
        const result = await openMotion({
          variables: {
            input: {
              circleId,
              kind: 'CREATE_CHALLENGE',
              title: t('motionTitle', { challenge: title }),
              rationale: draft.description.trim() || undefined,
              payloadJson: createChallengeMotionPayload(draft),
              idempotencyKey: key,
            },
          },
        });

        const outcome = readCircleWrite(result, (d) => d.openCircleMotion);
        if (!outcome.ok) {
          toast.error(tActions(`writeErrors.${refusalMessageKey(outcome.refusal)}`));
          return;
        }

        toast.success(t('motionOpened'));
        setIdempotencyKey(null);
        if (onDone) onDone();
        else router.push(`/circles/${circleId}/motions/${outcome.data.id}`);
        return;
      }

      // ── Step 1: create the DRAFT ─────────────────────────────────────────
      const created = await createChallenge({
        variables: {
          input: {
            circleId,
            title,
            description: draft.description.trim() || undefined,
            verificationMode: draft.verificationMode,
            cadence: draft.cadence,
            pointsPerEntry: numberOrUndefined(draft.pointsPerEntry),
            maxEntriesPerPeriod: numberOrUndefined(draft.maxEntriesPerPeriod),
            startsAt: toIsoInstant(draft.startsAt),
            endsAt: toIsoInstant(draft.endsAt),
            idempotencyKey: key,
          },
        },
      });

      const createOutcome = readCircleWrite(created, (d) => d.createCircleChallenge);
      if (!createOutcome.ok) {
        toast.error(tActions(`writeErrors.${refusalMessageKey(createOutcome.refusal)}`));
        return;
      }

      const challengeId = createOutcome.data.id;

      // ── Step 2: activate. The authoritative cap gate, and the freeze. ────
      const activated = await activateChallenge({
        variables: { circleId, challengeId },
      });

      const activateOutcome = readCircleWrite(
        activated,
        (d) => d.activateCircleChallenge,
      );

      if (!activateOutcome.ok) {
        /*
         * The honest third outcome. The challenge is a real DRAFT row now; the
         * member must be told it exists and did not start, or they will create
         * a second one. Navigation still goes to the challenge, which is where
         * the draft can be seen.
         */
        toast.error(
          t('createdNotStarted', {
            reason: tActions(`writeErrors.${refusalMessageKey(activateOutcome.refusal)}`),
          }),
        );
        setIdempotencyKey(null);
        if (onDone) onDone();
        else router.push(`/circles/${circleId}/challenges/${challengeId}`);
        return;
      }

      toast.success(t('started'));
      setIdempotencyKey(null);
      if (onDone) onDone();
      else router.push(`/circles/${circleId}/challenges/${challengeId}`);
    } catch (error) {
      const outcome = readCircleWrite({ error }, () => null);
      toast.error(tActions(`writeErrors.${refusalMessageKey(outcome.refusal)}`));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <ActionBlockedNotice policy={policy} />
      <AllowanceNotice allowance={policy.allowance} />

      <TextInput
        id="challenge-title"
        type="text"
        value={draft.title}
        onChange={(v: string) => set('title', v)}
        label={t('titleLabel')}
        placeholder={t('titlePlaceholder')}
        required
        disabled={submitting}
      />

      <div className="space-y-2">
        <label htmlFor="challenge-description" className="label-medium text-text-primary">
          {t('descriptionLabel')}
        </label>
        <textarea
          id="challenge-description"
          value={draft.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder={t('descriptionPlaceholder')}
          rows={3}
          disabled={submitting}
          className="w-full rounded-md border-2 border-border-subtle bg-surface-subtle px-3 py-2 text-text-primary placeholder:text-text-secondary focus:outline-none focus-visible:border-border-brand"
        />
      </div>

      {/* The centrepiece, not a settings row — see the file header. */}
      <fieldset className="space-y-3" disabled={submitting}>
        <legend id={verificationLabelId} className="label-medium text-text-primary">
          {t('verificationQuestion')}
        </legend>
        <p className="caption-small flex items-start gap-1.5 text-text-secondary">
          <Lock aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          {t('verificationLockNote')}
        </p>
        <RadioCardGroup
          aria-labelledby={verificationLabelId}
          value={draft.verificationMode}
          onValueChange={(v) => set('verificationMode', v as CircleVerificationModeInput)}
        >
          {CIRCLE_VERIFICATION_MODE_ORDER.map((mode) => (
            <RadioCard
              key={mode}
              value={mode}
              // Reuses the strings the challenge DETAIL screen already renders,
              // so the mode a member picked reads identically to the mode they
              // are shown afterwards.
              title={tVerification(MODE_COPY[mode].label)}
              description={tVerification(MODE_COPY[mode].description)}
              disabled={submitting}
            />
          ))}
        </RadioCardGroup>
      </fieldset>

      <fieldset className="space-y-3" disabled={submitting}>
        <legend id={cadenceLabelId} className="label-medium text-text-primary">
          {t('cadenceQuestion')}
        </legend>
        <RadioCardGroup
          aria-labelledby={cadenceLabelId}
          value={draft.cadence}
          onValueChange={(v) => set('cadence', v as CircleChallengeCadence)}
        >
          {CIRCLE_CHALLENGE_CADENCE_ORDER.map((cadence) => (
            <RadioCard
              key={cadence}
              value={cadence}
              title={t(`cadence.${cadence}.title`)}
              description={t(`cadence.${cadence}.description`)}
              disabled={submitting}
            />
          ))}
        </RadioCardGroup>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextInput
          id="challenge-points"
          type="number"
          value={draft.pointsPerEntry}
          onChange={(v: string) => set('pointsPerEntry', v)}
          label={t('pointsLabel')}
          // Left blank the server uses 1 (`readInt(...) ?? 1`), so the
          // placeholder states the default rather than pretending to be one.
          placeholder={t('pointsPlaceholder')}
          disabled={submitting}
        />
        <TextInput
          id="challenge-max-entries"
          type="number"
          value={draft.maxEntriesPerPeriod}
          onChange={(v: string) => set('maxEntriesPerPeriod', v)}
          label={t('maxEntriesLabel')}
          placeholder={t('maxEntriesPlaceholder')}
          disabled={submitting}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextInput
          id="challenge-starts-at"
          type="date"
          value={draft.startsAt}
          onChange={(v: string) => set('startsAt', v)}
          label={t('startsAtLabel')}
          placeholder=""
          disabled={submitting}
        />
        <TextInput
          id="challenge-ends-at"
          type="date"
          value={draft.endsAt}
          onChange={(v: string) => set('endsAt', v)}
          label={t('endsAtLabel')}
          placeholder=""
          disabled={submitting}
        />
      </div>

      <ActionRouteChoice
        policy={policy}
        value={effectiveRoute}
        onChange={setRoute}
        disabled={submitting}
      />

      <div className="flex items-center gap-2">
        <ButtonType2
          size="lg"
          className="flex-1"
          onClick={submit}
          disabled={!canSubmit}
        >
          {submitting
            ? t('submitting')
            : effectiveRoute === 'direct'
              ? t('submitDirect')
              : t('submitMotion')}
        </ButtonType2>
        <ButtonType1 size="lg" onClick={() => router.back()} disabled={submitting}>
          {tCommon('cancel')}
        </ButtonType1>
      </div>
    </div>
  );
}
