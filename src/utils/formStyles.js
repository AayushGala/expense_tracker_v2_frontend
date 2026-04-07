export const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-700 transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 hover:border-gray-300 placeholder-gray-400';
export const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5';
export const errorClass = 'mt-1.5 text-xs text-rose-500 font-medium';

/** Format account for dropdown: "Name · Owner" or just "Name" if no owner */
export function accountOption(a) {
  const label = a.owner ? `${a.name} · ${a.owner}` : a.name;
  return { value: String(a.id), label };
}
