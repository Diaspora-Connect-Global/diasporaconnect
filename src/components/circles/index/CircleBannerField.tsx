'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { ImageIcon, Lock } from 'lucide-react';

import { LabelMedium } from '@/components/utils';

/**
 * The banner field on "Create a Circle" — present, labelled, and deliberately
 * inert.
 *
 * ## Why it does not upload yet
 *
 * A banner cannot be attached at creation time. `CreateCircleInput` carries
 * `name`, `tagline`, `description`, `handle`, `discoverable`, `joinMode` and
 * `idempotencyKey` — no `bannerUrl` — and the gateway's `createCircle` resolver
 * does not forward one. The field that does exist,
 * `UpdateCircleProfileInput.bannerUrl`, belongs to the separate
 * `updateCircleProfile` mutation, which has no document in
 * `src/services/gql/circles.ts` (the 47 operations there do not include it).
 *
 * So a working banner needs a second mutation added to the data layer, not more
 * UI. Rather than mount a file picker whose result would be uploaded to GCS and
 * then silently dropped on the floor — an upload that appears to work and
 * changes nothing is worse than no upload — the control ships disabled.
 *
 * It is a real `<button disabled>`, so assistive tech announces it as
 * unavailable rather than leaving a decorative box to be puzzled over, and the
 * lock glyph says the same thing visually.
 *
 * To finish it: add `UPDATE_CIRCLE_PROFILE` to `services/gql/circles.ts`, then
 * upload via `getUploadUrl` (category `'cover'`) before `createCircle` and call
 * `updateCircleProfile({ circleId, bannerUrl })` with the returned `publicUrl`.
 * The founder is a LEAD from the moment the circle exists, which is the role
 * that mutation requires.
 */
export function CircleBannerField() {
  const t = useTranslations('circles');
  const hintId = useId();

  return (
    <div className="space-y-2">
      <LabelMedium>{t('create.bannerLabel')}</LabelMedium>

      <button
        type="button"
        disabled
        aria-describedby={hintId}
        className="flex h-32 w-full cursor-not-allowed flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border-subtle bg-surface-subtle opacity-60"
      >
        <ImageIcon aria-hidden="true" className="size-6 text-text-secondary" />
        <span className="label-small flex items-center gap-1.5 text-text-primary">
          <Lock aria-hidden="true" className="size-3.5" />
          {t('create.bannerCta')}
        </span>
        <span id={hintId} className="caption-small text-text-secondary">
          {t('create.bannerHint')}
        </span>
      </button>
    </div>
  );
}
