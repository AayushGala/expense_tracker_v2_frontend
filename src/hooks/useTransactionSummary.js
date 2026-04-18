import { useEffect, useState } from 'react';
import api from '../api/client';

function buildParams(filters, splitMode) {
  const params = {};
  if (filters.dateFrom) params.date_from = filters.dateFrom;
  if (filters.dateTo) params.date_to = filters.dateTo;
  if (filters.type) params.type = filters.type;
  if (filters.accountId) params.account_id = filters.accountId;
  if (filters.categoryIds?.length > 0) params.category_ids = filters.categoryIds.join(',');
  if (filters.beneficiary) params.beneficiary = filters.beneficiary;
  if (filters.owner) params.owner = filters.owner;
  if (filters.platform) params.platform = filters.platform;
  if (filters.tag) params.tag = filters.tag;
  if (filters.search) params.search = filters.search;
  if (splitMode) params.split_mode = splitMode;
  return params;
}

export function useTransactionSummary(filters, splitMode = 'my_share') {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    api.getTransactionSummary(buildParams(filters, splitMode))
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [filtersKey, splitMode]);

  return { summary, isLoading, error };
}
