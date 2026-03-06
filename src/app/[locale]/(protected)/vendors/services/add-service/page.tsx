/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState } from 'react';
import { ChevronDown, Plus, ChevronRight, Minus } from 'lucide-react';
import { useTranslations } from 'next-intl';

type Step = 1 | 2;
type PricingMode = 'single' | 'multiple';

const AddServiceFlow = () => {
  const t = useTranslations('vendors.services');
  const tForm = useTranslations('vendors.services.form');
  const tCommon = useTranslations('common');
  
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [pricingMode, setPricingMode] = useState<PricingMode>('single');
  
  // Step 1 state
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [description, setDescription] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Step 2 - Single pricing state
  const [singlePrice, setSinglePrice] = useState('0.00');
  const [billingType, setBillingType] = useState('');
  const [addExtras, setAddExtras] = useState(false);

  // Step 2 - Multiple pricing state
  const [packages, setPackages] = useState([
    { id: 'basic', name: tForm('basic'), price: '0.00', features: '', duration: '', revisions: 0 },
    { id: 'standard', name: tForm('standard'), price: '0.00', features: '', duration: '', revisions: 0 },
    { id: 'premium', name: tForm('premium'), price: '0.00', features: '', duration: '', revisions: 0 },
  ]);

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
              <button className="px-6 py-2.5 border-2 border-border-brand text-text-brand rounded-full font-medium hover:bg-surface-brand-subtle transition-colors">
                {tForm('saveToDraft')}
              </button>
              <button
                onClick={() => setCurrentStep(2)}
                className="px-8 py-2.5 bg-surface-disabled text-text-secondary rounded-full font-medium cursor-not-allowed"
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
                          <span className="text-lg">🇬🇭</span>
                          <span className="font-medium">GH₵</span>
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
                              <span>🇬🇭</span>
                              <span className="font-medium">GH₵</span>
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
                onClick={() => setCurrentStep(1)}
                className="px-6 py-2.5 border-2 border-border-brand text-text-brand rounded-full font-medium hover:bg-surface-brand-subtle transition-colors"
              >
                {tForm('saveToDraft')}
              </button>
              <div className="flex gap-3">
                <button className="px-6 py-2.5 bg-surface-disabled text-text-secondary rounded-full font-medium hover:bg-surface-disabled transition-colors">
                  {tForm('saveAndAddAnother')}
                </button>
                <button className="px-8 py-2.5 bg-surface-disabled text-text-secondary rounded-full font-medium cursor-not-allowed">
                  {tForm('saveAndPreview')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddServiceFlow;