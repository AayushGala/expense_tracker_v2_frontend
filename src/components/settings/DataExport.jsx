import Card from '../common/Card';
import { useData } from '../../context/DataContext';

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toCSV(transactions) {
  const headers = ['id', 'date', 'type', 'amount', 'beneficiary', 'notes', 'tags'];
  const escape = (v) => {
    const str = v == null ? '' : String(v);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = transactions.map((txn) =>
    headers.map((h) => escape(txn[h])).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

export default function DataExport() {
  const {
    accounts,
    categories,
    transactions,
    entries,
    receivables,
    budgets,
    settings,
  } = useData();

  const timestamp = () =>
    new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  function handleExportJSON() {
    const payload = {
      exportedAt: new Date().toISOString(),
      accounts,
      categories,
      transactions,
      entries,
      receivables,
      budgets,
      settings,
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, `expense-tracker-export-${timestamp()}.json`);
  }

  function handleExportCSV() {
    const csv = toCSV(transactions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `transactions-${timestamp()}.csv`);
  }

  const btnClass =
    'shrink-0 text-sm px-5 py-2.5 min-w-[160px] justify-center bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 flex items-center gap-2 transition-colors';

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="pb-3 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800">Data Export</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Download a copy of your data. The file is generated entirely in your browser.
          </p>
        </div>

        <div className="mt-4 space-y-5">
          {/* JSON */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-medium text-gray-700">Full Export (JSON)</p>
              <p className="text-xs text-gray-400 mt-0.5">
                All data: accounts, categories, transactions, entries, receivables, budgets and settings.
              </p>
            </div>
            <button onClick={handleExportJSON} className={btnClass}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
              </svg>
              Export JSON
            </button>
          </div>

          <div className="h-px bg-gray-50" />

          {/* CSV */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-medium text-gray-700">Transactions (CSV)</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Transactions only — compatible with spreadsheet apps.
                {transactions.length > 0 && (
                  <> Includes {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}.</>
                )}
              </p>
            </div>
            <button onClick={handleExportCSV} className={btnClass}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
