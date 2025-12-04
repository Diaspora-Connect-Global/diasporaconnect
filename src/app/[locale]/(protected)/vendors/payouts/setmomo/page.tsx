"use client";
import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const AddMobileAccount = () => {
  const [selectedProvider, setSelectedProvider] = useState('mtn');
  const [phoneNumber, setPhoneNumber] = useState('24 123 4567');
  const [accountName, setAccountName] = useState('John Doe');

  const providers = [
    { id: 'mtn', name: 'MTN MOMO', logo: '📱', bgColor: 'bg-yellow-500' },
    { id: 'telecel', name: 'TELECEL CASH', logo: '📱', bgColor: 'bg-red-600' },
    { id: 'at', name: 'AT MONEY', logo: '📱', bgColor: 'bg-white border border-gray-300 text-gray-700' },
  ];

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <span className="hover:text-gray-900 cursor-pointer">Payouts</span>
          <span>{'>'}</span>
          <span className="text-gray-900 font-medium">Add mobile account</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Payout setup</h1>

        {/* Mobile Money Form */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">
            Mobile money account details
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
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className={`${provider.bgColor} w-14 h-14 rounded-lg flex items-center justify-center text-2xl mb-3 mx-auto`}>
                    {provider.logo}
                  </div>
                  <p className={`text-xs font-medium text-center ${
                    selectedProvider === provider.id ? 'text-blue-900' : 'text-gray-700'
                  }`}>
                    {provider.name}
                  </p>
                  {selectedProvider === provider.id && (
                    <div className="absolute top-3 right-3 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone number
            </label>
            <div className="flex gap-3">
              <div className="relative w-28">
                <select className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer text-sm">
                  <option>🇬🇭 +233</option>
                  <option>🇳🇬 +234</option>
                  <option>🇰🇪 +254</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="24 123 4567"
                className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          {/* Account name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account name
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex justify-end">
          <button className="bg-blue-900 hover:bg-blue-800 text-white px-8 py-3 rounded-full font-medium transition-colors shadow-lg">
            Save payout method
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMobileAccount;