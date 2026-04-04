import { useMemo } from 'react';
import Card from '../common/Card';
import { useData } from '../../context/DataContext';
import { formatINR, formatDate } from '../../utils/formatters';

function agingDays(dateStr) {
  if (!dateStr) return 0;
  const created = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - created) / (1000 * 60 * 60 * 24));
}

function statusBadge(status) {
  const map = {
    pending:  'bg-yellow-100 text-yellow-800',
    partial:  'bg-blue-100 text-blue-800',
    settled:  'bg-green-100 text-green-800',
    paid:     'bg-green-100 text-green-800',
    waived:   'bg-gray-100 text-gray-600',
  };
  const cls = map[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {status ?? 'unknown'}
    </span>
  );
}

function agingBadge(days) {
  let cls = 'bg-green-50 text-green-700';
  if (days > 90) cls = 'bg-red-100 text-red-700';
  else if (days > 30) cls = 'bg-orange-100 text-orange-700';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {days}d
    </span>
  );
}

const STATUS_ORDER = { pending: 0, partial: 1, waived: 2, settled: 3, paid: 4 };

export default function ReceivablesReport() {
  const { receivables } = useData();

  const rows = useMemo(
    () =>
      receivables
        .map((r) => {
          const amount    = r.amount_owed ?? 0;
          const settled   = r.amount_settled ?? 0;
          const outstanding = Math.max(0, Math.round((amount - settled) * 100) / 100);
          const days      = agingDays(r.created_at ?? r.date);
          return { ...r, _amount: amount, _settled: settled, _outstanding: outstanding, _days: days };
        })
        .sort((a, b) => {
          const so = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
          if (so !== 0) return so;
          return b._days - a._days; // older first within same status
        }),
    [receivables]
  );

  const totalOwed       = useMemo(() => rows.reduce((s, r) => s + r._amount, 0), [rows]);
  const totalOutstanding = useMemo(() => rows.filter((r) => r.status !== 'settled' && r.status !== 'paid').reduce((s, r) => s + r._outstanding, 0), [rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 min-h-[44px]">
        <h2 className="text-base font-bold text-gray-900 flex-1">Receivables</h2>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs text-gray-500">Total Loaned</p>
          <p className="text-base font-bold text-gray-900 mt-0.5">{formatINR(totalOwed)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Outstanding</p>
          <p className="text-base font-bold text-orange-600 mt-0.5">{formatINR(totalOutstanding)}</p>
        </Card>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No receivables found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Person', 'Amount', 'Settled', 'Outstanding', 'Status', 'Aging'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                      {r.person_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {formatINR(r._amount)}
                    </td>
                    <td className="px-4 py-3 text-green-700 whitespace-nowrap">
                      {formatINR(r._settled)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-orange-600 whitespace-nowrap">
                      {formatINR(r._outstanding)}
                    </td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3">{agingBadge(r._days)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
