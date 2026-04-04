import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import Card from '../common/Card';
import Dropdown from '../common/Dropdown';
import { useReports } from '../../hooks/useReports';
import { useOwners } from '../../hooks/useOwners';
import { formatINR } from '../../utils/formatters';

function shortMonth(monthKey) {
  const [year, month] = monthKey.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-4 py-2 text-sm space-y-1">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.fill }}>
          {p.name}: <span className="font-semibold">{formatINR(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export default function CashflowReport() {
  const { cashflow } = useReports();
  const { owners, ownerOptions } = useOwners();

  const [selectedOwner, setSelectedOwner] = useState('');

  const data = useMemo(
    () =>
      cashflow(12, selectedOwner || undefined).map((d) => ({
        ...d,
        label: shortMonth(d.month),
      })),
    [cashflow, selectedOwner]
  );

  const totals = useMemo(
    () =>
      data.reduce(
        (acc, d) => ({
          income:      acc.income      + d.income,
          expenses:    acc.expenses    + d.expenses,
          investments: acc.investments + d.investments,
        }),
        { income: 0, expenses: 0, investments: 0 }
      ),
    [data]
  );

  const netSavings = totals.income - totals.expenses - totals.investments;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 min-h-[44px]">
        <h2 className="text-base font-bold text-gray-900 flex-1">Cashflow — Last 12 Months</h2>
        {owners.length > 0 && (
          <Dropdown
            value={selectedOwner}
            onChange={setSelectedOwner}
            options={ownerOptions}
            className="min-w-[130px]"
          />
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Income',      value: totals.income,      color: 'text-green-600' },
          { label: 'Total Expenses',    value: totals.expenses,    color: 'text-red-600' },
          { label: 'Total Investments', value: totals.investments, color: 'text-purple-600' },
          { label: 'Net Savings',       value: netSavings,         color: netSavings >= 0 ? 'text-green-600' : 'text-red-600' },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-base font-bold mt-0.5 truncate ${s.color}`}>
              {formatINR(s.value)}
            </p>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }} barCategoryGap="30%">
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
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="income"      name="Income"      fill="#22c55e" radius={[3, 3, 0, 0]} />
            <Bar dataKey="expenses"    name="Expenses"    fill="#ef4444" radius={[3, 3, 0, 0]} />
            <Bar dataKey="investments" name="Investments" fill="#a855f7" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
