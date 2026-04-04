import { useState, useMemo } from 'react';
import { useAccounts } from '../hooks/useAccounts';
import { useOwners } from '../hooks/useOwners';
import { useData } from '../context/DataContext';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import AmountDisplay from '../components/common/AmountDisplay';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import Dropdown from '../components/common/Dropdown';
import { formatDate } from '../utils/formatters';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCOUNT_SECTIONS = [
  { key: 'asset',      label: 'Assets',      badgeType: 'income' },
  { key: 'liability',  label: 'Liabilities',  badgeType: 'expense' },
  { key: 'receivable', label: 'Receivables',  badgeType: 'transfer' },
];

const ACCOUNT_TYPES = [
  { value: 'asset',      label: 'Asset' },
  { value: 'liability',  label: 'Liability' },
  { value: 'receivable', label: 'Receivable' },
];

const ACCOUNT_SUB_TYPES = {
  asset:      ['bank', 'cash', 'wallet', 'brokerage', 'savings', 'other'],
  liability:  ['credit_card', 'loan', 'mortgage', 'other'],
  receivable: ['receivable'],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function subTypeLabel(sub) {
  if (!sub) return '';
  return sub.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// AccountTypeBadge — inline colour chip for account type
// ---------------------------------------------------------------------------

function AccountTypeBadge({ type, subType }) {
  const colors = {
    asset:      'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
    liability:  'bg-rose-50 text-rose-600 ring-rose-200/60',
    receivable: 'bg-sky-50 text-sky-700 ring-sky-200/60',
  };
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold ring-1 ${
        colors[type] ?? 'bg-gray-50 text-gray-600 ring-gray-200/60'
      }`}
    >
      {subType ? subTypeLabel(subType) : type}
    </span>
  );
}

// ---------------------------------------------------------------------------
// AccountLedger — displayed inside a modal
// ---------------------------------------------------------------------------

function AccountLedger({ account, ledger }) {
  if (ledger.length === 0) {
    return (
      <EmptyState
        message="No entries yet"
        description="Transactions involving this account will appear here."
        className="py-8"
      />
    );
  }

  return (
    <>
      {/* Mobile card list */}
      <div className="md:hidden -mx-6 divide-y divide-gray-50">
        {ledger.map((entry) => (
          <div key={entry.id} className="flex items-center gap-3 px-6 py-3">
            <span
              className={`inline-block w-9 text-xs font-medium rounded px-1.5 py-0.5 text-center flex-shrink-0 ${
                entry.entry_type === 'DEBIT'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-600'
              }`}
            >
              {entry.entry_type === 'DEBIT' ? 'DR' : 'CR'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm tabular-nums text-gray-700">₹{entry.amount.toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{formatDate(entry.date)}</p>
            </div>
            <AmountDisplay amount={entry.runningBalance} className="text-sm font-semibold flex-shrink-0" />
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto -mx-6 px-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="pb-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-24">Date</th>
              <th className="pb-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Entry</th>
              <th className="pb-2 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide w-28">Amount</th>
              <th className="pb-2 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide w-32">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {ledger.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-2.5 text-gray-400 text-xs whitespace-nowrap">
                  {formatDate(entry.date)}
                </td>
                <td className="py-2.5 text-gray-700 truncate max-w-[180px]">
                  <span
                    className={`inline-block w-12 text-xs font-medium rounded px-1.5 py-0.5 mr-2 text-center ${
                      entry.entry_type === 'DEBIT'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {entry.entry_type === 'DEBIT' ? 'DR' : 'CR'}
                  </span>
                  {entry.transaction_id}
                </td>
                <td className="py-2.5 text-right tabular-nums text-gray-700">
                  ₹{entry.amount.toFixed(2)}
                </td>
                <td className="py-2.5 text-right tabular-nums">
                  <AmountDisplay amount={entry.runningBalance} className="text-sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// AccountForm — add new account (inside a modal)
// ---------------------------------------------------------------------------

function AccountForm({ onSubmit, onCancel, isSaving, ownerOptions, accountTypes }) {
  const firstType = accountTypes[0];
  const firstSub = firstType?.sub_types?.[0];

  const [form, setForm] = useState({
    name: '',
    type_id: firstType ? String(firstType.id) : '',
    sub_type_id: firstSub ? String(firstSub.id) : '',
    currency: 'INR',
    owner: '',
  });
  const [error, setError] = useState('');

  const selectedType = accountTypes.find((t) => String(t.id) === form.type_id);
  const subTypeOptions = selectedType?.sub_types ?? [];

  function handleChange(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-select first sub_type when type changes
      if (field === 'type_id') {
        const subs = accountTypes.find((t) => String(t.id) === value)?.sub_types ?? [];
        next.sub_type_id = subs.length > 0 ? String(subs[0].id) : '';
      }
      return next;
    });
    if (error) setError('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Account name is required.');
      return;
    }
    const payload = {
      name: form.name,
      type: Number(form.type_id),
      currency: form.currency,
      owner: form.owner,
    };
    if (form.sub_type_id) payload.sub_type = Number(form.sub_type_id);
    onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="acc-name">
          Account Name <span className="text-red-500">*</span>
        </label>
        <input
          id="acc-name"
          type="text"
          value={form.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="e.g. HDFC Savings"
          autoFocus
          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm
                     text-gray-700 shadow-sm placeholder-gray-400 focus:border-teal-400
                     focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        />
      </div>

      {/* Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="acc-type">
          Account Type
        </label>
        <select
          id="acc-type"
          value={form.type_id}
          onChange={(e) => handleChange('type_id', e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm
                     text-gray-700 shadow-sm focus:border-teal-500 focus:outline-none
                     focus:ring-2 focus:ring-teal-500/30"
        >
          {accountTypes.map((t) => (
            <option key={t.id} value={String(t.id)}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Sub-type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="acc-subtype">
          Sub-Type
        </label>
        <select
          id="acc-subtype"
          value={form.sub_type_id}
          onChange={(e) => handleChange('sub_type_id', e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm
                     text-gray-700 shadow-sm focus:border-teal-500 focus:outline-none
                     focus:ring-2 focus:ring-teal-500/30"
        >
          {subTypeOptions.map((s) => (
            <option key={s.id} value={String(s.id)}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Owner */}
      {ownerOptions.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="acc-owner">
            Owner
          </label>
          <select
            id="acc-owner"
            value={form.owner}
            onChange={(e) => handleChange('owner', e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm
                       text-gray-700 shadow-sm focus:border-teal-500 focus:outline-none
                       focus:ring-2 focus:ring-teal-500/30"
          >
            <option value="">None (shared)</option>
            {ownerOptions.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
      )}

      {/* Currency */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="acc-currency">
          Currency
        </label>
        <input
          id="acc-currency"
          type="text"
          value={form.currency}
          onChange={(e) => handleChange('currency', e.target.value.toUpperCase())}
          maxLength={3}
          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm
                     text-gray-700 shadow-sm focus:border-teal-500 focus:outline-none
                     focus:ring-2 focus:ring-teal-500/30"
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium
                     text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 rounded-xl bg-teal-600 py-2.5 text-sm font-bold text-white
                     shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2
                     focus:ring-teal-500/50 transition-colors disabled:opacity-60"
        >
          {isSaving ? 'Saving…' : 'Add Account'}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// AccountCard — single account tile
// ---------------------------------------------------------------------------

const ACCOUNT_ICONS = {
  bank:        'M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3',
  cash:        'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  wallet:      'M21 12a2 2 0 00-2-2h-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-2a2 2 0 00-2-2M17 12a1 1 0 110 2 1 1 0 010-2z',
  brokerage:   'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  savings:     'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  credit_card: 'M3 10h18M7 15h.01M11 15h2M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z',
  loan:        'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
  receivable:  'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  other:       'M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z',
};

const ACCOUNT_ICON_COLORS = {
  asset:      'bg-emerald-100 text-emerald-600',
  liability:  'bg-rose-100 text-rose-500',
  receivable: 'bg-sky-100 text-sky-600',
};

function AccountIcon({ type, subType }) {
  const path = ACCOUNT_ICONS[subType] ?? ACCOUNT_ICONS[type] ?? ACCOUNT_ICONS.other;
  const color = ACCOUNT_ICON_COLORS[type] ?? 'bg-gray-100 text-gray-500';
  return (
    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color} flex-shrink-0`}>
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
      </svg>
    </div>
  );
}

function AccountCard({ account, balance, onClick }) {
  return (
    <Card
      onClick={() => onClick(account)}
      className="p-4 flex items-center gap-3.5"
    >
      <AccountIcon type={account.type} subType={account.sub_type} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 truncate">{account.name}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <AccountTypeBadge type={account.type} subType={account.sub_type} />
          {account.owner && (
            <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold ring-1 bg-indigo-50 text-indigo-700 ring-indigo-200/60">
              {account.owner}
            </span>
          )}
          {account.currency && account.currency !== 'INR' && (
            <span className="text-[11px] text-gray-400 font-medium">{account.currency}</span>
          )}
        </div>
      </div>
      <AmountDisplay
        amount={balance}
        variant={
          account.type === 'asset' || account.type === 'receivable' ? 'income' : 'expense'
        }
        className="text-base font-bold flex-shrink-0"
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// AccountSection — titled group of accounts
// ---------------------------------------------------------------------------

function AccountSection({ title, accounts, getBalance, onAccountClick, balanceSummary }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <span className="text-xs font-medium text-gray-400">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</span>
        </div>
        {balanceSummary !== undefined && (
          <AmountDisplay amount={balanceSummary} className="text-sm font-bold" />
        )}
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-10 flex items-center justify-center">
          <p className="text-sm text-gray-400">No {title.toLowerCase()} accounts yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              balance={getBalance(account.id)}
              onClick={onAccountClick}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// AccountsPage
// ---------------------------------------------------------------------------

export default function AccountsPage() {
  const { isLoading, addAccount, accountTypes } = useData();
  const { accountsByType, getAccountBalance, getAccountLedger } = useAccounts();
  const { owners, ownerOptions } = useOwners();

  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [ledgerAccount, setLedgerAccount] = useState(null); // account object | null
  const [ownerFilter, setOwnerFilter] = useState('');

  // Filter accounts by owner when a filter is active
  const filteredByType = useMemo(() => {
    if (!ownerFilter) return accountsByType;
    const result = {};
    for (const key of Object.keys(accountsByType)) {
      result[key] = (accountsByType[key] ?? []).filter(
        (a) => a.owner === ownerFilter
      );
    }
    return result;
  }, [accountsByType, ownerFilter]);

  // Pre-compute section totals
  const assetTotal = useMemo(
    () => (filteredByType.asset ?? []).reduce((sum, a) => sum + getAccountBalance(a.id), 0),
    [filteredByType, getAccountBalance]
  );
  const liabilityTotal = useMemo(
    () => (filteredByType.liability ?? []).reduce((sum, a) => sum + getAccountBalance(a.id), 0),
    [filteredByType, getAccountBalance]
  );
  const receivableTotal = useMemo(
    () => (filteredByType.receivable ?? []).reduce((sum, a) => sum + getAccountBalance(a.id), 0),
    [filteredByType, getAccountBalance]
  );

  const sectionTotals = {
    asset: assetTotal,
    liability: liabilityTotal,
    receivable: receivableTotal,
  };

  // Ledger for selected account
  const ledgerEntries = useMemo(
    () => (ledgerAccount ? getAccountLedger(ledgerAccount.id) : []),
    [ledgerAccount, getAccountLedger]
  );

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function handleAccountClick(account) {
    setLedgerAccount(account);
  }

  async function handleAddAccount(formData) {
    setIsSaving(true);
    try {
      await addAccount({
        ...formData,
        is_active: true,
      });
      setShowAddModal(false);
    } catch (err) {
      console.error('AccountsPage: addAccount failed', err);
    } finally {
      setIsSaving(false);
    }
  }

  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <LoadingSpinner size="h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-sm text-gray-400 mt-1">Manage your financial accounts and track balances.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {owners.length > 0 && (
            <Dropdown
              value={ownerFilter}
              onChange={setOwnerFilter}
              options={ownerOptions}
              className="min-w-[130px]"
            />
          )}
          <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2.5 min-h-[44px]
                     text-sm font-bold text-white shadow-sm hover:bg-teal-700
                     focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          Add Account
        </button>
        </div>
      </div>

      {/* Net worth summary bar */}
      <Card className="p-0 overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
          <div className="p-5">
            <p className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-wider font-semibold">
              Total Assets
            </p>
            <AmountDisplay amount={assetTotal} variant="income" className="text-xl font-bold" />
          </div>
          <div className="p-5">
            <p className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-wider font-semibold">
              Total Liabilities
            </p>
            <AmountDisplay amount={liabilityTotal} variant="expense" className="text-xl font-bold" />
          </div>
          <div className="p-5">
            <p className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-wider font-semibold">
              Receivables
            </p>
            <AmountDisplay amount={receivableTotal} className="text-xl font-bold" />
          </div>
          <div className="p-5 bg-gray-50/50">
            <p className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-wider font-semibold">
              Net Worth
            </p>
            <AmountDisplay
              amount={assetTotal + receivableTotal - liabilityTotal}
              className="text-xl font-bold"
            />
          </div>
        </div>
      </Card>

      {/* Sections */}
      {ACCOUNT_SECTIONS.map(({ key, label }) => (
        <AccountSection
          key={key}
          title={label}
          accounts={filteredByType[key] ?? []}
          getBalance={getAccountBalance}
          onAccountClick={handleAccountClick}
          balanceSummary={sectionTotals[key]}
        />
      ))}

      {/* Add Account modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Account"
        maxWidth="max-w-md"
      >
        <AccountForm
          onSubmit={handleAddAccount}
          onCancel={() => setShowAddModal(false)}
          isSaving={isSaving}
          ownerOptions={owners}
          accountTypes={accountTypes}
        />
      </Modal>

      {/* Account Ledger modal */}
      <Modal
        isOpen={ledgerAccount !== null}
        onClose={() => setLedgerAccount(null)}
        title={ledgerAccount ? `${ledgerAccount.name} — Ledger` : 'Ledger'}
        maxWidth="max-w-lg md:max-w-2xl"
      >
        {ledgerAccount && (
          <div className="flex flex-col gap-4">
            {/* Account meta */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <AccountTypeBadge
                  type={ledgerAccount.type}
                  subType={ledgerAccount.sub_type}
                />
                <span className="text-xs text-gray-400">{ledgerAccount.currency ?? 'INR'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Balance</span>
                <AmountDisplay
                  amount={getAccountBalance(ledgerAccount.id)}
                  variant={
                    ledgerAccount.type === 'liability' ? 'expense' : 'income'
                  }
                  className="text-base font-bold"
                />
              </div>
            </div>

            {/* Entries table */}
            <AccountLedger account={ledgerAccount} ledger={ledgerEntries} />

            <button
              onClick={() => setLedgerAccount(null)}
              className="mt-1 w-full rounded-lg border border-gray-200 py-2.5 text-sm font-medium
                         text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
