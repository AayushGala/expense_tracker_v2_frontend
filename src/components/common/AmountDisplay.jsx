import { formatINR } from '../../utils/formatters';

export default function AmountDisplay({ amount, variant = 'neutral', showSign = false, className = '' }) {
  const colorClass =
    variant === 'income'
      ? 'text-accent'
      : variant === 'expense'
      ? 'text-gray-800'
      : amount > 0
      ? 'text-accent'
      : amount < 0
      ? 'text-gray-800'
      : 'text-gray-700';

  const prefix = showSign && amount > 0 ? '+' : '';

  return (
    <span className={`font-semibold tabular-nums ${colorClass} ${className}`}>
      {prefix}{formatINR(amount)}
    </span>
  );
}
