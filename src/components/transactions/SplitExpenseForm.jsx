import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useOwners } from '../../hooks/useOwners';
import CalendarPicker from '../common/CalendarPicker';
import Select from '../common/Select';

/**
 * Form for recording a split expense.
 * Pays total from an account; my share is an expense; others' shares become receivables.
 *
 * @param {Object}   props
 * @param {Function} props.onSubmit - Called with (transaction, entries, receivables)
 */
export default function SplitExpenseForm({ onSubmit }) {
  const { accounts, categories } = useData();
  const { owners, getAccountOwner } = useOwners();

  const payableAccounts = accounts.filter(
    (a) => a.type === 'asset' || a.type === 'liability'
  );
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  // Find or derive a receivable account
  const receivableAccount = accounts.find((a) => a.type === 'receivable') ?? null;

  const today = new Date().toISOString().slice(0, 10);

  const [totalAmount, setTotalAmount] = useState('');
  const [date, setDate] = useState(today);
  const [fromAccountId, setFromAccountId] = useState('');
  const [owner, setOwner] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [totalPeople, setTotalPeople] = useState('2');
  // myShareType: 'equal' (even split) | 'custom' (enter amount directly)
  const [myShareType, setMyShareType] = useState('equal');
  const [customMyShare, setCustomMyShare] = useState('');
  const [notes, setNotes] = useState('');

  // Each other person: { id, name, amount }
  const [otherPeople, setOtherPeople] = useState([{ id: crypto.randomUUID(), name: '', amount: '' }]);

  const [errors, setErrors] = useState({});

  // Computed values
  const parsedTotal = parseFloat(totalAmount) || 0;
  const parsedTotalPeople = parseInt(totalPeople, 10) || 2;

  const computedMyShare =
    myShareType === 'equal'
      ? parsedTotal > 0 && parsedTotalPeople > 0
        ? Math.round((parsedTotal / parsedTotalPeople) * 100) / 100
        : 0
      : parseFloat(customMyShare) || 0;

  const othersTotal = Math.round((parsedTotal - computedMyShare) * 100) / 100;

  function addPerson() {
    setOtherPeople((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: '', amount: '' },
    ]);
  }

  function removePerson(id) {
    setOtherPeople((prev) => prev.filter((p) => p.id !== id));
  }

  function updatePerson(id, field, value) {
    setOtherPeople((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  }

  function validate() {
    const errs = {};
    if (!totalAmount || isNaN(parsedTotal) || parsedTotal <= 0) {
      errs.totalAmount = 'Enter a valid total amount.';
    }
    if (!date) errs.date = 'Date is required.';
    if (!fromAccountId) errs.fromAccountId = 'Select the paying account.';
    if (!categoryId) errs.categoryId = 'Select a category.';
    if (!receivableAccount) {
      errs.submit = 'No receivable account found. Please add a receivable account first.';
    }
    if (myShareType === 'custom') {
      const ms = parseFloat(customMyShare);
      if (isNaN(ms) || ms < 0) errs.customMyShare = 'Enter a valid share amount.';
      if (!isNaN(ms) && ms > parsedTotal) {
        errs.customMyShare = 'My share cannot exceed the total amount.';
      }
    }
    otherPeople.forEach((p, idx) => {
      if (!p.name.trim()) {
        errs[`person_name_${idx}`] = 'Name is required.';
      }
      const amt = parseFloat(p.amount);
      if (isNaN(amt) || amt < 0) {
        errs[`person_amount_${idx}`] = 'Enter a valid amount.';
      }
    });

    // Check that sum of others' entered amounts roughly equals othersTotal
    const sumOthers = otherPeople.reduce(
      (sum, p) => sum + (parseFloat(p.amount) || 0),
      0
    );
    if (
      parsedTotal > 0 &&
      otherPeople.length > 0 &&
      Math.abs(sumOthers - othersTotal) > 0.02
    ) {
      errs.otherPeople = `Others' amounts (₹${sumOthers.toFixed(2)}) must add up to ₹${othersTotal.toFixed(2)}.`;
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

    onSubmit({
      type: 'split_expense',
      total_amount: parsedTotal,
      my_share: computedMyShare,
      date,
      from_account_id: parseInt(fromAccountId),
      category_id: parseInt(categoryId),
      receivable_account_id: receivableAccount.id,
      owner,
      notes: notes.trim(),
      receivables: otherPeople.map((person) => ({
        person_name: person.name.trim(),
        amount_owed: parseFloat(person.amount),
      })),
    });
  }

  const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-700 transition-colors focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 hover:border-gray-300 placeholder-gray-400';
  const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5';
  const errorClass = 'mt-1.5 text-xs text-rose-500 font-medium';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Total Amount */}
      <div>
        <label className={labelClass}>Total Bill Amount (₹)</label>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
          className={inputClass}
        />
        {errors.totalAmount && <p className={errorClass}>{errors.totalAmount}</p>}
      </div>

      {/* Date */}
      <div>
        <label className={labelClass}>Date</label>
        <CalendarPicker value={date} onChange={(val) => setDate(val)} className="w-full" />
        {errors.date && <p className={errorClass}>{errors.date}</p>}
      </div>

      {/* Paying Account */}
      <div>
        <label className={labelClass}>Paying Account</label>
        <Select
          value={fromAccountId}
          onChange={(e) => {
            setFromAccountId(e.target.value);
            setOwner(getAccountOwner(e.target.value));
          }}
          options={payableAccounts.map((a) => ({ value: String(a.id), label: a.name }))}
          placeholder="Select account"
        />
        {errors.fromAccountId && (
          <p className={errorClass}>{errors.fromAccountId}</p>
        )}
      </div>

      {/* Category */}
      <div>
        <label className={labelClass}>Expense Category</label>
        <Select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          options={expenseCategories.map((c) => ({ value: String(c.id), label: c.name }))}
          placeholder="Select category"
        />
        {errors.categoryId && <p className={errorClass}>{errors.categoryId}</p>}
      </div>

      {/* Total People */}
      <div>
        <label className={labelClass}>Total Number of People</label>
        <input
          type="number"
          inputMode="numeric"
          min="2"
          step="1"
          value={totalPeople}
          onChange={(e) => setTotalPeople(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* My Share */}
      <div>
        <label className={labelClass}>My Share</label>
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => setMyShareType('equal')}
            className={`flex-1 rounded-lg border py-3 min-h-[44px] text-sm font-medium transition-colors ${
              myShareType === 'equal'
                ? 'bg-teal-50 border-teal-400 text-teal-700'
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            Equal Split
          </button>
          <button
            type="button"
            onClick={() => setMyShareType('custom')}
            className={`flex-1 rounded-lg border py-3 min-h-[44px] text-sm font-medium transition-colors ${
              myShareType === 'custom'
                ? 'bg-teal-50 border-teal-400 text-teal-700'
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            Custom Amount
          </button>
        </div>
        {myShareType === 'equal' && parsedTotal > 0 && (
          <p className="text-sm text-gray-600">
            My share:{' '}
            <span className="font-semibold">₹{computedMyShare.toFixed(2)}</span>{' '}
            ({parsedTotalPeople} people)
          </p>
        )}
        {myShareType === 'custom' && (
          <div>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={customMyShare}
              onChange={(e) => setCustomMyShare(e.target.value)}
              className={inputClass}
            />
            {errors.customMyShare && (
              <p className={errorClass}>{errors.customMyShare}</p>
            )}
          </div>
        )}
      </div>

      {/* Others' shares summary */}
      {parsedTotal > 0 && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2 text-xs text-yellow-800">
          Others owe you: <span className="font-bold">₹{othersTotal.toFixed(2)}</span>
        </div>
      )}

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
          rows={2}
          placeholder="Optional notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Other people table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Other People</p>
          <button
            type="button"
            onClick={addPerson}
            className="min-h-[44px] px-3 text-xs font-medium text-teal-600 hover:text-teal-700 rounded-lg hover:bg-teal-50 transition-colors"
          >
            + Add Person
          </button>
        </div>

        <div className="space-y-2">
          {otherPeople.map((person, idx) => (
            <div key={person.id} className="flex gap-2 items-start">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Person name"
                  value={person.name}
                  onChange={(e) => updatePerson(person.id, 'name', e.target.value)}
                  className={`${inputClass} ${errors[`person_name_${idx}`] ? 'border-red-400' : ''}`}
                />
                {errors[`person_name_${idx}`] && (
                  <p className={errorClass}>{errors[`person_name_${idx}`]}</p>
                )}
              </div>
              <div className="w-28">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="₹ amount"
                  value={person.amount}
                  onChange={(e) => updatePerson(person.id, 'amount', e.target.value)}
                  className={`${inputClass} ${errors[`person_amount_${idx}`] ? 'border-red-400' : ''}`}
                />
                {errors[`person_amount_${idx}`] && (
                  <p className={errorClass}>{errors[`person_amount_${idx}`]}</p>
                )}
              </div>
              {otherPeople.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePerson(person.id)}
                  className="flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  aria-label="Remove person"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {errors.otherPeople && (
          <p className={`${errorClass} mt-2`}>{errors.otherPeople}</p>
        )}
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
        Save Split Expense
      </button>
    </form>
  );
}
