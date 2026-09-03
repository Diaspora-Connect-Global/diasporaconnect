'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
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
import {
  readCircleWrite,
  refusalMessageKey,
} from '@/components/circles/governance/mutationOutcome';
import { createProjectMotionPayload } from '@/components/circles/governance/motionPayload';
import { ButtonType1, ButtonType2 } from '@/components/custom/button';
import { TextInput } from '@/components/custom/input';
import { useRouter } from '@/i18n/navigation';
import {
  CIRCLE,
  CIRCLE_ENTITLEMENTS,
  CIRCLE_GOVERNANCE_RULES,
  CREATE_CIRCLE_PROJECT,
  MY_CIRCLE_MEMBERSHIP,
  OPEN_CIRCLE_MOTION,
} from '@/services/gql/circles-actions';
import type {
  CircleEntitlementsData,
  CircleGovernanceRulesData,
  CreateCircleProjectData,
  CreateCircleProjectVariables,
  OpenCircleMotionData,
  OpenCircleMotionVariables,
} from '@/services/gql/types/circles';
import type { Circle, CircleMembershipCheck } from '@/services/gql/types/circles';
import type { CircleProjectDraft } from '@/services/gql/types/circles-actions';

/**
 * @fileoverview Start a project — directly, or by putting it to the circle.
 * @module components/circles/project/CreateProjectForm
 *
 * ── WHAT THIS SCREEN HAS TO KNOW BEFORE IT SHOWS A SINGLE FIELD ─────────────
 * Three reads gate the form, and all three change the answer:
 *
 *   `circle.status`            a DORMANT circle can still start a project but
 *                              cannot hold a vote; an ARCHIVED one can do
 *                              neither
 *   `circleGovernanceRules`    whether CREATE_PROJECT is this member's to take
 *                              or the circle's to decide — per circle, not a
 *                              constant
 *   `circleEntitlements`       how many active-project slots are left, stated
 *                              BEFORE the title is typed rather than as a
 *                              refusal after it
 *
 * ── THE PROJECT IS BORN ACTIVE, NOT DRAFT ───────────────────────────────────
 * `CreateProjectHandler` calls `activate()` in the same handler it creates in,
 * because `logContribution` refuses anything that is not ACTIVE and no rpc
 * exists that activates a project — a DRAFT would be permanently inert. So
 * there is no "publish" step to offer here, and the confirmation says the
 * project has started rather than that it has been saved.
 *
 * ── WHY `idempotencyKey` IS SENT AND WHY IT IS NOT PROMISED ─────────────────
 * `CreateProjectRequest` carries the field and circle-service accepts it, but
 * `circle_project` has NO unique index behind it, and the handler says so
 * outright: *"Documented rather than silently ignored so nobody assumes
 * protection that the schema does not provide."* A retry after a lost response
 * creates a SECOND project. It is sent because the audit trail can correlate
 * the attempts, and the submit button is disabled while in flight because that
 * is the only real protection available.
 */

interface CircleData {
  circle?: Circle | null;
}
interface MembershipData {
  myCircleMembership?: CircleMembershipCheck | null;
}

const EMPTY_DRAFT: CircleProjectDraft = {
  title: '',
  description: '',
  startsOn: '',
  dueOn: '',
};

export interface CreateProjectFormProps {
  circleId: string;
  /** Where to go after a successful create. Defaults to the circle home. */
  onDone?: () => void;
}

