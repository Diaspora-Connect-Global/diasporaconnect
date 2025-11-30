"use client";
import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const AddBankAccount = () => {
  const [country, setCountry] = useState('Ghana');
  const [currency, setCurrency] = useState('Ghana cedis');
  const [bankName, setBankName] = useState('Fidelity Bank');
  const [accountNumber, setAccountNumber] = useState('2100223343213');
  const [accountName, setAccountName] = useState('John Doe');
  const [routingCode, setRoutingCode] = useState('2034542');

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <span className="hover:text-gray-900 cursor-pointer">Payouts</span>
          <span>{'>'}</span>
          <span className="text-gray-900 font-medium">Add bank account</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Payout setup</h1>

        {/* Bank Account Form */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Bank account details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <div className="relative">
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer"
                >
                  <option>Ghana</option>
                  <option>Nigeria</option>
                  <option>Kenya</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <div className="relative">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer"
                >
                  <option>Ghana cedis</option>
                  <option>US Dollars</option>
                  <option>Euros</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Bank name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank name
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
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
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* Account number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account number
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* Routing code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Routing code
              </label>
              <input
                type="text"
                value={routingCode}
                onChange={(e) => setRoutingCode(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
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

export default AddBankAccount;