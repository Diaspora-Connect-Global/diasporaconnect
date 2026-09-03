/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState } from 'react';
import { ChevronDown, Plus, ChevronRight, Minus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client/react';
import { toast } from 'sonner';
import {
  ADD_MILESTONE,
  CREATE_SERVICE_PACKAGE,
  GET_MY_VENDOR,
  PUBLISH_SERVICE_PACKAGE,
} from '@/services/gql/vendor';
import type { GetMyVendorResponse } from '@/services/gql/types/vendor';
import { handleVendorError } from '@/lib/vendor-error-mapper';
import VendorKycRequiredModal from '@/components/vendors/VendorKycRequiredModal';
import { CURRENCIES } from '@/types/money';
import { readMutationOutcome, refusalMessageKey } from '@/lib/mutationOutcome';

type Step = 1 | 2;
type PricingMode = 'single' | 'multiple';

const AddServiceFlow = () => {
  const t = useTranslations('vendors.services');
  const tForm = useTranslations('vendors.services.form');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('vendors.errors');
  const locale = useLocale();
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [pricingMode, setPricingMode] = useState<PricingMode>('single');
  
  // Step 1 state
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [description, setDescription] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Step 2 - Single pricing state
  const [singlePrice, setSinglePrice] = useState('0.00');
  const [currency, setCurrency] = useState('GHS');
  const [billingType, setBillingType] = useState('');
  const [addExtras, setAddExtras] = useState(false);

  // Step 2 - Multiple pricing state
  const [packages, setPackages] = useState([
    { id: 'basic', name: tForm('basic'), price: '0.00', features: '', duration: '', revisions: 0 },
    { id: 'standard', name: tForm('standard'), price: '0.00', features: '', duration: '', revisions: 0 },
    { id: 'premium', name: tForm('premium'), price: '0.00', features: '', duration: '', revisions: 0 },
  ]);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const { data: vendorData } = useQuery<GetMyVendorResponse>(GET_MY_VENDOR);
  const vendorId = vendorData?.getMyVendor?.id;
  const [createServicePackage, { loading: creatingPackage }] = useMutation<{ createServicePackage: string }>(CREATE_SERVICE_PACKAGE);
  const [addMilestone] = useMutation<{ addMilestone: string }>(ADD_MILESTONE);
  const [publishServicePackage, { loading: publishingPackage }] = useMutation<{ publishServicePackage: boolean }>(PUBLISH_SERVICE_PACKAGE);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const updatePackage = (id: string, field: string, value: any) => {
    setPackages(packages.map(pkg => 
      pkg.id === id ? { ...pkg, [field]: value } : pkg
    ));
  };

  const parseEstimatedDuration = () => {
    const candidate = pricingMode === 'single' ? billingType : packages[0]?.duration ?? '';
    const parsed = Number.parseInt(candidate.replace(/\D/g, ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
  };

  const deriveBasePrice = () => {
    if (pricingMode === 'single') {
      return Number.parseFloat(singlePrice) || 0;
    }
    const prices = packages.map((pkg) => Number.parseFloat(pkg.price) || 0).filter((value) => value > 0);
    return prices[0] ?? 0;
  };

  const createDraftServicePackage = async (): Promise<string | null> => {
    if (!vendorId) {
      handleVendorError({
        error: new Error('Vendor profile not found'),
        locale,
        router,
      });
      return null;
    }
    if (!serviceTitle.trim() || !description.trim()) {
      toast.error('Please add a title and description');
      return null;
    }

    const basePrice = deriveBasePrice();
    if (basePrice <= 0) {
      toast.error('Please add a valid price');
      return null;
    }

    const result = await createServicePackage({
      variables: {
        vendorId,
        title: serviceTitle.trim(),
        description: description.trim(),
        basePrice: Math.round(basePrice * 100),
        currency,
        estimatedDuration: parseEstimatedDuration(),
        benefits:
          pricingMode === 'multiple'
            ? packages.filter((pkg) => pkg.features.trim()).map((pkg) => `${pkg.name}: ${pkg.features}`)
            : [],
      },
    });

    const outcome = readMutationOutcome(result, (d) => d.createServicePackage);
    if (!outcome.ok) {
      toast.error(tErrors(refusalMessageKey(outcome.message, 'vendors.errors')));
      return null;
    }

    return result.data?.createServicePackage ?? null;
  };

  const createMilestonesForPackage = async (packageId: string) => {
    if (pricingMode === 'multiple') {
      const activePackages = packages.filter((pkg) => Number.parseFloat(pkg.price) > 0);
      const total = activePackages.reduce((sum, pkg) => sum + (Number.parseFloat(pkg.price) || 0), 0) || 1;
      let allocated = 0;

      for (let index = 0; index < activePackages.length; index += 1) {
        const pkg = activePackages[index];
        const isLast = index === activePackages.length - 1;
        const rawPercent = ((Number.parseFloat(pkg.price) || 0) / total) * 100;
        const percent = isLast ? Number((100 - allocated).toFixed(2)) : Number(rawPercent.toFixed(2));
        allocated += percent;
        await addMilestone({
          variables: {
            packageId,
            title: `${pkg.name} package`,
            description: pkg.features || `Deliverables for ${pkg.name}`,
            percentageOfTotal: percent,
            estimatedDays: Number.parseInt(pkg.duration.replace(/\D/g, ''), 10) || 7,
            deliverables: pkg.features ? [pkg.features] : [`${pkg.name} deliverable`],
            order: index + 1,
          },
        });
      }
      return;
    }

    await addMilestone({
      variables: {
        packageId,
        title: 'Delivery',
        description: description || 'Service delivery',
        percentageOfTotal: 100,
        estimatedDays: parseEstimatedDuration(),
        deliverables: [serviceTitle || 'Service deliverable'],
        order: 1,
      },
    });
  };

  return (
    <div className="min-h-screen  p-6">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-text-secondary mb-6">
          <span className="hover:text-text-primary cursor-pointer">{t('breadcrumbProducts')}</span>
          <span>{'>'}</span>
          <span className="text-text-primary font-medium">{t('addNewService')}</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-text-primary mb-8">{t('addNewService')}</h1>

        {/* Step 1: Service Details */}
        {currentStep === 1 && (
          <div className="bg-surface-default rounded-2xl p-8 shadow-sm border border-border-subtle">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-1">{tForm('serviceDetails')}</h2>
                <p className="text-sm text-text-secondary">{tForm('serviceDetailsDescription')}</p>
              </div>
              <span className="text-sm text-text-secondary">{tForm('step', { current: 1, total: 2 })}</span>
            </div>

            {/* Service Title */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-primary mb-2">
                {tForm('serviceTitle')}
              </label>
              <input
                type="text"
                value={serviceTitle}
                onChange={(e) => setServiceTitle(e.target.value)}
                placeholder={tForm('serviceTitlePlaceholder')}
                className="w-full px-4 py-3 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-border-brand bg-surface-default"
              />
            </div>

            {/* Service Category */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-primary mb-2">
                {tForm('serviceCategory')}
              </label>
              <div className="relative">
                <select
                  value={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-border-brand bg-surface-default appearance-none cursor-pointer text-text-tertiary"
                >
                  <option value="">{tForm('serviceCategoryPlaceholder')}</option>
                  <option>{tForm('webDevelopment')}</option>
                  <option>{tForm('graphicDesign')}</option>
                  <option>{tForm('digitalMarketing')}</option>
                  <option>{tForm('writingTranslation')}</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-tertiary pointer-events-none" aria-hidden="true" />
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-primary mb-2">
                {tForm('description')}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={tForm('descriptionPlaceholder')}
                rows={6}
                className="w-full px-4 py-3 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-border-brand bg-surface-default resize-none"
              />
            </div>

            {/* Image Upload */}
            <div className="mb-8">
              <input
                type="file"
                id="image-upload"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <label
                htmlFor="image-upload"
                className="inline-flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-border-brand rounded-lg cursor-pointer hover:border-border-brand hover:bg-surface-brand-subtle transition-colors"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt={tForm('preview')} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <>
                    <Plus className="w-6 h-6 text-text-brand mb-1" aria-hidden="true" />
                    <span className="text-xs text-text-brand font-medium text-center px-2">
                      {tForm('addImageOfService')}
                    </span>
                  </>
                )}
              </label>
            </div>

            {/* Buttons */}
            <div className="flex justify-between">
              <button
                onClick={async () => {
                  try {
                    const packageId = await createDraftServicePackage();
                    if (!packageId) return;
                    toast.success(tForm('saveToDraft'));
                  } catch (error) {
                    handleVendorError({
                      error,
                      locale,
                      router,
                      openKycModal: () => setIsKycModalOpen(true),
                    });
                  }
                }}
                className="px-6 py-2.5 border-2 border-border-brand text-text-brand rounded-full font-medium hover:bg-surface-brand-subtle transition-colors"
              >
                {tForm('saveToDraft')}
              </button>
              <button
                onClick={() => setCurrentStep(2)}
                className="px-8 py-2.5 bg-surface-brand text-text-white rounded-full font-medium"
              >
                {tForm('saveAndContinue')}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Pricing */}
        {currentStep === 2 && (
          <div className="bg-surface-default rounded-2xl p-8 shadow-sm border border-border-subtle">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-1">{tForm('pricing')}</h2>
                <p className="text-sm text-text-secondary">{tForm('pricingDescription')}</p>
              </div>
              <span className="text-sm text-text-secondary">{tForm('step', { current: 2, total: 2 })}</span>
            </div>

            {/* Settlement currency (applies to all packages) */}
            <div className="mb-6 max-w-xs">
              <label className="block text-sm font-medium text-text-primary mb-2">Currency</label>
              <div className="relative">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-border-brand bg-surface-default appearance-none cursor-pointer"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-tertiary pointer-events-none" aria-hidden="true" />
              </div>
            </div>

            {/* Single Pricing Option */}
            <div
              onClick={() => setPricingMode('single')}
              className={`p-5 rounded-xl border-2 mb-4 cursor-pointer transition-all ${
                pricingMode === 'single' ? 'border-border-brand bg-surface-brand-subtle' : 'border-border-subtle hover:border-border-subtle'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-text-primary mb-2">{tForm('singlePricing')}</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {tForm('singlePricingDescription')}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-text-tertiary ml-4 flex-shrink-0" aria-hidden="true" />
              </div>

              {pricingMode === 'single' && (
                <div className="mt-6 pt-6 border-t border-border-subtle">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">{tForm('price')}</label>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-2 bg-surface-subtle border border-border-subtle rounded-lg text-sm flex items-center gap-1">
                          <span className="font-medium">{currency}</span>
                        </span>
                        <input
                          type="text"
                          value={singlePrice}
                          onChange={(e) => setSinglePrice(e.target.value)}
                          className="flex-1 px-4 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-border-brand"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">{tForm('billingType')}</label>
                      <div className="relative">
                        <select
                          value={billingType}
                          onChange={(e) => setBillingType(e.target.value)}
                          className="w-full px-4 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-border-brand bg-surface-default appearance-none cursor-pointer text-text-tertiary"
                        >
                          <option value="">{tForm('billingTypePlaceholder')}</option>
                          <option>{tForm('perHour')}</option>
                          <option>{tForm('perSession')}</option>
                          <option>{tForm('perProject')}</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-tertiary pointer-events-none" aria-hidden="true" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={addExtras}
                        onChange={(e) => setAddExtras(e.target.checked)}
                        className="w-4 h-4 text-text-brand border-border-subtle rounded focus:ring-border-brand"
                      />
                      <span className="text-sm text-text-primary">{tForm('addExtras')}</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Multiple Package Pricing Option */}
            <div
              onClick={() => setPricingMode('multiple')}
              className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                pricingMode === 'multiple' ? 'border-border-brand bg-surface-brand-subtle' : 'border-border-subtle hover:border-border-subtle'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-text-primary mb-2">{tForm('multiplePackagePricing')}</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {tForm('multiplePackagePricingDescription')}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-text-tertiary ml-4 flex-shrink-0" aria-hidden="true" />
              </div>

              {pricingMode === 'multiple' && (
                <div className="mt-6 pt-6 border-t border-border-subtle">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {packages.map((pkg) => (
                      <div key={pkg.id} className="border border-border-subtle rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-text-brand border-border-subtle rounded focus:ring-border-brand"
                          />
                          <span className="font-semibold text-text-primary capitalize">{pkg.name}</span>
                        </div>
                        
                        <div className="mb-3">
                          <label className="block text-xs text-text-secondary mb-1">{tForm('price')}</label>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-surface-subtle border border-border-subtle rounded text-xs flex items-center gap-1">
                              <span className="font-medium">{currency}</span>
                            </span>
                            <input
                              type="text"
                              value={pkg.price}
                              onChange={(e) => updatePackage(pkg.id, 'price', e.target.value)}
                              className="flex-1 px-2 py-1 border border-border-subtle rounded text-sm focus:outline-none focus:ring-2 focus:ring-border-brand"
                            />
                          </div>
                        </div>

                        <div className="mb-3">
                          <label className="block text-xs text-text-secondary mb-1">{tForm('featuresIncluded')}</label>
                          <textarea
                            value={pkg.features}
                            onChange={(e) => updatePackage(pkg.id, 'features', e.target.value)}
                            placeholder={tForm('featuresPlaceholder')}
                            rows={2}
                            className="w-full px-2 py-1 border border-border-subtle rounded text-xs focus:outline-none focus:ring-2 focus:ring-border-brand resize-none"
                          />
                        </div>

                        <div className="mb-3">
                          <label className="block text-xs text-text-secondary mb-1">{tForm('duration')}</label>
                          <input
                            type="text"
                            value={pkg.duration}
                            onChange={(e) => updatePackage(pkg.id, 'duration', e.target.value)}
                            placeholder={tForm('durationPlaceholder')}
                            className="w-full px-2 py-1 border border-border-subtle rounded text-xs focus:outline-none focus:ring-2 focus:ring-border-brand"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-text-secondary mb-1">{tForm('maxRevisions')}</label>
                          <div className="flex items-center justify-between gap-2">
                            <button
                              onClick={() => updatePackage(pkg.id, 'revisions', Math.max(0, pkg.revisions - 1))}
                              className="w-8 h-8 flex items-center justify-center border border-border-subtle rounded-full hover:bg-surface-subtle"
                              aria-label={tCommon('decreaseRevisions')}
                            >
                              <Minus className="w-4 h-4 text-text-secondary" />
                            </button>
                            <span className="text-sm font-medium">{pkg.revisions}</span>
                            <button
                              onClick={() => updatePackage(pkg.id, 'revisions', pkg.revisions + 1)}
                              className="w-8 h-8 flex items-center justify-center border border-border-subtle rounded-full hover:bg-surface-subtle"
                              aria-label={tCommon('increaseRevisions')}
                            >
                              <Plus className="w-4 h-4 text-text-secondary" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-text-brand border-border-subtle rounded focus:ring-border-brand"
                    />
                    <span className="text-sm text-text-primary">{tForm('addExtras')}</span>
                  </label>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex justify-between mt-8">
              <button
                onClick={async () => {
                  try {
                    const packageId = await createDraftServicePackage();
                    if (!packageId) return;
                    toast.success(tForm('saveToDraft'));
                    setCurrentStep(1);
                  } catch (error) {
                    handleVendorError({
                      error,
                      locale,
                      router,
                      openKycModal: () => setIsKycModalOpen(true),
                    });
                  }
                }}
                className="px-6 py-2.5 border-2 border-border-brand text-text-brand rounded-full font-medium hover:bg-surface-brand-subtle transition-colors"
              >
                {tForm('saveToDraft')}
              </button>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    try {
                      const packageId = await createDraftServicePackage();
                      if (!packageId) return;
                      toast.success(tForm('saveAndAddAnother'));
                      setServiceTitle('');
                      setServiceCategory('');
                      setDescription('');
                      setSinglePrice('0.00');
                      setCurrency('GHS');
                      setBillingType('');
                    } catch (error) {
                    handleVendorError({
                      error,
                      locale,
                      router,
                      openKycModal: () => setIsKycModalOpen(true),
                    });
                    }
                  }}
                  className="px-6 py-2.5 bg-surface-disabled text-text-secondary rounded-full font-medium hover:bg-surface-disabled transition-colors"
                >
                  {tForm('saveAndAddAnother')}
                </button>
                <button
                  onClick={async () => {
                    try {
                      const packageId = await createDraftServicePackage();
                      if (!packageId) return;
                      await createMilestonesForPackage(packageId);
                      const publishResult = await publishServicePackage({ variables: { packageId } });
                      const publishOutcome = readMutationOutcome(publishResult, (d) => d.publishServicePackage);
                      if (!publishOutcome.ok) {
                        toast.error(tErrors(refusalMessageKey(publishOutcome.message, 'vendors.errors')));
                        return;
                      }
                      toast.success(tForm('servicePackagePublished'));
                    } catch (error) {
                    handleVendorError({
                      error,
                      locale,
                      router,
                      openKycModal: () => setIsKycModalOpen(true),
                    });
                    }
                  }}
                  disabled={creatingPackage || publishingPackage}
                  className="px-8 py-2.5 bg-surface-brand text-text-white rounded-full font-medium disabled:opacity-60"
                >
                  {tForm('saveAndPreview')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <VendorKycRequiredModal
        open={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
      />
    </div>
  );
};

export default AddServiceFlow;