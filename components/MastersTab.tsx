'use client';

import { useState } from 'react';
import { MASTER_KEYS, MASTER_LABELS, Masters } from '@/lib/types';

export default function MastersTab({
  masters,
  onSaveCategory,
}: {
  masters: Masters;
  onSaveCategory: (category: keyof Masters, items: string[]) => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingCat, setSavingCat] = useState<string | null>(null);

  async function addItem(cat: keyof Masters) {
    const val = (drafts[cat] || '').trim();
    if (!val) return;
    if (masters[cat].includes(val)) {
      setDrafts({ ...drafts, [cat]: '' });
      return;
    }
    setSavingCat(cat);
    try {
      await onSaveCategory(cat, [...masters[cat], val]);
      setDrafts({ ...drafts, [cat]: '' });
    } finally {
      setSavingCat(null);
    }
  }

  async function removeItem(cat: keyof Masters, val: string) {
    setSavingCat(cat);
    try {
      await onSaveCategory(
        cat,
        masters[cat].filter((v) => v !== val)
      );
    } finally {
      setSavingCat(null);
    }
  }

  return (
    <div className="masters-grid">
      {MASTER_KEYS.map((cat) => (
        <div className="card" key={cat}>
          <h3 className="card-title">{MASTER_LABELS[cat]}</h3>
          <div className="master-chip-list">
            {masters[cat].length === 0 && <span className="empty-state">未登録</span>}
            {masters[cat].map((v) => (
              <span className="master-chip" key={v}>
                {v}
                <button onClick={() => removeItem(cat, v)} disabled={savingCat === cat} aria-label="削除">
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="add-row">
            <input
              placeholder="新しい項目を追加"
              value={drafts[cat] || ''}
              onChange={(e) => setDrafts({ ...drafts, [cat]: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addItem(cat);
              }}
            />
            <button className="btn btn-sm btn-primary" onClick={() => addItem(cat)} disabled={savingCat === cat}>
              追加
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
