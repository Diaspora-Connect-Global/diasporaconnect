/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState } from 'react';
import { ChevronDown, Plus, ChevronRight, Minus } from 'lucide-react';

type Step = 1 | 2;
type PricingMode = 'single' | 'multiple';

const AddServiceFlow = () => {
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
    { id: 'basic', name: 'Basic', price: '0.00', features: '', duration: '', revisions: 0 },
    { id: 'standard', name: 'Standard', price: '0.00', features: '', duration: '', revisions: 0 },
    { id: 'premium', name: 'Premium', price: '0.00', features: '', duration: '', revisions: 0 },
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
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <span className="hover:text-gray-900 cursor-pointer">Products</span>
          <span>{'>'}</span>
          <span className="text-gray-900 font-medium">Add a new service</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Add a new service</h1>

        {/* Step 1: Service Details */}
        {currentStep === 1 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-1">Service details</h2>
                <p className="text-sm text-gray-500">Add title, descriptions and images for your service</p>
              </div>
              <span className="text-sm text-gray-500">Step 1 of 2</span>
            </div>

            {/* Service Title */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service title
              </label>
              <input
                type="text"
                value={serviceTitle}
                onChange={(e) => setServiceTitle(e.target.value)}
                placeholder="Enter title for the service you want to provide"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* Service Category */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service category
              </label>
              <div className="relative">
                <select
                  value={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer text-gray-400"
                >
                  <option value="">Select category of the service</option>
                  <option>Web Development</option>
                  <option>Graphic Design</option>
                  <option>Digital Marketing</option>
                  <option>Writing & Translation</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description of the service"
                rows={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
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
                className="inline-flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <>
                    <Plus className="w-6 h-6 text-blue-600 mb-1" />
                    <span className="text-xs text-blue-600 font-medium text-center px-2">
                      Add image of service
                    </span>
                  </>
                )}
              </label>
            </div>

            {/* Buttons */}
            <div className="flex justify-between">
              <button className="px-6 py-2.5 border-2 border-blue-900 text-blue-900 rounded-full font-medium hover:bg-blue-50 transition-colors">
                Save to draft
              </button>
              <button
                onClick={() => setCurrentStep(2)}
                className="px-8 py-2.5 bg-gray-300 text-gray-500 rounded-full font-medium cursor-not-allowed"
              >
                Save and continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Pricing */}
        {currentStep === 2 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-1">Pricing</h2>
                <p className="text-sm text-gray-500">Which best describes your pricing model for your service</p>
              </div>
              <span className="text-sm text-gray-500">Step 2 of 2</span>
            </div>

            {/* Single Pricing Option */}
            <div
              onClick={() => setPricingMode('single')}
              className={`p-5 rounded-xl border-2 mb-4 cursor-pointer transition-all ${
                pricingMode === 'single' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-2">Single pricing</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Set one fixed price for this service. Customers will pay a flat rate based on the unit you choose (per hour, per session, per job, etc.). Ideal for simple services with predictable costs.
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" />
              </div>

              {pricingMode === 'single' && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm flex items-center gap-1">
                          <span className="text-lg">🇬🇭</span>
                          <span className="font-medium">GH₵</span>
                        </span>
                        <input
                          type="text"
                          value={singlePrice}
                          onChange={(e) => setSinglePrice(e.target.value)}
                          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Billing type</label>
                      <div className="relative">
                        <select
                          value={billingType}
                          onChange={(e) => setBillingType(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer text-gray-400"
                        >
                          <option value="">Select the billing type for pricing</option>
                          <option>Per hour</option>
                          <option>Per session</option>
                          <option>Per project</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={addExtras}
                        onChange={(e) => setAddExtras(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Add extra services related to the service you&apos;re providing</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Multiple Package Pricing Option */}
            <div
              onClick={() => setPricingMode('multiple')}
              className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                pricingMode === 'multiple' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-2">Multiple package pricing</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Create multiple pricing tiers for this service. Each package can include different features, durations, or deliverables. This helps customers choose the option that best fits their needs and increases your chances of earning more.
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" />
              </div>

              {pricingMode === 'multiple' && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {packages.map((pkg) => (
                      <div key={pkg.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="font-semibold text-gray-800 capitalize">{pkg.name}</span>
                        </div>
                        
                        <div className="mb-3">
                          <label className="block text-xs text-gray-600 mb-1">Price</label>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs flex items-center gap-1">
                              <span>🇬🇭</span>
                              <span className="font-medium">GH₵</span>
                            </span>
                            <input
                              type="text"
                              value={pkg.price}
                              onChange={(e) => updatePackage(pkg.id, 'price', e.target.value)}
                              className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div className="mb-3">
                          <label className="block text-xs text-gray-600 mb-1">Features Included</label>
                          <textarea
                            value={pkg.features}
                            onChange={(e) => updatePackage(pkg.id, 'features', e.target.value)}
                            placeholder="Enter features that will be included in this package"
                            rows={2}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                        </div>

                        <div className="mb-3">
                          <label className="block text-xs text-gray-600 mb-1">Duration</label>
                          <input
                            type="text"
                            value={pkg.duration}
                            onChange={(e) => updatePackage(pkg.id, 'duration', e.target.value)}
                            placeholder="Enter duration for this package"
                            className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Max number of revisions allowed</label>
                          <div className="flex items-center justify-between gap-2">
                            <button
                              onClick={() => updatePackage(pkg.id, 'revisions', Math.max(0, pkg.revisions - 1))}
                              className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-full hover:bg-gray-50"
                            >
                              <Minus className="w-4 h-4 text-gray-600" />
                            </button>
                            <span className="text-sm font-medium">{pkg.revisions}</span>
                            <button
                              onClick={() => updatePackage(pkg.id, 'revisions', pkg.revisions + 1)}
                              className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-full hover:bg-gray-50"
                            >
                              <Plus className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Add extra services related to the service you&apos;re providing</span>
                  </label>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex justify-between mt-8">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-2.5 border-2 border-blue-900 text-blue-900 rounded-full font-medium hover:bg-blue-50 transition-colors"
              >
                Save to draft
              </button>
              <div className="flex gap-3">
                <button className="px-6 py-2.5 bg-gray-200 text-gray-600 rounded-full font-medium hover:bg-gray-300 transition-colors">
                  Save and add another service
                </button>
                <button className="px-8 py-2.5 bg-gray-300 text-gray-500 rounded-full font-medium cursor-not-allowed">
                  Save and preview
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