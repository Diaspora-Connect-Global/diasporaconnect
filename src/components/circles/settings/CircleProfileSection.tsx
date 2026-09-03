'use client';

import { useState, type FormEvent } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { CircleImageField } from '@/components/circles/index';
import { ButtonType2 } from '@/components/custom/button';
import { TextArea, TextInput } from '@/components/custom/input';
import { useImageUpload } from '@/hooks/useImageUpload';
import { toCdnUrl } from '@/lib/cdn';
import { CircularImageCropper } from '@/lib/imagecropper';
import { UPDATE_CIRCLE_PROFILE } from '@/services/gql/circles';
import type { Circle, UpdateCircleProfileData } from '@/services/gql/types/circles';

import { isCircleLive } from './liveness';
import { SettingsSection } from './SettingsSection';

/**
 * Name, tagline, description, handle, avatar and banner.
 *
 * LEAD-only: `updateCircleProfile` is the one settings mutation the gateway
 * gates with `assertCircleLead`. A member who is not a lead sees this block
 * read-only rather than not at all — the circle's own description is not a
 * secret from its members, and hiding it would make the screen look broken.
 *
 * ── LIMITS ARE MIRRORED FROM THE AGGREGATE, NOT INVENTED ────────────────────
 * `circle.aggregate.ts` clamps name ≤ 120, tagline ≤ 300, description ≤ 5000,
 * handle ≤ 48 and throws past any of them. Validating client-side to the same
 * numbers turns a 400 into an inline message; the server stays the authority.
 *
 * ── THE ONE TRAP ON THIS FORM: OPTIONAL FIELDS CANNOT BE CLEARED ────────────
 * The aggregate is careful to distinguish "not supplied" from "cleared", and
 * `UpdateCircleProfileHandler` comments that collapsing the two "would make it
 * impossible to remove a tagline". Over gRPC that distinction is nevertheless
 * lost, in two steps that each look correct alone:
 *
 *   1. `circle-grpc.client.ts` sends `input.tagline ?? ''` — an omitted field
 *      leaves the gateway as an EMPTY STRING, because proto3 has no null.
 *   2. `circle.controller.ts`'s `coerceString` returns a value only when
 *      `typeof v === 'string' && v.length > 0`, so that empty string arrives at
 *      the handler as `undefined` — "not supplied".
 *
 * Step 2 is what makes step 1 safe: without it, every partial edit would blank
 * every field the client did not resend. The cost is that an explicit clear is
 * indistinguishable from an omission, so `tagline: ''` means UNCHANGED and a
 * user who empties the field and saves gets the old value back with a success
 * toast. That is the silent no-op this codebase keeps getting bitten by.
 *
 * So the form refuses the change it cannot make: emptying a field that
 * currently has content is an inline validation error naming the limitation,
 * not a request that quietly fails. Replacing the text works normally. When
 * `coerceString` learns to distinguish an absent key from an empty one, delete
 * `clearAttempted` and the `notClearable` string with it.
 *
 * The same applies to imagery, which is why the pickers offer Change and not
 * Remove — see `imageState` below.
 */

/** Mirrors MAX_NAME / MAX_TAGLINE / MAX_DESCRIPTION / MAX_HANDLE in the aggregate. */
const MAX_NAME = 120;
const MAX_TAGLINE = 300;
const MAX_DESCRIPTION = 5000;
const MAX_HANDLE = 48;

/**
 * Verbatim from `circle.aggregate.ts`'s `HANDLE_RE`. Copied exactly rather than
 * approximated so the client can never accept what the server rejects, nor
 * reject what it accepts.
 *
 * Worth knowing before "fixing" it: the aggregate's own error message says
 * "2-48 chars", but this pattern admits a ONE-character handle and rejects a
 * two-character one (after the first character the optional group needs at
 * least 1 + 1 more). The message and the regex disagree on the backend; the
 * regex is what actually runs, so it is what is mirrored here. The hint shown
 * to the user therefore describes the alphabet and the ceiling and claims no
 * minimum — a promise the server would not keep.
 */
