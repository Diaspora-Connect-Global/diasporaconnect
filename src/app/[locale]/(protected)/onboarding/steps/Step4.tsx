// steps/Step4.tsx - Phone Number
import React, { useCallback, useMemo } from 'react';
import { FormData } from '../page';
import { MultiStep } from '@/components/custom/multistep';
import { LabelMedium } from '@/components/utils';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { useTranslations } from 'next-intl';
import { CountryCodeSelect } from '@/components/custom/input';
import { COUNTRIES } from '@/data/CountryCodesWithFlags';
import { getRegistrationPhonePlaceholder } from '@/lib/registrationPhonePlaceholder';
import {
    getNationalNumberBounds,
    getRegistrationPhoneInputStatus,
    normalizeNationalPhoneInput,
} from '@/lib/registrationPhoneValidation';

interface Step4Props {
    data: FormData;
    updateData: (data: Partial<FormData>) => void;
    nextStep: () => void;
    prevStep: () => void;
    loading: boolean;
    errorMessage?: string;
}

export const Step4: React.FC<Step4Props> = ({ data, loading, updateData, nextStep, prevStep, errorMessage }) => {
    const t = useTranslations('onboarding');
    const tActions = useTranslations('actions');

    const phonePlaceholder = useMemo(
        () => getRegistrationPhonePlaceholder(data.country),
        [data.country]
    );

    const nationalDigits = useMemo(
        () => normalizeNationalPhoneInput(data.phoneNumber || '', data.countryCode || ''),
        [data.phoneNumber, data.countryCode]
    );

    const phoneInputStatus = useMemo(
        () => getRegistrationPhoneInputStatus(data.countryCode, nationalDigits),
        [data.countryCode, nationalDigits]
    );

    const bounds = useMemo(
        () => getNationalNumberBounds(data.countryCode || ''),
        [data.countryCode]
    );

    const isNextDisabled =
        !data.countryCode || phoneInputStatus !== 'valid';

    const showShortHint =
        Boolean(data.countryCode) &&
        nationalDigits.length > 0 &&
        phoneInputStatus === 'incomplete' &&
        nationalDigits.length < bounds.min;

    const inputRingClass = useMemo(() => {
        if (!data.countryCode || nationalDigits.length === 0) {
            return 'border-border-default';
        }
        if (phoneInputStatus === 'valid') {
            return 'border-emerald-600/70 dark:border-emerald-500/70';
        }
        if (showShortHint) {
            return 'border-amber-600/80 dark:border-amber-500/80';
        }
        return 'border-border-default';
    }, [data.countryCode, nationalDigits.length, phoneInputStatus, showShortHint]);

    const handlePhoneChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (!data.countryCode) {
                return;
            }
            const next = normalizeNationalPhoneInput(
                e.target.value,
                data.countryCode
            );
            updateData({ phoneNumber: next });
        },
        [data.countryCode, updateData]
    );

    const handleCodeChange = (value: string) => {


        // Find the full country object to get the dial code
        const selectedCountry = COUNTRIES.find(country => country.code === value);

        if (selectedCountry) {
            updateData({
                country: selectedCountry.code,
                countryCode: selectedCountry.dial_code
            });
        }
    };

    return (
        <MultiStep
            isLoading={loading}
            stepNumber={4}
            totalSteps={7}
            title={t('phoneVerification.title')}
            subtitle={t('phoneVerification.description')}
            isNextDisabled={isNextDisabled}
            nextButtonText={tActions('sendCode')}
            showBackButton={true}
            showSkipButton={false}
            onNext={() => nextStep()}
            onBack={prevStep}
            errorMessage={errorMessage}
        >
            <div className="w-full">
                <label
                    htmlFor="phoneNumber"
                    className="block text-sm font-medium mb-2"
                >
                    <LabelMedium>
                        {t('phoneVerification.phoneNumber.label')}
                    </LabelMedium>
                </label>





                <InputGroup
                    className={`px-3 py-6 border-1 rounded-sm bg-surface-subtle text-text-primary focus:outline-none focus:ring-0 transition ${inputRingClass}`}
                >
                    <InputGroupAddon>
                        <InputGroupText>
                            <CountryCodeSelect
                                value={data.country}
                                onChange={handleCodeChange}
                                label={t('location.country.label')}

                            />
                        </InputGroupText>
                    </InputGroupAddon>

                    <InputGroupInput
                        id="phoneNumber"
                        inputMode="tel"
                        autoComplete="tel-national"
                        onChange={handlePhoneChange}
                        value={data.phoneNumber || ''}
                        placeholder={phonePlaceholder}
                        aria-invalid={showShortHint}
                        aria-describedby={
                            showShortHint ? 'phone-national-hint' : undefined
                        }
                        className='text-text-primary body-large  px-3 py-6 ml-5 focus:outline-none focus:ring-0 border-0'
                    />
                </InputGroup>
                {showShortHint ? (
                    <p
                        id="phone-national-hint"
                        className="mt-2 text-sm text-amber-800 dark:text-amber-200/90"
                        role="status"
                    >
                        {bounds.min === bounds.max
                            ? t('phoneVerification.phoneNumber.validation.needExact', {
                                  n: bounds.min,
                              })
                            : t('phoneVerification.phoneNumber.validation.needMin', {
                                  min: bounds.min,
                                  max: bounds.max,
                              })}
                    </p>
                ) : null}
            </div>
        </MultiStep>
    );
};