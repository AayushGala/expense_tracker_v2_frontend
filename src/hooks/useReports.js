import { useMemo } from 'react';
import { useData } from '../context/DataContext';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns "YYYY-MM" from a date string or Date object. */
function toMonthKey(dateStr) {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Returns the "YYYY-MM" key for a month that is `offset` months before today. */
function monthOffset(offset) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - offset);
  return toMonthKey(d);
}

/** Generates an ordered array of month keys from oldest to newest (inclusive). */
function generateMonthKeys(count) {
  const keys = [];
  for (let i = count - 1; i >= 0; i--) {
    keys.push(monthOffset(i));
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Report aggregation hook.  All returned functions are stable references
 * (created inside useMemo or directly as closures over memoised data).
 */
export function useReports() {
  const { transactions, entries, categories, receivables } = useData();

  // ── Pre-computed lookup tables ────────────────────────────────────────────

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  // Map txnId → transaction (for quick lookup of date and type)
  const txnMap = useMemo(
    () => new Map(transactions.map((t) => [t.id, t])),
    [transactions]
  );

  // Expense-type entries only (account_id is a category with type "expense")
  const expenseEntries = useMemo(
    () =>
      entries.filter((e) => {
        const cat = categoryMap.get(e.account_id);
        return cat?.type === 'expense' && e.entry_type === 'DEBIT';
      }),
    [entries, categoryMap]
  );

  // Income-type entries only (account_id is a category with type "income")
  const incomeEntries = useMemo(
    () =>
      entries.filter((e) => {
        const cat = categoryMap.get(e.account_id);
        return cat?.type === 'income' && e.entry_type === 'CREDIT';
      }),
    [entries, categoryMap]
  );

  // Investment transactions
  const investmentTxns = useMemo(
    () => transactions.filter((t) => t.type === 'investment'),
    [transactions]
  );

  // ── monthlySpending ───────────────────────────────────────────────────────

  /**
   * Returns expense totals per month for the last `months` months.
   * Optionally filtered to a specific beneficiary and/or owner.
   *
   * @param {string} [beneficiary]
   * @param {number} [months=12]
   * @param {string} [owner]
   * @returns {Array<{ month: string, total: number }>}
   */
  function monthlySpending(beneficiary, months = 12, owner) {
    const keys = generateMonthKeys(months);
    const totals = Object.fromEntries(keys.map((k) => [k, 0]));

    for (const entry of expenseEntries) {
      const txn = txnMap.get(entry.transaction_id);
      if (!txn) continue;
      if (beneficiary && txn.beneficiary !== beneficiary) continue;
      if (owner && txn.owner !== owner) continue;

      const key = toMonthKey(txn.date);
      if (Object.prototype.hasOwnProperty.call(totals, key)) {
        totals[key] = Math.round((totals[key] + entry.amount) * 100) / 100;
      }
    }

    return keys.map((month) => ({ month, total: totals[month] }));
  }

  // ── categoryBreakdown ─────────────────────────────────────────────────────

  /**
   * Returns expense totals by category for a specific month.
   * Defaults to the current month.
   *
   * @param {string} [beneficiary]
   * @param {string} [month] - "YYYY-MM", defaults to current month
   * @param {string} [owner]
   * @returns {Array<{ categoryId: string, categoryName: string, total: number }>}
   */
  function categoryBreakdown(beneficiary, month, owner) {
    const targetMonth = month ?? toMonthKey(new Date());
    const totals = new Map(); // categoryId → number

    for (const entry of expenseEntries) {
      const txn = txnMap.get(entry.transaction_id);
      if (!txn) continue;
      if (toMonthKey(txn.date) !== targetMonth) continue;
      if (beneficiary && txn.beneficiary !== beneficiary) continue;
      if (owner && txn.owner !== owner) continue;

      const prev = totals.get(entry.account_id) ?? 0;
      totals.set(
        entry.account_id,
        Math.round((prev + entry.amount) * 100) / 100
      );
    }

    return Array.from(totals.entries()).map(([categoryId, total]) => ({
      categoryId,
      categoryName: categoryMap.get(categoryId)?.name ?? categoryId,
      total,
    }));
  }

  // ── cashflow ──────────────────────────────────────────────────────────────

  /**
   * Returns income, expenses, and investment totals per month.
   * Optionally filtered by owner.
   *
   * @param {number} [months=12]
   * @param {string} [owner]
   * @returns {Array<{ month: string, income: number, expenses: number, investments: number }>}
   */
  function cashflow(months = 12, owner) {
    const keys = generateMonthKeys(months);
    const data = Object.fromEntries(
      keys.map((k) => [k, { income: 0, expenses: 0, investments: 0 }])
    );

    for (const entry of expenseEntries) {
      const txn = txnMap.get(entry.transaction_id);
      if (!txn) continue;
      if (owner && txn.owner !== owner) continue;
      const key = toMonthKey(txn.date);
      if (!data[key]) continue;
      data[key].expenses = Math.round((data[key].expenses + entry.amount) * 100) / 100;
    }

    for (const entry of incomeEntries) {
      const txn = txnMap.get(entry.transaction_id);
      if (!txn) continue;
      if (owner && txn.owner !== owner) continue;
      const key = toMonthKey(txn.date);
      if (!data[key]) continue;
      data[key].income = Math.round((data[key].income + entry.amount) * 100) / 100;
    }

    for (const txn of investmentTxns) {
      if (owner && txn.owner !== owner) continue;
      const key = toMonthKey(txn.date);
      if (!data[key]) continue;
      data[key].investments = Math.round(
        (data[key].investments + (txn.amount ?? 0)) * 100
      ) / 100;
    }

    return keys.map((month) => ({ month, ...data[month] }));
  }

  // ── spendingTrends ────────────────────────────────────────────────────────

  /**
   * Returns monthly expense totals, optionally filtered to a single category
   * and/or owner.
   *
   * @param {string} [categoryId]
   * @param {number} [months=12]
   * @param {string} [owner]
   * @returns {Array<{ month: string, total: number }>}
   */
  function spendingTrends(categoryId, months = 12, owner) {
    const keys = generateMonthKeys(months);
    const totals = Object.fromEntries(keys.map((k) => [k, 0]));

    for (const entry of expenseEntries) {
      if (categoryId && entry.account_id !== categoryId) continue;
      const txn = txnMap.get(entry.transaction_id);
      if (!txn) continue;
      if (owner && txn.owner !== owner) continue;
      const key = toMonthKey(txn.date);
      if (!Object.prototype.hasOwnProperty.call(totals, key)) continue;
      totals[key] = Math.round((totals[key] + entry.amount) * 100) / 100;
    }

    return keys.map((month) => ({ month, total: totals[month] }));
  }

  // ── receivablesSummary ────────────────────────────────────────────────────

  /**
   * Returns the total outstanding receivable amount and a per-person breakdown.
   *
   * @returns {{ totalOwed: number, byPerson: Array<{ person: string, amount: number }> }}
   */
  function receivablesSummary() {
    const outstanding = receivables.filter(
      (r) => r.status !== 'settled' && r.status !== 'paid'
    );

    const personMap = new Map(); // person name → outstanding amount
    for (const r of outstanding) {
      const name = r.person_name ?? 'Unknown';
      const prev = personMap.get(name) ?? 0;
      const remaining = (r.amount_owed ?? 0) - (r.amount_settled ?? 0);
      personMap.set(name, Math.round((prev + remaining) * 100) / 100);
    }

    const byPerson = Array.from(personMap.entries()).map(([person, amount]) => ({
      person,
      amount,
    }));

    const totalOwed = byPerson.reduce((sum, p) => sum + p.amount, 0);

    return {
      totalOwed: Math.round(totalOwed * 100) / 100,
      byPerson,
    };
  }

  return {
    monthlySpending,
    categoryBreakdown,
    cashflow,
    spendingTrends,
    receivablesSummary,
  };
}
