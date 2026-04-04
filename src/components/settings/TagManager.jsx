import { useMemo } from 'react';
import Card from '../common/Card';
import { useData } from '../../context/DataContext';

export default function TagManager() {
  const { transactions } = useData();

  const tags = useMemo(() => {
    const set = new Set();
    for (const txn of transactions) {
      if (!txn.tags) continue;
      const parts = String(txn.tags)
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      parts.forEach((p) => set.add(p));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  const tagCounts = useMemo(() => {
    const counts = new Map();
    for (const txn of transactions) {
      if (!txn.tags) continue;
      const parts = String(txn.tags)
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      parts.forEach((p) => counts.set(p, (counts.get(p) ?? 0) + 1));
    }
    return counts;
  }, [transactions]);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="pb-3 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800">Tags</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Tags are derived automatically from your transactions.
          </p>
        </div>
        {tags.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 mt-2">
            No tags found. Add tags to transactions using comma-separated values.
          </p>
        ) : (
          <>
            <div className="mt-3"></div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <div
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#c5f1ec] ring-1 ring-[#2cbcac]/30"
                >
                  <span className="text-sm text-[#1e2a30] font-semibold">{tag}</span>
                  <span className="text-[11px] text-[#2cbcac] font-medium">
                    x{tagCounts.get(tag) ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
