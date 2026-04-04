import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { DataProvider, useData } from './DataContext';
import {
  MOCK_ALL_DATA,
  MOCK_ACCOUNT_TYPES,
  MOCK_PAGINATED_ACCOUNT_TYPES,
  createMockApi,
} from '../test/helpers';

// ---------------------------------------------------------------------------
// Mock the api module
// ---------------------------------------------------------------------------

let mockApi;

vi.mock('../api/client', () => {
  return {
    default: new Proxy(
      {},
      {
        get(_, prop) {
          // `mockApi` is reassigned per-test; the proxy always reads the live reference.
          return mockApi[prop];
        },
      }
    ),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrapper({ children }) {
  return <DataProvider>{children}</DataProvider>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DataContext', () => {
  beforeEach(() => {
    mockApi = createMockApi();
  });

  // -----------------------------------------------------------------------
  // Initial loading
  // -----------------------------------------------------------------------

  it('loads data and account types on mount', async () => {
    const { result } = renderHook(() => useData(), { wrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.accounts).toEqual(MOCK_ALL_DATA.accounts);
    expect(result.current.categories).toEqual(MOCK_ALL_DATA.categories);
    expect(result.current.accountTypes).toEqual(MOCK_ACCOUNT_TYPES);
    expect(mockApi.getAllData).toHaveBeenCalledTimes(1);
    expect(mockApi.getAccountTypes).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // accountTypes stays an array even when loadData runs
  // (Bug fix: SET_DATA was overwriting accountTypes with undefined)
  // -----------------------------------------------------------------------

  it('preserves accountTypes when SET_DATA runs', async () => {
    const { result } = renderHook(() => useData(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // accountTypes should be an array, not undefined
    expect(Array.isArray(result.current.accountTypes)).toBe(true);
    expect(result.current.accountTypes).toEqual(MOCK_ACCOUNT_TYPES);
  });

  // -----------------------------------------------------------------------
  // Handles paginated account types response
  // (Bug fix: DRF returns { count, next, previous, results })
  // -----------------------------------------------------------------------

  it('handles paginated account types response', async () => {
    mockApi = createMockApi({
      getAccountTypes: vi.fn().mockResolvedValue(MOCK_PAGINATED_ACCOUNT_TYPES),
    });

    const { result } = renderHook(() => useData(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should extract results array from paginated response
    expect(Array.isArray(result.current.accountTypes)).toBe(true);
    expect(result.current.accountTypes).toEqual(MOCK_ACCOUNT_TYPES);
  });

  // -----------------------------------------------------------------------
  // loadAccountTypes failure doesn't crash the app
  // (Bug fix: unhandled rejection was crashing React tree)
  // -----------------------------------------------------------------------

  it('does not crash when loadAccountTypes fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockApi = createMockApi({
      getAccountTypes: vi.fn().mockRejectedValue(new Error('Network error')),
    });

    const { result } = renderHook(() => useData(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should fall back to empty array, not crash
    expect(result.current.accountTypes).toEqual([]);
    expect(result.current.accounts).toEqual(MOCK_ALL_DATA.accounts);

    consoleSpy.mockRestore();
  });

  // -----------------------------------------------------------------------
  // loadData failure sets error state
  // -----------------------------------------------------------------------

  it('sets error state when loadData fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockApi = createMockApi({
      getAllData: vi.fn().mockRejectedValue(new Error('Server down')),
    });

    const { result } = renderHook(() => useData(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Server down');

    consoleSpy.mockRestore();
  });

  // -----------------------------------------------------------------------
  // Account CRUD
  // -----------------------------------------------------------------------

  it('adds an account', async () => {
    const { result } = renderHook(() => useData(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addAccount({ name: 'New', type: 'asset', sub_type: 'bank' });
    });

    expect(mockApi.createAccount).toHaveBeenCalledWith({ name: 'New', type: 'asset', sub_type: 'bank' });
    expect(result.current.accounts).toHaveLength(MOCK_ALL_DATA.accounts.length + 1);
  });

  it('updates an account', async () => {
    const { result } = renderHook(() => useData(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updateAccount(1, { name: 'Renamed' });
    });

    expect(mockApi.updateAccount).toHaveBeenCalledWith(1, { name: 'Renamed' });
  });

  // -----------------------------------------------------------------------
  // Category CRUD
  // -----------------------------------------------------------------------

  it('adds a category', async () => {
    const { result } = renderHook(() => useData(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addCategory({ name: 'Travel', type: 'expense' });
    });

    expect(mockApi.createCategory).toHaveBeenCalledWith({ name: 'Travel', type: 'expense' });
    expect(result.current.categories).toHaveLength(MOCK_ALL_DATA.categories.length + 1);
  });

  it('deletes a category and reloads data', async () => {
    const { result } = renderHook(() => useData(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteCategory(1);
    });

    expect(mockApi.deleteCategory).toHaveBeenCalledWith(1);
    // Should reload all data to pick up orphaned children
    expect(mockApi.getAllData).toHaveBeenCalledTimes(2); // initial + reload
  });

  // -----------------------------------------------------------------------
  // Account Type CRUD
  // -----------------------------------------------------------------------

  it('adds an account type and reloads', async () => {
    const { result } = renderHook(() => useData(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addAccountType({ name: 'equity', label: 'Equity' });
    });

    expect(mockApi.createAccountType).toHaveBeenCalledWith({ name: 'equity', label: 'Equity' });
    // Should reload account types after adding
    expect(mockApi.getAccountTypes).toHaveBeenCalledTimes(2); // initial + reload
  });

  it('deletes an account type and reloads', async () => {
    const { result } = renderHook(() => useData(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteAccountType(1);
    });

    expect(mockApi.deleteAccountType).toHaveBeenCalledWith(1);
    expect(mockApi.getAccountTypes).toHaveBeenCalledTimes(2);
  });

  // -----------------------------------------------------------------------
  // Account Sub-Type CRUD
  // -----------------------------------------------------------------------

  it('adds an account sub-type and reloads', async () => {
    const { result } = renderHook(() => useData(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addAccountSubType({ name: 'wallet', label: 'Wallet', account_type: 1 });
    });

    expect(mockApi.createAccountSubType).toHaveBeenCalledWith({ name: 'wallet', label: 'Wallet', account_type: 1 });
    expect(mockApi.getAccountTypes).toHaveBeenCalledTimes(2);
  });

  // -----------------------------------------------------------------------
  // Transaction CRUD
  // -----------------------------------------------------------------------

  it('adds a transaction with entries', async () => {
    mockApi.createTransaction.mockResolvedValue({
      id: 10,
      category: 1,
      entries: [{ id: 1, transaction: 10, account: 1, amount: '100.00' }],
      receivables: [],
    });

    const { result } = renderHook(() => useData(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addTransaction({ amount: 100 });
    });

    expect(result.current.transactions).toHaveLength(1);
    expect(result.current.entries).toHaveLength(1);
    // Transform should map transaction field to transaction_id
    expect(result.current.entries[0].transaction_id).toBe(10);
    // Transform should parse string amounts
    expect(result.current.entries[0].amount).toBe(100);
  });

  it('deletes a transaction and its entries', async () => {
    mockApi.createTransaction.mockResolvedValue({
      id: 10,
      category: 1,
      entries: [{ id: 1, transaction: 10, account: 1, amount: 100 }],
    });

    const { result } = renderHook(() => useData(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addTransaction({});
    });
    expect(result.current.transactions).toHaveLength(1);

    await act(async () => {
      await result.current.deleteTransaction(10);
    });
    expect(result.current.transactions).toHaveLength(0);
    expect(result.current.entries).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // Settings
  // -----------------------------------------------------------------------

  it('updates settings optimistically', async () => {
    const { result } = renderHook(() => useData(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.updateSettings('theme', 'dark');
    });

    // Optimistic update — should be immediate
    expect(result.current.settings.theme).toBe('dark');
    expect(mockApi.updateSetting).toHaveBeenCalledWith('theme', 'dark');
  });

  // -----------------------------------------------------------------------
  // useData outside provider
  // -----------------------------------------------------------------------

  it('throws when useData is used outside DataProvider', () => {
    // Suppress console.error from React for the expected error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useData());
    }).toThrow('useData must be used inside a <DataProvider>');

    consoleSpy.mockRestore();
  });
});
