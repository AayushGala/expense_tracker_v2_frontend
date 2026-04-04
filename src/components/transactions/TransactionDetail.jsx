import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { formatDate, formatINR } from '../../utils/formatters';
import Badge from '../common/Badge';
import AmountDisplay from '../common/AmountDisplay';

function amountVariant(type) {
  if (type === 'income' || type === 'cashback' || type === 'reimbursement') return 'income';
  if (type === 'expense' || type === 'bill_payment' || type === 'split_expense') return 'expense';
  return 'neutral';
}

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

  function resolveAccountName(id) {
    return accountMap.get(id)?.name ?? categoryMap.get(id)?.name ?? id;
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
    type, amount, date, notes, beneficiary, tags,
    from_account_id, to_account_id, account_id, category_id, created_at,
  } = transaction;

  const detailRows = [
    from_account_id && { label: 'From Account', value: resolveAccountName(from_account_id) },
    to_account_id && { label: 'To Account', value: resolveAccountName(to_account_id) },
    account_id && !from_account_id && !to_account_id && { label: 'Account', value: resolveAccountName(account_id) },
    category_id && { label: 'Category', value: resolveAccountName(category_id) },
    beneficiary && { label: 'Beneficiary', value: beneficiary.charAt(0).toUpperCase() + beneficiary.slice(1) },
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
            {notes || type}
          </p>
          {date && (
            <p className="text-sm text-gray-400 mt-0.5">{formatDate(date)}</p>
          )}
        </div>
        <Badge type={type} />
      </div>

      {/* Amount */}
      <div className="rounded-xl bg-gray-50 px-5 py-4 flex items-center justify-between ring-1 ring-gray-100">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Amount</span>
        <AmountDisplay
          amount={amount ?? 0}
          variant={amountVariant(type)}
          className="text-2xl font-bold"
        />
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
                      {resolveAccountName(entry.account_id)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600 font-medium">
                      {entry.entry_type === 'DEBIT' ? formatINR(entry.amount) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-rose-500 font-medium">
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
          className="flex-1 rounded-xl border border-[#2cbcac] bg-[#c5f1ec] py-2.5 text-sm
                     font-semibold text-[#1e2a30] hover:bg-[#c5f1ec] transition-colors"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          className="flex-1 rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-sm
                     font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
        >
          Delete
        </button>
      </div>

      <button
        onClick={onClose}
        className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold
                   text-gray-500 hover:bg-gray-50 transition-colors"
      >
        Close
      </button>
    </div>
  );
}
