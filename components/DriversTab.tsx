'use client';

import { useMemo, useState } from 'react';
import { AppData, Driver } from '@/lib/types';
import { daysUntil } from '@/lib/utils';
import Modal from './Modal';

const emptyDriver = (data: AppData): Driver => ({
  id: '',
  lastName: '',
  firstName: '',
  empId: '',
  dept: data.masters.departments[0] || '',
  licenseType: data.masters.licenseTypes[0] || '',
  licenseExpiry: '',
  phone: '',
  licenseNo: '',
  notes: '',
});

export default function DriversTab({
  data,
  onSave,
  onDelete,
}: {
  data: AppData;
  onSave: (d: Driver) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Driver | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return data.drivers;
    return data.drivers.filter(
      (d) => `${d.lastName}${d.firstName}`.includes(q) || d.empId.includes(q) || d.dept.includes(q)
    );
  }, [data.drivers, query]);

  function openNew() {
    setEditing(emptyDriver(data));
  }

  function openEdit(d: Driver) {
    setEditing({ ...d });
  }

  async function handleSubmit() {
    if (!editing) return;
    if (!editing.lastName || !editing.firstName) {
      alert('氏名（姓・名）は必須です。');
      return;
    }
    setSaving(true);
    try {
      await onSave(editing);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('この運転者を削除しますか？')) return;
    await onDelete(id);
  }

  function licenseBadge(d: Driver) {
    const days = daysUntil(d.licenseExpiry);
    if (days === null) return <span className="pill pill-slate">未設定</span>;
    if (days < 0) return <span className="pill pill-red">期限切れ</span>;
    if (days <= 30) return <span className="pill pill-amber">あと{days}日</span>;
    return <span className="pill pill-green">正常</span>;
  }

  return (
    <div>
      <div className="toolbar">
        <input
          className="search"
          placeholder="氏名・社員番号・部署で検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ padding: '9px 12px', border: '1px solid var(--slate-300)', borderRadius: 8 }}
        />
        <button className="btn btn-primary" onClick={openNew}>
          ＋ 運転者を新規登録
        </button>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state">運転者データがありません</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>氏名</th>
                  <th>社員番号</th>
                  <th>所属</th>
                  <th>免許種別</th>
                  <th>免許更新期日</th>
                  <th>状態</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id}>
                    <td>
                      {d.lastName} {d.firstName}
                    </td>
                    <td>{d.empId || '-'}</td>
                    <td>{d.dept}</td>
                    <td>{d.licenseType}</td>
                    <td>{d.licenseExpiry || '-'}</td>
                    <td>{licenseBadge(d)}</td>
                    <td>
                      <button className="btn btn-sm" onClick={() => openEdit(d)}>
                        編集
                      </button>{' '}
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(d.id)}>
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <Modal
          title={editing.id ? '運転者情報を編集' : '運転者を新規登録'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn" onClick={() => setEditing(null)}>
                キャンセル
              </button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? '保存中…' : '保存する'}
              </button>
            </>
          }
        >
          <div className="field-row">
            <div className="field">
              <label>氏名（姓）</label>
              <input
                value={editing.lastName}
                onChange={(e) => setEditing({ ...editing, lastName: e.target.value })}
              />
            </div>
            <div className="field">
              <label>氏名（名）</label>
              <input
                value={editing.firstName}
                onChange={(e) => setEditing({ ...editing, firstName: e.target.value })}
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>社員番号</label>
              <input value={editing.empId} onChange={(e) => setEditing({ ...editing, empId: e.target.value })} />
            </div>
            <div className="field">
              <label>所属事業部</label>
              <select value={editing.dept} onChange={(e) => setEditing({ ...editing, dept: e.target.value })}>
                {data.masters.departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>免許種別</label>
              <select
                value={editing.licenseType}
                onChange={(e) => setEditing({ ...editing, licenseType: e.target.value })}
              >
                {data.masters.licenseTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>免許更新期日</label>
              <input
                type="date"
                value={editing.licenseExpiry}
                onChange={(e) => setEditing({ ...editing, licenseExpiry: e.target.value })}
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>連絡先電話番号</label>
              <input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
            </div>
            <div className="field">
              <label>免許証番号</label>
              <input
                value={editing.licenseNo}
                onChange={(e) => setEditing({ ...editing, licenseNo: e.target.value })}
              />
            </div>
          </div>
          <div className="field">
            <label>特記事項</label>
            <textarea
              rows={2}
              value={editing.notes}
              onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
