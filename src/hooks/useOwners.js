import { useMemo } from 'react';
import { useData } from '../context/DataContext';

/**
 * Hook that provides owner names from settings and helper utilities.
 *
 * New format:  settings.owners  — comma-separated string, e.g. "Aayush,Riddhi"
 * Legacy:      settings.owner_1 + settings.owner_2 (auto-migrated on read)
 */
export function useOwners() {
  const { settings, accounts } = useData();

  /** Non-empty owner names. */
  const owners = useMemo(() => {
    // New format: single comma-separated key
    if (settings.owners) {
      return settings.owners
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    // Legacy fallback: owner_1 / owner_2
    return [settings.owner_1, settings.owner_2]
      .map((s) => (s || '').trim())
      .filter(Boolean);
  }, [settings.owners, settings.owner_1, settings.owner_2]);

  /** Dropdown options with an "All" entry. */
  const ownerOptions = useMemo(
    () => [
      { value: '', label: 'All' },
      ...owners.map((o) => ({ value: o, label: o })),
    ],
    [owners]
  );

  /** Account-id → owner name lookup. */
  const accountOwnerMap = useMemo(
    () => new Map(accounts.filter((a) => a.owner).map((a) => [a.id, a.owner])),
    [accounts]
  );

  /** Returns the owner name for a given account id, or ''. */
  function getAccountOwner(accountId) {
    return accountOwnerMap.get(accountId) ?? '';
  }

  return {
    owners,
    ownerOptions,
    getAccountOwner,
  };
}
