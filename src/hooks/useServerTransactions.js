import { useState, useEffect, useMemo, useCallback } from 'react';
import { useData } from '../context/DataContext';
import api from '../api/client';

/**
 * Hook that fetches transactions from the backend with server-side filtering
 * and pagination. Enriches results with in-memory account/category/entry data.
 *
 * @param {Object} filters - Filter params matching backend query params
 * @param {number} page - Current page number (1-based)
 */
export function useServerTransactions(filters = {}, page = 1) {
  const { accounts, categories, entries } = useData();

  const [results, setResults] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState(null);

  // Lookup maps for enrichment
  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts]
  );
  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );
  const entriesByTxn = useMemo(() => {
    const map = new Map();
    for (const entry of entries) {
      if (!map.has(entry.transaction_id)) {
        map.set(entry.transaction_id, []);
      }
      map.get(entry.transaction_id).push(entry);
    }
    return map;
  }, [entries]);

  // Build query params from filters
  const queryParams = useMemo(() => {
    const params = { page };
    const {
      dateFrom, dateTo, type, accountId, categoryId,
      beneficiary, owner, platform, tag, search,
    } = filters;

    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (type) params.type = type;
    if (accountId) params.account_id = accountId;
    if (categoryId) params.category_id = categoryId;
    if (beneficiary) params.beneficiary = beneficiary;
    if (owner) params.owner = owner;
    if (platform) params.platform = platform;
    if (tag) params.tag = tag;
    if (search) params.search = search;

    return params;
  }, [filters, page]);

  // Stable key to detect when we need to refetch
  const paramsKey = JSON.stringify(queryParams);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const data = await api.getTransactions(queryParams);
      // Handle both paginated and non-paginated responses
      const txns = Array.isArray(data) ? data : (data.results ?? []);
      const total = Array.isArray(data) ? data.length : (data.count ?? txns.length);
      setResults(txns);
      setCount(total);
    } catch (err) {
      console.error('useServerTransactions: fetch failed', err);
      setError(err.message ?? String(err));
      setResults([]);
      setCount(0);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [paramsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Enrich transactions with account/category names and amounts from entries
  const enrichedTransactions = useMemo(() => {
    return results.map((txn) => {
      const transformed = {
        ...txn,
        category_id: txn.category ?? txn.category_id,
      };

      const txnEntries = entriesByTxn.get(txn.id) ?? [];
      const accountNames = [
        ...new Set(
          txnEntries
            .map((e) => accountMap.get(e.account_id)?.name)
            .filter(Boolean)
        ),
      ];
      const categoryNames = [
        ...new Set(
          txnEntries
            .map((e) => categoryMap.get(e.category_id)?.name)
            .filter(Boolean)
        ),
      ];

      // Compute display amount from entries
      let amount = txn.amount;
      if (amount === undefined || amount === null || amount === '') {
        const credits = txnEntries
          .filter((e) => e.entry_type === 'CREDIT')
          .reduce((sum, e) => sum + (e.amount || 0), 0);
        const debits = txnEntries
          .filter((e) => e.entry_type === 'DEBIT')
          .reduce((sum, e) => sum + (e.amount || 0), 0);
        amount = Math.max(credits, debits);
      }

      return {
        ...transformed,
        amount,
        accountNames,
        categoryNames,
      };
    });
  }, [results, entriesByTxn, accountMap, categoryMap]);

  function getTransactionEntries(txnId) {
    return entriesByTxn.get(txnId) ?? [];
  }

  return {
    transactions: enrichedTransactions,
    totalCount: count,
    isLoading: initialLoad,
    isFetching: loading,
    error,
    refetch: fetchTransactions,
    getTransactionEntries,
  };
}
