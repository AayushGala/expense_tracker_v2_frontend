import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Card from '../common/Card';
import Dropdown from '../common/Dropdown';
import { useReports } from '../../hooks/useReports';
import { useOwners } from '../../hooks/useOwners';
import { useTransactions } from '../../hooks/useTransactions';
import { useData } from '../../context/DataContext';
import { formatINR, formatDate } from '../../utils/formatters';
import { categoryOptions } from '../../utils/formStyles';

function shortMonth(monthKey) {
  const [year, month] = monthKey.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-4 py-2 text-sm">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      <p className="text-accent font-semibold">{formatINR(payload[0].value)}</p>
    </div>
  );
}

export default function SpendingTrends() {
  const { spendingTrends } = useReports();
  const { categories } = useData();
  const { owners, ownerOptions } = useOwners();

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  );

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedOwner, setSelectedOwner] = useState('');

  const data = useMemo(
    () =>
      spendingTrends(selectedCategory || undefined, 12, selectedOwner || undefined).map((d) => ({
        ...d,
        label: shortMonth(d.month),
      })),
    [spendingTrends, selectedCategory, selectedOwner]
  );

  const total = useMemo(() => data.reduce((s, d) => s + d.total, 0), [data]);
  const nonZero = data.filter((d) => d.total > 0);
  const avg = nonZero.length ? total / nonZero.length : 0;
  const peak = useMemo(() => Math.max(0, ...data.map((d) => d.total)), [data]);

  // Transaction list — filtered by type=expense, optionally by category and owner
  const txnFilters = useMemo(() => {
    const f = { type: 'expense' };
    if (selectedCategory) f.categoryId = selectedCategory;
    if (selectedOwner) f.owner = selectedOwner;
    return f;
  }, [selectedCategory, selectedOwner]);

  const { filteredTransactions } = useTransactions(txnFilters);

  const categoryName = useMemo(
    () => categories.find((c) => c.id === selectedCategory)?.name ?? null,
    [categories, selectedCategory]
  );

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 min-h-[44px]">
        <h2 className="text-base font-bold text-gray-900 flex-1">Spending</h2>
        {owners.length > 0 && (
          <Dropdown
            value={selectedOwner}
            onChange={setSelectedOwner}
            options={ownerOptions}
            className="min-w-[130px]"
          />
        )}
        <Dropdown
          value={selectedCategory}
          onChange={setSelectedCategory}
          options={[
            { value: '', label: 'All categories' },
            ...categoryOptions(expenseCategories),
          ]}
          className="min-w-[180px]"
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '12-month total', value: formatINR(total) },
          { label: nonZero.length === data.length ? 'Monthly average' : 'Active-month avg', value: formatINR(avg) },
          { label: 'Peak month', value: formatINR(peak) },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-base font-bold text-gray-900 mt-0.5 truncate">{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card className="p-5">
        {categoryName && (
          <p className="text-sm font-medium text-gray-600 mb-3">
            Monthly spend — {categoryName}
          </p>
        )}
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#2cbcac"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#2cbcac' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Transaction list */}
      <Card className="p-5">
        <p className="text-sm font-medium text-gray-600 mb-3">
          {categoryName ? `${categoryName} Transactions` : 'All Expense Transactions'} ({filteredTransactions.length})
        </p>
        {filteredTransactions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No transactions found.</p>
        ) : (
          <div className="divide-y divide-gray-100 -mx-5 px-5 max-h-80 overflow-y-auto">
            {filteredTransactions.map((txn) => (
              <div key={txn.id} className="flex items-center justify-between py-2.5 gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {txn.beneficiary || txn.notes || 'Transaction'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDate(txn.date)}
                    {txn.categoryNames?.length > 0 && !selectedCategory && ` · ${txn.categoryNames[0]}`}
                    {txn.platform && ` · ${txn.platform}`}
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-800 whitespace-nowrap">
                  {formatINR(txn.amount ?? 0)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
