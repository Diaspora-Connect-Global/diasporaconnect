"use client";
import React, { useState } from 'react';
import { Search, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client/react';
import { toast } from 'sonner';
import {
  GET_MY_VENDOR,
  GET_VENDOR_DASHBOARD,
  GET_VENDOR_ELIGIBILITY,
  LIST_VENDOR_ORDERS,
  REQUEST_PAYOUT,
} from '@/services/gql/vendor';
import {
  MY_PAYOUT_ACCOUNTS,
  CREATE_PAYOUT_ACCOUNT,
  SET_PRIMARY_PAYOUT_ACCOUNT,
  MY_PAYMENT_INTENTS,
} from '@/services/gql/payments';
import type {
  GetMyVendorResponse,
  GetVendorDashboardResponse,
  GetVendorEligibilityResponse,
  ListVendorOrdersResponse,
  OrderStatus,
} from '@/services/gql/types/vendor';
import type {
  MyPayoutAccountsResponse,
  CreatePayoutAccountResponse,
  SetPrimaryPayoutAccountResponse,
  MyPaymentIntentsResponse,
} from '@/services/gql/types/payments';
import { handleVendorError } from '@/lib/vendor-error-mapper';
import VendorKycRequiredModal from '@/components/vendors/VendorKycRequiredModal';

interface Transaction {
  id: string;
  transactionId: string;
  date: string;
  type: string;
  amount: string;
}

const PayoutsDashboard = () => {
  const t = useTranslations('vendors.payouts');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [currency, setCurrency] = useState('GHS');
  const [payoutProvider, setPayoutProvider] = useState('MOBILE_MONEY');
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isKycMandatory, setIsKycMandatory] = useState(true);
  const { data: vendorData } = useQuery<GetMyVendorResponse>(GET_MY_VENDOR);
  const { data: dashboardData } = useQuery<GetVendorDashboardResponse>(GET_VENDOR_DASHBOARD);
  const { data: escrowOrdersData } = useQuery<ListVendorOrdersResponse>(LIST_VENDOR_ORDERS, {
    variables: { status: 'IN_PROGRESS', limit: 100, offset: 0 },
  });
  const { data: eligibilityData } = useQuery<GetVendorEligibilityResponse>(GET_VENDOR_ELIGIBILITY);
  const { data: payoutAccountsData } = useQuery<MyPayoutAccountsResponse>(MY_PAYOUT_ACCOUNTS);
  const { data: paymentIntentsData } = useQuery<MyPaymentIntentsResponse>(MY_PAYMENT_INTENTS, {
    variables: { page: currentPage, limit: rowsPerPage },
    fetchPolicy: 'cache-and-network',
  });
  const [requestPayout, { loading: requestingPayout }] = useMutation<{ requestPayout: string }>(REQUEST_PAYOUT);
  const [createPayoutAccount, { loading: creatingPayoutAccount }] =
    useMutation<CreatePayoutAccountResponse>(CREATE_PAYOUT_ACCOUNT);
  const [setPrimaryPayoutAccount, { loading: settingPrimaryPayout }] =
    useMutation<SetPrimaryPayoutAccountResponse>(SET_PRIMARY_PAYOUT_ACCOUNT);
  const canReceivePayout = eligibilityData?.getVendorEligibility?.canReceivePayout ?? false;
  const eligibilityStatus = eligibilityData?.getVendorEligibility?.status;
  const payoutAccounts = payoutAccountsData?.myPayoutAccounts?.payout_accounts ?? [];

  const rawIntents = paymentIntentsData?.myPaymentIntents?.payment_intents ?? [];
  const totalIntentCount = paymentIntentsData?.myPaymentIntents?.total ?? 0;
  const transactions: Transaction[] = rawIntents.map((intent) => ({
    id: intent.id,
    transactionId: intent.id.slice(0, 8),
    date: intent.created_at ? new Date(intent.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
    type: intent.purpose === 'SERVICE_ORDER' ? 'Escrow to wallet' : 'Withdrawal',
    amount: `${intent.currency} ${(intent.gross_amount / 100).toFixed(2)}`,
  }));
  const totalPages = Math.max(1, Math.ceil(totalIntentCount / rowsPerPage));

  const getLocalizedType = (type: string): string => {
    return type === 'Withdrawal' ? t('withdrawal') : t('escrowToWallet');
  };

  const executePayout = async (vendorId: string, amountMajor: number, payoutCurrency: string) => {
    const amount = Math.round(amountMajor * 100);
    const { data } = await requestPayout({
      variables: {
        vendorId,
        amount,
        currency: payoutCurrency,
      },
    });
    if (!data?.requestPayout) {
      toast.error('Failed to request payout');
      return;
    }
    toast.success(`Payout requested: ${data.requestPayout}`);
    setPayoutAmount('');
  };

  const submitPayout = async () => {
    const vendorId = vendorData?.getMyVendor?.id;
    const amountMajor = Number.parseFloat(payoutAmount);
    if (!vendorId) {
      handleVendorError({
        error: new Error('Vendor profile not found'),
        locale,
        router,
      });
      return;
    }
    if (!Number.isFinite(amountMajor) || amountMajor <= 0) {
      toast.error('Enter a valid payout amount');
      return;
    }

    try {
      if (!canReceivePayout) {
        setIsKycMandatory(true);
        setIsKycModalOpen(true);
        toast.error('Payout is unavailable until your vendor account is payout-eligible.');
        return;
      }

      await executePayout(vendorId, amountMajor, currency);
    } catch (error) {
      handleVendorError({
        error,
        locale,
        router,
        openKycModal: () => setIsKycModalOpen(true),
      });
    }
  };

  const handleAddPayoutMethod = async () => {
    if (payoutProvider === 'BANK_ACCOUNT') {
      router.push(`/${locale}/vendors/payouts/setbankaccount`);
      return;
    }

    if (payoutProvider === 'MOBILE_MONEY') {
      router.push(`/${locale}/vendors/payouts/setmomo`);
      return;
    }

    try {
      const { data } = await createPayoutAccount({
        variables: {
          input: {
            provider: payoutProvider,
            account_type: payoutProvider,
            currency,
            account_number: '',
            account_name: '',
          },
        },
        refetchQueries: [{ query: MY_PAYOUT_ACCOUNTS }, { query: GET_VENDOR_ELIGIBILITY }],
      });

      if (!data?.createPayoutAccount?.payout_account?.id) {
        toast.error('Unable to add payout account');
        return;
      }

      toast.success('Payout account added');
    } catch (error) {
      handleVendorError({
        error,
        locale,
        router,
      });
    }
  };

  const handleSetPrimary = async (accountId: string) => {
    try {
      const { data } = await setPrimaryPayoutAccount({
        variables: { payout_account_id: accountId },
        refetchQueries: [{ query: MY_PAYOUT_ACCOUNTS }, { query: GET_VENDOR_ELIGIBILITY }],
      });
      if (!data?.setPrimaryPayoutAccount?.success) {
        toast.error('Failed to set primary payout account');
        return;
      }
      toast.success('Primary payout account updated');
    } catch (error) {
      handleVendorError({
        error,
        locale,
        router,
      });
    }
  };

  return (
    <div className="min-h-screen  p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <h1 className="text-3xl font-bold text-text-primary mb-6">{t('title')}</h1>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Wallet Balance Card */}
          <div className="bg-surface-default rounded-2xl p-6 shadow-sm border border-border-subtle">
            <p className="text-sm text-text-secondary mb-2">{t('walletBalance')}</p>
            <p className="text-4xl font-bold text-text-primary mb-4">
              {dashboardData?.getVendorDashboard
                ? `${currency} ${(dashboardData.getVendorDashboard.totalEarnings / 100).toFixed(2)}`
                : '—'}
            </p>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <input
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount"
                className="px-3 py-2 border border-border-subtle rounded-lg"
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="px-3 py-2 border border-border-subtle rounded-lg"
              >
                <option value="GHS">GHS</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <button
              onClick={submitPayout}
              disabled={requestingPayout}
              className="bg-surface-brand text-text-white hover:opacity-90 px-6 py-2.5 rounded-full font-medium transition-colors disabled:opacity-50"
            >
              {t('withdraw')}
            </button>
            {!canReceivePayout && (
              <p className="text-xs text-text-warning mt-2">
                Payouts are unavailable until your account is payout-ready. Status: {eligibilityStatus ?? 'UNKNOWN'}
              </p>
            )}
          </div>

          {/* Escrow Account Card */}
          <div className="bg-surface-default rounded-2xl p-6 shadow-sm border border-border-subtle">
            <p className="text-sm text-text-secondary mb-2">{t('escrowAccount')}</p>
            <p className="text-4xl font-bold text-text-tertiary mb-2">
              {currency}{' '}
              {(
                (escrowOrdersData?.listVendorOrders.items ?? []).reduce(
                  (sum, o) => sum + (o.totalAmount ?? 0),
                  0
                ) / 100
              ).toFixed(2)}
            </p>
            <p className="text-xs text-text-brand">
              {t('escrowDescription')}
            </p>
          </div>
        </div>

        {/* Payout Method Card */}
        <div className="bg-surface-default rounded-2xl p-6 shadow-sm border border-border-subtle mb-8">
          <p className="text-base font-semibold text-text-primary mb-2">{t('payoutMethod')}</p>
          <p className="text-sm text-text-secondary mb-4">{t('payoutMethodDescription')}</p>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <select
              value={payoutProvider}
              onChange={(e) => setPayoutProvider(e.target.value)}
              className="px-3 py-2 border border-border-subtle rounded-lg"
            >
              <option value="MOBILE_MONEY">MOBILE_MONEY</option>
              <option value="BANK_ACCOUNT">BANK_ACCOUNT</option>
              <option value="PAYPAL">PAYPAL</option>
              <option value="STRIPE_CONNECT">STRIPE_CONNECT</option>
            </select>
            <button
              onClick={handleAddPayoutMethod}
              disabled={creatingPayoutAccount}
              className="bg-surface-brand text-text-white hover:opacity-90 px-6 py-2.5 rounded-full font-medium transition-colors disabled:opacity-50"
            >
              {t('addPayoutMethod')}
            </button>
          </div>

          {payoutAccounts.length > 0 ? (
            <div className="space-y-2">
              {payoutAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between border border-border-subtle rounded-lg p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {account.provider} · {account.currency}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {account.last4 ? `····${account.last4}` : account.account_name ?? ''}
                      {account.is_primary ? ' · Primary' : ''}
                    </p>
                  </div>
                  {!account.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(account.id)}
                      disabled={settingPrimaryPayout}
                      className="text-sm text-text-brand hover:underline disabled:opacity-50"
                    >
                      Set primary
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No payout accounts yet.</p>
          )}
        </div>

        {/* History Section */}
        <div className="bg-surface-default rounded-2xl shadow-sm border border-border-subtle overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold text-text-primary mb-4">{t('history')}</h2>

            {/* Search and Filter */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-5 h-5" aria-hidden="true" />
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-border-brand bg-surface-default"
                />
              </div>

              <button className="flex items-center gap-2 px-4 py-2.5 border border-border-subtle rounded-lg hover:bg-surface-subtle transition-colors bg-surface-default" aria-label={t('allTime')}>
                <Calendar className="w-5 h-5 text-text-secondary" aria-hidden="true" />
                <span className="text-sm text-text-primary">{t('allTime')}</span>
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-subtle border-b border-border-subtle">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-text-primary">{t('transactionId')}</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-text-primary">{t('date')}</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-text-primary">{t('transactionType')}</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-text-primary">{t('amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-border-subtle hover:bg-surface-subtle transition-colors">
                      <td className="px-6 py-4 text-sm text-text-primary">{transaction.transactionId}</td>
                      <td className="px-6 py-4 text-sm text-text-secondary">{transaction.date}</td>
                      <td className="px-6 py-4 text-sm text-text-primary">{getLocalizedType(transaction.type)}</td>
                      <td className="px-6 py-4 text-sm text-text-primary font-medium text-right">{transaction.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">{t('rowsPerPage')}</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  className="px-3 py-1.5 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-border-brand bg-surface-default cursor-pointer text-sm"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm text-text-secondary">
                  {t('page', { current: currentPage, total: totalPages })}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-surface-subtle disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label={tCommon('previousPage')}
                  >
                    <ChevronLeft className="w-5 h-5 text-text-secondary" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-surface-subtle disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label={tCommon('nextPage')}
                  >
                    <ChevronRight className="w-5 h-5 text-text-secondary" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <VendorKycRequiredModal
        open={isKycModalOpen}
        mandatory={isKycMandatory}
        onClose={() => {
          setIsKycModalOpen(false);
        }}
      />
    </div>
  );
};

export default PayoutsDashboard;