import Dropdown from './Dropdown';

export default function Select({
  label,
  id,
  value,
  onChange,
  options = [],
  placeholder,
  disabled = false,
  className = '',
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </label>
      )}
      {disabled ? (
        <div className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-400 cursor-not-allowed opacity-50">
          {options.find((o) => o.value === value)?.label ?? placeholder ?? 'Select...'}
        </div>
      ) : (
        <Dropdown
          value={value}
          onChange={(val) => {
            // Simulate native event shape for backward compat
            onChange({ target: { value: val } });
          }}
          options={placeholder ? [{ value: '', label: placeholder }, ...options] : options}
        />
      )}
    </div>
  );
}
