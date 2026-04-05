import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useOwners } from '../../hooks/useOwners';
import CalendarPicker from '../common/CalendarPicker';
import Select from '../common/Select';
import { inputClass, labelClass, errorClass } from '../../utils/formStyles';

/**
 * Form for recording a transfer between two asset/liability accounts.
 *
 * @param {Object}   props
 * @param {Function} props.onSubmit - Called with (transaction, entries)
 */
export default function TransferForm({ onSubmit, initialData }) {
  const { accounts } = useData();
  const { owners, getAccountOwner } = useOwners();

  const eligibleAccounts = accounts.filter(
    (a) => a.type === 'asset' || a.type === 'liability'
  );

  const today = new Date().toISOString().slice(0, 10);

  const [amount, setAmount] = useState(initialData?.amount ?? '');
  const [date, setDate] = useState(initialData?.date ?? today);
  const [fromAccountId, setFromAccountId] = useState(String(initialData?.from_account_id ?? ''));
  const [toAccountId, setToAccountId] = useState(String(initialData?.to_account_id ?? ''));
  const [owner, setOwner] = useState(initialData?.owner ?? '');
  const [platform, setPlatform] = useState(initialData?.platform ?? '');
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [errors, setErrors] = useState({});

  function handleFromAccountChange(accountId) {
    setFromAccountId(accountId);
    setOwner(getAccountOwner(accountId));
  }

  function validate() {
    const errs = {};
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      errs.amount = 'Enter a valid positive amount.';
    }
    if (!date) errs.date = 'Date is required.';
    if (!fromAccountId) errs.fromAccountId = 'Select the source account.';
    if (!toAccountId) errs.toAccountId = 'Select the destination account.';
    if (fromAccountId && toAccountId && fromAccountId === toAccountId) {
      errs.toAccountId = 'Source and destination must be different accounts.';
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
      type: 'transfer',
      amount: parsedAmount,
      date,
      from_account_id: parseInt(fromAccountId),
      to_account_id: parseInt(toAccountId),
      owner,
      platform: platform.trim(),
      notes: notes.trim(),
    });
  }


  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Amount */}
      <div>
        <label className={labelClass}>Amount</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-300">₹</span>
          <input
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
        {errors.amount && <p className={errorClass}>{errors.amount}</p>}
      </div>

      {/* Date + From Account */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Date</label>
          <CalendarPicker value={date} onChange={(val) => setDate(val)} className="w-full" />
          {errors.date && <p className={errorClass}>{errors.date}</p>}
        </div>

        <div>
          <label className={labelClass}>From Account</label>
          <Select
            value={fromAccountId}
            onChange={(e) => handleFromAccountChange(e.target.value)}
            options={eligibleAccounts.map((a) => ({ value: String(a.id), label: a.name }))}
            placeholder="Select source account"
          />
          {errors.fromAccountId && (
            <p className={errorClass}>{errors.fromAccountId}</p>
          )}
        </div>
      </div>

      {/* To Account + Owner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>To Account</label>
          <Select
            value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value)}
            options={eligibleAccounts.map((a) => ({ value: String(a.id), label: a.name }))}
            placeholder="Select destination account"
          />
          {errors.toAccountId && (
            <p className={errorClass}>{errors.toAccountId}</p>
          )}
        </div>

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
      </div>

      {/* Platform */}
      <div>
        <label className={labelClass}>Platform</label>
        <input
          type="text"
          placeholder="e.g. Swiggy, Amazon, Flipkart"
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className={inputClass}
        />
      </div>

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
        className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold
                   text-white shadow-sm hover:bg-brand-hover focus:outline-none
                   focus:ring-2 focus:ring-accent/30 transition-colors"
      >
        {initialData ? 'Update Transfer' : 'Save Transfer'}
      </button>
    </form>
  );
}
