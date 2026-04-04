import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import TypeSelector from './TypeSelector';
import ExpenseForm from './ExpenseForm';
import IncomeForm from './IncomeForm';
import TransferForm from './TransferForm';
import BillPaymentForm from './BillPaymentForm';
import InvestmentForm from './InvestmentForm';
import CashbackForm from './CashbackForm';
import SplitExpenseForm from './SplitExpenseForm';
import ReimbursementForm from './ReimbursementForm';
import Card from '../common/Card';

export default function TransactionForm() {
  const navigate = useNavigate();
  const { addTransaction } = useData();

  const [type, setType] = useState('expense');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(transactionData) {
    if (submitting) return;
    setSubmitting(true);

    try {
      await addTransaction(transactionData);
      navigate(-1);
    } catch (err) {
      console.error('TransactionForm: submit failed', err);
      setSubmitting(false);
    }
  }

  function renderSubForm() {
    switch (type) {
      case 'expense':       return <ExpenseForm onSubmit={handleSubmit} />;
      case 'income':        return <IncomeForm onSubmit={handleSubmit} />;
      case 'transfer':      return <TransferForm onSubmit={handleSubmit} />;
      case 'bill_payment':  return <BillPaymentForm onSubmit={handleSubmit} />;
      case 'investment':    return <InvestmentForm onSubmit={handleSubmit} />;
      case 'cashback':      return <CashbackForm onSubmit={handleSubmit} />;
      case 'split_expense': return <SplitExpenseForm onSubmit={handleSubmit} />;
      case 'reimbursement': return <ReimbursementForm onSubmit={handleSubmit} />;
      default:              return null;
    }
  }

  return (
    <div className="max-w-2xl mx-auto pb-10">
      {/* Back link */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-4"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        Back to Transactions
      </button>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Transaction</h1>
          <p className="text-sm text-gray-400 mt-1">Record a new entry into your finances.</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Transaction type card */}
      <Card className="p-5 mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Transaction Type</p>
        <TypeSelector value={type} onChange={setType} />
      </Card>

      {/* Form card */}
      <Card className="p-6">
        {submitting ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 rounded-full border-[3px] border-teal-600 border-t-transparent animate-spin" />
          </div>
        ) : (
          renderSubForm()
        )}
      </Card>
    </div>
  );
}
