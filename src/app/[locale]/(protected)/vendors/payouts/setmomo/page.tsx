"use client";
import React, { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { ChevronDown } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  CREATE_PAYOUT_ACCOUNT,
  MY_PAYOUT_ACCOUNTS,
  type CreatePayoutAccountResponse,
  type CreatePayoutAccountInput,
} from '@/services/gql/payments';

const AddMobileAccount = () => {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('vendors.payouts.momo');
  const tCommon = useTranslations('common');
  const [selectedProvider, setSelectedProvider] = useState('mtn');
  const [phoneNumber, setPhoneNumber] = useState('24 123 4567');
  const [accountName, setAccountName] = useState('John Doe');
  const [countryCode, setCountryCode] = useState('+233');
  const [createPayoutAccount, { loading: saving }] =
    useMutation<CreatePayoutAccountResponse>(CREATE_PAYOUT_ACCOUNT);

  const providers = [
    { id: 'mtn', name: t('mtnMomo'), logo: '📱', bgColor: 'bg-yellow-500' },
    { id: 'telecel', name: t('telecelCash'), logo: '📱', bgColor: 'bg-surface-danger' },
    { id: 'at', name: t('atMoney'), logo: '📱', bgColor: 'bg-surface-default border border-border-subtle text-text-primary' },
  ];

  const handleSave = async () => {
    const sanitized = phoneNumber.replace(/\s+/g, '');
    if (!sanitized || !accountName.trim()) {
      toast.error('Please enter phone number and account name.');
      return;
    }

    const input: CreatePayoutAccountInput = {
      provider: 'HUBTEL',
      account_type: 'MOBILE_MONEY',
      currency: 'GHS',
      account_number: sanitized,
      mobile_number: `${countryCode}${sanitized}`,
      account_name: accountName.trim(),
    };

    try {
      const { data } = await createPayoutAccount({
        variables: { input },
        refetchQueries: [{ query: MY_PAYOUT_ACCOUNTS }],
      });

      if (!data?.createPayoutAccount?.success) {
        toast.error(data?.createPayoutAccount?.message || 'Unable to save payout method.');
        return;
      }

      toast.success('Mobile money payout account saved.');
      router.push(`/${locale}/vendors/payouts`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save payout method.';
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-text-secondary mb-6">
          <span className="hover:text-text-primary cursor-pointer">{t('breadcrumbPayouts')}</span>
          <span>{'>'}</span>
          <span className="text-text-primary font-medium">{t('addMobileAccount')}</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-text-primary mb-8">{t('payoutSetup')}</h1>

        {/* Mobile Money Form */}
        <div className="bg-surface-default rounded-2xl p-8 shadow-sm border border-border-subtle">
          <h2 className="text-lg font-semibold text-text-primary mb-6">
            {t('mobileMoneyDetails')}
          </h2>

          {/* Provider Selection */}
          <div className="mb-8">
            <div className="grid grid-cols-3 gap-4">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => setSelectedProvider(provider.id)}
                  className={`relative p-5 rounded-xl border-2 transition-all ${
                    selectedProvider === provider.id
                      ? 'border-border-brand bg-surface-brand-subtle'
                      : 'border-border-subtle hover:border-border-default bg-surface-default'
                  }`}
                >
                  <div className={`${provider.bgColor} w-14 h-14 rounded-lg flex items-center justify-center text-2xl mb-3 mx-auto`}>
                    {provider.logo}
                  </div>
                  <p className={`text-xs font-medium text-center ${
                    selectedProvider === provider.id ? 'text-text-brand' : 'text-text-primary'
                  }`}>
                    {provider.name}
                  </p>
                  {selectedProvider === provider.id && (
                    <div className="absolute top-3 right-3 w-5 h-5 bg-surface-brand rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Phone number */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-primary mb-2">
              {t('phoneNumber')}
            </label>
            <div className="flex gap-3">
              <div className="relative w-28">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full px-3 py-3 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-border-brand bg-surface-default appearance-none cursor-pointer text-sm"
                  aria-label={tCommon('countryCode')}
                >
                  <option value="+233">🇬🇭 +233</option>
                  <option value="+234">🇳🇬 +234</option>
                  <option value="+254">🇰🇪 +254</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" aria-hidden="true" />
              </div>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder={t('phonePlaceholder')}
                className="flex-1 px-4 py-3 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-border-brand bg-surface-default"
              />
            </div>
          </div>

          {/* Account name */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              {t('accountName')}
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder={t('accountNamePlaceholder')}
              className="w-full px-4 py-3 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-border-brand bg-surface-default"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-surface-brand text-text-text-white hover:opacity-90 px-8 py-3 rounded-full font-medium transition-colors shadow-lg disabled:opacity-60"
          >
            {t('savePayoutMethod')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMobileAccount;