'use client';

import { useId, useState, type FormEvent } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff, Mail, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { RadioCard, RadioCardGroup } from '@/components/circles/primitives';
import { ButtonType2 } from '@/components/custom/button';
import { TextInput } from '@/components/custom/input';
import { useRouter } from '@/i18n/navigation';
import { CREATE_CIRCLE } from '@/services/gql/circles';
import type {
  CircleJoinMode,
  CreateCircleData,
} from '@/services/gql/types/circles';

import { CircleBannerField } from './CircleBannerField';

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

  const [createCircle, { loading }] = useMutation<CreateCircleData>(
    CREATE_CIRCLE,
    {
      onCompleted: (data) => {
        const circle = data?.createCircle;
        if (!circle?.id) return;
        toast.success(t('create.success'));
        router.push(`/circles/${circle.id}`);
      },
      onError: () => toast.error(t('create.error')),
    },
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(t('create.nameRequired'));
      return;
    }
    setNameError(undefined);

    void createCircle({
      variables: {
        input: {
          name: trimmed,
          discoverable,
          joinMode,
        },
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
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

      <CircleBannerField />

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

      <ButtonType2 type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? t('create.submitting') : t('create.submit')}
      </ButtonType2>
    </form>
  );
}
