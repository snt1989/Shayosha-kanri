'use client';

import { useMemo, useState } from 'react';
import { AppData, MaintRecord, Vehicle } from '@/lib/types';
import { daysUntil, todayStr } from '@/lib/utils';
import Modal from './Modal';

const emptyVehicle = (data: AppData): Vehicle => ({
  id: '',
  name: '',
  plate: '',
  modelType: '',
  shakenDate: '',
  checkDate: '',
  odometer: 0,
  oilKm: 3000,
  tire: data.masters.tireTypes[0] || '',
  maintHistory: [],
});

export default function VehiclesTab({
  data,
  onSave,
  onDelete,
}: {
  data: AppData;
  onSave: (v: Vehicle) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [saving, setSaving] = useState(false);
  const [newMaint, setNewMaint] = useState<Partial<MaintRecord>>({});

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return data.vehicles;
    return data.vehicles.filter((v) => v.name.includes(q) || v.plate.includes(q));
  }, [data.vehicles, query]);

  function openNew() {
    setEditing(emptyVehicle(data));
    setNewMaint({});
  }

  function openEdit(v: Vehicle) {
    setEditing({ ...v, maintHistory: [...v.maintHistory] });
    setNewMaint({});
  }

  async function handleSubmit() {
    if (!editing) return;
    if (!editing.name || !editing.plate) {
      alert('車両呼称とナンバープレートは必須です。');
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
    if (!confirm('この車両を削除しますか？関連する過去の日報は残ります。')) return;
    await onDelete(id);
  }

  function addMaint() {
    if (!editing) return;
    if (!newMaint.type) {
      alert('整備種別を選択してください。');
      return;
    }
    const rec: MaintRecord = {
      date: newMaint.date || todayStr(),
      type: newMaint.type,
      km: Number(newMaint.km || editing.odometer),
      note: newMaint.note || '',
    };
    setEditing({ ...editing, maintHistory: [rec, ...editing.maintHistory] });
    setNewMaint({});
  }

  function removeMaint(idx: number) {
    if (!editing) return;
    const list = [...editing.maintHistory];
    list.splice(idx, 1);
    setEditing({ ...editing, maintHistory: list });
  }

  function shakenBadge(v: Vehicle) {
    const days = daysUntil(v.shakenDate);
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
          placeholder="車両呼称・ナンバーで検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ padding: '9px 12px', border: '1px solid var(--slate-300)', borderRadius: 8 }}
        />
        <button className="btn btn-primary" onClick={openNew}>
          ＋ 車両を新規登録
        </button>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state">車両データがありません</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>車両呼称</th>
                  <th>ナンバー</th>
                  <th>型式</th>
                  <th>車検満了日</th>
                  <th>状態</th>
                  <th>積算走行km</th>
                  <th>タイヤ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id}>
                    <td>{v.name}</td>
                    <td>{v.plate}</td>
                    <td>{v.modelType || '-'}</td>
                    <td>{v.shakenDate || '-'}</td>
                    <td>{shakenBadge(v)}</td>
                    <td>{v.odometer.toLocaleString()}km</td>
                    <td>{v.tire}</td>
                    <td>
                      <button className="btn btn-sm" onClick={() => openEdit(v)}>
                        編集
                      </button>{' '}
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(v.id)}>
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
          title={editing.id ? '車両情報を編集' : '車両を新規登録'}
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
          <div className="section-heading">基本情報</div>
          <div className="field-row">
            <div className="field">
              <label>車両呼称</label>
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div className="field">
              <label>ナンバープレート</label>
              <input value={editing.plate} onChange={(e) => setEditing({ ...editing, plate: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>型式</label>
            <input
              value={editing.modelType}
              onChange={(e) => setEditing({ ...editing, modelType: e.target.value })}
            />
          </div>

          <div className="section-heading">点検・車検</div>
          <div className="field-row">
            <div className="field">
              <label>車検満了日</label>
              <input
                type="date"
                value={editing.shakenDate}
                onChange={(e) => setEditing({ ...editing, shakenDate: e.target.value })}
              />
            </div>
            <div className="field">
              <label>12ヶ月点検日</label>
              <input
                type="date"
                value={editing.checkDate}
                onChange={(e) => setEditing({ ...editing, checkDate: e.target.value })}
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>現在積算走行（km）</label>
              <input
                type="number"
                value={editing.odometer}
                onChange={(e) => setEditing({ ...editing, odometer: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label>次回オイル交換目安（km）</label>
              <input
                type="number"
                value={editing.oilKm}
                onChange={(e) => setEditing({ ...editing, oilKm: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="field">
            <label>タイヤ種別</label>
            <select value={editing.tire} onChange={(e) => setEditing({ ...editing, tire: e.target.value })}>
              {data.masters.tireTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="section-heading">整備履歴</div>
          <div className="field-row">
            <div className="field">
              <label>実施日</label>
              <input
                type="date"
                value={newMaint.date || ''}
                onChange={(e) => setNewMaint({ ...newMaint, date: e.target.value })}
              />
            </div>
            <div className="field">
              <label>整備種別</label>
              <select
                value={newMaint.type || ''}
                onChange={(e) => setNewMaint({ ...newMaint, type: e.target.value })}
              >
                <option value="">選択</option>
                {data.masters.maintTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>走行km</label>
              <input
                type="number"
                value={newMaint.km ?? ''}
                onChange={(e) => setNewMaint({ ...newMaint, km: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>備考</label>
              <input
                value={newMaint.note || ''}
                onChange={(e) => setNewMaint({ ...newMaint, note: e.target.value })}
              />
            </div>
          </div>
          <button className="btn btn-sm" type="button" onClick={addMaint}>
            ＋ 整備履歴を追加
          </button>

          {editing.maintHistory.length > 0 && (
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>日付</th>
                    <th>種別</th>
                    <th>km</th>
                    <th>備考</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {editing.maintHistory.map((m, idx) => (
                    <tr key={idx}>
                      <td>{m.date}</td>
                      <td>{m.type}</td>
                      <td>{m.km.toLocaleString()}</td>
                      <td>{m.note}</td>
                      <td>
                        <button className="btn btn-sm btn-danger" onClick={() => removeMaint(idx)}>
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
