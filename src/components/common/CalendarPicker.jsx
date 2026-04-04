import { useState, useRef, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const SHORT_MONTHS = MONTH_NAMES.map((m) => m.slice(0, 3));
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function toDateStr(d) {
  // Returns YYYY-MM-DD
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function isSameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay();
}

function formatDisplay(dateStr) {
  if (!dateStr) return '';
  const d = parseDate(dateStr);
  if (!d) return '';
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// ---------------------------------------------------------------------------
// CalendarPicker
// ---------------------------------------------------------------------------

export default function CalendarPicker({
  value,
  onChange,
  placeholder = 'Select date',
  min,
  max,
  compact = false,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selected = parseDate(value);
  const minDate = parseDate(min);
  const maxDate = parseDate(max);

  // Which month/year is being viewed in the calendar
  const [viewYear, setViewYear] = useState(() => (selected ?? new Date()).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => (selected ?? new Date()).getMonth());

  // Sync view to selected value when it changes externally
  useEffect(() => {
    if (selected) {
      setViewYear(selected.getFullYear());
      setViewMonth(selected.getMonth());
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const prevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  function selectDay(day) {
    const dateStr = toDateStr(new Date(viewYear, viewMonth, day));
    onChange(dateStr);
    setOpen(false);
  }

  function handleClear(e) {
    e.stopPropagation();
    onChange('');
    setOpen(false);
  }

  function isDisabled(day) {
    const d = new Date(viewYear, viewMonth, day);
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;
    return false;
  }

  // Build calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
  const weeks = [];
  let week = new Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const today = new Date();

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-xl border bg-white text-sm transition-colors
                    hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2cbcac]/20 focus:border-[#2cbcac]
                    ${open ? 'border-[#2cbcac] ring-2 ring-[#2cbcac]/20' : 'border-gray-200'}
                    ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span className={value ? 'text-gray-700' : 'text-gray-400'}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        {value && (
          <span
            role="button"
            tabIndex={-1}
            onClick={handleClear}
            className="ml-auto text-gray-300 hover:text-gray-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </span>
        )}
      </button>

      {/* Calendar dropdown */}
      {open && (
        <div className="absolute z-50 mt-1.5 left-0 w-[280px] rounded-2xl bg-white shadow-xl ring-1 ring-gray-200/80 p-3 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Month / Year navigation */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <span className="text-sm font-bold text-gray-900">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold text-gray-400 uppercase py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {weeks.flat().map((day, idx) => {
              if (day === null) {
                return <div key={`e-${idx}`} />;
              }

              const dayDate = new Date(viewYear, viewMonth, day);
              const isSelected = isSameDay(dayDate, selected);
              const isToday = isSameDay(dayDate, today);
              const disabled = isDisabled(day);

              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectDay(day)}
                  className={`h-9 w-full rounded-lg text-sm font-medium transition-colors
                    ${isSelected
                      ? 'bg-[#1e2a30] text-white shadow-sm'
                      : isToday
                        ? 'bg-[#c5f1ec] text-[#1e2a30] font-bold'
                        : 'text-gray-700 hover:bg-gray-100'
                    }
                    ${disabled ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : 'cursor-pointer'}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => { selectDay(today.getDate()); setViewMonth(today.getMonth()); setViewYear(today.getFullYear()); }}
              className="flex-1 text-xs font-semibold text-[#2cbcac] hover:bg-[#c5f1ec] rounded-lg py-1.5 transition-colors"
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="flex-1 text-xs font-semibold text-gray-400 hover:bg-gray-50 rounded-lg py-1.5 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
