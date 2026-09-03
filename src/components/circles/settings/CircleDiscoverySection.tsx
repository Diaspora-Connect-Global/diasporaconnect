'use client';

import { useId, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff, Mail, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { RadioCard, RadioCardGroup } from '@/components/circles/primitives';
import {
  readCircleWrite,
  refusalMessageKey,
} from '@/components/circles/governance/mutationOutcome';
import {
  SET_CIRCLE_DISCOVERABLE,
  SET_CIRCLE_JOIN_MODE,
} from '@/services/gql/circles-settings';
import type { Circle, CircleJoinMode } from '@/services/gql/types/circles';
import type {
  SetCircleDiscoverableData,
  SetCircleDiscoverableVariables,
  SetCircleJoinModeData,
  SetCircleJoinModeVariables,
} from '@/services/gql/types/circles-settings';

import { isCircleLive } from './liveness';
import { SettingsSection } from './SettingsSection';

/**
 * Discovery, as TWO controls.
 *
 * ── WHY NOT ONE PUBLIC/PRIVATE SWITCH ───────────────────────────────────────
 * `discoverable` and `joinMode` are separate columns on the aggregate because
 * they answer separate questions — *can people find us?* and *how do they get
 * in?* — and every combination of the two is a real configuration someone is
 * running:
 *
 *   discoverable + REQUEST      an open group anyone can find and ask to join
 *   discoverable + INVITE_ONLY  a listed circle you have to be asked into
 *   hidden       + REQUEST      unlisted, but anyone with the link may ask
 *   hidden       + INVITE_ONLY  fully private
 *
 * A single switch can express two of those four. The other two would become
 * unreachable from the UI while remaining perfectly valid in the database —
 * which is worse than not offering the control, because a circle already in one
 * of those states would be silently reconfigured the first time its lead
 * touched the switch. They are asked separately because they are separate.
 *
 * ── WHY THERE ARE TWO JOIN MODES AND NOT THREE ──────────────────────────────
 * `CircleJoinMode` is `INVITE_ONLY | REQUEST`. There is no auto-admitting mode:
 * `requestToJoinCircle` only ever creates a PENDING row, and admission is an
 * `ADMIT_MEMBER` motion — circle-service has no approve-a-request command at
 * all. Splitting REQUEST into "anyone can apply" and "request + approval" would
 * show one setting twice and advertise a mode that does not exist.
 *
 * ── WHY EACH CHANGE APPLIES IMMEDIATELY ─────────────────────────────────────
 * One control, one mutation, no shared save button — so a Save would only add a
 * step and a chance to leave the page mid-edit.
 *
 * The important consequence is what happens on refusal. The control REVERTS to
 * the value the server still holds and the toast carries circle-service's own
 * message, which the gateway's `assertOk` rethrows verbatim. Optimism here
 * would leave the UI showing a setting the circle does not have.
 *
 * The pending value is tracked separately from the committed one for exactly
 * that reason: `circle` stays the source of truth, and `pending` is only what
 * is in flight.
 *
 * ── BOTH MUTATIONS ARE LEAD-GATED, DESPITE THE RESOLVER ─────────────────────
 * `setCircleDiscoverable` and `setCircleJoinMode` pass through the gateway's
 * `assertCircleMember`, but `SetDiscoverableHandler` and `SetJoinModeHandler`
 * each call `requireLead` in circle-service, so a member who is not a lead
 * cannot make either change directly. Offering the radios to every member would
 * mean a control that always fails after the click. See the gate map in
 * `types/circles-settings.ts`.
 *
 * A member is not stuck, though, and the read-only state says so when
 * `canPropose`: `SET_DISCOVERABLE` and `CHANGE_JOIN_MODE` are both
 * `CircleMotionKind`s, so the way through is `openCircleMotion`. The handler's
 * own words — "that route stays open, which is what makes this refusal a
 * redirection rather than a wall".
 */
export interface CircleDiscoverySectionProps {
  circle: Circle;
  /** LEAD and the circle live. False renders the configuration read-only. */
  canEdit: boolean;
  /** Whether to point a non-lead member at opening a motion instead. */
  canPropose: boolean;
  /** Refetch the circle so the committed value comes from the server. */
  onChanged: () => void;
}

export function CircleDiscoverySection({
  circle,
  canEdit,
  canPropose,
  onChanged,
}: CircleDiscoverySectionProps) {
  const t = useTranslations('circles.settings');
  const tActions = useTranslations('circles.actions');
  const discoverabilityLabelId = useId();
  const accessLabelId = useId();

  /*
   * `null` means "nothing in flight". While a value is pending the radio shows
   * it, so the click registers; on failure it is dropped and the group snaps
   * back to `circle`, which never moved.
   */
  const [pendingDiscoverable, setPendingDiscoverable] = useState<boolean | null>(null);
  const [pendingJoinMode, setPendingJoinMode] = useState<CircleJoinMode | null>(null);

  const [setDiscoverable, { loading: savingDiscoverable }] = useMutation<
    SetCircleDiscoverableData,
    SetCircleDiscoverableVariables
  >(SET_CIRCLE_DISCOVERABLE);

  const [setJoinMode, { loading: savingJoinMode }] = useMutation<
    SetCircleJoinModeData,
    SetCircleJoinModeVariables
  >(SET_CIRCLE_JOIN_MODE);

  const discoverable = pendingDiscoverable ?? circle.discoverable;
  const joinMode = pendingJoinMode ?? circle.joinMode;

  const handleDiscoverableChange = async (next: boolean) => {
    if (next === circle.discoverable || savingDiscoverable) return;
    setPendingDiscoverable(next);
    try {
      const result = await setDiscoverable({
        variables: { circleId: circle.id, discoverable: next },
      });

      /*
       * `data`, not the absence of a throw. The global `errorPolicy: 'all'`
       * resolves a REFUSED mutation, so the catch below never saw a server
       * refusal — a lost LEAD role or a status that stopped being live between
       * load and click reported "saved" over a toggle that did not move.
       *
       * This used to surface `err.message` on the theory that circle-service's
       * own sentence was the only part worth reading. It is operator English
       * carrying raw UUIDs, and it is never translated, so the classified key
       * is the better answer in a five-locale UI. See
       * `governance/mutationOutcome.ts`.
       */
      const outcome = readCircleWrite(result, (d) => d.setCircleDiscoverable);
      if (!outcome.ok) {
        toast.error(tActions(`writeErrors.${refusalMessageKey(outcome.refusal)}`));
        return;
      }

      toast.success(t('discovery.discoverabilitySaved'));
      onChanged();
    } catch (error) {
      const outcome = readCircleWrite({ error }, () => null);
      toast.error(tActions(`writeErrors.${refusalMessageKey(outcome.refusal)}`));
    } finally {
      setPendingDiscoverable(null);
    }
  };

  const handleJoinModeChange = async (next: CircleJoinMode) => {
    if (next === circle.joinMode || savingJoinMode) return;
    setPendingJoinMode(next);
    try {
      const result = await setJoinMode({
        variables: { circleId: circle.id, joinMode: next },
      });

      // Same false-success trap as above.
      const outcome = readCircleWrite(result, (d) => d.setCircleJoinMode);
      if (!outcome.ok) {
        toast.error(tActions(`writeErrors.${refusalMessageKey(outcome.refusal)}`));
        return;
      }

      toast.success(t('discovery.joinModeSaved'));
      onChanged();
    } catch (error) {
      const outcome = readCircleWrite({ error }, () => null);
      toast.error(tActions(`writeErrors.${refusalMessageKey(outcome.refusal)}`));
    } finally {
      setPendingJoinMode(null);
    }
  };

  if (!canEdit) {
    return (
      <SettingsSection
        title={t('discovery.title')}
        description={t('discovery.readOnlyDescription')}
      >
        <dl className="space-y-3">
          <div>
            <dt className="label-medium text-text-primary">
              {t('discovery.discoverabilityQuestion')}
            </dt>
            <dd className="body-small mt-0.5 text-text-secondary">
              {circle.discoverable
                ? t('discovery.discoverableTitle')
                : t('discovery.hiddenTitle')}
            </dd>
          </div>
          <div>
            <dt className="label-medium text-text-primary">
              {t('discovery.accessQuestion')}
            </dt>
            <dd className="body-small mt-0.5 text-text-secondary">
              {circle.joinMode === 'INVITE_ONLY'
                ? t('discovery.inviteTitle')
                : t('discovery.requestTitle')}
            </dd>
          </div>
        </dl>

        {/*
         * Shown only to a member who may actually open one. `canPropose` is
         * circle-service's verdict against the circle's pinned rule; telling
         * someone to propose a motion they would be refused would be worse than
         * saying nothing. Suppressed on a non-live circle too, where the
         * screen's banner already gives the real reason and motions cannot open.
         */}
        {canPropose && isCircleLive(circle.status) && (
          <p className="body-small mt-4 rounded-lg bg-surface-brand-light p-4 text-text-brand">
            {t('discovery.proposeInstead')}
          </p>
        )}
      </SettingsSection>
    );
  }

  return (
    <SettingsSection title={t('discovery.title')} description={t('discovery.description')}>
      <div className="space-y-6">
        <fieldset className="space-y-3" disabled={savingDiscoverable}>
          <legend id={discoverabilityLabelId} className="label-medium text-text-primary">
            {t('discovery.discoverabilityQuestion')}
          </legend>
          <p className="caption-small text-text-secondary">
            {t('discovery.discoverabilityHelp')}
          </p>
          <RadioCardGroup
            aria-labelledby={discoverabilityLabelId}
            value={discoverable ? 'yes' : 'no'}
            onValueChange={(value) => void handleDiscoverableChange(value === 'yes')}
          >
            <RadioCard
              value="yes"
              icon={<Eye aria-hidden="true" />}
              title={t('discovery.discoverableTitle')}
              description={t('discovery.discoverableDescription')}
              disabled={savingDiscoverable}
            />
            <RadioCard
              value="no"
              icon={<EyeOff aria-hidden="true" />}
              title={t('discovery.hiddenTitle')}
              description={t('discovery.hiddenDescription')}
              disabled={savingDiscoverable}
            />
          </RadioCardGroup>
        </fieldset>

        <fieldset className="space-y-3" disabled={savingJoinMode}>
          <legend id={accessLabelId} className="label-medium text-text-primary">
            {t('discovery.accessQuestion')}
          </legend>
          <p className="caption-small text-text-secondary">{t('discovery.accessHelp')}</p>
          <RadioCardGroup
            aria-labelledby={accessLabelId}
            value={joinMode}
            onValueChange={(value) => void handleJoinModeChange(value as CircleJoinMode)}
          >
            <RadioCard
              value="REQUEST"
              icon={<UserPlus aria-hidden="true" />}
              title={t('discovery.requestTitle')}
              description={t('discovery.requestDescription')}
              disabled={savingJoinMode}
            />
            <RadioCard
              value="INVITE_ONLY"
              icon={<Mail aria-hidden="true" />}
              title={t('discovery.inviteTitle')}
              description={t('discovery.inviteDescription')}
              disabled={savingJoinMode}
            />
          </RadioCardGroup>
        </fieldset>

        {/*
         * `surface-brand-light` holds the same light blue in BOTH themes, so it
         * is legible only behind `text-text-brand` navy — which is this exact
         * pair. Never put `text-text-primary` on it.
         */}
        <p className="body-small rounded-lg bg-surface-brand-light p-4 text-text-brand">
          {t('discovery.leadNote')}
        </p>
      </div>
    </SettingsSection>
  );
}
