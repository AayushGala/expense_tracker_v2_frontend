import { transactionTypeLabel } from '../../utils/formatters';

const TYPE_STYLES = {
  expense:       'bg-[#1e2a30] text-white ring-[#1e2a30]/20',
  income:        'bg-[#c5f1ec] text-[#1e2a30] ring-[#2cbcac]/30',
  transfer:      'bg-gray-100 text-gray-600 ring-gray-200/60',
  bill_payment:  'bg-[#1e2a30] text-white ring-[#1e2a30]/20',
  investment:    'bg-gray-100 text-gray-600 ring-gray-200/60',
  cashback:      'bg-[#c5f1ec] text-[#1e2a30] ring-[#2cbcac]/30',
  split_expense: 'bg-[#1e2a30] text-white ring-[#1e2a30]/20',
  reimbursement: 'bg-[#c5f1ec] text-[#1e2a30] ring-[#2cbcac]/30',
};

export default function Badge({ type, className = '' }) {
  const label = transactionTypeLabel(type);
  const style = TYPE_STYLES[type] ?? 'bg-gray-50 text-gray-600 ring-gray-200/60';

  return (
    <span
      className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold ring-1 ${style} ${className}`}
    >
      {label}
    </span>
  );
}
