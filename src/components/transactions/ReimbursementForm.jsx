import { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useOwners } from '../../hooks/useOwners';
import { formatINR } from '../../utils/formatters';
import CalendarPicker from '../common/CalendarPicker';

/**
 * Form for recording reimbursement received from someone.
 * Shows pending receivables and lets the user mark partial/full settlement.
 *
 * @param {Object}   props
 * @param {Function} props.onSubmit - Called with (transaction, entries, updatedReceivable)
 */
export default function ReimbursementForm({ onSubmit }) {
  const { accounts, receivables } = useData();
  const { owners, getAccountOwner } = useOwners();

  const assetAccounts = accounts.filter((a) => a.type === 'asset');
  const receivableAccount = accounts.find((a) => a.type === 'receivable') ?? null;

  // Only pending or partially settled receivables
  const pendingReceivables = useMemo(
    () =>
      (receivables ?? []).filter(
        (r) => r.status === 'pending' || r.status === 'partial'
      ),
    [receivables]
  );

  const today = new Date().toISOString().slice(0, 10);

  const [selectedReceivableId, setSelectedReceivableId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [toAccountId, setToAccountId] = useState('');
  const [owner, setOwner] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  const selectedReceivable = pendingReceivables.find(
    (r) => r.id === selectedReceivableId
  ) ?? null;

  const outstanding = selectedReceivable
    ? Math.round(
        ((selectedReceivable.amount_owed ?? 0) -
          (selectedReceivable.amount_settled ?? 0)) *
          100
      ) / 100
    : 0;

  function validate() {
    const errs = {};
    if (!selectedReceivableId) errs.receivable = 'Select a receivable to settle.';
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      errs.amount = 'Enter a valid positive amount.';
    } else if (parsedAmount > outstanding + 0.001) {
      errs.amount = `Amount cannot exceed outstanding balance of ${formatINR(outstanding)}.`;
    }
    if (!date) errs.date = 'Date is required.';
    if (!toAccountId) errs.toAccountId = 'Select the account receiving the payment.';
    if (!receivableAccount) {
      errs.submit = 'No receivable account found in your accounts.';
    }
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const parsedAmount = parseFloat(amount);

    onSubmit({
      type: 'reimbursement',
      amount: parsedAmount,
      date,
      to_account_id: parseInt(toAccountId),
      receivable_account_id: receivableAccount.id,
      settle_receivable_id: parseInt(selectedReceivableId),
      owner,
      notes: notes.trim(),
    });
  }

  const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-700 transition-colors focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 hover:border-gray-300 placeholder-gray-400';
  const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5';
  const errorClass = 'mt-1.5 text-xs text-rose-500 font-medium';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {pendingReceivables.length === 0 ? (
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
          No pending receivables found.
        </div>
      ) : (
        <>
          {/* Select Person / Receivable */}
          <div>
            <label className={labelClass}>Select Receivable</label>
            <select
              value={selectedReceivableId}
              onChange={(e) => {
                setSelectedReceivableId(e.target.value);
                setAmount('');
                setErrors({});
              }}
              className={inputClass}
            >
              <option value="">Choose a person</option>
              {pendingReceivables.map((r) => {
                const owed = (r.amount_owed ?? 0) - (r.amount_settled ?? 0);
                return (
                  <option key={r.id} value={r.id}>
                    {r.person_name} — {formatINR(owed)} outstanding
                  </option>
                );
              })}
            </select>
            {errors.receivable && (
              <p className={errorClass}>{errors.receivable}</p>
            )}
          </div>

          {/* Outstanding info */}
          {selectedReceivable && (
            <div className="rounded-lg bg-cyan-50 border border-cyan-200 px-3 py-2 text-xs text-cyan-800">
              <span className="font-semibold">{selectedReceivable.person_name}</span>{' '}
              owes you <span className="font-bold">{formatINR(outstanding)}</span>
              {selectedReceivable.notes ? ` — ${selectedReceivable.notes}` : ''}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className={labelClass}>Amount Received (₹)</label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
            />
            {selectedReceivable && (
              <button
                type="button"
                onClick={() => setAmount(outstanding.toString())}
                className="mt-1 text-xs text-teal-600 hover:underline"
              >
                Fill full outstanding ({formatINR(outstanding)})
              </button>
            )}
            {errors.amount && <p className={errorClass}>{errors.amount}</p>}
          </div>

          {/* Date */}
          <div>
            <label className={labelClass}>Date</label>
            <CalendarPicker value={date} onChange={(val) => setDate(val)} className="w-full" />
            {errors.date && <p className={errorClass}>{errors.date}</p>}
          </div>

          {/* To Account */}
          <div>
            <label className={labelClass}>Received Into</label>
            <select
              value={toAccountId}
              onChange={(e) => {
                setToAccountId(e.target.value);
                setOwner(getAccountOwner(e.target.value));
              }}
              className={inputClass}
            >
              <option value="">Select account</option>
              {assetAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            {errors.toAccountId && (
              <p className={errorClass}>{errors.toAccountId}</p>
            )}
          </div>

          {/* Owner */}
          {owners.length > 0 && (
            <div>
              <label className={labelClass}>Owner</label>
              <select value={owner} onChange={(e) => setOwner(e.target.value)} className={inputClass}>
                <option value="">Unassigned</option>
                {owners.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              rows={2}
              placeholder="Optional notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputClass} resize-none`}
            />
          </div>

          {errors.submit && (
            <p className="text-sm text-red-500 text-center">{errors.submit}</p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-bold
                       text-white shadow-sm hover:bg-teal-700 focus:outline-none
                       focus:ring-2 focus:ring-teal-500/50 transition-colors"
          >
            Record Reimbursement
          </button>
        </>
      )}
    </form>
  );
}
