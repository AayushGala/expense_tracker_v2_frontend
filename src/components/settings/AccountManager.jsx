import { useEffect, useState } from 'react';
import Card from '../common/Card';
import Dropdown from '../common/Dropdown';
import { useData } from '../../context/DataContext';
import { useOwners } from '../../hooks/useOwners';

// Account types and sub-types are now loaded dynamically from the API via DataContext.

const inputClass =
  'text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 hover:border-gray-300 transition-colors';

const TYPE_BADGE_COLORS = {
  asset:      'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
  liability:  'bg-rose-50 text-rose-600 ring-rose-200/60',
  receivable: 'bg-sky-50 text-sky-700 ring-sky-200/60',
};

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
  const badgeColor = TYPE_BADGE_COLORS[account.type] ?? 'bg-gray-50 text-gray-600 ring-gray-200/60';

  return (
    <div className={`flex items-center gap-2.5 py-3 group ${isInactive ? 'opacity-40' : ''}`}>
      {/* Type badge */}
      <span className={`text-[11px] px-2 py-0.5 rounded-lg font-semibold ring-1 capitalize shrink-0 ${badgeColor}`}>
        {account.type}
      </span>

      {/* Name */}
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
            className={`flex-1 ${inputClass} !border-teal-300`}
          />
          <button
            onClick={handleSaveName}
            disabled={savingName}
            className="text-xs px-3 py-1.5 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
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
          <span className="flex-1 text-sm font-medium text-gray-700 truncate">
            {account.name}
          </span>
          {owners.length > 0 && (
            <select
              value={account.owner || ''}
              onChange={async (e) => {
                await onUpdate(account.id, { owner: e.target.value });
              }}
              className="text-[11px] border border-gray-200 rounded-lg px-1.5 py-1 text-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500/20 shrink-0"
            >
              <option value="">No owner</option>
              {owners.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-gray-400 hover:text-teal-600 px-2 py-1 rounded-lg hover:bg-teal-50 font-medium transition-colors shrink-0"
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

export default function AccountManager() {
  const { accounts, entries, accountTypes, addAccount, updateAccount } = useData();
  const { owners } = useOwners();

  const [newName, setNewName]       = useState('');
  const [newType, setNewType]       = useState('');
  const [newSubType, setNewSubType] = useState('');
  const [adding, setAdding]         = useState(false);
  const [error, setError]           = useState('');

  // Set defaults once account types are loaded
  useEffect(() => {
    if (accountTypes.length > 0 && !newType) {
      const first = accountTypes[0];
      setNewType(first.name);
      const subs = first.sub_types ?? [];
      if (subs.length > 0) setNewSubType(subs[0].name);
    }
  }, [accountTypes, newType]);

  const selectedAccountType = accountTypes.find((t) => t.name === newType);
  const subTypeOptions = selectedAccountType?.sub_types ?? [];

  const accountsWithEntries = new Set(entries.map((e) => e.account_id));

  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) { setError('Name is required.'); return; }
    setError('');
    setAdding(true);
    await addAccount({
      name: trimmed,
      type: newType,
      sub_type: newSubType,
      currency: 'INR',
      is_active: true,
    });
    setNewName('');
    setAdding(false);
  }

  const allAccounts = accounts;

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
            value={newType}
            onChange={(val) => {
              setNewType(val);
              const subs = accountTypes.find((t) => t.name === val)?.sub_types ?? [];
              setNewSubType(subs.length > 0 ? subs[0].name : '');
            }}
            options={accountTypes.map((t) => ({ value: t.name, label: t.label }))}
            className="min-w-[130px]"
          />
          {subTypeOptions.length > 0 && (
            <Dropdown
              value={newSubType}
              onChange={setNewSubType}
              options={subTypeOptions.map((s) => ({ value: s.name, label: s.label }))}
              className="min-w-[130px]"
            />
          )}
          <button
            onClick={handleAdd}
            disabled={adding}
            className="text-sm px-5 py-2 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {adding ? 'Adding...' : 'Add'}
          </button>
        </div>
        {error && <p className="text-xs text-rose-500 font-medium mt-2">{error}</p>}
      </Card>

      {/* Account list */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            All Accounts
          </p>
          <span className="text-[11px] text-gray-400 font-medium">{allAccounts.length} items</span>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Accounts with transactions can be deactivated but not deleted.
        </p>
        {allAccounts.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No accounts found.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {allAccounts.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                hasEntries={accountsWithEntries.has(account.id)}
                onUpdate={updateAccount}
                owners={owners}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
