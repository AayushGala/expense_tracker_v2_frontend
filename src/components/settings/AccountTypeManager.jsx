import { useState } from 'react';
import Card from '../common/Card';
import Dropdown from '../common/Dropdown';
import { useData } from '../../context/DataContext';

const inputClass =
  'text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 hover:border-gray-300 transition-colors';

// ---------------------------------------------------------------------------
// SubType Row
// ---------------------------------------------------------------------------

function SubTypeRow({ subType, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(subType.label);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleSave() {
    const trimmed = label.trim();
    if (trimmed && trimmed !== subType.label) {
      onEdit(subType.id, { label: trimmed });
    }
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-2 py-2.5 pl-6 group">
      {editing ? (
        <>
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') { setLabel(subType.label); setEditing(false); }
            }}
            className={`flex-1 ${inputClass} !border-teal-300`}
          />
          <button
            onClick={handleSave}
            className="text-xs px-3 py-1.5 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => { setLabel(subType.label); setEditing(false); }}
            className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 font-medium transition-colors"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <span className="text-[11px] px-2 py-0.5 rounded-lg font-medium ring-1 bg-gray-50 text-gray-500 ring-gray-200/60 shrink-0">
            {subType.name}
          </span>
          <span className="flex-1 text-sm font-medium text-gray-600">{subType.label}</span>
          <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-gray-400 hover:text-teal-600 px-2 py-1 rounded-lg hover:bg-teal-50 font-medium transition-colors"
            >
              Edit
            </button>
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { onDelete(subType.id); setConfirmDelete(false); }}
                  className="text-xs px-2.5 py-1 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-gray-400 hover:text-rose-500 px-2 py-1 rounded-lg hover:bg-rose-50 font-medium transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AccountType Section (one per type, with its sub-types listed)
// ---------------------------------------------------------------------------

function AccountTypeSection({ accountType, onEditType, onDeleteType, onAddSubType, onEditSubType, onDeleteSubType }) {
  const [editingType, setEditingType] = useState(false);
  const [typeLabel, setTypeLabel] = useState(accountType.label);
  const [confirmDeleteType, setConfirmDeleteType] = useState(false);

  // Add sub-type form
  const [addingSubType, setAddingSubType] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubLabel, setNewSubLabel] = useState('');
  const [subError, setSubError] = useState('');
  const [subAdding, setSubAdding] = useState(false);

  function handleSaveType() {
    const trimmed = typeLabel.trim();
    if (trimmed && trimmed !== accountType.label) {
      onEditType(accountType.id, { label: trimmed });
    }
    setEditingType(false);
  }

  async function handleAddSubType() {
    const trimmedName = newSubName.trim();
    const trimmedLabel = newSubLabel.trim();
    if (!trimmedName) { setSubError('Name (key) is required.'); return; }
    if (!trimmedLabel) { setSubError('Label is required.'); return; }
    setSubError('');
    setSubAdding(true);
    await onAddSubType({ name: trimmedName, label: trimmedLabel, account_type: accountType.id });
    setNewSubName('');
    setNewSubLabel('');
    setSubAdding(false);
    setAddingSubType(false);
  }

  const subTypes = accountType.sub_types ?? [];

  return (
    <Card className="p-5">
      {/* Type header */}
      <div className="flex items-center gap-2 mb-1 group">
        {editingType ? (
          <>
            <input
              autoFocus
              value={typeLabel}
              onChange={(e) => setTypeLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveType();
                if (e.key === 'Escape') { setTypeLabel(accountType.label); setEditingType(false); }
              }}
              className={`flex-1 ${inputClass} !border-teal-300`}
            />
            <button
              onClick={handleSaveType}
              className="text-xs px-3 py-1.5 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => { setTypeLabel(accountType.label); setEditingType(false); }}
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <span className="text-[11px] px-2 py-0.5 rounded-lg font-semibold ring-1 bg-teal-50 text-teal-700 ring-teal-200/60 shrink-0">
              {accountType.name}
            </span>
            <p className="flex-1 text-sm font-semibold text-gray-700">{accountType.label}</p>
            <span className="text-[11px] text-gray-400 font-medium">{subTypes.length} sub-types</span>
            <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setEditingType(true)}
                className="text-xs text-gray-400 hover:text-teal-600 px-2 py-1 rounded-lg hover:bg-teal-50 font-medium transition-colors"
              >
                Edit
              </button>
              {confirmDeleteType ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { onDeleteType(accountType.id); setConfirmDeleteType(false); }}
                    className="text-xs px-2.5 py-1 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmDeleteType(false)}
                    className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteType(true)}
                  className="text-xs text-gray-400 hover:text-rose-500 px-2 py-1 rounded-lg hover:bg-rose-50 font-medium transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Sub-types list */}
      {subTypes.length === 0 ? (
        <p className="text-sm text-gray-400 py-3 pl-6">No sub-types yet.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {subTypes.map((st) => (
            <SubTypeRow key={st.id} subType={st} onEdit={onEditSubType} onDelete={onDeleteSubType} />
          ))}
        </div>
      )}

      {/* Add sub-type */}
      {addingSubType ? (
        <div className="mt-3 pl-6 flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-0">
            <label className="block text-[11px] font-medium text-gray-400 mb-1">Name (key)</label>
            <input
              autoFocus
              value={newSubName}
              onChange={(e) => setNewSubName(e.target.value)}
              placeholder="e.g. savings"
              className={`w-full ${inputClass}`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-[11px] font-medium text-gray-400 mb-1">Label</label>
            <input
              value={newSubLabel}
              onChange={(e) => setNewSubLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSubType()}
              placeholder="e.g. Savings Account"
              className={`w-full ${inputClass}`}
            />
          </div>
          <button
            onClick={handleAddSubType}
            disabled={subAdding}
            className="text-xs px-4 py-2 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {subAdding ? '...' : 'Add'}
          </button>
          <button
            onClick={() => { setAddingSubType(false); setNewSubName(''); setNewSubLabel(''); setSubError(''); }}
            className="text-xs px-4 py-2 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 font-medium transition-colors"
          >
            Cancel
          </button>
          {subError && <p className="w-full text-xs text-rose-500 font-medium">{subError}</p>}
        </div>
      ) : (
        <button
          onClick={() => setAddingSubType(true)}
          className="mt-2 ml-6 text-xs text-teal-600 hover:text-teal-700 font-semibold hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors"
        >
          + Add Sub-Type
        </button>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AccountTypeManager() {
  const {
    accountTypes,
    addAccountType,
    updateAccountType,
    deleteAccountType,
    addAccountSubType,
    updateAccountSubType,
    deleteAccountSubType,
  } = useData();

  const [newName, setNewName]   = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding]     = useState(false);
  const [error, setError]       = useState('');

  async function handleAdd() {
    const trimmedName = newName.trim();
    const trimmedLabel = newLabel.trim();
    if (!trimmedName) { setError('Name (key) is required.'); return; }
    if (!trimmedLabel) { setError('Label is required.'); return; }
    setError('');
    setAdding(true);
    await addAccountType({ name: trimmedName, label: trimmedLabel });
    setNewName('');
    setNewLabel('');
    setAdding(false);
  }

  return (
    <div className="space-y-6">
      {/* Add account type */}
      <Card className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Add Account Type</p>
        <div className="flex flex-wrap gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name (key), e.g. asset"
            className={`flex-1 min-w-0 ${inputClass}`}
          />
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Label, e.g. Asset"
            className={`flex-1 min-w-0 ${inputClass}`}
          />
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

      {/* List of account types with their sub-types */}
      {accountTypes.length === 0 ? (
        <Card className="p-5">
          <p className="text-sm text-gray-400 py-4 text-center">No account types found.</p>
        </Card>
      ) : (
        accountTypes.map((at) => (
          <AccountTypeSection
            key={at.id}
            accountType={at}
            onEditType={updateAccountType}
            onDeleteType={deleteAccountType}
            onAddSubType={addAccountSubType}
            onEditSubType={updateAccountSubType}
            onDeleteSubType={deleteAccountSubType}
          />
        ))
      )}
    </div>
  );
}
