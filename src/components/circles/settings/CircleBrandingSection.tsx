'use client';

import { useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';

import { StatusPill } from '@/components/circles/primitives';
import { ButtonType1 } from '@/components/custom/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import {
  CIRCLE_ENTITLEMENTS,
  circleEntitlementEnabled,
} from '@/services/gql/circles';
import type {
  CircleEntitlementsData,
  CircleEntitlementsVariables,
} from '@/services/gql/types/circles';

import { SettingsSection } from './SettingsSection';

/**
 * Branding — what the circle's own colours are doing right now.
 *
 * ── SUPPRESSED, NEVER DELETED ───────────────────────────────────────────────
 * `CUSTOM_BRANDING` is a FLAG entitlement. When a plan lacks it, circle-service
 * *suppresses* `brandJson` on read and leaves the stored value completely
 * untouched, so a plan change brings the colours back exactly as they were.
 * Every string in this block says that, because "Branding: off" on its own
 * reads as "your colours were thrown away" — which would make a lead re-enter
 * work that was never lost, and make a reversible plan change feel destructive.
 *
 * ── WHY THIS PANEL CANNOT SAY "YOU HAVE COLOURS SAVED" ──────────────────────
 * That suppression is exactly why. On a plan without the entitlement
 * `circle.brandJson` comes back null whether or not something is stored, so an
 * absent value means "not on this plan", NOT "unset" — and the client has no
 * way to tell the two apart. The copy therefore speaks conditionally ("any
 * colours you have saved") rather than claiming a fact it cannot check.
 *
 * ── AND WHY THERE IS NO EDITOR ──────────────────────────────────────────────
 * `updateCircleProfile` accepts `brandJson`, but it is an opaque JSON string:
 * neither the gateway schema nor circle-service defines what is inside it, so a
 * colour picker here would be inventing a format the backend has never agreed
 * to and writing it into a column something else may later read differently.
 * The panel reports the state truthfully and stops there.
 */
export interface CircleBrandingSectionProps {
  circleId: string;
}

export function CircleBrandingSection({ circleId }: CircleBrandingSectionProps) {
  const t = useTranslations('circles.settings.branding');

  /*
   * `circleEntitlements` is the same root the plan screen reads with the same
   * arguments and the same selection, so once either has run the other is a
   * cache hit — this panel costs a round trip only when it is opened first.
   *
   * `errorPolicy: 'all'` because the root is MEMBER-gated and nullable: a
   * refusal nulls the field rather than the response, and a null here has to
   * render as "we don't know", never as "branding is off".
   */
  const { data, loading, error } = useQuery<
    CircleEntitlementsData,
    CircleEntitlementsVariables
  >(CIRCLE_ENTITLEMENTS, {
    variables: { circleId },
    skip: !circleId,
    errorPolicy: 'all',
  });

  const entitlements = data?.circleEntitlements ?? null;

  const body = () => {
    if (loading && !entitlements) {
      return (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      );
    }

    /*
     * Unknown is its own state. Guessing `false` would tell a circle that pays
     * for branding that it does not have it, and guessing `true` would promise
     * a capability the server may refuse — so neither is offered.
     */
    if (!entitlements) {
      return (
        <p className="body-small text-text-secondary">
          {error ? t('loadFailed') : t('unknown')}
        </p>
      );
    }

    const enabled = circleEntitlementEnabled(
      entitlements.entitlements,
      'CUSTOM_BRANDING',
    );

    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="label-medium text-text-primary">{t('customColours')}</span>
          <StatusPill
            /*
              "Hidden", not "Off" or "Removed". The colours are still there;
              only the display of them is paused, and the pill is the first
              word a lead reads.
            */
            variant={enabled ? 'success' : 'warning'}
            label={enabled ? t('included') : t('hidden')}
          />
        </div>

        <p className="body-small text-text-secondary">
          {enabled ? t('includedBody') : t('hiddenBody')}
        </p>

        {!enabled && (
          <p className="caption-small text-text-secondary">{t('hiddenWhy')}</p>
        )}

        <p className="caption-small text-text-secondary">{t('noEditor')}</p>

        {!enabled && (
          <Link href={`/circles/${circleId}/plan`} className="w-fit">
            <ButtonType1>{t('changePlan')}</ButtonType1>
          </Link>
        )}
      </div>
    );
  };

  return (
    <SettingsSection title={t('title')} description={t('description')}>
      {body()}
    </SettingsSection>
  );
}
