export default function EmptyState({
  message,
  description,
  icon,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}
    >
      {icon && (
        <div className="mb-4 text-gray-300">
          {icon}
        </div>
      )}
      <p className="text-base font-semibold text-gray-500">{message}</p>
      {description && (
        <p className="mt-1 text-sm text-gray-400 max-w-xs">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white
                     hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-colors shadow-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
