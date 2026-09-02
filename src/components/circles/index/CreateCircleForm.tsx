'use client';

import { useId, useState, type FormEvent } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff, Mail, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { RadioCard, RadioCardGroup } from '@/components/circles/primitives';
import { ButtonType2 } from '@/components/custom/button';
import { TextInput } from '@/components/custom/input';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useRouter } from '@/i18n/navigation';
import { CircularImageCropper } from '@/lib/imagecropper';
import { CREATE_CIRCLE, UPDATE_CIRCLE_PROFILE } from '@/services/gql/circles';
import type {
  CircleJoinMode,
  CreateCircleData,
  UpdateCircleProfileData,
} from '@/services/gql/types/circles';

import { CircleImageField } from './CircleBannerField';

/** `Circle.name` is clamped to 120 characters by circle-service. */
const MAX_NAME_LENGTH = 120;

/**
 * Create a circle.
 *
 * ## Two questions, not one toggle
 *
 * `discoverable` and `joinMode` are independent axes on the aggregate, and
 * collapsing them into a single public/private switch would throw away a real
 * configuration: a hidden circle that still accepts requests from anyone with
 * its link is a legitimate, common shape, and so is a listed circle nobody can
 * ask to join. They are asked separately because they are separate.
 *
 * ## Why the second question has two options, not the mockup's three
 *
 * `CircleJoinMode` is `INVITE_ONLY | REQUEST` — there is no third mode. The
 * mockup's "Anyone can apply" and "Request + approval" are the same enum value:
 * `requestToJoinCircle` only ever creates a PENDING row, and admission is an
 * ADMIT_MEMBER motion (circle-service has no `ApproveJoinRequest` command at
 * all). Offering both would present one setting twice and imply an
 * auto-admitting mode that does not exist, so REQUEST is described once, as
 * what it actually does.
 *
 * ## No governance form here
 *
 * A new circle gets working default governance rules, seeded in the same
 * transaction that creates it. Asking someone to configure quorum and majority
 * before their circle has two members is asking a question they cannot answer
 * yet — hence the note, and `AMEND_RULES` later.
 *
 * ## Images are attached after creation, and cannot fail the creation
 *
 * `CreateCircleInput` has no `avatarUrl` / `bannerUrl`, because the frozen
 * `CreateCircleRequest` proto has no such fields. Imagery goes through the
 * LEAD-gated `updateCircleProfile`, which needs a circle id — so submit runs
 * three steps in order:
 *
 *   1. `createCircle` — the only step allowed to fail the form.
 *   2. upload each chosen file to GCS via `getUploadUrl` (signed PUT).
 *   3. `updateCircleProfile` with whichever URLs came back.
 *
 * Creation deliberately runs FIRST, before the uploads, even though a signed
 * upload URL needs no circle id. Once step 1 returns, the circle exists; if
 * step 2 or 3 then fails, saying "we couldn't create your circle" would be a
 * lie that sends the user off to create a second one. So steps 2–3 are wrapped
 * as one best-effort phase: the failure surfaces as a non-blocking note that
 * the circle is fine and the image can be added from settings, and navigation
 * happens either way. Uploading first would only move the same problem —
 * orphaned GCS objects for an abandoned form — while risking exactly the lie.
 *
 * A URL is never dropped silently: an upload that succeeds is either attached
 * by step 3 or reported by the note.
 */
