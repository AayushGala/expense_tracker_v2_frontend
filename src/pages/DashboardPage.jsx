import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useAccounts } from '../hooks/useAccounts';
import { useOwners } from '../hooks/useOwners';
import { useReports } from '../hooks/useReports';
import { useData } from '../context/DataContext';
import { useTransactions } from '../hooks/useTransactions';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import AmountDisplay from '../components/common/AmountDisplay';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDate, formatINR, transactionTypeLabel } from '../utils/formatters';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BENEFICIARY_OPTIONS = ['All', 'Self', 'Family'];

const PIE_COLORS = [
  '#1e2a30', '#2cbcac', '#7c9ea6', '#c5f1ec',
  '#4a6670', '#a8d8d0', '#34495e', '#5dade2',
  '#85929e', '#48c9b0', '#2c3e50', '#76d7c4',
];

// ---------------------------------------------------------------------------
// Beneficiary toggle
// ---------------------------------------------------------------------------

function BeneficiaryToggle({ value, onChange }) {
  return (
    <div className="inline-flex rounded-xl bg-gray-100 p-1 gap-0.5">
      {BENEFICIARY_OPTIONS.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all
            ${value === opt
              ? 'bg-white text-[#1e2a30] shadow-sm'
              : 'text-gray-400 hover:text-gray-600'
            }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Owner toggle
// ---------------------------------------------------------------------------

function OwnerToggle({ value, onChange, options }) {
  if (options.length === 0) return null;
  const allOptions = ['All', ...options];
  return (
    <div className="inline-flex rounded-xl bg-gray-100 p-1 gap-0.5">
      {allOptions.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all
            ${value === opt
              ? 'bg-white text-[#1e2a30] shadow-sm'
              : 'text-gray-400 hover:text-gray-600'
            }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// NetWorthCard
// ---------------------------------------------------------------------------

function NetWorthCard({ accountsByType, balances, netWorth }) {
  const sum = (accounts) =>
    accounts.reduce((acc, a) => acc + (balances.get(a.id) ?? 0), 0);

  const totalAssets     = sum(accountsByType.asset ?? []);
  const totalReceivable = sum(accountsByType.receivable ?? []);
  const totalLiability  = sum(accountsByType.liability ?? []);

  return (
    <Card className="p-6 flex flex-col gap-4">
      <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
        Net Worth
      </h3>

      <div className="flex items-end gap-2">
        <AmountDisplay amount={netWorth} className="text-3xl font-bold" />
      </div>

      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
        <div>
          <p className="text-[11px] text-gray-400 mb-0.5 font-medium">Assets</p>
          <AmountDisplay amount={totalAssets} variant="income" className="text-sm font-bold" />
        </div>
        <div>
          <p className="text-[11px] text-gray-400 mb-0.5 font-medium">Liabilities</p>
          <AmountDisplay amount={totalLiability} variant="expense" className="text-sm font-bold" />
        </div>
        <div>
          <p className="text-[11px] text-gray-400 mb-0.5 font-medium">Receivable</p>
          <AmountDisplay amount={totalReceivable} className="text-sm font-bold" />
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// MonthlySpendingChart
// ---------------------------------------------------------------------------

function MonthlySpendingChart({ data }) {
  if (!data || data.every((d) => d.total === 0)) {
    return (
      <Card className="p-6 flex flex-col gap-3">
        <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          Monthly Spending
        </h3>
        <EmptyState
          message="No spending data yet"
          description="Add some expense transactions to see your chart."
          className="py-10"
        />
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: new Date(d.month + '-02').toLocaleDateString('en-IN', { month: 'short' }),
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl bg-white ring-1 ring-gray-200 shadow-lg px-3 py-2 text-sm">
        <p className="font-semibold text-gray-700 mb-0.5">{label}</p>
        <p className="text-[#2cbcac] font-bold">{formatINR(payload[0].value)}</p>
      </div>
    );
  };

  return (
    <Card className="p-6 flex flex-col gap-3">
      <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
        Monthly Spending — Last 6 Months
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6' }} />
          <Bar dataKey="total" fill="#1e2a30" radius={[8, 8, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// CategoryPieChart
// ---------------------------------------------------------------------------

function CategoryPieChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <Card className="p-6 flex flex-col gap-3">
        <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          This Month by Category
        </h3>
        <EmptyState
          message="No category data"
          description="Add expense transactions this month to see the breakdown."
          className="py-10"
        />
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl bg-white ring-1 ring-gray-200 shadow-lg px-3 py-2 text-sm">
        <p className="font-semibold text-gray-700">{payload[0].name}</p>
        <p className="text-[#2cbcac] font-bold">{formatINR(payload[0].value)}</p>
      </div>
    );
  };

  return (
    <Card className="p-6 flex flex-col gap-3">
      <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
        This Month by Category
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="categoryName"
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={40}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => (
              <span className="text-xs text-gray-500 font-medium">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// TypeIcon — matches the Transactions tab style
// ---------------------------------------------------------------------------

const TYPE_ICONS = {
  expense: { bg: 'bg-[#1e2a30]', color: 'text-white', path: 'M12 5v14m0 0l6-6m-6 6l-6-6' },
  income: { bg: 'bg-[#c5f1ec]', color: 'text-[#2cbcac]', path: 'M12 19V5m0 0l-6 6m6-6l6 6' },
  transfer: { bg: 'bg-gray-100', color: 'text-gray-500', path: 'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4' },
  bill_payment: { bg: 'bg-[#1e2a30]/10', color: 'text-[#1e2a30]', path: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
  investment: { bg: 'bg-gray-100', color: 'text-gray-500', path: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  cashback: { bg: 'bg-[#c5f1ec]', color: 'text-[#2cbcac]', path: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  split_expense: { bg: 'bg-[#1e2a30]/10', color: 'text-[#1e2a30]', path: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  reimbursement: { bg: 'bg-[#c5f1ec]', color: 'text-[#2cbcac]', path: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6' },
};

function TypeIcon({ type }) {
  const icon = TYPE_ICONS[type] ?? { bg: 'bg-gray-100', color: 'text-gray-500', path: 'M12 6v6m0 0v6m0-6h6m-6 0H6' };
  return (
    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${icon.bg} flex-shrink-0`}>
      <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${icon.color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={icon.path} />
      </svg>
    </div>
  );
}

function getVariant(type) {
  if (type === 'income' || type === 'cashback' || type === 'reimbursement') return 'income';
  if (type === 'expense' || type === 'bill_payment' || type === 'split_expense') return 'expense';
  return 'neutral';
}

// ---------------------------------------------------------------------------
// RecentTransactions
// ---------------------------------------------------------------------------

function RecentTransactions({ transactions }) {
  if (transactions.length === 0) {
    return (
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Recent Activity</h2>
        </div>
        <EmptyState
          message="No transactions yet"
          description="Add your first transaction to get started."
          className="py-10"
        />
      </Card>
    );
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-900">Recent Activity</h2>
        <p className="text-xs text-gray-400">{transactions.length} of {transactions.length}</p>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden divide-y divide-gray-50">
        {transactions.map((txn) => (
          <div key={txn.id} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
            <TypeIcon type={txn.type} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {txn.notes || transactionTypeLabel(txn.type)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatDate(txn.date)}
                {txn.categoryNames?.length > 0 && ` · ${txn.categoryNames[0]}`}
                {txn.platform && ` · ${txn.platform}`}
              </p>
            </div>
            <AmountDisplay
              amount={txn.amount ?? 0}
              variant={getVariant(txn.type)}
              className="text-sm font-bold flex-shrink-0"
            />
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="py-3 pl-5 pr-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Date</th>
              <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Description</th>
              <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 hidden lg:table-cell">Category</th>
              <th className="py-3 px-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">Amount</th>
              <th className="py-3 pl-3 pr-5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 hidden sm:table-cell">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {transactions.map((txn) => (
              <tr key={txn.id} className="hover:bg-gray-50/80 transition-colors">
                <td className="py-4 pl-5 pr-3 whitespace-nowrap">
                  <p className="text-sm font-medium text-gray-700">{formatDate(txn.date)}</p>
                </td>
                <td className="py-4 px-3">
                  <div className="flex items-center gap-3">
                    <TypeIcon type={txn.type} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {txn.notes || transactionTypeLabel(txn.type)}
                      </p>
                      {(txn.accountNames?.length > 0 || txn.platform) && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {[txn.accountNames?.join(' · '), txn.platform].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-3 hidden lg:table-cell">
                  {txn.categoryNames?.length > 0 && (
                    <span className="inline-flex items-center rounded-lg bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 uppercase tracking-wide">
                      {txn.categoryNames[0]}
                    </span>
                  )}
                </td>
                <td className="py-4 px-3 text-right whitespace-nowrap">
                  <AmountDisplay
                    amount={txn.amount ?? 0}
                    variant={getVariant(txn.type)}
                    className="text-sm"
                  />
                </td>
                <td className="py-4 pl-3 pr-5 hidden sm:table-cell">
                  <Badge type={txn.type} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// ReceivablesSummary
// ---------------------------------------------------------------------------

function ReceivablesSummary({ summary }) {
  const { totalOwed, byPerson } = summary;

  return (
    <Card className="p-6 flex flex-col gap-3">
      <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
        Receivables
      </h3>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 font-medium">Total owed to you</p>
        <AmountDisplay amount={totalOwed} variant="income" className="text-lg font-bold" />
      </div>

      {byPerson.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">Nothing outstanding</p>
      ) : (
        <ul className="divide-y divide-gray-100 -mx-6 px-6 mt-1">
          {byPerson.map(({ person, amount }) => (
            <li key={person} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#c5f1ec] flex items-center justify-center text-xs font-bold text-[#1e2a30] uppercase flex-shrink-0">
                  {person.charAt(0)}
                </div>
                <span className="text-sm font-medium text-gray-700">{person}</span>
              </div>
              <AmountDisplay amount={amount} variant="income" className="text-sm" />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// DashboardPage
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { isLoading } = useData();
  const { accountsByType, balances, netWorth, getAccountBalance } = useAccounts();
  const { owners } = useOwners();
  const { monthlySpending, categoryBreakdown, receivablesSummary } = useReports();

  const [beneficiary, setBeneficiary] = useState('All');
  const [ownerFilter, setOwnerFilter] = useState('All');

  const beneficiaryFilter =
    beneficiary === 'All' ? undefined : beneficiary.toLowerCase();
  const ownerValue =
    ownerFilter === 'All' ? undefined : ownerFilter;

  const spendingData = useMemo(
    () => monthlySpending(beneficiaryFilter, 6, ownerValue),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [beneficiaryFilter, ownerValue]
  );

  const categoryData = useMemo(
    () => categoryBreakdown(beneficiaryFilter, undefined, ownerValue),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [beneficiaryFilter, ownerValue]
  );

  const receivables = useMemo(
    () => receivablesSummary(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Filter net worth by owner
  const filteredAccountsByType = useMemo(() => {
    if (!ownerValue) return accountsByType;
    const result = {};
    for (const key of Object.keys(accountsByType)) {
      result[key] = (accountsByType[key] ?? []).filter(
        (a) => a.owner === ownerValue
      );
    }
    return result;
  }, [accountsByType, ownerValue]);

  const filteredNetWorth = useMemo(() => {
    if (!ownerValue) return netWorth;
    const sum = (accounts) =>
      accounts.reduce((acc, a) => acc + (getAccountBalance(a.id) ?? 0), 0);
    const assets = sum(filteredAccountsByType.asset ?? []);
    const receivable = sum(filteredAccountsByType.receivable ?? []);
    const liability = sum(filteredAccountsByType.liability ?? []);
    return assets + receivable - liability;
  }, [ownerValue, filteredAccountsByType, getAccountBalance, netWorth]);

  const filteredBalances = useMemo(() => {
    if (!ownerValue) return balances;
    // Return only balances for accounts matching the owner
    const filtered = new Map();
    for (const [id, balance] of balances) {
      const allAccounts = [
        ...(accountsByType.asset ?? []),
        ...(accountsByType.liability ?? []),
        ...(accountsByType.receivable ?? []),
      ];
      const account = allAccounts.find((a) => a.id === id);
      if (account?.owner === ownerValue) {
        filtered.set(id, balance);
      }
    }
    return filtered;
  }, [ownerValue, balances, accountsByType]);

  const txnFilters = useMemo(
    () => {
      const f = {};
      if (beneficiaryFilter) f.beneficiary = beneficiaryFilter;
      if (ownerValue) f.owner = ownerValue;
      return f;
    },
    [beneficiaryFilter, ownerValue]
  );
  const { filteredTransactions } = useTransactions(txnFilters);
  const recentTxns = filteredTransactions.slice(0, 15);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <LoadingSpinner size="h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Your financial overview at a glance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OwnerToggle value={ownerFilter} onChange={setOwnerFilter} options={owners} />
          <BeneficiaryToggle value={beneficiary} onChange={setBeneficiary} />
        </div>
      </div>

      {/* Top row: net worth + spending chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NetWorthCard
          accountsByType={filteredAccountsByType}
          balances={filteredBalances}
          netWorth={filteredNetWorth}
        />
        <MonthlySpendingChart data={spendingData} />
      </div>

      {/* Middle row: pie chart + receivables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CategoryPieChart data={categoryData} />
        <ReceivablesSummary summary={receivables} />
      </div>

      {/* Bottom: recent transactions (full width) */}
      <RecentTransactions transactions={recentTxns} />
    </div>
  );
}
