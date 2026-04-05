import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { formatDate, formatINR, transactionTypeLabel } from '../../utils/formatters';
import Badge from '../common/Badge';
import AmountDisplay from '../common/AmountDisplay';
import { getVariant } from '../common/TypeIcon';

export default function TransactionDetail({
  transaction,
  entries = [],
  onClose,
  onDeleted,
}) {
  const navigate = useNavigate();
  const { accounts, categories, deleteTransaction } = useData();

  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts]
  );
  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  function resolveEntryName(entry) {
    if (entry.account_id != null) return accountMap.get(entry.account_id)?.name ?? entry.account_id;
    if (entry.category_id != null) return categoryMap.get(entry.category_id)?.name ?? entry.category_id;
    return '—';
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      'Delete this transaction? This cannot be undone.'
    );
    if (!confirmed) return;
    await deleteTransaction(transaction.id);
    onDeleted?.();
    onClose();
  }

  function handleEdit() {
    navigate(`/transactions/${transaction.id}/edit`);
    onClose();
  }

  const {
    type, amount, date, notes, beneficiary, platform, tags,
    category_id, created_at,
  } = transaction;

  // Derive account info from entries since the transaction model doesn't store account IDs
  const accountIds = new Set(accounts.map((a) => a.id));
  const accountEntries = entries.filter((e) => e.account_id != null);
  const debitAccount = accountEntries.find((e) => e.entry_type === 'DEBIT');
  const creditAccount = accountEntries.find((e) => e.entry_type === 'CREDIT');

  // Determine "from" and "to" based on transaction type
  let fromName = null;
  let toName = null;
  if (type === 'expense' || type === 'split_expense') {
    fromName = creditAccount ? accountMap.get(creditAccount.account_id)?.name : null;
  } else if (type === 'income' || type === 'cashback' || type === 'reimbursement') {
    toName = debitAccount ? accountMap.get(debitAccount.account_id)?.name : null;
  } else if (type === 'transfer' || type === 'bill_payment' || type === 'investment') {
    fromName = creditAccount ? accountMap.get(creditAccount.account_id)?.name : null;
    toName = debitAccount ? accountMap.get(debitAccount.account_id)?.name : null;
  }

  const detailRows = [
    fromName && { label: 'From Account', value: fromName },
    toName && { label: 'To Account', value: toName },
    category_id && { label: 'Category', value: categoryMap.get(category_id)?.name ?? transaction.category_name ?? category_id },
    beneficiary && { label: 'Beneficiary', value: beneficiary.charAt(0).toUpperCase() + beneficiary.slice(1) },
    platform && { label: 'Platform', value: platform },
    tags?.length > 0 && { label: 'Tags', value: Array.isArray(tags) ? tags.join(', ') : tags },
    notes && { label: 'Notes', value: notes },
    created_at && { label: 'Created', value: formatDate(created_at) },
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-gray-900 leading-tight">
            {notes || transactionTypeLabel(type)}
          </p>
          {date && (
            <p className="text-sm text-gray-400 mt-0.5">{formatDate(date)}</p>
          )}
        </div>
        <Badge type={type} />
      </div>

      {/* Amount */}
      <div className="rounded-2xl bg-brand px-5 py-4 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-brand-muted">Amount</span>
        <p className="text-2xl font-bold text-white tabular-nums">
          {formatINR(amount ?? 0)}
        </p>
      </div>

      {/* Details grid */}
      {detailRows.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          {detailRows.map(({ label, value }) => (
            <div key={label} className="contents">
              <dt className="text-gray-400 text-xs font-semibold uppercase tracking-wide">{label}</dt>
              <dd className="text-gray-700 font-medium break-words">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* Journal entries table */}
      {entries.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Journal Entries
          </p>
          <div className="rounded-xl ring-1 ring-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Account</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Debit</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((entry) => (
                  <tr key={entry.id} className="bg-white">
                    <td className="px-4 py-2.5 text-gray-700 font-medium truncate max-w-[140px]">
                      {resolveEntryName(entry)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-accent font-medium">
                      {entry.entry_type === 'DEBIT' ? formatINR(entry.amount) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-800 font-medium">
                      {entry.entry_type === 'CREDIT' ? formatINR(entry.amount) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={handleEdit}
          className="flex-1 rounded-xl bg-brand py-2.5 text-sm
                     font-semibold text-white hover:bg-brand-hover transition-colors"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm
                     font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