export function CreateProjectForm({ circleId, onDone }: CreateProjectFormProps) {
  const t = useTranslations('circles.newProject');
  const tActions = useTranslations('circles.actions');
  const tCommon = useTranslations('circles.common');
  const router = useRouter();

  const [draft, setDraft] = useState<CircleProjectDraft>(EMPTY_DRAFT);
  const [route, setRoute] = useState<ChosenRoute>('direct');
  const [submitting, setSubmitting] = useState(false);
  // One key per user action, minted on first submit and RETAINED across a
  // failure — see the file header for why it protects less here than elsewhere.
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
        kind: 'CREATE_PROJECT',
        rules: rulesData?.circleGovernanceRules,
        entitlements: entitlementsData?.circleEntitlements,
        entitlementKey: ACTION_ENTITLEMENT_KEY.CREATE_PROJECT,
        isMember: membership?.isMember ?? false,
        isLead: membership?.isLead ?? false,
        canPropose: membership?.canPropose ?? false,
        circleIsActive: circleCanOpenMotions(circle?.status),
        circleIsLive: circleIsLive(circle?.status),
      }),
    [rulesData, entitlementsData, membership, circle?.status],
  );

  /*
   * The chosen route is CORRECTED to whichever is available rather than being
   * left on an impossible one. A member at the project cap keeps the motion
   * route — the cap binds at enactment, not at proposal — and would otherwise
   * sit on a "start it now" selection whose button is dead.
   */
  const effectiveRoute: ChosenRoute = policy.canActDirectly
    ? policy.canOpenMotion
      ? route
      : 'direct'
    : 'motion';

  const [createProject] = useMutation<
    CreateCircleProjectData,
    CreateCircleProjectVariables
  >(CREATE_CIRCLE_PROJECT, {
    // By operation name, so whichever project list is mounted refetches with
    // the variables it currently holds.
    refetchQueries: ['CircleProjects', 'CircleEntitlements'],
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

  function set<K extends keyof CircleProjectDraft>(key: K, value: CircleProjectDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);

    const key = idempotencyKey ?? crypto.randomUUID();
    if (idempotencyKey === null) setIdempotencyKey(key);

    try {
      if (effectiveRoute === 'direct') {
        const result = await createProject({
          variables: {
            input: {
              circleId,
              title,
              // Empty optionals are DROPPED, never sent as ''. The gRPC loader
              // runs with `defaults: true`, so an empty string is
              // indistinguishable from an unset field on the far side and can
              // blank a value rather than leave it alone.
              description: draft.description.trim() || undefined,
              startsOn: draft.startsOn || undefined,
              dueOn: draft.dueOn || undefined,
              idempotencyKey: key,
            },
          },
        });

        /*
         * `data`, not the absence of a throw. Under this app's global
         * `errorPolicy: 'all'` a refused mutation RESOLVES with
         * `{ data: null, error }`, so an `await` that "succeeded" proves
         * nothing. See `governance/mutationOutcome.ts`.
         */
        const outcome = readCircleWrite(result, (d) => d.createCircleProject);
        if (!outcome.ok) {
          toast.error(tActions(`writeErrors.${refusalMessageKey(outcome.refusal)}`));
          return;
        }

        toast.success(t('createdDirect'));
        setIdempotencyKey(null);
        if (onDone) onDone();
        else router.push(`/circles/${circleId}/projects/${outcome.data.id}`);
        return;
      }

      const result = await openMotion({
        variables: {
          input: {
            circleId,
            kind: 'CREATE_PROJECT',
            title: t('motionTitle', { project: title }),
            rationale: draft.description.trim() || undefined,
            // Built from the draft rather than by hand: nothing validates this
            // until AFTER the vote, where a missing `title` becomes
            // ENACTMENT_FAILED on a motion the circle has already passed.
            payloadJson: createProjectMotionPayload(draft),
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
    } catch (error) {
      // Reached only by the failures that genuinely reject — a link-level
      // throw or an aborted request. The classified path above handles the
      // rest, and both land on the same copy.
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
        id="project-title"
        type="text"
        value={draft.title}
        onChange={(v: string) => set('title', v)}
        label={t('titleLabel')}
        placeholder={t('titlePlaceholder')}
        required
        disabled={submitting}
      />

      <div className="space-y-2">
        <label htmlFor="project-description" className="label-medium text-text-primary">
          {t('descriptionLabel')}
        </label>
        <textarea
          id="project-description"
          value={draft.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder={t('descriptionPlaceholder')}
          rows={3}
          disabled={submitting}
          className="w-full rounded-md border-2 border-border-subtle bg-surface-subtle px-3 py-2 text-text-primary placeholder:text-text-secondary focus:outline-none focus-visible:border-border-brand"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextInput
          id="project-starts-on"
          type="date"
          value={draft.startsOn}
          onChange={(v: string) => set('startsOn', v)}
          label={t('startsOnLabel')}
          placeholder=""
          disabled={submitting}
        />
        <TextInput
          id="project-due-on"
          type="date"
          value={draft.dueOn}
          onChange={(v: string) => set('dueOn', v)}
          label={t('dueOnLabel')}
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
          // Validation is a disabled CTA, not an error message: an empty title
          // is self-evident and there is no message worth a translation for it.
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
