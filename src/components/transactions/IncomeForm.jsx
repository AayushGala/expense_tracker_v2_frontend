import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useOwners } from '../../hooks/useOwners';
import CalendarPicker from '../common/CalendarPicker';

/**
 * Form for recording an income transaction.
 *
 * @param {Object}   props
 * @param {Function} props.onSubmit - Called with (transaction, entries)
 */
export default function IncomeForm({ onSubmit }) {
  const { accounts, categories } = useData();
  const { owners, getAccountOwner } = useOwners();

  const assetAccounts = accounts.filter((a) => a.type === 'asset');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  const today = new Date().toISOString().slice(0, 10);

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [owner, setOwner] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  function handleToAccountChange(accountId) {
    setToAccountId(accountId);
    setOwner(getAccountOwner(accountId));
  }

  function validate() {
    const errs = {};
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      errs.amount = 'Enter a valid positive amount.';
    }
    if (!date) errs.date = 'Date is required.';
    if (!toAccountId) errs.toAccountId = 'Select a destination account.';
    if (!categoryId) errs.categoryId = 'Select an income category.';
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
      type: 'income',
      amount: parsedAmount,
      date,
      to_account_id: parseInt(toAccountId),
      category_id: parseInt(categoryId),
      owner,
      notes: notes.trim(),
    });
  }

  const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-700 transition-colors focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 hover:border-gray-300 placeholder-gray-400';
  const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5';
  const errorClass = 'mt-1.5 text-xs text-rose-500 font-medium';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Amount */}
      <div>
        <label className={labelClass}>Amount (₹)</label>
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

      {/* To Account */}
      <div>
        <label className={labelClass}>Received Into</label>
        <select
          value={toAccountId}
          onChange={(e) => handleToAccountChange(e.target.value)}
          className={inputClass}
        >
          <option value="">Select account</option>
          {assetAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        {errors.toAccountId && <p className={errorClass}>{errors.toAccountId}</p>}
      </div>

      {/* Category */}
      <div>
        <label className={labelClass}>Income Category</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={inputClass}
        >
          <option value="">Select category</option>
          {incomeCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.categoryId && <p className={errorClass}>{errors.categoryId}</p>}
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
        Save Income
      </button>
    </form>
  );
}
