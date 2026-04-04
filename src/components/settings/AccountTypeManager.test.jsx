import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccountTypeManager from './AccountTypeManager';
import {
  MOCK_ACCOUNT_TYPES,
  MOCK_ALL_DATA,
  createMockApi,
} from '../../test/helpers';

// ---------------------------------------------------------------------------
// Mock modules
// ---------------------------------------------------------------------------

let mockApi;

vi.mock('../../api/client', () => ({
  default: new Proxy({}, { get(_, prop) { return mockApi[prop]; } }),
}));

import { DataProvider } from '../../context/DataContext';

function renderAccountTypeManager() {
  return render(
    <DataProvider>
      <AccountTypeManager />
    </DataProvider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AccountTypeManager', () => {
  beforeEach(() => {
    mockApi = createMockApi();
  });

  it('renders account types from the API', async () => {
    renderAccountTypeManager();

    await waitFor(() => {
      expect(screen.getByText('Asset')).toBeInTheDocument();
      expect(screen.getByText('Liability')).toBeInTheDocument();
    });
  });

  it('renders sub-types under their parent type', async () => {
    renderAccountTypeManager();

    await waitFor(() => {
      expect(screen.getByText('Bank Account')).toBeInTheDocument();
      expect(screen.getByText('Cash')).toBeInTheDocument();
      expect(screen.getByText('Credit Card')).toBeInTheDocument();
    });
  });

  it('shows empty state when no account types exist', async () => {
    mockApi = createMockApi({
      getAccountTypes: vi.fn().mockResolvedValue([]),
    });

    renderAccountTypeManager();

    await waitFor(() => {
      expect(screen.getByText('No account types found.')).toBeInTheDocument();
    });
  });

  it('validates name is required when adding account type', async () => {
    const user = userEvent.setup();
    renderAccountTypeManager();

    await waitFor(() => {
      expect(screen.getByText('Add Account Type')).toBeInTheDocument();
    });

    // Click Add without filling anything
    await user.click(screen.getByRole('button', { name: /^add$/i }));
    expect(screen.getByText('Name (key) is required.')).toBeInTheDocument();
    expect(mockApi.createAccountType).not.toHaveBeenCalled();
  });

  it('validates label is required when adding account type', async () => {
    const user = userEvent.setup();
    renderAccountTypeManager();

    await waitFor(() => {
      expect(screen.getByText('Add Account Type')).toBeInTheDocument();
    });

    // Fill name but not label
    await user.type(screen.getByPlaceholderText(/name.*key/i), 'equity');
    await user.click(screen.getByRole('button', { name: /^add$/i }));
    expect(screen.getByText('Label is required.')).toBeInTheDocument();
    expect(mockApi.createAccountType).not.toHaveBeenCalled();
  });

  it('calls API to add account type with valid input', async () => {
    const user = userEvent.setup();
    renderAccountTypeManager();

    await waitFor(() => {
      expect(screen.getByText('Add Account Type')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText(/name.*key/i), 'equity');
    await user.type(screen.getByPlaceholderText(/label/i), 'Equity');
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() => {
      expect(mockApi.createAccountType).toHaveBeenCalledWith({ name: 'equity', label: 'Equity' });
    });
  });

  it('shows sub-type count per type', async () => {
    renderAccountTypeManager();

    await waitFor(() => {
      expect(screen.getByText('2 sub-types')).toBeInTheDocument(); // asset has 2
      expect(screen.getByText('1 sub-types')).toBeInTheDocument(); // liability has 1
    });
  });

  it('shows "+ Add Sub-Type" buttons for each type', async () => {
    renderAccountTypeManager();

    await waitFor(() => {
      const addButtons = screen.getAllByText('+ Add Sub-Type');
      expect(addButtons).toHaveLength(2); // one per account type
    });
  });

  it('shows add sub-type form when clicking "+ Add Sub-Type"', async () => {
    const user = userEvent.setup();
    renderAccountTypeManager();

    await waitFor(() => {
      expect(screen.getAllByText('+ Add Sub-Type')).toHaveLength(2);
    });

    // Click the first "+ Add Sub-Type" button
    await user.click(screen.getAllByText('+ Add Sub-Type')[0]);

    expect(screen.getByPlaceholderText('e.g. savings')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Savings Account')).toBeInTheDocument();
  });
});
