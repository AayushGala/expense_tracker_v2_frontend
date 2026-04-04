import { useEffect, useMemo, useState } from 'react';
import Card from '../common/Card';
import Dropdown from '../common/Dropdown';
import { useData } from '../../context/DataContext';
import { useOwners } from '../../hooks/useOwners';

const inputClass =
  'text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2cbcac]/30 focus:border-[#2cbcac] hover:border-gray-300 transition-colors';

// ---------------------------------------------------------------------------
// Account Row
// ---------------------------------------------------------------------------

function AccountRow({ account, hasEntries, onUpdate, owners }) {
  const [editing, setEditing]     = useState(false);
  const [name, setName]           = useState(account.name);
  const [savingName, setSavingName] = useState(false);
  const [toggling, setToggling]   = useState(false);

  async function handleSaveName() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== account.name) {
      setSavingName(true);
      await onUpdate(account.id, { name: trimmed });
      setSavingName(false);
    }
    setEditing(false);
  }

  async function handleToggleActive() {
    setToggling(true);
    await onUpdate(account.id, { is_active: !account.is_active });
    setToggling(false);
  }

  const isInactive = account.is_active === false;

  return (
    <div className={`flex items-center gap-2.5 py-2.5 group ${isInactive ? 'opacity-40' : ''}`}>
      {editing ? (
        <>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveName();
              if (e.key === 'Escape') { setName(account.name); setEditing(false); }
            }}
            className={`flex-1 ${inputClass} !border-[#2cbcac]`}
          />
          <button
            onClick={handleSaveName}
            disabled={savingName}
            className="text-xs px-3 py-1.5 bg-[#1e2a30] text-white rounded-lg font-semibold hover:bg-[#2a3a42] disabled:opacity-50 transition-colors"
          >
            {savingName ? '...' : 'Save'}
          </button>
          <button
            onClick={() => { setName(account.name); setEditing(false); }}
            className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 font-medium transition-colors"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 text-[13px] text-gray-700 truncate">
            {account.name}
          </span>
          {account.sub_type && (
            <span className="text-[11px] text-gray-400 shrink-0">{account.sub_type}</span>
          )}
          {owners.length > 0 && (
            <select
              value={account.owner || ''}
              onChange={async (e) => {
                await onUpdate(account.id, { owner: e.target.value });
              }}
              className="text-[11px] border border-gray-200 rounded-lg px-1.5 py-1 text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#2cbcac]/30 shrink-0"
            >
              <option value="">No owner</option>
              {owners.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-gray-400 hover:text-[#2cbcac] px-2 py-1 rounded-lg hover:bg-[#c5f1ec]/30 font-medium transition-colors shrink-0"
            >
              Rename
            </button>
            <button
              onClick={handleToggleActive}
              disabled={toggling || (hasEntries && !isInactive)}
              title={hasEntries && !isInactive ? 'Cannot delete accounts with transactions; deactivate instead.' : ''}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium shrink-0 disabled:opacity-40 transition-colors ${
                isInactive
                  ? 'text-emerald-600 hover:bg-emerald-50'
                  : 'text-amber-600 hover:bg-amber-50'
              }`}
            >
              {toggling ? '...' : isInactive ? 'Activate' : 'Deactivate'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Account Group Card (one per account type)
// ---------------------------------------------------------------------------

function AccountGroupCard({ typeLabel, accounts, accountsWithEntries, onUpdate, owners }) {
  const sorted = useMemo(
    () => [...accounts].sort((a, b) => a.name.localeCompare(b.name)),
    [accounts]
  );

  return (
    <Card className="p-5">
      <div className="pb-3 border-b border-gray-100">
        <h3 className="text-base font-bold text-gray-800">{typeLabel}</h3>
        <p className="text-[11px] text-gray-400 mt-0.5">
          {sorted.length} {sorted.length === 1 ? 'account' : 'accounts'}
        </p>
      </div>
      <div className="mt-2">
        {sorted.length === 0 ? (
          <p className="text-sm text-gray-400 py-3">No accounts yet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {sorted.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                hasEntries={accountsWithEntries.has(account.id)}
                onUpdate={onUpdate}
                owners={owners}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AccountManager() {
  const { accounts, entries, accountTypes, addAccount, updateAccount } = useData();
  const { owners } = useOwners();

  const [newName, setNewName]       = useState('');
  const [newTypeId, setNewTypeId]   = useState('');
  const [newSubTypeId, setNewSubTypeId] = useState('');
  const [adding, setAdding]         = useState(false);
  const [error, setError]           = useState('');

  // Set defaults once account types are loaded
  useEffect(() => {
    if (accountTypes.length > 0 && !newTypeId) {
      const first = accountTypes[0];
      setNewTypeId(String(first.id));
      const subs = first.sub_types ?? [];
      if (subs.length > 0) setNewSubTypeId(String(subs[0].id));
    }
  }, [accountTypes, newTypeId]);

  const selectedAccountType = accountTypes.find((t) => String(t.id) === newTypeId);
  const subTypeOptions = selectedAccountType?.sub_types ?? [];

  const accountsWithEntries = new Set(entries.map((e) => e.account_id));

  // Group accounts by type label
  const groupedByType = useMemo(() => {
    const groups = new Map();
    for (const at of accountTypes) {
      groups.set(at.label, []);
    }
    for (const account of accounts) {
      const typeLabel = account.type;
      // Find the matching account type label (type is normalized to type_name string)
      const atObj = accountTypes.find((t) => t.name === typeLabel || t.label === typeLabel);
      const label = atObj?.label ?? typeLabel;
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(account);
    }
    return groups;
  }, [accounts, accountTypes]);

  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) { setError('Name is required.'); return; }
    setError('');
    setAdding(true);
    const payload = {
      name: trimmed,
      type: Number(newTypeId),
      currency: 'INR',
      is_active: true,
    };
    if (newSubTypeId) payload.sub_type = Number(newSubTypeId);
    await addAccount(payload);
    setNewName('');
    setAdding(false);
  }

  return (
    <div className="space-y-6">
      {/* Add account */}
      <Card className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Add Account</p>
        <div className="flex flex-wrap gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Account name"
            className={`flex-1 min-w-0 ${inputClass}`}
          />
          <Dropdown
            value={newTypeId}
            onChange={(val) => {
              setNewTypeId(val);
              const subs = accountTypes.find((t) => String(t.id) === val)?.sub_types ?? [];
              setNewSubTypeId(subs.length > 0 ? String(subs[0].id) : '');
            }}
            options={accountTypes.map((t) => ({ value: String(t.id), label: t.label }))}
            className="min-w-[130px]"
          />
          {subTypeOptions.length > 0 && (
            <Dropdown
              value={newSubTypeId}
              onChange={setNewSubTypeId}
              options={subTypeOptions.map((s) => ({ value: String(s.id), label: s.label }))}
              className="min-w-[130px]"
            />
          )}
          <button
            onClick={handleAdd}
            disabled={adding}
            className="text-sm px-5 py-2 bg-[#1e2a30] text-white rounded-xl font-bold hover:bg-[#2a3a42] disabled:opacity-50 transition-colors"
          >
            {adding ? 'Adding...' : 'Add'}
          </button>
        </div>
        {error && <p className="text-xs text-rose-500 font-medium mt-2">{error}</p>}
      </Card>

      {/* Grouped account cards */}
      {[...groupedByType.entries()].map(([typeLabel, typeAccounts]) => (
        <AccountGroupCard
          key={typeLabel}
          typeLabel={typeLabel}
          accounts={typeAccounts}
          accountsWithEntries={accountsWithEntries}
          onUpdate={updateAccount}
          owners={owners}
        />
      ))}
    </div>
  );
}
