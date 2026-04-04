import { formatINR } from '../../utils/formatters';

export default function AmountDisplay({ amount, variant = 'neutral', showSign = false, className = '' }) {
  const colorClass =
    variant === 'income'
      ? 'text-emerald-600'
      : variant === 'expense'
      ? 'text-rose-500'
      : amount > 0
      ? 'text-emerald-600'
      : amount < 0
      ? 'text-rose-500'
      : 'text-gray-700';

  const prefix = showSign && amount > 0 ? '+' : '';

  return (
    <span className={`font-semibold tabular-nums ${colorClass} ${className}`}>
      {prefix}{formatINR(amount)}
    </span>
  );
}
