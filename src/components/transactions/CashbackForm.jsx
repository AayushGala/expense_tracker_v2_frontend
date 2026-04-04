import { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useOwners } from '../../hooks/useOwners';
import CalendarPicker from '../common/CalendarPicker';
import Select from '../common/Select';

/**
 * Form for recording cashback received into an account.
 *
 * @param {Object}   props
 * @param {Function} props.onSubmit - Called with (transaction, entries)
 */
export default function CashbackForm({ onSubmit, initialData }) {
  const { accounts, categories } = useData();
  const { owners, getAccountOwner } = useOwners();

  const assetAccounts = accounts.filter((a) => a.type === 'asset');

  // Find cashback income category — prefer name containing "cashback", else first income
  const cashbackCategory = useMemo(() => {
    const incomeCategories = categories.filter((c) => c.type === 'income');
    return (
      incomeCategories.find((c) =>
        c.name?.toLowerCase().includes('cashback')
      ) ?? incomeCategories[0] ?? null
    );
  }, [categories]);

  const today = new Date().toISOString().slice(0, 10);

  const [amount, setAmount] = useState(initialData?.amount ?? '');
  const [date, setDate] = useState(initialData?.date ?? today);
  const [accountId, setAccountId] = useState(String(initialData?.account_id ?? ''));
  const [owner, setOwner] = useState(initialData?.owner ?? '');
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [errors, setErrors] = useState({});

  function handleAccountChange(id) {
    setAccountId(id);
    setOwner(getAccountOwner(id));
  }

  function validate() {
    const errs = {};
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      errs.amount = 'Enter a valid positive amount.';
    }
    if (!date) errs.date = 'Date is required.';
    if (!accountId) errs.accountId = 'Select the account receiving cashback.';
    if (!cashbackCategory) {
      errs.submit = 'No income category found. Please add one first.';
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
      type: 'cashback',
      amount: parsedAmount,
      date,
      account_id: parseInt(accountId),
      category_id: cashbackCategory.id,
      owner,
      notes: notes.trim(),
    });
  }

  const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-700 transition-colors focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 hover:border-gray-300 placeholder-gray-400';
  const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5';
  const errorClass = 'mt-1.5 text-xs text-rose-500 font-medium';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {cashbackCategory && (
        <div className="rounded-lg bg-teal-50 border border-teal-200 px-3 py-2 text-xs text-teal-700">
          Cashback will be categorised as{' '}
          <span className="font-semibold">{cashbackCategory.name}</span>.
        </div>
      )}

      {/* Amount */}
      <div>
        <label className={labelClass}>Cashback Amount (₹)</label>
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
        {errors.amount && <p className={errorClass}>{errors.amount}</p>}
      </div>

      {/* Date */}
      <div>
        <label className={labelClass}>Date</label>
        <CalendarPicker value={date} onChange={(val) => setDate(val)} className="w-full" />
        {errors.date && <p className={errorClass}>{errors.date}</p>}
      </div>

      {/* Account */}
      <div>
        <label className={labelClass}>Account Receiving Cashback</label>
        <Select
          value={accountId}
          onChange={(e) => handleAccountChange(e.target.value)}
          options={assetAccounts.map((a) => ({ value: String(a.id), label: a.name }))}
          placeholder="Select account"
        />
        {errors.accountId && <p className={errorClass}>{errors.accountId}</p>}
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

      {/* Notes */}
      <div>
        <label className={labelClass}>Notes</label>
        <textarea
          rows={3}
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
        {initialData ? 'Update Cashback' : 'Save Cashback'}
      </button>
    </form>
  );
}
