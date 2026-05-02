// ---------------------------------------------------------------------------
// Saved transaction views (filter presets) — pure helpers.
// Persistence lives in the backend `settings` table under key
// `transaction_views`; this module only handles parse/serialize/equality.
// ---------------------------------------------------------------------------

/** Parse a stored setting value into a list of views. Returns [] on bad input. */
export function parseViews(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Serialize a views list for the setting value. */
export function serializeViews(views) {
  return JSON.stringify(views ?? []);
}

/** Build a new view record. */
export function makeView(name, filters) {
  return {
    id: `v_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    filters: { ...filters },
    createdAt: new Date().toISOString(),
  };
}

/**
 * Drop empty values ('', null, undefined, []) and sort arrays so two
 * equivalent filter states compare equal regardless of key order or
 * how "empty" is expressed.
 */
function normalizeFilters(filters) {
  const out = {};
  for (const key of Object.keys(filters)) {
    const v = filters[key];
    if (v === '' || v === null || v === undefined) continue;
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      out[key] = [...v].sort();
    } else {
      out[key] = v;
    }
  }
  return out;
}

/** Returns the first view whose filters match the given filters, or null. */
export function findMatchingView(filters, views) {
  if (!Array.isArray(views) || views.length === 0) return null;
  const target = JSON.stringify(normalizeFilters(filters));
  return views.find((v) => JSON.stringify(normalizeFilters(v.filters)) === target) ?? null;
}
