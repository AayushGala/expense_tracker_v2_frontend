import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useOwners } from '../../hooks/useOwners';
import CalendarPicker from '../common/CalendarPicker';
import Select from '../common/Select';
import { inputClass, labelClass, errorClass, accountOption, categoryOptions } from '../../utils/formStyles';

const PREDEFINED_BENEFICIARIES = ['self', 'family'];

export default function ExpenseForm({ onSubmit, initialData }) {
  const { accounts, categories } = useData();
  const { owners, getAccountOwner } = useOwners();

  const payableAccounts = accounts.filter(
    (a) => (a.type === 'asset' || a.type === 'liability') && a.is_active !== false
  );
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const today = new Date().toISOString().slice(0, 10);

  // Parse beneficiary from initialData
  const initBeneficiary = initialData?.beneficiary ?? '';
  const initBeneficiaryType = PREDEFINED_BENEFICIARIES.includes(initBeneficiary)
    ? initBeneficiary
    : initBeneficiary
      ? 'custom'
      : 'self';
  const initCustomBeneficiary =
    initBeneficiary && !PREDEFINED_BENEFICIARIES.includes(initBeneficiary)
      ? initBeneficiary
      : '';

  const [amount, setAmount] = useState(initialData?.amount ?? '');
  const [date, setDate] = useState(initialData?.date ?? today);
  const [fromAccountId, setFromAccountId] = useState(String(initialData?.from_account_id ?? ''));
  const [categoryId, setCategoryId] = useState(String(initialData?.category_id ?? ''));
  const [owner, setOwner] = useState(initialData?.owner ?? '');
  const [beneficiaryType, setBeneficiaryType] = useState(initBeneficiaryType);
  const [customBeneficiary, setCustomBeneficiary] = useState(initCustomBeneficiary);
  const [platform, setPlatform] = useState(initialData?.platform ?? '');
  const [tags, setTags] = useState(initialData?.tags ?? '');
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
    if (!fromAccountId) errs.fromAccountId = 'Select an account.';
    if (!categoryId) errs.categoryId = 'Select a category.';
    if (beneficiaryType === 'custom' && !customBeneficiary.trim()) {
      errs.customBeneficiary = 'Enter a beneficiary name.';
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

    const parsedAmount = Math.round(parseFloat(amount) * 100) / 100;
    const beneficiary =
      beneficiaryType === 'custom' ? customBeneficiary.trim() : beneficiaryType;

    onSubmit({
      type: 'expense',
      amount: parsedAmount,
      date,
      from_account_id: parseInt(fromAccountId),
      category_id: parseInt(categoryId),
      beneficiary,
      owner,
      platform: platform.trim(),
      tags: tags.trim(),
      notes: notes.trim(),
    });
  }


  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Amount — hero field */}
      <div>
        <label htmlFor="txn-amount" className={labelClass}>Amount</label>
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

      {/* Date + Account row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Date</label>
          <CalendarPicker value={date} onChange={(val) => setDate(val)} className="w-full" />
          {errors.date && <p className={errorClass}>{errors.date}</p>}
        </div>

        <div>
          <label className={labelClass}>Paid From</label>
          <Select
            value={fromAccountId}
            onChange={(e) => handleFromAccountChange(e.target.value)}
            options={payableAccounts.map(accountOption)}
            placeholder="Select account"
          />
          {errors.fromAccountId && <p className={errorClass}>{errors.fromAccountId}</p>}
        </div>
      </div>

      {/* Category + Beneficiary row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Category</label>
          <Select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            options={categoryOptions(expenseCategories)}
            placeholder="Select category"
          />
          {errors.categoryId && <p className={errorClass}>{errors.categoryId}</p>}
        </div>

        <div>
          <label className={labelClass}>Beneficiary</label>
          <Select
            value={beneficiaryType}
            onChange={(e) => setBeneficiaryType(e.target.value)}
            options={[
              ...PREDEFINED_BENEFICIARIES.map((b) => ({
                value: b,
                label: b.charAt(0).toUpperCase() + b.slice(1),
              })),
              { value: 'custom', label: 'Other (custom)' },
            ]}
          />
          {beneficiaryType === 'custom' && (
            <div className="mt-2">
              <input
                id="txn-custom-beneficiary"
                type="text"
                placeholder="Enter name"
                value={customBeneficiary}
                onChange={(e) => setCustomBeneficiary(e.target.value)}
                className={inputClass}
              />
              {errors.customBeneficiary && (
                <p className={errorClass}>{errors.customBeneficiary}</p>
              )}
            </div>
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

      {/* Platform + Tags */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="txn-platform" className={labelClass}>Platform</label>
          <input id="txn-platform" type="text" placeholder="e.g. Swiggy, Amazon" value={platform} onChange={(e) => setPlatform(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="txn-tags" className={labelClass}>Tags (comma-separated)</label>
          <input id="txn-tags" type="text" placeholder="food, travel, utilities" value={tags} onChange={(e) => setTags(e.target.value)} className={inputClass} />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="txn-notes" className={labelClass}>Notes (optional)</label>
        <textarea
          id="txn-notes"
          rows={3}
          placeholder="Add a short description of this transaction..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={`${inputClass} resize-none`}
        />
      </div>

      {errors.submit && (
        <p className="text-sm text-rose-500 text-center font-medium">{errors.submit}</p>
      )}

      <button
        type="submit"
        className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold
                   text-white shadow-sm hover:bg-brand-hover focus:outline-none
                   focus:ring-2 focus:ring-accent/30 transition-colors active:bg-brand-deep"
      >
        {initialData ? 'Update Expense' : 'Save Expense'}
      </button>
    </form>
  );
}
