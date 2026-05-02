import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../../context/DataContext';
import {
  parseViews,
  serializeViews,
  makeView,
  findMatchingView,
} from '../../utils/transactionViews';

/**
 * Popover for saving/applying named filter combinations.
 * Views are persisted in the backend `settings` table under key
 * `transaction_views` (JSON-stringified array), so they follow the user
 * across browsers/devices.
 */
export default function SavedViews({ filters, onApply, className = '' }) {
  const { settings, updateSettings } = useData();
  const views = useMemo(
    () => parseViews(settings?.transaction_views),
    [settings?.transaction_views]
  );

  const [open, setOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const inputRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState({});

  const activeView = useMemo(() => findMatchingView(filters, views), [filters, views]);
  const triggerLabel = activeView?.name ?? 'Views';

  const trimmedName = saveName.trim();
  const isDuplicate = views.some((v) => v.name.toLowerCase() === trimmedName.toLowerCase());
  const canSave = trimmedName.length > 0 && !isDuplicate;

  // Persist a new views list
  const persist = useCallback(
    (next) => updateSettings('transaction_views', serializeViews(next)),
    [updateSettings]
  );

  function handleSave() {
    if (!canSave) return;
    const next = [...views, makeView(trimmedName, filters)];
    persist(next);
    setSaveName('');
  }

  function handleDelete(id) {
    persist(views.filter((v) => v.id !== id));
  }

  function handleApply(view) {
    onApply(view.filters);
    setOpen(false);
  }

  // Position menu (mirrors CategoryFilter); clamp horizontally so the menu
  // never overflows the viewport on narrow screens.
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuHeight = 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove = spaceBelow < menuHeight && rect.top > spaceBelow;

    const margin = 8;
    const desiredWidth = Math.max(rect.width, 280);
    const width = Math.min(desiredWidth, window.innerWidth - margin * 2);
    // Right-align with the trigger by default, then clamp to viewport
    let left = rect.right - width;
    if (left < margin) left = margin;
    if (left + width > window.innerWidth - margin) {
      left = window.innerWidth - margin - width;
    }

    const base = { position: 'fixed', left, width, minWidth: width };
    if (openAbove) {
      setMenuStyle({ ...base, bottom: window.innerHeight - rect.top + 6 });
    } else {
      setMenuStyle({ ...base, top: rect.bottom + 6 });
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

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      requestAnimationFrame(() => {
        if (
          triggerRef.current && !triggerRef.current.contains(e.target) &&
          menuRef.current && !menuRef.current.contains(e.target)
        ) {
          setOpen(false);
        }
      });
    }
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  function handleToggle(e) {
    e.preventDefault();
    e.stopPropagation();
    if (open) setOpen(false);
    else { updatePosition(); setOpen(true); }
  }

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onMouseDown={handleToggle}
        className={`
          w-full flex items-center gap-2 rounded-xl border bg-white
          px-3 py-2.5 text-sm transition-colors cursor-pointer
          ${open ? 'border-accent ring-2 ring-accent/20' : 'border-gray-200 hover:border-gray-300'}
        `}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-gray-400 flex-shrink-0"
          viewBox="0 0 20 20" fill="currentColor"
        >
          <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-3-5 3V4z" />
        </svg>
        <span className={`truncate flex-1 text-left ${activeView ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
          {triggerLabel}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20" fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          style={menuStyle}
          onMouseDown={(e) => e.stopPropagation()}
          className="z-[9999] rounded-xl border border-gray-200 bg-white shadow-xl flex flex-col max-h-80"
        >
          {/* Saved view list */}
          <div className="overflow-y-auto py-1 flex-1">
            {views.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4 px-3">
                No saved views yet. Save your current filters below.
              </p>
            ) : (
              views.map((view) => {
                const isActive = activeView?.id === view.id;
                return (
                  <div
                    key={view.id}
                    className={`flex items-center gap-1 px-2 py-0.5 ${isActive ? 'bg-accent-light/40' : ''}`}
                  >
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); handleApply(view); }}
                      className={`flex-1 text-left px-2 py-1.5 text-sm rounded-md truncate transition-colors ${
                        isActive ? 'text-brand font-semibold' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {view.name}
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); handleDelete(view.id); }}
                      aria-label={`Delete ${view.name}`}
                      className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-base leading-none">&times;</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Save form */}
          <div className="border-t border-gray-100 p-2 shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
                  if (e.key === 'Escape') setOpen(false);
                }}
                placeholder="Save current filters as…"
                className="flex-1 text-sm px-2.5 py-1.5 rounded-lg border border-gray-200 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 placeholder-gray-400"
              />
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSave(); }}
                disabled={!canSave}
                className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  canSave
                    ? 'bg-brand text-white hover:bg-brand/90'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Save
              </button>
            </div>
            {trimmedName.length > 0 && isDuplicate && (
              <p className="text-[11px] text-gray-400 mt-1 px-1">A view with this name already exists.</p>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