export function CreateCircleForm() {
  const t = useTranslations('circles');
  const router = useRouter();
  const discoverabilityLabelId = useId();
  const accessLabelId = useId();

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  /*
   * Both default to the mockup's pre-selected option. Note that `discoverable`
   * defaults to FALSE on the aggregate — this form deliberately proposes the
   * opposite, which is safe only because the question is asked in plain words
   * directly above the choice and is reversible from the circle's settings.
   */
  const [discoverable, setDiscoverable] = useState(true);
  const [joinMode, setJoinMode] = useState<CircleJoinMode>('REQUEST');
  /*
   * Spans all three submit steps, not just the `createCircle` round trip, so
   * the button stays busy while images upload. Apollo's own `loading` would go
   * false the moment step 1 returned and re-arm the form mid-flight.
   */
  const [submitting, setSubmitting] = useState(false);

  /*
   * Both pickers only hold a local data URL until submit — nothing is uploaded
   * from an abandoned form.
   *
   * The avatar goes through the cropper: it is displayed as a circle, and
   * `CircularImageCropper` is fixed at `aspect={1}` with a circular canvas
   * mask, which is exactly right for that and exactly wrong for a wide banner.
   * The banner therefore sets `skipCrop` and keeps the frame the user chose,
   * resized to 1600px rather than the avatar's 512.
   */
  const avatar = useImageUpload({ category: 'community_avatar' });
  const banner = useImageUpload({
    category: 'cover',
    maxDimension: 1600,
    skipCrop: true,
  });

  const [createCircle] = useMutation<CreateCircleData>(CREATE_CIRCLE);
  const [updateCircleProfile] =
    useMutation<UpdateCircleProfileData>(UPDATE_CIRCLE_PROFILE);

  /**
   * Steps 2 and 3, run after the circle exists. Never throws — the circle is
   * already saved, so nothing in here may reach the form's error path.
   *
   * Returns false when anything the user chose did not end up on the circle,
   * which is the signal to show the non-blocking note instead of plain success.
   */
  const attachImagery = async (circleId: string): Promise<boolean> => {
    const wantsAvatar = Boolean(avatar.croppedImage);
    const wantsBanner = Boolean(banner.croppedImage);
    if (!wantsAvatar && !wantsBanner) return true;

    /*
     * `uploadImage` resolves to null on failure rather than rejecting, so one
     * broken upload cannot discard the other's URL — a URL that reached GCS is
     * always either attached below or reported to the user, never dropped.
     */
    const [avatarUrl, bannerUrl] = await Promise.all([
      wantsAvatar ? avatar.uploadImage() : Promise.resolve(null),
      wantsBanner ? banner.uploadImage() : Promise.resolve(null),
    ]);

    const uploadsComplete =
      (!wantsAvatar || Boolean(avatarUrl)) &&
      (!wantsBanner || Boolean(bannerUrl));

    if (!avatarUrl && !bannerUrl) return false;

    try {
      // Omitted means unchanged, so a half-successful pair still attaches the
      // half that worked instead of blanking the other.
      await updateCircleProfile({
        variables: {
          input: {
            circleId,
            ...(avatarUrl ? { avatarUrl } : {}),
            ...(bannerUrl ? { bannerUrl } : {}),
          },
        },
      });
    } catch {
      return false;
    }

    return uploadsComplete;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(t('create.nameRequired'));
      return;
    }
    setNameError(undefined);

    setSubmitting(true);
    try {
      // Step 1. The ONLY step whose failure means "your circle was not created".
      const { data } = await createCircle({
        variables: {
          input: {
            name: trimmed,
            discoverable,
            joinMode,
          },
        },
      });

      const circle = data?.createCircle;
      if (!circle?.id) throw new Error('createCircle returned no circle');

      // Steps 2–3. From here the circle exists no matter what happens.
      const imageryAttached = await attachImagery(circle.id);

      if (imageryAttached) {
        toast.success(t('create.success'));
      } else {
        toast.message(t('create.imageFailed'));
      }

      router.push(`/circles/${circle.id}`);
    } catch {
      toast.error(t('create.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      noValidate
      className="space-y-6"
    >
      <TextInput
        id="circle-name"
        label={t('create.nameLabel')}
        placeholder={t('create.namePlaceholder')}
        value={name}
        onChange={(value: string) => {
          setName(value.slice(0, MAX_NAME_LENGTH));
          if (nameError) setNameError(undefined);
        }}
        required
        errorMessage={nameError}
      />

      <CircleImageField
        variant="avatar"
        name={name}
        preview={avatar.croppedImage}
        disabled={submitting}
        onSelect={avatar.handleFileSelect}
        onClear={avatar.reset}
      />

      {/*
       * Mounted only while there is something to crop: the dialog owns its own
       * `open`, and `rawImage` is cleared on both confirm and cancel.
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
        preview={banner.croppedImage}
        disabled={submitting}
        onSelect={banner.handleFileSelect}
        onClear={banner.reset}
      />

      <fieldset className="space-y-3">
        <legend id={discoverabilityLabelId} className="label-medium text-text-primary">
          {t('create.discoverability.question')}
        </legend>
        <p className="caption-small text-text-secondary">
          {t('create.discoverability.help')}
        </p>
        <RadioCardGroup
          aria-labelledby={discoverabilityLabelId}
          value={discoverable ? 'yes' : 'no'}
          onValueChange={(value) => setDiscoverable(value === 'yes')}
        >
          <RadioCard
            value="yes"
            icon={<Eye aria-hidden="true" />}
            title={t('create.discoverability.discoverable')}
          />
          <RadioCard
            value="no"
            icon={<EyeOff aria-hidden="true" />}
            title={t('create.discoverability.hidden')}
          />
        </RadioCardGroup>
      </fieldset>

      <fieldset className="space-y-3">
        <legend id={accessLabelId} className="label-medium text-text-primary">
          {t('create.access.question')}
        </legend>
        <p className="caption-small text-text-secondary">
          {t('create.access.help')}
        </p>
        <RadioCardGroup
          aria-labelledby={accessLabelId}
          value={joinMode}
          onValueChange={(value) => setJoinMode(value as CircleJoinMode)}
        >
          <RadioCard
            value="REQUEST"
            icon={<UserPlus aria-hidden="true" />}
            title={t('create.access.approvalLabel')}
            description={t('create.access.approvalDescription')}
          />
          <RadioCard
            value="INVITE_ONLY"
            icon={<Mail aria-hidden="true" />}
            title={t('create.access.inviteLabel')}
            description={t('create.access.inviteDescription')}
          />
        </RadioCardGroup>
      </fieldset>

      {/*
       * `surface-brand-light` holds the same light blue in both themes, so it is
       * legible only behind `text-text-brand` navy — which is exactly this pair.
       */}
      <p className="body-small rounded-lg bg-surface-brand-light p-4 text-text-brand">
        {t('create.note')}
      </p>

      <ButtonType2
        type="submit"
        size="lg"
        className="w-full"
        disabled={submitting}
      >
        {submitting ? t('create.submitting') : t('create.submit')}
      </ButtonType2>
    </form>
  );
}
