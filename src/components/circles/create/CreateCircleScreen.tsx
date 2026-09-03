'use client';

import { useId, useState, type FormEvent } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff, Info, Mail, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { RadioCard, RadioCardGroup } from '@/components/circles/primitives';
import { ButtonType2 } from '@/components/custom/button';
import { TextInput } from '@/components/custom/input';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useRouter } from '@/i18n/navigation';
import { CircularImageCropper } from '@/lib/imagecropper';
import { readMutationOutcome, refusalMessageKey } from '@/lib/mutationOutcome';
import { CREATE_CIRCLE, UPDATE_CIRCLE_PROFILE } from '@/services/gql/circles';
import type {
  CircleJoinMode,
  CreateCircleData,
  UpdateCircleProfileData,
} from '@/services/gql/types/circles';

import { CircleAvatarPicker } from './CircleAvatarPicker';
import { CircleBannerDropzone } from './CircleBannerDropzone';

/** `Circle.name` is clamped to 120 characters by circle-service. */
const MAX_NAME_LENGTH = 120;

/**
 * Create a circle — two columns: what the circle IS on the left, how it BEHAVES
 * on the right.
 *
 * ## Two questions, not one toggle
 *
 * `discoverable` and `joinMode` are independent axes on the aggregate, and
 * collapsing them into a single public/private switch would throw away a real
 * configuration: a hidden circle that still accepts requests from anyone with
 * its link is a legitimate, common shape, and so is a listed circle nobody can
 * ask to join. They are asked separately because they are separate, and they
 * are two separate `<fieldset>`s so assistive tech hears them that way too.
 *
 * ## Why the second question has two options, not the design's three
 *
 * `CircleJoinMode` is `INVITE_ONLY | REQUEST` — there is no third mode, and
 * `CreateCircleInput` carries no approval flag beside it. The design's "Anyone
 * can apply" and "Request + approval" are the SAME enum value: joining always
 * creates a PENDING row, and admission is an ADMIT_MEMBER motion (circle-service
 * has no `ApproveJoinRequest` command at all). Shipping both would be two radio
 * options that write identical state — a control where picking the other one
 * changes nothing, and where the distinction vanishes on reload. So REQUEST is
 * offered once, taking its title from the design's default card and its
 * description from the third, which is the half that tells the truth about
 * approval.
 *
 * ## No governance form here
 *
 * A new circle gets working default governance rules, seeded in the same
 * transaction that creates it. Asking someone to configure quorum and majority
 * before their circle has two members is asking a question they cannot answer
 * yet — hence the callout, and `AMEND_RULES` later.
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
 * happens either way.
 *
 * ## The success path is gated on the RESULT, not on the absence of a throw
 *
 * `lib/graph-client.ts` sets `errorPolicy: 'all'` globally, so a REFUSED
 * mutation RESOLVES with `{ data: null }`. `try { await m(); toast.success() }`
 * therefore announces success on failure and leaves the `catch` as dead code.
 * `readMutationOutcome` reads `data` and classifies the refusal; nothing
 * navigates or toasts success until it says `ok`.
 */