const HANDLE_RE = /^[a-z0-9](?:[a-z0-9_-]{1,46}[a-z0-9])?$/;

/** `''` and `null` both mean "no value" for an optional field. */
function blank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

export interface CircleProfileSectionProps {
  circle: Circle;
  /** False for a member who is not a LEAD: the block renders read-only. */
  canEdit: boolean;
}

export function CircleProfileSection({ circle, canEdit }: CircleProfileSectionProps) {
  const t = useTranslations('circles.settings');

  const [name, setName] = useState(circle.name ?? '');
  const [tagline, setTagline] = useState(circle.tagline ?? '');
  const [description, setDescription] = useState(circle.description ?? '');
  const [handle, setHandle] = useState(circle.handle ?? '');

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  /*
   * Spans the whole submit — upload, then mutate — rather than tracking
   * Apollo's `loading`, which would go false the moment the mutation returned
   * and re-arm the form while an image was still in flight. Same reasoning as
   * `CreateCircleScreen`.
   */
  const [saving, setSaving] = useState(false);

  /*
   * The avatar goes through the cropper; the banner does not. `CircularImageCropper`
   * is locked to `aspect={1}` with a circular canvas mask, which is right for an
   * avatar and would hand back a circle on a transparent square for a banner —
   * hence `skipCrop`, and 1600px instead of the avatar's 512 so a wide image is
   * not upscaled from a thumbnail at display size.
   */
  const avatar = useImageUpload({ category: 'community_avatar' });
  const banner = useImageUpload({
    category: 'cover',
    maxDimension: 1600,
    skipCrop: true,
  });

  const [updateProfile] = useMutation<UpdateCircleProfileData>(UPDATE_CIRCLE_PROFILE);

  /**
   * Existing imagery is shown until a new file is chosen, at which point the
   * local preview takes over.
   *
   * There is no Remove: clearing `avatarUrl` would mean sending `''`, which the
   * gRPC path reads as "unchanged" (see the file header). A Remove button that
   * silently does nothing is worse than no button, so the control offers
   * Change, and `onClear` reverts to the STORED image rather than to nothing —
   * it cancels the pick, which is the only thing it can honestly do.
   */
  // `toCdnUrl` returns `''` — never null — for an absent URL, so the `|| null`
  // is what actually normalises "no image" for `CircleImageField`. A trailing
  // `?? null` would be dead code here.
  const avatarPreview = avatar.croppedImage ?? (toCdnUrl(circle.avatarUrl) || null);
  const bannerPreview = banner.croppedImage ?? (toCdnUrl(circle.bannerUrl) || null);

  /** Which optional fields the user has emptied that previously had content. */
  const clearAttempted = {
    tagline: blank(tagline) && !blank(circle.tagline),
    description: blank(description) && !blank(circle.description),
    handle: blank(handle) && !blank(circle.handle),
  };

  const validate = (): boolean => {
    const next: Record<string, string | undefined> = {};

    const trimmedName = name.trim();
    if (!trimmedName) next.name = t('profile.nameRequired');
    else if (trimmedName.length > MAX_NAME) {
      next.name = t('profile.tooLong', { max: MAX_NAME });
    }

    if (tagline.trim().length > MAX_TAGLINE) {
      next.tagline = t('profile.tooLong', { max: MAX_TAGLINE });
    }
    if (description.trim().length > MAX_DESCRIPTION) {
      next.description = t('profile.tooLong', { max: MAX_DESCRIPTION });
    }

    const normalisedHandle = handle.trim().toLowerCase();
    if (normalisedHandle) {
      if (normalisedHandle.length > MAX_HANDLE) {
        next.handle = t('profile.tooLong', { max: MAX_HANDLE });
      } else if (!HANDLE_RE.test(normalisedHandle)) {
        next.handle = t('profile.handleInvalid');
      }
    }

    // Refuse a clear rather than letting it succeed-and-revert. See the header.
    if (clearAttempted.tagline) next.tagline = t('profile.notClearable');
    if (clearAttempted.description) next.description = t('profile.notClearable');
    if (clearAttempted.handle) next.handle = t('profile.notClearable');

    setErrors(next);
    return Object.values(next).every((value) => !value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || !canEdit) return;
    if (!validate()) return;

    setSaving(true);
    try {
      /*
       * Upload first here, unlike `CreateCircleScreen`, and for the mirror-image
       * reason: the circle already exists, so there is no risk of reporting a
       * failed image as a failed circle. Uploading before the mutation means a
       * broken upload aborts the save instead of half-applying it.
       *
       * `uploadImage` resolves to null on failure rather than rejecting, so one
       * failed upload cannot discard the other's URL.
       */
      const [avatarUrl, bannerUrl] = await Promise.all([
        avatar.croppedImage ? avatar.uploadImage() : Promise.resolve(null),
        banner.croppedImage ? banner.uploadImage() : Promise.resolve(null),
      ]);

      if (
        (avatar.croppedImage && !avatarUrl) ||
        (banner.croppedImage && !bannerUrl)
      ) {
        // `useImageUpload` has already shown the specific failure toast.
        toast.error(t('profile.imageFailed'));
        return;
      }

      /*
       * Send only what CHANGED. Every field is omitted-means-unchanged, so a
       * lead who edited a tagline does not resend a 5000-character description
       * — and, more importantly, does not re-submit a `handle` whose uniqueness
       * check could then fail for no reason the user caused.
       */
      const trimmedName = name.trim();
      const trimmedTagline = tagline.trim();
      const trimmedDescription = description.trim();
      const normalisedHandle = handle.trim().toLowerCase();

      const input: Record<string, string> = { circleId: circle.id };
      if (trimmedName !== (circle.name ?? '')) input.name = trimmedName;
      if (trimmedTagline && trimmedTagline !== (circle.tagline ?? '')) {
        input.tagline = trimmedTagline;
      }
      if (trimmedDescription && trimmedDescription !== (circle.description ?? '')) {
        input.description = trimmedDescription;
      }
      if (normalisedHandle && normalisedHandle !== (circle.handle ?? '')) {
        input.handle = normalisedHandle;
      }
      if (avatarUrl) input.avatarUrl = avatarUrl;
      if (bannerUrl) input.bannerUrl = bannerUrl;

      if (Object.keys(input).length === 1) {
        toast.message(t('profile.nothingToSave'));
        return;
      }

      await updateProfile({ variables: { input } });

      // The pickers have served their purpose; the fresh `circle` prop now
      // carries the stored URLs, so drop the local previews.
      avatar.reset();
      banner.reset();
      toast.success(t('profile.saved'));
    } catch (err) {
      /*
       * circle-service's own message reaches here intact: the gateway's
       * `assertOk` rethrows `res.message` as a `BadRequestException`. It is the
       * only text that can explain a handle collision or a governance refusal,
       * so it is preferred over the generic string.
       */
      toast.error(err instanceof Error ? err.message : t('profile.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) {
    /*
     * `canEdit` is false for TWO different reasons — not a lead, or the circle
     * is not live — and the section cannot tell them apart from the flag alone.
     * The lead note is therefore shown only when the circle IS live; when it is
     * not, the screen's own banner has already given the real reason, and
     * repeating "only a lead can edit" underneath it would name the wrong
     * cause to a lead who is reading it.
     *
     * And unlike the discovery and archive blocks, there is no "propose it
     * instead" note here — deliberately. Those two map onto real motion kinds
     * (`SET_DISCOVERABLE`, `CHANGE_JOIN_MODE`, `DISSOLVE_CIRCLE`), so a member
     * has a genuine route. `CircleMotionKind` has no profile-edit member, so
     * offering the same nudge for a tagline would send someone to open a motion
     * that does not exist.
     */
    return (
      <SettingsSection
        title={t('profile.title')}
        description={
          isCircleLive(circle.status)
            ? t('profile.leadOnlyNote')
            : t('profile.readOnlyDescription')
        }
      >
        <dl className="space-y-3">
          <div>
            <dt className="label-medium text-text-primary">{t('profile.nameLabel')}</dt>
            <dd className="body-small mt-0.5 text-text-secondary">{circle.name}</dd>
          </div>
          {circle.handle && (
            <div>
              <dt className="label-medium text-text-primary">
                {t('profile.handleLabel')}
              </dt>
              <dd className="body-small mt-0.5 text-text-secondary">@{circle.handle}</dd>
            </div>
          )}
          {circle.tagline && (
            <div>
              <dt className="label-medium text-text-primary">
                {t('profile.taglineLabel')}
              </dt>
              <dd className="body-small mt-0.5 text-text-secondary">{circle.tagline}</dd>
            </div>
          )}
          {circle.description && (
            <div>
              <dt className="label-medium text-text-primary">
                {t('profile.descriptionLabel')}
              </dt>
              <dd className="body-small mt-0.5 whitespace-pre-wrap text-text-secondary">
                {circle.description}
              </dd>
            </div>
          )}
        </dl>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection title={t('profile.title')} description={t('profile.description')}>
      <form onSubmit={(event) => void handleSubmit(event)} noValidate className="space-y-5">
        <TextInput
          id="circle-settings-name"
          label={t('profile.nameLabel')}
          placeholder={t('profile.namePlaceholder')}
          value={name}
          onChange={(value: string) => {
            setName(value.slice(0, MAX_NAME));
            if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
          }}
          required
          disabled={saving}
          errorMessage={errors.name}
        />

        <div>
          <TextInput
            id="circle-settings-handle"
            label={t('profile.handleLabel')}
            placeholder={t('profile.handlePlaceholder')}
            value={handle}
            onChange={(value: string) => {
              // Lower-cased as typed, matching `normaliseHandle` on the
              // aggregate, so what the field shows is what gets stored.
              setHandle(value.toLowerCase().slice(0, MAX_HANDLE));
              if (errors.handle) setErrors((prev) => ({ ...prev, handle: undefined }));
            }}
            disabled={saving}
            errorMessage={errors.handle}
          />
          <p className="caption-small mt-1 text-text-secondary">
            {t('profile.handleHint', { max: MAX_HANDLE })}
          </p>
        </div>

        <div>
          <TextInput
            id="circle-settings-tagline"
            label={t('profile.taglineLabel')}
            placeholder={t('profile.taglinePlaceholder')}
            value={tagline}
            onChange={(value: string) => {
              setTagline(value.slice(0, MAX_TAGLINE));
              if (errors.tagline) setErrors((prev) => ({ ...prev, tagline: undefined }));
            }}
            disabled={saving}
            errorMessage={errors.tagline}
          />
        </div>

        <div>
          <TextArea
            id="circle-settings-description"
            label={t('profile.descriptionLabel')}
            placeholder={t('profile.descriptionPlaceholder')}
            value={description}
            onChange={(value: string) => {
              setDescription(value);
              if (errors.description) {
                setErrors((prev) => ({ ...prev, description: undefined }));
              }
            }}
            rows={5}
            maxLength={MAX_DESCRIPTION}
          />
          {errors.description && (
            <p className="caption-small mt-1 text-text-danger">{errors.description}</p>
          )}
        </div>

        <CircleImageField
          variant="avatar"
          name={name}
          preview={avatarPreview}
          disabled={saving}
          onSelect={avatar.handleFileSelect}
          onClear={avatar.reset}
        />

        {/*
         * Mounted only while there is something to crop — the dialog owns its
         * own `open`, and `rawImage` is cleared on confirm and on cancel.
         */}
        {avatar.rawImage && (
          <CircularImageCropper
            open={avatar.showCropper}
            src={avatar.rawImage}
            onCancel={avatar.handleCropCancel}
            onConfirm={avatar.handleCropConfirm}
          />
        )}

        <CircleImageField
          variant="banner"
          name={name}
          preview={bannerPreview}
          disabled={saving}
          onSelect={banner.handleFileSelect}
          onClear={banner.reset}
        />

        <p className="caption-small text-text-secondary">{t('profile.imageReplaceOnly')}</p>

        <ButtonType2 type="submit" disabled={saving} className="w-full sm:w-auto">
          {saving ? t('profile.saving') : t('profile.save')}
        </ButtonType2>
      </form>
    </SettingsSection>
  );
}
