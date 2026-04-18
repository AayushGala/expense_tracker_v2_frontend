import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTransactionSummary } from './useTransactionSummary';
import { createMockApi } from '../test/helpers';

let mockApi;

vi.mock('../api/client', () => ({
  default: new Proxy({}, { get(_, prop) { return mockApi[prop]; } }),
}));

describe('useTransactionSummary', () => {
  beforeEach(() => {
    mockApi = createMockApi();
  });

  it('calls API with correct query params built from filters', async () => {
    const filters = {
      dateFrom: '2026-01-01',
      dateTo: '2026-12-31',
      type: 'expense',
      accountId: 5,
      beneficiary: 'self',
      platform: 'Swiggy',
      tag: 'food',
      search: 'coffee',
    };

    renderHook(() => useTransactionSummary(filters));

    await waitFor(() => {
      expect(mockApi.getTransactionSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          date_from: '2026-01-01',
          date_to: '2026-12-31',
          type: 'expense',
          account_id: 5,
          beneficiary: 'self',
          platform: 'Swiggy',
          tag: 'food',
          search: 'coffee',
          split_mode: 'my_share',
        })
      );
    });
  });

  it('joins categoryIds array as comma-separated string', async () => {
    renderHook(() => useTransactionSummary({ categoryIds: [1, 2, 3] }));

    await waitFor(() => {
      expect(mockApi.getTransactionSummary).toHaveBeenCalledWith(
        expect.objectContaining({ category_ids: '1,2,3' })
      );
    });
  });

  it('passes split_mode param', async () => {
    renderHook(() => useTransactionSummary({}, 'total_amount'));

    await waitFor(() => {
      expect(mockApi.getTransactionSummary).toHaveBeenCalledWith(
        expect.objectContaining({ split_mode: 'total_amount' })
      );
    });
  });

  it('returns summary data on success', async () => {
    mockApi.getTransactionSummary.mockResolvedValue({
      total_outflow: 1000, total_inflow: 500, net: -500, count: 10,
      transfer_count: 0, transfer_amount: 0,
    });

    const { result } = renderHook(() => useTransactionSummary({}));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.summary).toEqual({
      total_outflow: 1000, total_inflow: 500, net: -500, count: 10,
      transfer_count: 0, transfer_amount: 0,
    });
    expect(result.current.error).toBeNull();
  });

  it('sets error state on API failure', async () => {
    const err = new Error('Network down');
    mockApi.getTransactionSummary.mockRejectedValue(err);

    const { result } = renderHook(() => useTransactionSummary({}));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.error).toBe(err);
    expect(result.current.summary).toBeNull();
  });
});
