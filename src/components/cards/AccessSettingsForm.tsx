'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ButtonType1 } from '@/components/custom/button';
import {
  UPDATE_COMMUNITY,
  UPDATE_COMMUNITY_JOIN_POLICY,
} from '@/services/gql/community';
import { UPDATE_ASSOCIATION } from '@/services/gql/associations';
import type {
  JoinPolicy,
  MembershipKind,
  PaymentType,
  Visibility,
} from '@/types/membership';

const SUPPORTED_CURRENCIES = ['GHS', 'USD', 'EUR', 'GBP', 'NGN'] as const;

export interface AccessSettingsFormProps {
  kind: MembershipKind;
  entityId: string;
  initial: {
    visibility: Visibility;
    joinPolicy: JoinPolicy;
    paymentType: PaymentType;
    priceAmount?: number | null;
    priceCurrency?: string | null;
  };
  onSaved?: () => void;
}

interface UpdateCommunityResponse {
  updateCommunity: { success: boolean; errors?: string[] | null };
}

export function AccessSettingsForm({
  kind,
  entityId,
  initial,
  onSaved,
}: AccessSettingsFormProps) {
  const t = useTranslations(
    kind === 'community' ? 'community.settings' : 'association.settings',
  );
  const tCommon = useTranslations('community.settings');

  const [visibility, setVisibility] = React.useState<Visibility>(initial.visibility);
  const [joinPolicy, setJoinPolicy] = React.useState<JoinPolicy>(initial.joinPolicy);
  const [paymentType, setPaymentType] = React.useState<PaymentType>(
    initial.paymentType,
  );
  const [priceAmount, setPriceAmount] = React.useState<string>(
    initial.priceAmount != null ? String(initial.priceAmount / 100) : '',
  );
  const [priceCurrency, setPriceCurrency] = React.useState<string>(
    initial.priceCurrency ?? 'GHS',
  );

  const [updateCommunity, { loading: communityLoading }] =
    useMutation<UpdateCommunityResponse>(UPDATE_COMMUNITY);
  const [updateCommunityJoinPolicy, { loading: cjpLoading }] = useMutation(
    UPDATE_COMMUNITY_JOIN_POLICY,
  );
  const [updateAssociation, { loading: assocLoading }] = useMutation(
    UPDATE_ASSOCIATION,
  );

  const saving = communityLoading || cjpLoading || assocLoading;

  const requiresPayment = joinPolicy === 'PAID';
  const hasPrice = paymentType !== 'NONE';

  const validate = (): string | null => {
    if (requiresPayment && paymentType === 'NONE') {
      return tCommon('validation.paidRequiresPaymentType');
    }
    if (hasPrice) {
      const value = Number(priceAmount);
      if (!Number.isFinite(value) || value <= 0) {
        return tCommon('validation.priceMustBePositive');
      }
      if (!priceCurrency) {
        return tCommon('validation.currencyRequired');
      }
    }
    return null;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    try {
      if (kind === 'community') {
        const res = await updateCommunity({
          variables: {
            id: entityId,
            input: {
              visibility,
              joinPolicy,
            },
          },
        });
        if (res.data?.updateCommunity && !res.data.updateCommunity.success) {
          const errs = res.data.updateCommunity.errors ?? [];
          throw new Error(errs[0] ?? tCommon('toasts.saveFailed'));
        }
        await updateCommunityJoinPolicy({
          variables: {
            input: {
              communityId: entityId,
              joinPolicy,
              paymentType,
              ...(hasPrice
                ? {
                    priceAmount: Math.round(Number(priceAmount) * 100),
                    priceCurrency,
                  }
                : { priceAmount: 0, priceCurrency: null }),
            },
          },
        });
      } else {
        // Association: paymentType/price are not yet persistable until the BE
        // exposes updateAssociationJoinPolicy. We still send visibility +
        // joinPolicy so owners can flag the entity as PAID and the FE can
        // surface badges, then revisit pricing once BE lands.
        await updateAssociation({
          variables: {
            input: {
              id: entityId,
              visibility,
              joinPolicy,
            },
          },
        });
      }

      toast.success(tCommon('toasts.saved'));
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('toasts.saveFailed'));
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface-default rounded-lg shadow-sm p-4 flex flex-col gap-4"
      aria-labelledby="access-settings-heading"
    >
      <h3 id="access-settings-heading" className="text-lg font-semibold text-text-primary">
        {t('title')}
      </h3>

      <fieldset className="flex flex-col gap-2">
        <legend className="label-medium text-text-primary">
          {tCommon('visibility.legend')}
        </legend>
        <RadioGroup
          value={visibility}
          onValueChange={(v) => setVisibility(v as Visibility)}
          className="grid-cols-1 sm:grid-cols-2"
        >
          {(['PUBLIC', 'PRIVATE'] as const).map((value) => (
            <div key={value} className="flex items-center gap-2">
              <RadioGroupItem value={value} id={`visibility-${value}`} />
              <Label htmlFor={`visibility-${value}`} className="body-small">
                {tCommon(`visibility.${value.toLowerCase()}`)}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="label-medium text-text-primary">
          {tCommon('joinPolicy.legend')}
        </legend>
        <RadioGroup
          value={joinPolicy}
          onValueChange={(v) => {
            const next = v as JoinPolicy;
            setJoinPolicy(next);
            if (next !== 'PAID') {
              setPaymentType('NONE');
            } else if (paymentType === 'NONE') {
              setPaymentType('ONE_TIME');
            }
          }}
          className="grid-cols-1 sm:grid-cols-2"
        >
          {(['OPEN', 'APPROVAL', 'INVITE_ONLY', 'PAID'] as const).map((value) => (
            <div key={value} className="flex items-center gap-2">
              <RadioGroupItem value={value} id={`joinPolicy-${value}`} />
              <Label htmlFor={`joinPolicy-${value}`} className="body-small">
                {tCommon(`joinPolicy.${value.toLowerCase()}`)}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </fieldset>

      {requiresPayment && (
        <fieldset className="flex flex-col gap-2">
          <legend className="label-medium text-text-primary">
            {tCommon('paymentType.legend')}
          </legend>
          <RadioGroup
            value={paymentType}
            onValueChange={(v) => setPaymentType(v as PaymentType)}
            className="grid-cols-1 sm:grid-cols-3"
          >
            {(['ONE_TIME', 'SUBSCRIPTION'] as const).map((value) => (
              <div key={value} className="flex items-center gap-2">
                <RadioGroupItem value={value} id={`paymentType-${value}`} />
                <Label htmlFor={`paymentType-${value}`} className="body-small">
                  {tCommon(`paymentType.${value.toLowerCase()}`)}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </fieldset>
      )}

      {hasPrice && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="priceAmount" className="label-medium">
              {tCommon('price.amount')}
            </Label>
            <Input
              id="priceAmount"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={priceAmount}
              onChange={(e) => setPriceAmount(e.target.value)}
              placeholder="0.00"
              aria-describedby="priceAmount-help"
              required
            />
            <span id="priceAmount-help" className="caption-medium text-text-secondary">
              {tCommon('price.helper')}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="priceCurrency" className="label-medium">
              {tCommon('price.currency')}
            </Label>
            <Select value={priceCurrency} onValueChange={setPriceCurrency}>
              <SelectTrigger id="priceCurrency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {kind === 'association' && requiresPayment && (
        <p role="note" className="caption-medium text-text-secondary">
          {tCommon('association.pricingComingSoon')}
        </p>
      )}

      <div className="flex justify-end">
        <ButtonType1 type="submit" disabled={saving}>
          {saving ? tCommon('actions.saving') : tCommon('actions.save')}
        </ButtonType1>
      </div>
    </form>
  );
}

export default AccessSettingsForm;
