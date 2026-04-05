import { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useOwners } from '../../hooks/useOwners';
import CalendarPicker from '../common/CalendarPicker';
import Select from '../common/Select';
import { inputClass, labelClass, errorClass } from '../../utils/formStyles';

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
  const [platform, setPlatform] = useState(initialData?.platform ?? '');
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
      platform: platform.trim(),
      notes: notes.trim(),
    });
  }


  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {cashbackCategory && (
        <div className="rounded-lg bg-accent-light border border-accent/30 px-3 py-2 text-xs text-brand">
          Cashback will be categorised as{' '}
          <span className="font-semibold">{cashbackCategory.name}</span>.
        </div>
      )}

      {/* Amount */}
      <div>
        <label htmlFor="txn-amount" className={labelClass}>Cashback Amount</label>
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
        {errors.amount && <p className={errorClass}>{errors.amount}</p>}
      </div>

      {/* Date + Account */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Date</label>
          <CalendarPicker value={date} onChange={(val) => setDate(val)} className="w-full" />
          {errors.date && <p className={errorClass}>{errors.date}</p>}
        </div>

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
        {initialData ? 'Update Cashback' : 'Save Cashback'}
      </button>
    </form>
  );
}
