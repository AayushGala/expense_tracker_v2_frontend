import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

// Global registry: when any dropdown opens, it calls closeAll first
const openDropdowns = new Set();

function closeAll() {
  openDropdowns.forEach((close) => close());
}

export default function Dropdown({ value, onChange, options = [], placeholder, className = '' }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState({});

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption?.label ?? placeholder ?? 'Select...';

  // Register/unregister this dropdown's close function
  const closeFn = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (open) {
      openDropdowns.add(closeFn);
    } else {
      openDropdowns.delete(closeFn);
    }
    return () => openDropdowns.delete(closeFn);
  }, [open, closeFn]);

  // Position the menu beneath (or above) the trigger
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuHeight = 240; // max-h-60 = 15rem = 240px
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openAbove = spaceBelow < menuHeight && spaceAbove > spaceBelow;

    if (openAbove) {
      setMenuStyle({
        position: 'fixed',
        bottom: window.innerHeight - rect.top + 6,
        left: rect.left,
        width: rect.width,
        minWidth: 160,
      });
    } else {
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
        minWidth: 160,
      });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  function handleToggle(e) {
    e.preventDefault();
    e.stopPropagation();
    if (open) {
      setOpen(false);
    } else {
      // Close all other open dropdowns first, then open this one
      closeAll();
      setOpen(true);
    }
  }

  function handleSelect(optValue) {
    onChange(optValue);
    setOpen(false);
  }

  return (
    <div className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onMouseDown={handleToggle}
        className={`
          w-full flex items-center gap-2 rounded-xl border bg-white
          px-3 py-2.5 text-sm transition-colors cursor-pointer
          ${open
            ? 'border-[#2cbcac] ring-2 ring-[#2cbcac]/20'
            : 'border-gray-200 hover:border-gray-300'
          }
        `}
      >
        <span className={`truncate flex-1 text-left ${value ? 'text-gray-700' : 'text-gray-400'}`}>
          {displayLabel}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Options list — rendered in a portal so it's never clipped */}
      {open && createPortal(
        <div
          ref={menuRef}
          style={menuStyle}
          className="z-[9999] rounded-xl border border-gray-200 bg-white shadow-xl py-1 max-h-60 overflow-y-auto"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(opt.value);
                }}
                className={`
                  w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2
                  ${isSelected
                    ? 'bg-[#c5f1ec] text-[#1e2a30] font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-3.5 w-3.5 flex-shrink-0 ${isSelected ? 'text-[#2cbcac]' : 'text-transparent'}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
