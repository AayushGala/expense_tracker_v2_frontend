// Entry generators are no longer used client-side (Django handles entry generation).
// The balance computation and validation functions below are still used by hooks.
const generateId = () => crypto.randomUUID();

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
  const typeLookup = new Map();
  for (const account of accounts) {
    typeLookup.set(account.id, account.type);
  }
  for (const category of categories) {
    typeLookup.set(category.id, category.type);
  }

  // Collect every unique account ID referenced in entries
  const accountIds = new Set(entries.map((e) => e.account_id));

  const balances = new Map();

  for (const accountId of accountIds) {
    const totals = computeAccountBalance(entries, accountId);
    const accountType = typeLookup.get(accountId) ?? 'asset'; // default to debit-normal
    const balance = applySignConvention(totals, accountType);
    balances.set(accountId, balance);
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

// ---------------------------------------------------------------------------
// Entry generator helpers
// ---------------------------------------------------------------------------

/**
 * Creates a single entry object.
 *
 * @param {string} transactionId
 * @param {string} accountId
 * @param {number} amount
 * @param {string} entryType - ENTRY_TYPE.DEBIT | ENTRY_TYPE.CREDIT
 * @returns {Object}
 */
function makeEntry(transactionId, accountId, amount, entryType) {
  return {
    id: generateId('entry'),
    transaction_id: transactionId,
    account_id: accountId,
    amount: Math.round(amount * 100) / 100,
    entry_type: entryType,
    created_at: new Date().toISOString(),
  };
}

/**
 * Expense: money flows OUT of an asset account INTO an expense category.
 *   DEBIT  expense category  (expense increases)
 *   CREDIT asset account     (asset decreases)
 *
 * @param {string} txnId
 * @param {number} amount
 * @param {string} fromAccountId - asset account being debited (paid from)
 * @param {string} categoryId    - expense category account
 * @returns {Array<Object>}
 */
export function generateExpenseEntries(txnId, amount, fromAccountId, categoryId) {
  return [
    makeEntry(txnId, categoryId, amount, ENTRY_TYPE.DEBIT),
    makeEntry(txnId, fromAccountId, amount, ENTRY_TYPE.CREDIT),
  ];
}

/**
 * Income: money flows INTO an asset account FROM an income category.
 *   DEBIT  asset account    (asset increases)
 *   CREDIT income category  (income increases)
 *
 * @param {string} txnId
 * @param {number} amount
 * @param {string} toAccountId - asset account receiving the income
 * @param {string} categoryId  - income category account
 * @returns {Array<Object>}
 */
export function generateIncomeEntries(txnId, amount, toAccountId, categoryId) {
  return [
    makeEntry(txnId, toAccountId, amount, ENTRY_TYPE.DEBIT),
    makeEntry(txnId, categoryId, amount, ENTRY_TYPE.CREDIT),
  ];
}

/**
 * Transfer: money moves between two asset accounts.
 *   DEBIT  toAccount   (destination asset increases)
 *   CREDIT fromAccount (source asset decreases)
 *
 * @param {string} txnId
 * @param {number} amount
 * @param {string} fromAccountId
 * @param {string} toAccountId
 * @returns {Array<Object>}
 */
export function generateTransferEntries(txnId, amount, fromAccountId, toAccountId) {
  return [
    makeEntry(txnId, toAccountId, amount, ENTRY_TYPE.DEBIT),
    makeEntry(txnId, fromAccountId, amount, ENTRY_TYPE.CREDIT),
  ];
}

/**
 * Bill payment: paying off a liability using an asset account.
 * Structurally identical to a transfer — debit the liability, credit the asset.
 *   DEBIT  liability account  (liability decreases)
 *   CREDIT asset account      (asset decreases)
 *
 * @param {string} txnId
 * @param {number} amount
 * @param {string} fromAccountId - asset account used to pay
 * @param {string} toAccountId   - liability account being paid off
 * @returns {Array<Object>}
 */
export function generateBillPaymentEntries(txnId, amount, fromAccountId, toAccountId) {
  return [
    makeEntry(txnId, toAccountId, amount, ENTRY_TYPE.DEBIT),
    makeEntry(txnId, fromAccountId, amount, ENTRY_TYPE.CREDIT),
  ];
}

/**
 * Investment: moving money from a liquid asset account into an investment account.
 * Structurally identical to a transfer.
 *   DEBIT  investment account (destination increases)
 *   CREDIT source account     (source decreases)
 *
 * @param {string} txnId
 * @param {number} amount
 * @param {string} fromAccountId - liquid asset being debited
 * @param {string} toAccountId   - investment account receiving funds
 * @returns {Array<Object>}
 */
export function generateInvestmentEntries(txnId, amount, fromAccountId, toAccountId) {
  return [
    makeEntry(txnId, toAccountId, amount, ENTRY_TYPE.DEBIT),
    makeEntry(txnId, fromAccountId, amount, ENTRY_TYPE.CREDIT),
  ];
}

/**
 * Cashback: receiving cashback credit into an asset account.
 *   DEBIT  asset account          (asset increases)
 *   CREDIT cashback income category (income increases)
 *
 * @param {string} txnId
 * @param {number} amount
 * @param {string} accountId   - asset account receiving the cashback
 * @param {string} categoryId  - cashback income category
 * @returns {Array<Object>}
 */
export function generateCashbackEntries(txnId, amount, accountId, categoryId) {
  return [
    makeEntry(txnId, accountId, amount, ENTRY_TYPE.DEBIT),
    makeEntry(txnId, categoryId, amount, ENTRY_TYPE.CREDIT),
  ];
}

/**
 * Split expense: pays the full bill from an asset account, records my share as an
 * expense, and records the remainder as a receivable (money owed back to me).
 *
 *   DEBIT  expense category       myShare              (my expense)
 *   DEBIT  receivable account     (totalAmount-myShare) (others owe me)
 *   CREDIT asset account          totalAmount           (total paid out)
 *
 * @param {string} txnId
 * @param {number} totalAmount        - full bill amount paid
 * @param {number} myShare            - portion that is my expense
 * @param {string} fromAccountId      - asset account used to pay
 * @param {string} categoryId         - expense category for my share
 * @param {string} receivableAccountId - receivable account for the outstanding amount
 * @returns {Array<Object>}
 */
export function generateSplitExpenseEntries(
  txnId,
  totalAmount,
  myShare,
  fromAccountId,
  categoryId,
  receivableAccountId
) {
  const othersShare = Math.round((totalAmount - myShare) * 100) / 100;
  return [
    makeEntry(txnId, categoryId, myShare, ENTRY_TYPE.DEBIT),
    makeEntry(txnId, receivableAccountId, othersShare, ENTRY_TYPE.DEBIT),
    makeEntry(txnId, fromAccountId, totalAmount, ENTRY_TYPE.CREDIT),
  ];
}

/**
 * Reimbursement: receiving repayment from someone, settling a receivable.
 *   DEBIT  asset account      (asset increases — money received)
 *   CREDIT receivable account (receivable decreases — debt settled)
 *
 * @param {string} txnId
 * @param {number} amount
 * @param {string} toAccountId         - asset account receiving the payment
 * @param {string} receivableAccountId - receivable account being cleared
 * @returns {Array<Object>}
 */
export function generateReimbursementEntries(txnId, amount, toAccountId, receivableAccountId) {
  return [
    makeEntry(txnId, toAccountId, amount, ENTRY_TYPE.DEBIT),
    makeEntry(txnId, receivableAccountId, amount, ENTRY_TYPE.CREDIT),
  ];
}
