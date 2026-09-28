'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AppData, Report } from '@/lib/types';
import { nowTimeStr, todayStr } from '@/lib/utils';
import { downloadCsv } from '@/lib/csv';
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
  inspectionPhoto: '',
});

function reportsToCsv(reports: Report[]): string {
  const headers = ['日付', '運転者', '使用車両', '行先・用件', '運転前ALC', '運転後ALC', '出発km', '帰着km', '実走行km', 'ステータス', '特記事項'];
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const rows = reports.map((r) =>
    [
      r.date,
      r.driver,
      r.vehicleName,
      `${r.destination}${r.purpose ? ' / ' + r.purpose : ''}`,
      r.preAlcohol,
      r.postDone ? r.postAlcohol : '-',
      r.startKm,
      r.postDone ? r.endKm : '',
      r.postDone ? r.tripKm : '',
      r.postDone ? '帰着済' : '出庫中',
      r.notes,
    ]
      .map(esc)
      .join(',')
  );
  return '﻿' + [headers.map(esc).join(','), ...rows].join('\r\n');
}

export default function ReportsTab({
  data,
  onSave,
  onDelete,
  openTrigger,
}: {
  data: AppData;
  onSave: (r: Report) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  openTrigger?: number;
}) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Report | null>(null);
  const [saving, setSaving] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const lastTrigger = useRef(openTrigger);

  useEffect(() => {
    if (openTrigger !== undefined && openTrigger !== lastTrigger.current) {
      lastTrigger.current = openTrigger;
      setEditing(emptyReport(data));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTrigger]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return data.reports;
    return data.reports.filter(
      (r) => r.driver.includes(q) || r.vehicleName.includes(q) || r.destination.includes(q) || r.date.includes(q)
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
    setEditing({ ...editing, driverId: d.id, driverLast: d.lastName, driverFirst: d.firstName, dept: d.dept || editing.dept });
  }

  function selectVehicle(id: string) {
    if (!editing) return;
    const v = data.vehicles.find((x) => x.id === id);
    if (!v) {
      setEditing({ ...editing, vehicleId: '', vehicleName: '', plate: '', startKm: 0 });
      return;
    }
    setEditing({ ...editing, vehicleId: v.id, vehicleName: v.name, plate: v.plate, startKm: editing.startKm || v.odometer });
  }

  function handlePhotoFile(file: File | null) {
    if (!editing || !file) return;
    const reader = new FileReader();
    reader.onload = () => setEditing((cur) => (cur ? { ...cur, inspectionPhoto: String(reader.result) } : cur));
    reader.readAsDataURL(file);
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

  function exportCsv() {
    downloadCsv(`運転日報_${todayStr()}.csv`, reportsToCsv(filtered).replace(/^﻿/, ''));
  }

  return (
    <div>
      <div className="card">
        <div className="toolbar2">
          <div>
            <h3 className="card-title" style={{ marginBottom: 4 }}>
              📋 運転日報 &amp; 酒気帯び確認記録簿 <span className="pill pill-slate">白ナンバー点呼基準</span>
            </h3>
            <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>
              運転前後の酒気帯び確認・簡易点検・実走行kmを記録保管します。
            </div>
          </div>
          <div className="actions">
            <input
              className="search"
              placeholder="運転者・車両・行先を検索…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ padding: '9px 12px', border: '1px solid var(--slate-300)', borderRadius: 8, minWidth: 220 }}
            />
            <button className="btn btn-sm" onClick={exportCsv}>
              ⬇ CSV出力
            </button>
            <button className="btn btn-primary btn-sm" onClick={openNew}>
              ＋ 出発登録（運転前）
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">日報データがありません</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>日付</th>
                  <th>運転者</th>
                  <th>使用車両</th>
                  <th>行先・用件</th>
                  <th>運転前ALC</th>
                  <th>運転後ALC</th>
                  <th>走行メーター</th>
                  <th>点検写真</th>
                  <th>ステータス</th>
                  <th>管理操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>{r.date}</td>
                    <td>{r.driver}</td>
                    <td>{r.vehicleName}</td>
                    <td>
                      {r.destination}
                      {r.purpose ? ` / ${r.purpose}` : ''}
                    </td>
                    <td>
                      {parseFloat(r.preAlcohol || '0') > 0 ? (
                        <span className="pill pill-red">{r.preAlcohol}mg/L</span>
                      ) : (
                        <span className="pill pill-green">0.00</span>
                      )}
                    </td>
                    <td>
                      {!r.postDone ? (
                        <span className="pill pill-slate">未実施</span>
                      ) : parseFloat(r.postAlcohol || '0') > 0 ? (
                        <span className="pill pill-red">{r.postAlcohol}mg/L</span>
                      ) : (
                        <span className="pill pill-green">0.00</span>
                      )}
                    </td>
                    <td>{r.postDone ? `${r.startKm.toLocaleString()}→${r.endKm.toLocaleString()}km（${r.tripKm}km）` : `${r.startKm.toLocaleString()}km〜`}</td>
                    <td>
                      {r.inspectionPhoto ? (
                        <img src={r.inspectionPhoto} alt="点検写真" className="thumb-photo" onClick={() => window.open(r.inspectionPhoto, '_blank')} />
                      ) : (
                        <span style={{ color: 'var(--slate-400, #94a3b8)', fontSize: 11 }}>-</span>
                      )}
                    </td>
                    <td>
                      {r.postDone ? <span className="pill pill-green">帰着済</span> : <span className="pill pill-amber">出庫中</span>}
                    </td>
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
          title={editing.id ? '日報を編集' : '出発登録（運転前）'}
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
              <input type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} />
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
              <input value={editing.destination} onChange={(e) => setEditing({ ...editing, destination: e.target.value })} />
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
              <input type="time" value={editing.preTime} onChange={(e) => setEditing({ ...editing, preTime: e.target.value })} />
            </div>
            <div className="field">
              <label>アルコール濃度（mg/L）</label>
              <input type="number" step="0.01" value={editing.preAlcohol} onChange={(e) => setEditing({ ...editing, preAlcohol: e.target.value })} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>確認者</label>
              <select value={editing.preChecker} onChange={(e) => setEditing({ ...editing, preChecker: e.target.value })}>
                {data.masters.checkers.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>確認方法</label>
              <select value={editing.preMethod} onChange={(e) => setEditing({ ...editing, preMethod: e.target.value })}>
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
              <input type="checkbox" checked={editing.preCheckOk} onChange={(e) => setEditing({ ...editing, preCheckOk: e.target.checked })} />
              目視・日常点検を実施し異常なし
            </label>
          </div>
          <div className="field">
            <label>出発時 走行距離（km）</label>
            <input type="number" value={editing.startKm} onChange={(e) => setEditing({ ...editing, startKm: Number(e.target.value) })} />
          </div>
          <div className="field">
            <label>点検写真（任意）</label>
            {editing.inspectionPhoto ? (
              <div>
                <img src={editing.inspectionPhoto} alt="点検写真プレビュー" className="photo-preview" />
                <button type="button" className="btn btn-sm" onClick={() => setEditing({ ...editing, inspectionPhoto: '' })}>
                  写真を削除
                </button>
              </div>
            ) : (
              <div className="photo-drop" onClick={() => photoInputRef.current?.click()}>
                📷 タップして点検写真を撮影・アップロード
              </div>
            )}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => handlePhotoFile(e.target.files?.[0] || null)}
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
                  <input type="time" value={editing.postTime} onChange={(e) => setEditing({ ...editing, postTime: e.target.value })} />
                </div>
                <div className="field">
                  <label>アルコール濃度（mg/L）</label>
                  <input type="number" step="0.01" value={editing.postAlcohol} onChange={(e) => setEditing({ ...editing, postAlcohol: e.target.value })} />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>確認者</label>
                  <select value={editing.postChecker} onChange={(e) => setEditing({ ...editing, postChecker: e.target.value })}>
                    {data.masters.checkers.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>確認方法</label>
                  <select value={editing.postMethod} onChange={(e) => setEditing({ ...editing, postMethod: e.target.value })}>
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
                <input type="number" value={editing.endKm} onChange={(e) => setEditing({ ...editing, endKm: Number(e.target.value) })} />
              </div>
            </>
          )}

          <div className="field">
            <label>特記事項</label>
            <textarea rows={2} value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
          </div>
        </Modal>
      )}
    </div>
  );
}
