import { transactionTypeLabel } from '../../utils/formatters';

const TYPE_STYLES = {
  expense:       'bg-rose-50 text-rose-600 ring-rose-200/60',
  income:        'bg-emerald-50 text-emerald-600 ring-emerald-200/60',
  transfer:      'bg-blue-50 text-blue-600 ring-blue-200/60',
  bill_payment:  'bg-orange-50 text-orange-600 ring-orange-200/60',
  investment:    'bg-violet-50 text-violet-600 ring-violet-200/60',
  cashback:      'bg-teal-50 text-teal-600 ring-teal-200/60',
  split_expense: 'bg-amber-50 text-amber-600 ring-amber-200/60',
  reimbursement: 'bg-cyan-50 text-cyan-600 ring-cyan-200/60',
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
