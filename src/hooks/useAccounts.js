import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { computeAllBalances, computeNetWorth } from '../utils/accounting';

/**
 * Custom hook that exposes account data, grouped accounts, balances, net worth,
 * and per-account ledger views built from the global DataContext.
 */
export function useAccounts() {
  const { accounts, categories, entries, transactions } = useData();

  // Only surface accounts that haven't been soft-deleted
  const activeAccounts = useMemo(
    () => accounts.filter((a) => !a._removed),
    [accounts]
  );

  // Group active accounts by type
  const accountsByType = useMemo(() => {
    const grouped = { asset: [], liability: [], receivable: [] };
    for (const account of activeAccounts) {
      const key = account.type;
      if (Object.prototype.hasOwnProperty.call(grouped, key)) {
        grouped[key].push(account);
      }
    }
    return grouped;
  }, [activeAccounts]);

  // Compute signed balances for every account and category referenced in entries
  const balances = useMemo(
    () => computeAllBalances(entries, activeAccounts, categories),
    [entries, activeAccounts, categories]
  );

  // Net worth: assets + receivables − liabilities
  const netWorth = useMemo(
    () => computeNetWorth(balances, activeAccounts),
    [balances, activeAccounts]
  );

  /**
   * Returns the signed balance for a single account.
   * @param {string} accountId
   * @returns {number}
   */
  function getAccountBalance(accountId) {
    return balances.get(accountId) ?? 0;
  }

  /**
   * Returns all ledger entries for an account sorted by transaction date (ascending),
   * each entry enriched with a running balance and the parent transaction's date.
   *
   * @param {string} accountId
   * @returns {Array<Object>}
   */
  function getAccountLedger(accountId) {
    // Build a quick lookup from transaction id → date
    const txnDateMap = new Map(transactions.map((t) => [t.id, t.date]));

    const accountEntries = entries
      .filter((e) => e.account_id === accountId)
      .map((e) => ({
        ...e,
        date: txnDateMap.get(e.transaction_id) ?? e.created_at,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Determine the account type to apply correct sign convention for running balance
    const account = activeAccounts.find((a) => a.id === accountId);
    const isDebitNormal =
      !account || account.type === 'asset' || account.type === 'receivable';

    let runningBalance = 0;
    return accountEntries.map((entry) => {
      const delta =
        entry.entry_type === 'DEBIT'
          ? isDebitNormal
            ? entry.amount
            : -entry.amount
          : isDebitNormal
          ? -entry.amount
          : entry.amount;

      runningBalance = Math.round((runningBalance + delta) * 100) / 100;
      return { ...entry, runningBalance };
    });
  }

  return {
    accounts: activeAccounts,
    accountsByType,
    balances,
    netWorth,
    getAccountBalance,
    getAccountLedger,
  };
}
