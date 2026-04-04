import { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import api from '../api/client';

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState = {
  accounts: [],
  categories: [],
  transactions: [],
  entries: [],
  receivables: [],
  budgets: [],
  accountTypes: [],
  settings: {},
  isLoading: true,
  error: null,
};

// ---------------------------------------------------------------------------
// Action types
// ---------------------------------------------------------------------------

const SET_DATA            = 'SET_DATA';
const SET_LOADING         = 'SET_LOADING';
const SET_ERROR           = 'SET_ERROR';
const ADD_TRANSACTION     = 'ADD_TRANSACTION';
const UPDATE_TRANSACTION  = 'UPDATE_TRANSACTION';
const DELETE_TRANSACTION  = 'DELETE_TRANSACTION';
const ADD_ACCOUNT         = 'ADD_ACCOUNT';
const UPDATE_ACCOUNT      = 'UPDATE_ACCOUNT';
const ADD_CATEGORY        = 'ADD_CATEGORY';
const UPDATE_CATEGORY     = 'UPDATE_CATEGORY';
const DELETE_CATEGORY     = 'DELETE_CATEGORY';
const ADD_RECEIVABLE      = 'ADD_RECEIVABLE';
const UPDATE_RECEIVABLE   = 'UPDATE_RECEIVABLE';
const SET_ACCOUNT_TYPES   = 'SET_ACCOUNT_TYPES';
const SET_SETTINGS        = 'SET_SETTINGS';

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function dataReducer(state, action) {
  switch (action.type) {
    case SET_DATA: {
      const { settings, ...rest } = action.payload;
      // settings may be an object already (from Django) or an array (legacy)
      const settingsObj = Array.isArray(settings)
        ? settings.reduce((acc, { key, value }) => { acc[key] = value; return acc; }, {})
        : (settings ?? {});
      return {
        ...state,
        ...rest,
        accountTypes: state.accountTypes,
        settings: settingsObj,
        isLoading: false,
        error: null,
      };
    }

    case SET_LOADING:
      return { ...state, isLoading: action.payload };

    case SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };

    // --- Transactions ---

    case ADD_TRANSACTION: {
      const { transaction, entries, receivables = [] } = action.payload;
      return {
        ...state,
        transactions: [...state.transactions, transaction],
        entries: [...state.entries, ...entries],
        receivables: [...state.receivables, ...receivables],
      };
    }

    case UPDATE_TRANSACTION: {
      const { id, transaction, newEntries } = action.payload;
      const transactions = state.transactions.map((t) =>
        t.id === id ? { ...t, ...transaction } : t
      );
      const entriesWithoutOld = state.entries.filter((e) => e.transaction_id !== id);
      return {
        ...state,
        transactions,
        entries: [...entriesWithoutOld, ...newEntries],
      };
    }

    case DELETE_TRANSACTION: {
      const { id } = action.payload;
      return {
        ...state,
        transactions: state.transactions.filter((t) => t.id !== id),
        entries: state.entries.filter((e) => e.transaction_id !== id),
      };
    }

    // --- Accounts ---

    case ADD_ACCOUNT:
      return { ...state, accounts: [...state.accounts, action.payload] };

    case UPDATE_ACCOUNT: {
      const { id, data } = action.payload;
      return {
        ...state,
        accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...data } : a)),
      };
    }

    // --- Categories ---

    case ADD_CATEGORY:
      return { ...state, categories: [...state.categories, action.payload] };

    case UPDATE_CATEGORY: {
      const { id, data } = action.payload;
      return {
        ...state,
        categories: state.categories.map((c) => (c.id === id ? { ...c, ...data } : c)),
      };
    }

    case DELETE_CATEGORY:
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.payload),
      };

    // --- Receivables ---

    case ADD_RECEIVABLE:
      return { ...state, receivables: [...state.receivables, action.payload] };

    case UPDATE_RECEIVABLE: {
      const { id, data } = action.payload;
      return {
        ...state,
        receivables: state.receivables.map((r) => (r.id === id ? { ...r, ...data } : r)),
      };
    }

    // --- Account Types ---

    case SET_ACCOUNT_TYPES:
      return { ...state, accountTypes: action.payload };

    // --- Settings ---

    case SET_SETTINGS: {
      const { key, value } = action.payload;
      return {
        ...state,
        settings: { ...state.settings, [key]: value },
      };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Transform helpers — map Django API response to frontend expected shape
// ---------------------------------------------------------------------------

function transformEntry(e) {
  return {
    ...e,
    transaction_id: e.transaction,
    account_id: e.account ?? e.category,
    amount: typeof e.amount === 'string' ? parseFloat(e.amount) : e.amount,
  };
}

function transformTransaction(t) {
  return {
    ...t,
    category_id: t.category,
  };
}

function transformReceivable(r) {
  return {
    ...r,
    transaction_id: r.transaction,
    amount_owed: typeof r.amount_owed === 'string' ? parseFloat(r.amount_owed) : r.amount_owed,
    amount_settled: typeof r.amount_settled === 'string' ? parseFloat(r.amount_settled) : r.amount_settled,
  };
}

function transformBudget(b) {
  return {
    ...b,
    amount: typeof b.amount === 'string' ? parseFloat(b.amount) : b.amount,
  };
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const DataContext = createContext(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function DataProvider({ children }) {
  const [state, dispatch] = useReducer(dataReducer, initialState);

  // ---------------------------------------------------------------------------
  // loadData
  // ---------------------------------------------------------------------------

  const loadData = useCallback(async () => {
    dispatch({ type: SET_LOADING, payload: true });
    try {
      const data = await api.getAllData();
      dispatch({
        type: SET_DATA,
        payload: {
          accounts: data.accounts ?? [],
          categories: data.categories ?? [],
          transactions: (data.transactions ?? []).map(transformTransaction),
          entries: (data.entries ?? []).map(transformEntry),
          receivables: (data.receivables ?? []).map(transformReceivable),
          budgets: (data.budgets ?? []).map(transformBudget),
          settings: data.settings ?? {},
        },
      });
    } catch (err) {
      console.error('DataContext: loadData failed', err);
      dispatch({ type: SET_ERROR, payload: err.message ?? String(err) });
    }
  }, []);

  const syncAll = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // Transactions
  // ---------------------------------------------------------------------------

  const addTransaction = useCallback(async (transactionData) => {
    const result = await api.createTransaction(transactionData);

    const transaction = transformTransaction(result);
    const entries = (result.entries ?? []).map(transformEntry);
    const receivables = (result.receivables ?? []).map(transformReceivable);

    dispatch({
      type: ADD_TRANSACTION,
      payload: { transaction, entries, receivables },
    });

    return result;
  }, []);

  const updateTransaction = useCallback(async (id, transactionData) => {
    const result = await api.updateTransaction(id, transactionData);

    const transaction = transformTransaction(result);
    const newEntries = (result.entries ?? []).map(transformEntry);

    dispatch({
      type: UPDATE_TRANSACTION,
      payload: { id, transaction, newEntries },
    });

    return result;
  }, []);

  const deleteTransaction = useCallback(async (id) => {
    await api.deleteTransaction(id);
    dispatch({ type: DELETE_TRANSACTION, payload: { id } });
  }, []);

  // ---------------------------------------------------------------------------
  // Accounts
  // ---------------------------------------------------------------------------

  const addAccount = useCallback(async (accountData) => {
    const result = await api.createAccount(accountData);
    dispatch({ type: ADD_ACCOUNT, payload: result });
    return result;
  }, []);

  const updateAccount = useCallback(async (id, data) => {
    const result = await api.updateAccount(id, data);
    dispatch({ type: UPDATE_ACCOUNT, payload: { id, data: result } });
    return result;
  }, []);

  // ---------------------------------------------------------------------------
  // Categories
  // ---------------------------------------------------------------------------

  const addCategory = useCallback(async (categoryData) => {
    const result = await api.createCategory(categoryData);
    dispatch({ type: ADD_CATEGORY, payload: result });
    return result;
  }, []);

  const updateCategory = useCallback(async (id, data) => {
    const result = await api.updateCategory(id, data);
    dispatch({ type: UPDATE_CATEGORY, payload: { id, data: result } });
    return result;
  }, []);

  const deleteCategory = useCallback(async (id) => {
    await api.deleteCategory(id);
    // Reload all data so orphaned children (parent set to null) are updated
    await loadData();
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // Receivables
  // ---------------------------------------------------------------------------

  const updateReceivable = useCallback(async (id, data) => {
    const result = await api.updateReceivable(id, data);
    dispatch({ type: UPDATE_RECEIVABLE, payload: { id, data: transformReceivable(result) } });
    return result;
  }, []);

  // ---------------------------------------------------------------------------
  // Account Types & Sub-Types
  // ---------------------------------------------------------------------------

  const loadAccountTypes = useCallback(async () => {
    try {
      const data = await api.getAccountTypes();
      // Handle both paginated ({ results: [...] }) and plain array responses
      const list = Array.isArray(data) ? data : (data.results ?? []);
      dispatch({ type: SET_ACCOUNT_TYPES, payload: list });
    } catch (err) {
      console.error('DataContext: loadAccountTypes failed', err);
    }
  }, []);

  const addAccountType = useCallback(async (data) => {
    await api.createAccountType(data);
    await loadAccountTypes();
  }, [loadAccountTypes]);

  const updateAccountType = useCallback(async (id, data) => {
    await api.updateAccountType(id, data);
    await loadAccountTypes();
  }, [loadAccountTypes]);

  const deleteAccountType = useCallback(async (id) => {
    await api.deleteAccountType(id);
    await loadAccountTypes();
  }, [loadAccountTypes]);

  const addAccountSubType = useCallback(async (data) => {
    await api.createAccountSubType(data);
    await loadAccountTypes();
  }, [loadAccountTypes]);

  const updateAccountSubType = useCallback(async (id, data) => {
    await api.updateAccountSubType(id, data);
    await loadAccountTypes();
  }, [loadAccountTypes]);

  const deleteAccountSubType = useCallback(async (id) => {
    await api.deleteAccountSubType(id);
    await loadAccountTypes();
  }, [loadAccountTypes]);

  // Auto-load data on mount
  useEffect(() => {
    loadData();
    loadAccountTypes();
  }, [loadData, loadAccountTypes]);

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------

  const updateSettings = useCallback(async (key, value) => {
    dispatch({ type: SET_SETTINGS, payload: { key, value } });
    try {
      await api.updateSetting(key, value);
    } catch (err) {
      console.error('DataContext: updateSettings failed', err);
      await loadData();
    }
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // Context value
  // ---------------------------------------------------------------------------

  const value = {
    ...state,
    loadData,
    syncAll,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addAccount,
    updateAccount,
    addCategory,
    updateCategory,
    deleteCategory,
    updateReceivable,
    addAccountType,
    updateAccountType,
    deleteAccountType,
    addAccountSubType,
    updateAccountSubType,
    deleteAccountSubType,
    updateSettings,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useData() {
  const ctx = useContext(DataContext);
  if (ctx === null) {
    throw new Error('useData must be used inside a <DataProvider>');
  }
  return ctx;
}
