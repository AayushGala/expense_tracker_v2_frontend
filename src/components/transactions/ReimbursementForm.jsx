import { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useOwners } from '../../hooks/useOwners';
import { formatINR } from '../../utils/formatters';
import CalendarPicker from '../common/CalendarPicker';
import Select from '../common/Select';
import { inputClass, labelClass, errorClass } from '../../utils/formStyles';

/**
 * Form for recording reimbursement received from someone.
 * Shows pending receivables and lets the user mark partial/full settlement.
 *
 * @param {Object}   props
 * @param {Function} props.onSubmit - Called with (transaction, entries, updatedReceivable)
 */
export default function ReimbursementForm({ onSubmit, initialData }) {
  const { accounts, receivables } = useData();
  const { owners, getAccountOwner } = useOwners();

  const assetAccounts = accounts.filter((a) => a.type === 'asset');
  const receivableAccount = accounts.find((a) => a.type === 'receivable') ?? null;

  const isEditing = Boolean(initialData);

  // When editing, show all receivables so the settled one can be displayed.
  // When creating, only show pending/partial.
  const availableReceivables = useMemo(
    () =>
      (receivables ?? []).filter(
        (r) => isEditing || r.status === 'pending' || r.status === 'partial'
      ),
    [receivables, isEditing]
  );

  // Try to find the receivable that was settled by this transaction
  const initialReceivableId = useMemo(() => {
    if (!initialData) return '';
    // Match by: receivable whose original transaction's receivables
    // include one with amount matching this reimbursement
    const amount = initialData.amount;
    const match = (receivables ?? []).find(
      (r) => r.amount_settled > 0 && Math.abs(r.amount_settled - amount) < 0.01
    );
    return match ? String(match.id) : '';
  }, [initialData, receivables]);

  const today = new Date().toISOString().slice(0, 10);

  const [selectedReceivableId, setSelectedReceivableId] = useState(initialReceivableId);
  const [amount, setAmount] = useState(initialData?.amount ?? '');
  const [date, setDate] = useState(initialData?.date ?? today);
  const [toAccountId, setToAccountId] = useState(String(initialData?.to_account_id ?? ''));
  const [owner, setOwner] = useState(initialData?.owner ?? '');
  const [platform, setPlatform] = useState(initialData?.platform ?? '');
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [errors, setErrors] = useState({});

  const selectedReceivable = availableReceivables.find(
    (r) => String(r.id) === String(selectedReceivableId)
  ) ?? null;

  // When editing, add back this transaction's original amount since it will be re-settled
  const previousAmount = isEditing ? (initialData?.amount ?? 0) : 0;
  const currentOutstanding = selectedReceivable
    ? Math.round(
        ((selectedReceivable.amount_owed ?? 0) -
          (selectedReceivable.amount_settled ?? 0)) *
          100
      ) / 100
    : 0;
  const outstanding = Math.round((currentOutstanding + previousAmount) * 100) / 100;

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
      platform: platform.trim(),
      notes: notes.trim(),
    });
  }


  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {availableReceivables.length === 0 ? (
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
          No pending receivables found.
        </div>
      ) : (
        <>
          {/* Select Person / Receivable */}
          <div>
            <label className={labelClass}>Select Receivable</label>
            <Select
              value={selectedReceivableId}
              onChange={(e) => {
                setSelectedReceivableId(e.target.value);
                setAmount('');
                setErrors({});
              }}
              options={availableReceivables.map((r) => {
                const owed = (r.amount_owed ?? 0) - (r.amount_settled ?? 0);
                const effective = isEditing && String(r.id) === initialReceivableId
                  ? Math.round((owed + previousAmount) * 100) / 100
                  : owed;
                return { value: String(r.id), label: `${r.person_name} — ${formatINR(effective)} outstanding` };
              })}
              placeholder="Choose a person"
            />
            {errors.receivable && (
              <p className={errorClass}>{errors.receivable}</p>
            )}
          </div>

          {/* Edit context note */}
          {isEditing && selectedReceivable && previousAmount > 0 && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-500">
              This reimbursement previously settled <span className="font-semibold text-gray-700">{formatINR(previousAmount)}</span>.
              Total outstanding including this transaction: <span className="font-semibold text-gray-700">{formatINR(outstanding)}</span>
            </div>
          )}

          {/* Amount */}
          <div>
            <label htmlFor="txn-amount" className={labelClass}>Amount Received</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-300">₹</span>
              <input
                id="txn-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-4 py-4 text-2xl font-bold text-gray-900 transition-colors focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 placeholder-gray-300"
              />
            </div>
            {selectedReceivable && (
              <button
                type="button"
                onClick={() => setAmount(outstanding.toString())}
                className="mt-1 text-xs text-accent hover:underline"
              >
                Fill full outstanding ({formatINR(outstanding)})
              </button>
            )}
            {errors.amount && <p className={errorClass}>{errors.amount}</p>}
          </div>

          {/* Date + To Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Date</label>
              <CalendarPicker value={date} onChange={(val) => setDate(val)} className="w-full" />
              {errors.date && <p className={errorClass}>{errors.date}</p>}
            </div>

            <div>
              <label className={labelClass}>Received Into</label>
              <Select
                value={toAccountId}
                onChange={(e) => {
                  setToAccountId(e.target.value);
                  setOwner(getAccountOwner(e.target.value));
                }}
                options={assetAccounts.map((a) => ({ value: String(a.id), label: a.name }))}
                placeholder="Select account"
              />
              {errors.toAccountId && (
                <p className={errorClass}>{errors.toAccountId}</p>
              )}
            </div>
          </div>

          {/* Owner */}
          {owners.length > 0 && (
            <div>
              <label className={labelClass}>Owner</label>
              <Select
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                options={owners.map((o) => ({ value: o, label: o }))}
                placeholder="Unassigned"
              />
            </div>
          )}

          {/* Platform */}
          <div>
            <label htmlFor="txn-platform" className={labelClass}>Platform</label>
            <input
              id="txn-platform"
              type="text"
              placeholder="e.g. Swiggy, Amazon, Flipkart"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="txn-notes" className={labelClass}>Notes</label>
            <textarea
              id="txn-notes"
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
            className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold
                       text-white shadow-sm hover:bg-brand-hover focus:outline-none
                       focus:ring-2 focus:ring-accent/30 transition-colors"
          >
            {initialData ? 'Update Reimbursement' : 'Record Reimbursement'}
          </button>
        </>
      )}
    </form>
  );
}
