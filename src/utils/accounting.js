// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ENTRY_TYPE = {
  DEBIT: 'DEBIT',
  CREDIT: 'CREDIT',
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validates that a set of journal entries is balanced (total debits === total credits).
 *
 * @param {Array<{amount: number, entry_type: string}>} entries
 * @returns {{ valid: boolean, totalDebits: number, totalCredits: number, difference: number }}
 */
export function validateEntries(entries) {
  let totalDebits = 0;
  let totalCredits = 0;

  for (const entry of entries) {
    if (entry.entry_type === ENTRY_TYPE.DEBIT) {
      totalDebits += entry.amount;
    } else if (entry.entry_type === ENTRY_TYPE.CREDIT) {
      totalCredits += entry.amount;
    }
  }

  // Round to 2 decimal places to avoid floating-point comparison issues
  totalDebits = Math.round(totalDebits * 100) / 100;
  totalCredits = Math.round(totalCredits * 100) / 100;
  const difference = Math.round((totalDebits - totalCredits) * 100) / 100;

  return {
    valid: difference === 0,
    totalDebits,
    totalCredits,
    difference,
  };
}

// ---------------------------------------------------------------------------
// Balance computation helpers
// ---------------------------------------------------------------------------

/**
 * Computes the raw debit and credit totals for a specific account across all
 * provided entries.  Sign logic is intentionally omitted here — the caller
 * (computeAllBalances) applies the correct sign based on account type.
 *
 * @param {Array<{account_id: string, amount: number, entry_type: string}>} entries
 * @param {string} accountId
 * @returns {{ debits: number, credits: number }}
 */
export function computeAccountBalance(entries, accountId) {
  let debits = 0;
  let credits = 0;

  for (const entry of entries) {
    if (entry.account_id !== accountId) continue;
    if (entry.entry_type === ENTRY_TYPE.DEBIT) {
      debits += entry.amount;
    } else if (entry.entry_type === ENTRY_TYPE.CREDIT) {
      credits += entry.amount;
    }
  }

  return {
    debits: Math.round(debits * 100) / 100,
    credits: Math.round(credits * 100) / 100,
  };
}

/**
 * Determines the signed balance for an account given its raw debit/credit totals.
 *
 * Normal balance conventions:
 *   Assets, Receivables, Expenses  → debits increase balance (debits - credits)
 *   Liabilities, Income, Equity    → credits increase balance (credits - debits)
 *
 * @param {{ debits: number, credits: number }} totals
 * @param {string} accountType - "asset" | "liability" | "equity" | "expense" | "income" | "receivable"
 * @returns {number}
 */
function applySignConvention(totals, accountType) {
  const { debits, credits } = totals;
  switch (accountType) {
    case 'asset':
    case 'receivable':
    case 'expense':
      return Math.round((debits - credits) * 100) / 100;
    case 'liability':
    case 'income':
    case 'equity':
      return Math.round((credits - debits) * 100) / 100;
    default:
      // Unknown type — return debit-normal as a safe default
      return Math.round((debits - credits) * 100) / 100;
  }
}

/**
 * Computes the signed balance for every account (real accounts + categories used as
 * accounts in entries) and returns a Map of accountId -> balance.
 *
 * Real accounts are identified by the "a_" prefix and carry a `type` field
 * ("asset", "liability", "equity", "receivable").
 *
 * Categories are identified by the "cat_" prefix and carry a `type` field
 * ("expense", "income").
 *
 * @param {Array<{account_id: string, amount: number, entry_type: string}>} entries
 * @param {Array<{id: string, type: string}>} accounts  - real accounts (a_ prefix)
 * @param {Array<{id: string, type: string}>} categories - category accounts (c_ prefix)
 * @returns {Map<string, number>} Map of accountId -> signed balance
 */
export function computeAllBalances(entries, accounts, categories) {
  // Build a lookup map: id -> type
  const accountTypeLookup = new Map();
  for (const account of accounts) {
    accountTypeLookup.set(account.id, account.type);
  }
  const categoryTypeLookup = new Map();
  for (const category of categories) {
    categoryTypeLookup.set(category.id, category.type);
  }

  const balances = new Map();

  // Compute balances for real accounts (using account_id)
  const accountIds = new Set(
    entries.map((e) => e.account_id).filter((id) => id != null)
  );
  for (const accountId of accountIds) {
    const totals = computeAccountBalance(entries, accountId);
    const accountType = accountTypeLookup.get(accountId) ?? 'asset';
    const balance = applySignConvention(totals, accountType);
    balances.set(accountId, balance);
  }

  // Compute balances for categories (using category_id)
  const categoryIds = new Set(
    entries.map((e) => e.category_id).filter((id) => id != null)
  );
  for (const categoryId of categoryIds) {
    let debits = 0;
    let credits = 0;
    for (const entry of entries) {
      if (entry.category_id !== categoryId) continue;
      if (entry.entry_type === ENTRY_TYPE.DEBIT) debits += entry.amount;
      else if (entry.entry_type === ENTRY_TYPE.CREDIT) credits += entry.amount;
    }
    const totals = {
      debits: Math.round(debits * 100) / 100,
      credits: Math.round(credits * 100) / 100,
    };
    const categoryType = categoryTypeLookup.get(categoryId) ?? 'expense';
    const balance = applySignConvention(totals, categoryType);
    balances.set(categoryId, balance);
  }

  return balances;
}

/**
 * Computes net worth as: sum of asset/receivable balances − sum of liability balances.
 * Income, expense, and equity accounts are excluded from the net-worth calculation.
 *
 * @param {Map<string, number>} balances - from computeAllBalances
 * @param {Array<{id: string, type: string}>} accounts - real accounts only
 * @returns {number}
 */
export function computeNetWorth(balances, accounts) {
  let netWorth = 0;

  for (const account of accounts) {
    const balance = balances.get(account.id) ?? 0;
    switch (account.type) {
      case 'asset':
      case 'receivable':
        netWorth += balance;
        break;
      case 'liability':
        netWorth -= balance;
        break;
      // equity, expense, income — not included in net worth
      default:
        break;
    }
  }

  return Math.round(netWorth * 100) / 100;
}