export function CreateCircleScreen() {
  const t = useTranslations('circles');
  const router = useRouter();
  const discoverabilityLabelId = useId();
  const accessLabelId = useId();
  const discoverabilityHelpId = useId();
  const accessHelpId = useId();

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  /*
   * Both default to the design's pre-selected option. Note that `discoverable`
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
   * Turn a server refusal into copy in this namespace, falling back to the
   * generic failure when the classified key has no translation — a toast must
   * never render a raw dot-path at someone.
   */
  const refusalText = (message: string | undefined): string => {
    const key = refusalMessageKey(message, 'create.errors');
    return t.has(key) ? t(key) : t('create.error');
  };

  /*
   * The redesign's headline is new copy, so it is read defensively: until
   * `create.headline` lands in every locale this falls back to the existing
   * title rather than rendering a raw dot-path as the page's <h1>. Same guard
   * as `CategoryBadge` and `VotePanel` use for optional keys.
   */
  const headline = t.has('create.headline')
    ? t('create.headline')
    : t('create.title');

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
      const result = await updateCircleProfile({
        variables: {
          input: {
            circleId,
            ...(avatarUrl ? { avatarUrl } : {}),
            ...(bannerUrl ? { bannerUrl } : {}),
          },
        },
      });

      // Same errorPolicy trap: a refused profile edit resolves. Without this
      // read, a rejected `updateCircleProfile` would report a fully-imaged
      // circle that has no image on it.
      if (!readMutationOutcome(result, (d) => d.updateCircleProfile).ok) {
        return false;
      }
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
      const result = await createCircle({
        variables: {
          input: {
            name: trimmed,
            discoverable,
            joinMode,
          },
        },
      });

      const outcome = readMutationOutcome(result, (d) => d.createCircle);
      if (!outcome.ok) {
        toast.error(refusalText(outcome.message));
        return;
      }

      const circle = result.data?.createCircle;
      // `outcome.ok` already proves `createCircle` came back non-null; this
      // narrows the type and guards the one shape it cannot see — a circle
      // returned without the id the next line navigates to.
      if (!circle?.id) {
        toast.error(t('create.error'));
        return;
      }

      // Steps 2–3. From here the circle exists no matter what happens.
      const imageryAttached = await attachImagery(circle.id);

      if (imageryAttached) {
        toast.success(t('create.success'));
      } else {
        toast.message(t('create.imageFailed'));
      }

      router.push(`/circles/${circle.id}`);
    } catch {
      // Reached only by the failures that genuinely reject: a link-level throw,
      // an aborted request, a protocol error.
      toast.error(t('create.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <header className="mb-8">
        <h1 className="heading-medium text-text-primary">
          {headline}
        </h1>
        <p className="body-small mt-1.5 text-text-secondary">
          {t('create.subtitle')}
        </p>
      </header>

      <form
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
        className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-12"
      >
        {/* LEFT — what the circle is. */}
        <div className="space-y-6">
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
            disabled={submitting}
            errorMessage={nameError}
          />

          <CircleBannerDropzone
            preview={banner.croppedImage}
            disabled={submitting}
            onSelect={banner.handleFileSelect}
            onClear={banner.reset}
          />

          <CircleAvatarPicker
            name={name}
            preview={avatar.croppedImage}
            disabled={submitting}
            onSelect={avatar.handleFileSelect}
            onClear={avatar.reset}
          />
        </div>

        {/* RIGHT — how it behaves. Two independent axes, two fieldsets. */}
        <div className="space-y-8">
          <fieldset className="space-y-3">
            <legend
              id={discoverabilityLabelId}
              className="label-medium text-text-primary"
            >
              {t('create.discoverability.question')}
            </legend>
            <p
              id={discoverabilityHelpId}
              className="caption-small text-text-secondary"
            >
              {t('create.discoverability.help')}
            </p>
            <RadioCardGroup
              aria-labelledby={discoverabilityLabelId}
              aria-describedby={discoverabilityHelpId}
              value={discoverable ? 'yes' : 'no'}
              onValueChange={(value) => setDiscoverable(value === 'yes')}
              disabled={submitting}
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
            <legend
              id={accessLabelId}
              className="label-medium text-text-primary"
            >
              {t('create.access.question')}
            </legend>
            <p id={accessHelpId} className="caption-small text-text-secondary">
              {t('create.access.help')}
            </p>
            <RadioCardGroup
              aria-labelledby={accessLabelId}
              aria-describedby={accessHelpId}
              value={joinMode}
              onValueChange={(value) => setJoinMode(value as CircleJoinMode)}
              disabled={submitting}
            >
              {/*
               * Title from the design's first card, description from its third:
               * both describe this one enum value, and only the third mentions
               * the approval that actually happens.
               */}
              <RadioCard
                value="REQUEST"
                icon={<UserPlus aria-hidden="true" />}
                title={t('create.access.applyLabel')}
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
           * `surface-brand-light` holds the same light blue in both themes, so
           * it is legible only behind `text-text-brand` navy — which is exactly
           * this pair.
           */}
          <p className="body-small flex items-start gap-3 rounded-xl bg-surface-brand-light p-4 text-text-brand">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{t('create.note')}</span>
          </p>

          <ButtonType2
            type="submit"
            size="lg"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? t('create.submitting') : t('create.submit')}
          </ButtonType2>
        </div>
      </form>

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
    </div>
  );
}
