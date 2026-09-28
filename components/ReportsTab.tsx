'use client';

import { useMemo, useState } from 'react';
import { AppData, Report } from '@/lib/types';
import { nowTimeStr, todayStr } from '@/lib/utils';
import Modal from './Modal';

const emptyReport = (data: AppData): Report => ({
  id: '',
  date: todayStr(),
  dept: data.masters.departments[0] || '',
  driverLast: '',
  driverFirst: '',
  driver: '',
  vehicleId: '',
  vehicleName: '',
  plate: '',
  destination: '',
  purpose: '',
  preTime: nowTimeStr(),
  preAlcohol: '0.00',
  preChecker: data.masters.checkers[0] || '',
  preMethod: data.masters.checkMethods[0] || '',
  preCheckOk: true,
  postDone: false,
  postTime: '',
  postAlcohol: '0.00',
  postChecker: '',
  postMethod: '',
  startKm: 0,
  endKm: 0,
  tripKm: 0,
  notes: '',
});

export default function ReportsTab({
  data,
  onSave,
  onDelete,
}: {
  data: AppData;
  onSave: (r: Report) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Report | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return data.reports;
    return data.reports.filter(
      (r) =>
        r.driver.includes(q) ||
        r.vehicleName.includes(q) ||
        r.destination.includes(q) ||
        r.date.includes(q)
    );
  }, [data.reports, query]);

  function openNew() {
    setEditing(emptyReport(data));
  }

  function openEdit(r: Report) {
    setEditing({ ...r });
  }

  function selectDriver(id: string) {
    if (!editing) return;
    const d = data.drivers.find((x) => x.id === id);
    if (!d) {
      setEditing({ ...editing, driverId: '', driverLast: '', driverFirst: '', dept: editing.dept });
      return;
    }
    setEditing({
      ...editing,
      driverId: d.id,
      driverLast: d.lastName,
      driverFirst: d.firstName,
      dept: d.dept || editing.dept,
    });
  }

  function selectVehicle(id: string) {
    if (!editing) return;
    const v = data.vehicles.find((x) => x.id === id);
    if (!v) {
      setEditing({ ...editing, vehicleId: '', vehicleName: '', plate: '', startKm: 0 });
      return;
    }
    setEditing({
      ...editing,
      vehicleId: v.id,
      vehicleName: v.name,
      plate: v.plate,
      startKm: editing.startKm || v.odometer,
    });
  }

  async function handleSubmit() {
    if (!editing) return;
    if (!editing.driverLast || !editing.vehicleId || !editing.destination) {
      alert('運転者・車両・行先は必須です。');
      return;
    }
    const tripKm = editing.postDone ? Math.max(0, (editing.endKm || 0) - (editing.startKm || 0)) : 0;
    setSaving(true);
    try {
      await onSave({ ...editing, tripKm });
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('この日報を削除しますか？')) return;
    await onDelete(id);
  }

  return (
    <div>
      <div className="toolbar">
        <input
          className="search"
          placeholder="運転者名・車両・行先・日付で検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ padding: '9px 12px', border: '1px solid var(--slate-300)', borderRadius: 8 }}
        />
        <button className="btn btn-primary" onClick={openNew}>
          ＋ 日報を新規登録
        </button>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state">日報データがありません</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>日付</th>
                  <th>運転者</th>
                  <th>車両</th>
                  <th>行先</th>
                  <th>出発前ALC</th>
                  <th>状態</th>
                  <th>走行km</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>{r.date}</td>
                    <td>{r.driver}</td>
                    <td>{r.vehicleName}</td>
                    <td>{r.destination}</td>
                    <td>
                      {parseFloat(r.preAlcohol || '0') > 0 ? (
                        <span className="pill pill-red">{r.preAlcohol}mg/L</span>
                      ) : (
                        <span className="pill pill-green">0.00</span>
                      )}
                    </td>
                    <td>
                      {r.postDone ? (
                        <span className="pill pill-green">帰着済</span>
                      ) : (
                        <span className="pill pill-amber">出庫中</span>
                      )}
                    </td>
                    <td>{r.postDone ? `${r.tripKm}km` : '-'}</td>
                    <td>
                      <button className="btn btn-sm" onClick={() => openEdit(r)}>
                        編集
                      </button>{' '}
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(r.id)}>
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
          title={editing.id ? '日報を編集' : '日報を新規登録'}
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
              <label>利用日</label>
              <input
                type="date"
                value={editing.date}
                onChange={(e) => setEditing({ ...editing, date: e.target.value })}
              />
            </div>
            <div className="field">
              <label>事業部・部署</label>
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
              <label>運転者</label>
              <select value={editing.driverId || ''} onChange={(e) => selectDriver(e.target.value)}>
                <option value="">選択してください</option>
                {data.drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.lastName} {d.firstName}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>使用車両</label>
              <select value={editing.vehicleId} onChange={(e) => selectVehicle(e.target.value)}>
                <option value="">選択してください</option>
                {data.vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>行先</label>
              <input
                value={editing.destination}
                onChange={(e) => setEditing({ ...editing, destination: e.target.value })}
              />
            </div>
            <div className="field">
              <label>用件</label>
              <input value={editing.purpose} onChange={(e) => setEditing({ ...editing, purpose: e.target.value })} />
            </div>
          </div>

          <div className="section-heading">出発前点呼・アルコールチェック</div>
          <div className="field-row">
            <div className="field">
              <label>点呼時刻</label>
              <input
                type="time"
                value={editing.preTime}
                onChange={(e) => setEditing({ ...editing, preTime: e.target.value })}
              />
            </div>
            <div className="field">
              <label>アルコール濃度（mg/L）</label>
              <input
                type="number"
                step="0.01"
                value={editing.preAlcohol}
                onChange={(e) => setEditing({ ...editing, preAlcohol: e.target.value })}
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>確認者</label>
              <select
                value={editing.preChecker}
                onChange={(e) => setEditing({ ...editing, preChecker: e.target.value })}
              >
                {data.masters.checkers.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>確認方法</label>
              <select
                value={editing.preMethod}
                onChange={(e) => setEditing({ ...editing, preMethod: e.target.value })}
              >
                {data.masters.checkMethods.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={editing.preCheckOk}
                onChange={(e) => setEditing({ ...editing, preCheckOk: e.target.checked })}
              />
              目視・日常点検を実施し異常なし
            </label>
          </div>
          <div className="field">
            <label>出発時 走行距離（km）</label>
            <input
              type="number"
              value={editing.startKm}
              onChange={(e) => setEditing({ ...editing, startKm: Number(e.target.value) })}
            />
          </div>

          <div className="section-heading">帰着報告</div>
          <div className="field">
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={editing.postDone}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    postDone: e.target.checked,
                    postTime: e.target.checked ? editing.postTime || nowTimeStr() : editing.postTime,
                    postChecker: e.target.checked ? editing.postChecker || data.masters.checkers[0] || '' : editing.postChecker,
                    postMethod: e.target.checked ? editing.postMethod || data.masters.checkMethods[0] || '' : editing.postMethod,
                  })
                }
              />
              帰着済み（帰着後点呼を実施）
            </label>
          </div>
          {editing.postDone && (
            <>
              <div className="field-row">
                <div className="field">
                  <label>帰着時刻</label>
                  <input
                    type="time"
                    value={editing.postTime}
                    onChange={(e) => setEditing({ ...editing, postTime: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>アルコール濃度（mg/L）</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editing.postAlcohol}
                    onChange={(e) => setEditing({ ...editing, postAlcohol: e.target.value })}
                  />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>確認者</label>
                  <select
                    value={editing.postChecker}
                    onChange={(e) => setEditing({ ...editing, postChecker: e.target.value })}
                  >
                    {data.masters.checkers.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>確認方法</label>
                  <select
                    value={editing.postMethod}
                    onChange={(e) => setEditing({ ...editing, postMethod: e.target.value })}
                  >
                    {data.masters.checkMethods.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>帰着時 走行距離（km）</label>
                <input
                  type="number"
                  value={editing.endKm}
                  onChange={(e) => setEditing({ ...editing, endKm: Number(e.target.value) })}
                />
              </div>
            </>
          )}

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
