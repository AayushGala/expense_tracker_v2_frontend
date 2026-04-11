import { describe, it, expect } from 'vitest';
import {
  ENTRY_TYPE,
  validateEntries,
  computeRawBalance,
  computeAccountBalances,
  computeCategoryBalances,
  computeNetWorth,
} from './accounting';

// ---------------------------------------------------------------------------
// validateEntries
// ---------------------------------------------------------------------------

describe('validateEntries', () => {
  it('returns valid for balanced entries', () => {
    const entries = [
      { amount: 100, entry_type: ENTRY_TYPE.DEBIT },
      { amount: 100, entry_type: ENTRY_TYPE.CREDIT },
    ];
    const result = validateEntries(entries);
    expect(result.valid).toBe(true);
    expect(result.totalDebits).toBe(100);
    expect(result.totalCredits).toBe(100);
    expect(result.difference).toBe(0);
  });

  it('returns invalid for unbalanced entries', () => {
    const entries = [
      { amount: 200, entry_type: ENTRY_TYPE.DEBIT },
      { amount: 50, entry_type: ENTRY_TYPE.CREDIT },
    ];
    const result = validateEntries(entries);
    expect(result.valid).toBe(false);
    expect(result.difference).toBe(150);
  });

  it('handles multiple entries that sum to balanced', () => {
    const entries = [
      { amount: 60, entry_type: ENTRY_TYPE.DEBIT },
      { amount: 40, entry_type: ENTRY_TYPE.DEBIT },
      { amount: 70, entry_type: ENTRY_TYPE.CREDIT },
      { amount: 30, entry_type: ENTRY_TYPE.CREDIT },
    ];
    const result = validateEntries(entries);
    expect(result.valid).toBe(true);
    expect(result.totalDebits).toBe(100);
    expect(result.totalCredits).toBe(100);
  });

  it('handles empty entries', () => {
    const result = validateEntries([]);
    expect(result.valid).toBe(true);
    expect(result.difference).toBe(0);
  });

  it('handles floating-point precision correctly', () => {
    const entries = [
      { amount: 0.1, entry_type: ENTRY_TYPE.DEBIT },
      { amount: 0.2, entry_type: ENTRY_TYPE.DEBIT },
      { amount: 0.3, entry_type: ENTRY_TYPE.CREDIT },
    ];
    const result = validateEntries(entries);
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computeRawBalance
// ---------------------------------------------------------------------------

describe('computeRawBalance', () => {
  it('computes debits and credits for a specific account', () => {
    const entries = [
      { account_id: 'a_1', amount: 500, entry_type: ENTRY_TYPE.DEBIT },
      { account_id: 'a_1', amount: 200, entry_type: ENTRY_TYPE.CREDIT },
      { account_id: 'a_2', amount: 300, entry_type: ENTRY_TYPE.DEBIT },
    ];
    const result = computeRawBalance(entries, 'a_1');
    expect(result.debits).toBe(500);
    expect(result.credits).toBe(200);
  });

  it('returns zeros for an account with no entries', () => {
    const entries = [
      { account_id: 'a_1', amount: 100, entry_type: ENTRY_TYPE.DEBIT },
    ];
    const result = computeRawBalance(entries, 'a_99');
    expect(result.debits).toBe(0);
    expect(result.credits).toBe(0);
  });

  it('handles mixed DEBIT/CREDIT entries for the same account', () => {
    const entries = [
      { account_id: 'a_1', amount: 100, entry_type: ENTRY_TYPE.DEBIT },
      { account_id: 'a_1', amount: 50, entry_type: ENTRY_TYPE.CREDIT },
      { account_id: 'a_1', amount: 75, entry_type: ENTRY_TYPE.DEBIT },
      { account_id: 'a_1', amount: 25, entry_type: ENTRY_TYPE.CREDIT },
    ];
    const result = computeRawBalance(entries, 'a_1');
    expect(result.debits).toBe(175);
    expect(result.credits).toBe(75);
  });
});

// ---------------------------------------------------------------------------
// computeAccountBalances
// ---------------------------------------------------------------------------

describe('computeAccountBalances', () => {
  it('computes signed balances for asset (debit-normal) accounts', () => {
    const entries = [
      { account_id: 'a_1', amount: 1000, entry_type: ENTRY_TYPE.DEBIT },
      { account_id: 'a_1', amount: 300, entry_type: ENTRY_TYPE.CREDIT },
    ];
    const accounts = [{ id: 'a_1', type: 'asset' }];
    const balances = computeAccountBalances(entries, accounts);
    expect(balances.get('a_1')).toBe(700);
  });

  it('computes signed balances for liability (credit-normal) accounts', () => {
    const entries = [
      { account_id: 'a_2', amount: 200, entry_type: ENTRY_TYPE.DEBIT },
      { account_id: 'a_2', amount: 800, entry_type: ENTRY_TYPE.CREDIT },
    ];
    const accounts = [{ id: 'a_2', type: 'liability' }];
    const balances = computeAccountBalances(entries, accounts);
    expect(balances.get('a_2')).toBe(600);
  });

  it('handles multiple accounts of different types', () => {
    const entries = [
      { account_id: 'a_1', amount: 5000, entry_type: ENTRY_TYPE.DEBIT },
      { account_id: 'a_2', amount: 3000, entry_type: ENTRY_TYPE.CREDIT },
      { account_id: 'a_3', amount: 2000, entry_type: ENTRY_TYPE.DEBIT },
    ];
    const accounts = [
      { id: 'a_1', type: 'asset' },
      { id: 'a_2', type: 'liability' },
      { id: 'a_3', type: 'receivable' },
    ];
    const balances = computeAccountBalances(entries, accounts);
    expect(balances.get('a_1')).toBe(5000);
    expect(balances.get('a_2')).toBe(3000);
    expect(balances.get('a_3')).toBe(2000);
  });

  it('does not include category entries in account balances', () => {
    const entries = [
      { account_id: 1, amount: 1000, entry_type: ENTRY_TYPE.DEBIT },
      { account_id: null, category_id: 1, amount: 1000, entry_type: ENTRY_TYPE.CREDIT },
    ];
    const accounts = [{ id: 1, type: 'asset' }];
    const balances = computeAccountBalances(entries, accounts);
    // Only the account entry counts, category entry has account_id: null
    expect(balances.get(1)).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// computeCategoryBalances
// ---------------------------------------------------------------------------

describe('computeCategoryBalances', () => {
  it('computes expense category as debit-normal', () => {
    const entries = [
      { category_id: 'cat_1', amount: 500, entry_type: ENTRY_TYPE.DEBIT },
      { category_id: 'cat_1', amount: 100, entry_type: ENTRY_TYPE.CREDIT },
    ];
    const categories = [{ id: 'cat_1', type: 'expense' }];
    const balances = computeCategoryBalances(entries, categories);
    expect(balances.get('cat_1')).toBe(400);
  });

  it('computes income category as credit-normal', () => {
    const entries = [
      { category_id: 'cat_2', amount: 50, entry_type: ENTRY_TYPE.DEBIT },
      { category_id: 'cat_2', amount: 1000, entry_type: ENTRY_TYPE.CREDIT },
    ];
    const categories = [{ id: 'cat_2', type: 'income' }];
    const balances = computeCategoryBalances(entries, categories);
    expect(balances.get('cat_2')).toBe(950);
  });
});

// ---------------------------------------------------------------------------
// computeNetWorth
// ---------------------------------------------------------------------------

describe('computeNetWorth', () => {
  it('computes net worth as assets + receivables - liabilities', () => {
    const accounts = [
      { id: 'a_1', type: 'asset' },
      { id: 'a_2', type: 'receivable' },
      { id: 'a_3', type: 'liability' },
    ];
    const balances = new Map([
      ['a_1', 10000],
      ['a_2', 2000],
      ['a_3', 5000],
    ]);
    // 10000 + 2000 - 5000 = 7000
    expect(computeNetWorth(balances, accounts)).toBe(7000);
  });

  it('excludes income, expense, and equity accounts', () => {
    const accounts = [
      { id: 'a_1', type: 'asset' },
      { id: 'a_2', type: 'income' },
      { id: 'a_3', type: 'expense' },
      { id: 'a_4', type: 'equity' },
    ];
    const balances = new Map([
      ['a_1', 5000],
      ['a_2', 3000],
      ['a_3', 1000],
      ['a_4', 2000],
    ]);
    // Only asset counts: 5000
    expect(computeNetWorth(balances, accounts)).toBe(5000);
  });

  it('returns 0 when no accounts are provided', () => {
    expect(computeNetWorth(new Map(), [])).toBe(0);
  });

  it('handles accounts with no balance in the map (defaults to 0)', () => {
    const accounts = [{ id: 'a_1', type: 'asset' }];
    const balances = new Map(); // no entry for a_1
    expect(computeNetWorth(balances, accounts)).toBe(0);
  });
});
