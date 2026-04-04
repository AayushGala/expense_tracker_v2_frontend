import { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { formatRelativeDate } from '../../utils/formatters';
import TransactionListItem from './TransactionListItem';
import EmptyState from '../common/EmptyState';
import Card from '../common/Card';

/**
 * Groups a flat array of transactions by their date (YYYY-MM-DD key).
 * Returns an array of [dateKey, transactions[]] pairs sorted newest first.
 *
 * @param {Array<Object>} transactions
 * @returns {Array<[string, Array<Object>]>}
 */
function groupByDate(transactions) {
  const groups = new Map();
  for (const txn of transactions) {
    const key = (txn.date ?? '').slice(0, 10);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(txn);
  }
  // Sort groups newest first
  return [...groups.entries()].sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0));
}

/**
 * Renders a list of transactions grouped by date.
 *
 * @param {Object}     props
 * @param {Array}      props.transactions  - Array of transaction objects
 * @param {Function}   props.onSelect      - Callback invoked with a transaction when its row is clicked
 */
export default function TransactionList({ transactions = [], onSelect }) {
  const { accounts } = useData();

  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts]
  );

  const grouped = useMemo(() => groupByDate(transactions), [transactions]);

  if (transactions.length === 0) {
    return (
      <EmptyState
        message="No transactions"
        description="Add your first transaction to get started."
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"
            />
          </svg>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map(([dateKey, txns]) => (
        <div key={dateKey}>
          {/* Date group header */}
          <div className="flex items-center gap-3 mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
              {formatRelativeDate(dateKey)}
            </p>
            <div className="flex-1 h-px bg-gray-100" />
            <p className="text-xs text-gray-400 whitespace-nowrap">
              {txns.length} item{txns.length !== 1 ? 's' : ''}
            </p>
          </div>

          <Card className="p-0 overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {txns.map((txn) => {
                const fromAccountName =
                  accountMap.get(txn.from_account_id)?.name ??
                  accountMap.get(txn.account_id)?.name ??
                  null;

                return (
                  <TransactionListItem
                    key={txn.id}
                    transaction={txn}
                    fromAccountName={fromAccountName}
                    onSelect={onSelect}
                  />
                );
              })}
            </ul>
          </Card>
        </div>
      ))}
    </div>
  );
}
