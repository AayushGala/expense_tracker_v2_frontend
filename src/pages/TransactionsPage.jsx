import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactions } from '../hooks/useTransactions';
import { useData } from '../context/DataContext';
import FilterBar from '../components/common/FilterBar';
import Badge from '../components/common/Badge';
import AmountDisplay from '../components/common/AmountDisplay';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import Card from '../components/common/Card';
import TransactionDetail from '../components/transactions/TransactionDetail';
import { formatDate, formatRelativeDate, transactionTypeLabel } from '../utils/formatters';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateKey(isoDate) {
  return isoDate?.slice(0, 10) ?? '';
}

function groupByDate(transactions) {
  const groups = new Map();
  for (const txn of transactions) {
    const key = toDateKey(txn.date);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(txn);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Transaction type icon
// ---------------------------------------------------------------------------

const TYPE_ICONS = {
  expense: { bg: 'bg-[#1e2a30]', color: 'text-white', path: 'M12 5v14m0 0l6-6m-6 6l-6-6' },
  income: { bg: 'bg-[#c5f1ec]', color: 'text-[#2cbcac]', path: 'M12 19V5m0 0l-6 6m6-6l6 6' },
  transfer: { bg: 'bg-gray-100', color: 'text-gray-500', path: 'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4' },
  bill_payment: { bg: 'bg-[#1e2a30]/10', color: 'text-[#1e2a30]', path: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
  investment: { bg: 'bg-gray-100', color: 'text-gray-500', path: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  cashback: { bg: 'bg-[#c5f1ec]', color: 'text-[#2cbcac]', path: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  split_expense: { bg: 'bg-[#1e2a30]/10', color: 'text-[#1e2a30]', path: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  reimbursement: { bg: 'bg-[#c5f1ec]', color: 'text-[#2cbcac]', path: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6' },
};

function TypeIcon({ type }) {
  const icon = TYPE_ICONS[type] ?? { bg: 'bg-gray-100', color: 'text-gray-500', path: 'M12 6v6m0 0v6m0-6h6m-6 0H6' };
  return (
    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${icon.bg} flex-shrink-0`}>
      <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${icon.color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={icon.path} />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TransactionRow — table-style row (desktop)
// ---------------------------------------------------------------------------

function getVariant(type) {
  if (type === 'income' || type === 'cashback' || type === 'reimbursement') return 'income';
  if (type === 'expense' || type === 'bill_payment' || type === 'split_expense') return 'expense';
  return 'neutral';
}

function TransactionRow({ txn, onClick }) {
  return (
    <tr
      onClick={() => onClick(txn)}
      className="hover:bg-gray-50/80 cursor-pointer transition-colors group"
    >
      {/* Date */}
      <td className="py-4 pl-5 pr-3 whitespace-nowrap">
        <p className="text-sm font-medium text-gray-700">{formatDate(txn.date)}</p>
      </td>

      {/* Description with icon */}
      <td className="py-4 px-3">
        <div className="flex items-center gap-3">
          <TypeIcon type={txn.type} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {txn.notes || transactionTypeLabel(txn.type)}
            </p>
            {(txn.accountNames?.length > 0 || txn.platform) && (
              <p className="text-xs text-gray-400 truncate mt-0.5">
                {[txn.accountNames?.join(' · '), txn.platform].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Category */}
      <td className="py-4 px-3 hidden lg:table-cell">
        {txn.categoryNames?.length > 0 && (
          <span className="inline-flex items-center rounded-lg bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 uppercase tracking-wide">
            {txn.categoryNames[0]}
          </span>
        )}
      </td>

      {/* Amount */}
      <td className="py-4 px-3 text-right whitespace-nowrap">
        <AmountDisplay
          amount={txn.amount ?? 0}
          variant={getVariant(txn.type)}
          className="text-sm"
        />
      </td>

      {/* Status badge */}
      <td className="py-4 pl-3 pr-5 hidden sm:table-cell">
        <Badge type={txn.type} />
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// TransactionCard — mobile card view
// ---------------------------------------------------------------------------

function TransactionCard({ txn, onClick }) {
  return (
    <button
      onClick={() => onClick(txn)}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50/80 transition-colors"
    >
      <TypeIcon type={txn.type} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {txn.notes || transactionTypeLabel(txn.type)}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatDate(txn.date)}
          {txn.categoryNames?.length > 0 && ` · ${txn.categoryNames[0]}`}
          {txn.platform && ` · ${txn.platform}`}
        </p>
      </div>
      <AmountDisplay
        amount={txn.amount ?? 0}
        variant={getVariant(txn.type)}
        className="text-sm font-bold flex-shrink-0"
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-between pt-4 px-1">
      <p className="text-xs text-gray-400">
        Page {currentPage} of {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
              p === currentPage
                ? 'bg-[#1e2a30] text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TransactionsPage
// ---------------------------------------------------------------------------

const EMPTY_FILTERS = {
  dateFrom: '',
  dateTo: '',
  type: '',
  accountId: '',
  categoryId: '',
  beneficiary: '',
  platform: '',
  tag: '',
  search: '',
};

export default function TransactionsPage() {
  const navigate = useNavigate();
  const { isLoading, deleteTransaction } = useData();

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { filteredTransactions, getTransactionEntries } = useTransactions(filters);

  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE);
  const paginatedTxns = filteredTransactions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function handleFilterChange(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }

  function handleReset() {
    setFilters(EMPTY_FILTERS);
    setCurrentPage(1);
  }

  function handleRowClick(txn) {
    setSelectedTxn(txn);
  }

  function handleModalClose() {
    setSelectedTxn(null);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <LoadingSpinner size="h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header — hidden on mobile (TopBar shows title) */}
      <div className="hidden md:block">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <p className="text-sm text-gray-400 mt-1">Review and manage your financial movement across all accounts.</p>
      </div>

      {/* Filter bar */}
      <Card className="px-5 py-4 overflow-visible">
        <FilterBar
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleReset}
        />
      </Card>

      {/* Content */}
      {filteredTransactions.length === 0 ? (
        <EmptyState
          message="No transactions found"
          description="Try adjusting your filters or add a new transaction."
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
          }
          actionLabel="Add Transaction"
          onAction={() => navigate('/transactions/new')}
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          {/* Table header label */}
          <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Recent Activity</h2>
            <p className="text-xs text-gray-400">
              {paginatedTxns.length} of {filteredTransactions.length}
            </p>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden divide-y divide-gray-50">
            {paginatedTxns.map((txn) => (
              <TransactionCard
                key={txn.id}
                txn={txn}
                onClick={handleRowClick}
              />
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-3 pl-5 pr-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Date</th>
                  <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Description</th>
                  <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 hidden lg:table-cell">Category</th>
                  <th className="py-3 px-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">Amount</th>
                  <th className="py-3 pl-3 pr-5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 hidden sm:table-cell">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedTxns.map((txn) => (
                  <TransactionRow
                    key={txn.id}
                    txn={txn}
                    onClick={handleRowClick}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="border-t border-gray-100 px-4 md:px-5 py-3">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </Card>
      )}

      {/* Transaction detail modal */}
      <Modal
        isOpen={selectedTxn !== null}
        onClose={handleModalClose}
        title="Transaction Details"
        maxWidth="max-w-lg"
      >
        {selectedTxn && (
          <TransactionDetail
            transaction={selectedTxn}
            entries={getTransactionEntries(selectedTxn.id)}
            onClose={handleModalClose}
            onDeleted={() => setSelectedTxn(null)}
          />
        )}
      </Modal>
    </div>
  );
}
