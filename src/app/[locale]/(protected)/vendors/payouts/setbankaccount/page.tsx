"use client";
import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ButtonType2 } from '@/components/custom/button';

const AddBankAccount = () => {
  const [country, setCountry] = useState('Ghana');
  const [currency, setCurrency] = useState('Ghana cedis');
  const [bankName, setBankName] = useState('Fidelity Bank');
  const [accountNumber, setAccountNumber] = useState('2100223343213');
  const [accountName, setAccountName] = useState('John Doe');
  const [routingCode, setRoutingCode] = useState('2034542');

  return (
    <div className="min-h-screen bg-surface-brand-subtle dark:bg-background p-6">
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-text-secondary mb-6">
          <span className="hover:text-text-primary cursor-pointer">Payouts</span>
          <span>{'>'}</span>
          <span className="text-text-primary font-medium">Add bank account</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-text-primary mb-8">Payout setup</h1>

        {/* Bank Account Form */}
        <div className="bg-surface-default rounded-2xl p-8 shadow-sm border border-border-subtle">
          <h2 className="text-lg font-semibold text-text-primary mb-6">Bank account details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Country
              </label>
              <div className="relative">
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-3 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-border-brand bg-surface-default appearance-none cursor-pointer"
                >
                  <option>Ghana</option>
                  <option>Nigeria</option>
                  <option>Kenya</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-tertiary pointer-events-none" />
              </div>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Currency
              </label>
              <div className="relative">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-3 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-border-brand bg-surface-default appearance-none cursor-pointer"
                >
                  <option>Ghana cedis</option>
                  <option>US Dollars</option>
                  <option>Euros</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-tertiary pointer-events-none" />
              </div>
            </div>

            {/* Bank name */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Bank name
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-4 py-3 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-border-brand bg-surface-default"
              />
            </div>

            {/* Account name */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Account name
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full px-4 py-3 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-border-brand bg-surface-default"
              />
            </div>

            {/* Account number */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Account number
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full px-4 py-3 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-border-brand bg-surface-default"
              />
            </div>

            {/* Routing code */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Routing code
              </label>
              <input
                type="text"
                value={routingCode}
                onChange={(e) => setRoutingCode(e.target.value)}
                className="w-full px-4 py-3 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-border-brand bg-surface-default"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex justify-end">
          <ButtonType2 size="lg" className="bg-surface-brand hover:opacity-90 shadow-lg">
            Save payout method
          </ButtonType2>
        </div>
      </div>
    </div>
  );
};

export default AddBankAccount;