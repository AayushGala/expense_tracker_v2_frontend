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
    <div className="space-y-5">
      <p className="text-sm text-gray-400">
        Tags are derived automatically from your transactions. Edit tags directly on each transaction.
      </p>

      <Card className="p-5">
        {tags.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            No tags found. Add tags to transactions using comma-separated values.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                All Tags
              </p>
              <span className="text-[11px] text-gray-400 font-medium">{tags.length} unique</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <div
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 ring-1 ring-teal-200/60"
                >
                  <span className="text-sm text-teal-700 font-semibold">{tag}</span>
                  <span className="text-[11px] text-teal-400 font-medium">
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
