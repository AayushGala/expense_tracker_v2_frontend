import CalendarPicker from './CalendarPicker';

export default function DatePicker({
  label,
  id,
  value,
  onChange,
  min,
  max,
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
      <CalendarPicker
        value={value}
        onChange={(val) => {
          // Mimic native input onChange signature: pass synthetic event
          if (typeof onChange === 'function') {
            onChange({ target: { value: val } });
          }
        }}
        min={min}
        max={max}
        placeholder="Select date"
        className="w-full"
      />
    </div>
  );
}
