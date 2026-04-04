import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CategoryManager from './CategoryManager';
import { MOCK_ALL_DATA, MOCK_ACCOUNT_TYPES, createMockApi } from '../../test/helpers';

// ---------------------------------------------------------------------------
// Mock modules
// ---------------------------------------------------------------------------

let mockApi;

vi.mock('../../api/client', () => ({
  default: new Proxy({}, { get(_, prop) { return mockApi[prop]; } }),
}));

import { DataProvider } from '../../context/DataContext';

function renderCategoryManager() {
  return render(
    <DataProvider>
      <CategoryManager />
    </DataProvider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CategoryManager', () => {
  beforeEach(() => {
    mockApi = createMockApi();
  });

  it('renders existing categories grouped by type', async () => {
    renderCategoryManager();

    await waitFor(() => {
      expect(screen.getByText('Food')).toBeInTheDocument();
      expect(screen.getByText('Salary')).toBeInTheDocument();
    });
  });

  it('shows validation error when adding category with empty name', async () => {
    const user = userEvent.setup();
    renderCategoryManager();

    await waitFor(() => {
      expect(screen.getByText('Add Category')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^add$/i }));
    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(mockApi.createCategory).not.toHaveBeenCalled();
  });

  it('calls API to add a category with valid input', async () => {
    const user = userEvent.setup();
    renderCategoryManager();

    await waitFor(() => {
      expect(screen.getByText('Add Category')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('Category name'), 'Travel');
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() => {
      expect(mockApi.createCategory).toHaveBeenCalledWith({ name: 'Travel', type: 'expense' });
    });
  });

  it('shows empty state for a type with no categories', async () => {
    mockApi = createMockApi({
      getAllData: vi.fn().mockResolvedValue({ ...MOCK_ALL_DATA, categories: [] }),
    });

    renderCategoryManager();

    await waitFor(() => {
      expect(screen.getByText('No expense categories yet.')).toBeInTheDocument();
      expect(screen.getByText('No income categories yet.')).toBeInTheDocument();
    });
  });

  it('enters edit mode when clicking Edit', async () => {
    const user = userEvent.setup();
    renderCategoryManager();

    await waitFor(() => {
      expect(screen.getByText('Food')).toBeInTheDocument();
    });

    // Click the first Edit button
    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    await user.click(editButtons[0]);

    // Should now show Save and Cancel buttons
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Cancel' })[0]).toBeInTheDocument();
  });

  it('shows delete confirmation when clicking Delete', async () => {
    const user = userEvent.setup();
    renderCategoryManager();

    await waitFor(() => {
      expect(screen.getByText('Food')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[0]);

    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });

  it('calls API to delete category on confirm', async () => {
    const user = userEvent.setup();
    renderCategoryManager();

    await waitFor(() => {
      expect(screen.getByText('Food')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[0]);
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(mockApi.deleteCategory).toHaveBeenCalledWith(1);
    });
  });
});
