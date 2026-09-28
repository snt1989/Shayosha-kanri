'use client';

import { useMemo, useRef, useState } from 'react';
import { AppData, MaintRecord, Vehicle } from '@/lib/types';
import { daysUntil, genId, todayStr } from '@/lib/utils';
import { csvToVehicles, downloadCsv, vehiclesToCsv } from '@/lib/csv';
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
  onBulkSave,
}: {
  data: AppData;
  onSave: (v: Vehicle) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onBulkSave: (list: Vehicle[]) => Promise<unknown>;
}) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [saving, setSaving] = useState(false);
  const [newMaint, setNewMaint] = useState<Partial<MaintRecord>>({});
  const [bulkRows, setBulkRows] = useState<Vehicle[] | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  function openBulkEdit() {
    setBulkRows(data.vehicles.map((v) => ({ ...v, maintHistory: [...v.maintHistory] })));
  }

  function addBulkRow() {
    setBulkRows((rows) => [
      ...(rows || []),
      {
        id: genId('v'),
        name: '',
        plate: '',
        modelType: '',
        shakenDate: '',
        checkDate: '',
        odometer: 0,
        oilKm: 3000,
        tire: data.masters.tireTypes[0] || '',
        maintHistory: [],
      },
    ]);
  }

  function updateBulkRow(idx: number, patch: Partial<Vehicle>) {
    setBulkRows((rows) => {
      if (!rows) return rows;
      const list = [...rows];
      list[idx] = { ...list[idx], ...patch };
      return list;
    });
  }

  function removeBulkRow(idx: number) {
    setBulkRows((rows) => {
      if (!rows) return rows;
      const list = [...rows];
      list.splice(idx, 1);
      return list;
    });
  }

  async function saveBulkEdit() {
    if (bulkRows === null) return;
    if (bulkRows.some((v) => !v.name.trim() || !v.plate.trim() || !v.shakenDate)) {
      alert('車両呼称・ナンバープレート・車検満了日は全行で必須です。');
      return;
    }
    setBulkSaving(true);
    try {
      await onBulkSave(bulkRows);
      setBulkRows(null);
    } finally {
      setBulkSaving(false);
    }
  }

  function triggerCsvImport() {
    fileRef.current?.click();
  }

  function handleCsvFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const text = String(reader.result || '');
      const imported = csvToVehicles(text, data.vehicles);
      const byId = new Map(data.vehicles.map((v) => [v.id, v]));
      imported.forEach((v) => byId.set(v.id, v));
      if (!confirm(`${imported.length}件の車両データを取り込みます。よろしいですか？`)) return;
      await onBulkSave(Array.from(byId.values()));
    };
    reader.readAsText(file, 'utf-8');
    if (fileRef.current) fileRef.current.value = '';
  }

  function exportCsv() {
    downloadCsv(`車両台帳_${todayStr()}.csv`, vehiclesToCsv(data.vehicles).replace(/^﻿/, ''));
  }

  return (
    <div>
      <div className="card">
        <div className="toolbar2">
          <div>
            <h3 className="card-title" style={{ marginBottom: 4 }}>
              🚗 社用車 台帳管理 <span className="pill pill-slate">車検・車両・整備</span>
            </h3>
            <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>
              車検満了日・12ヶ月点検・走行メーター・タイヤ種別を一括管理できます。
            </div>
          </div>
          <div className="actions">
            <input
              className="search"
              placeholder="車両呼称・ナンバーで検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ padding: '9px 12px', border: '1px solid var(--slate-300)', borderRadius: 8, minWidth: 180 }}
            />
            <button className="btn btn-sm" onClick={openBulkEdit}>
              📝 まとめて一括編集
            </button>
            <button className="btn btn-sm" onClick={triggerCsvImport}>
              ⬆ 車両CSV取込
            </button>
            <button className="btn btn-sm" onClick={exportCsv}>
              ⬇ 車両CSV出力
            </button>
            <button className="btn btn-primary btn-sm" onClick={openNew}>
              ＋ 1台ずつ新規登録
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => handleCsvFile(e.target.files?.[0] || null)} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">車両データがありません</div>
        ) : (
          <div className="cardgrid">
            {filtered.map((v) => {
              const remainOil = Math.max(0, v.oilKm - v.odometer);
              return (
                <div className="entity-card" key={v.id}>
                  <div className="ehead">
                    <div>
                      <div className="ename">{v.name}</div>
                      <div className="esub">
                        {v.plate} / 型式: {v.modelType || '-'}
                      </div>
                    </div>
                    <span className="pill pill-slate">{v.tire}</span>
                  </div>
                  <div className="emeta">
                    <div>
                      <span className="k">残存整備距離</span>
                      <span className="v">{remainOil.toLocaleString()} km</span>
                    </div>
                    <div>
                      <span className="k">次回オイル交換目安</span>
                      <span className="v">{v.oilKm.toLocaleString()} km</span>
                    </div>
                    <div>
                      <span className="k">車検満了日</span>
                      <span className="v">
                        {v.shakenDate || '-'} {shakenBadge(v)}
                      </span>
                    </div>
                    <div>
                      <span className="k">12ヶ月点検日</span>
                      <span className="v">{v.checkDate || '-'}</span>
                    </div>
                  </div>
                  <div className="efoot">
                    <button className="btn btn-sm" onClick={() => openEdit(v)}>
                      📝 点検・整備記録
                    </button>
                    <span className="eid">{v.id}</span>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(v.id)}>
                      削除
                    </button>
                  </div>
                </div>
              );
            })}
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
            <input value={editing.modelType} onChange={(e) => setEditing({ ...editing, modelType: e.target.value })} />
          </div>

          <div className="section-heading">点検・車検</div>
          <div className="field-row">
            <div className="field">
              <label>車検満了日</label>
              <input type="date" value={editing.shakenDate} onChange={(e) => setEditing({ ...editing, shakenDate: e.target.value })} />
            </div>
            <div className="field">
              <label>12ヶ月点検日</label>
              <input type="date" value={editing.checkDate} onChange={(e) => setEditing({ ...editing, checkDate: e.target.value })} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>現在積算走行（km）</label>
              <input type="number" value={editing.odometer} onChange={(e) => setEditing({ ...editing, odometer: Number(e.target.value) })} />
            </div>
            <div className="field">
              <label>次回オイル交換目安（km）</label>
              <input type="number" value={editing.oilKm} onChange={(e) => setEditing({ ...editing, oilKm: Number(e.target.value) })} />
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
              <input type="date" value={newMaint.date || ''} onChange={(e) => setNewMaint({ ...newMaint, date: e.target.value })} />
            </div>
            <div className="field">
              <label>整備種別</label>
              <select value={newMaint.type || ''} onChange={(e) => setNewMaint({ ...newMaint, type: e.target.value })}>
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
              <input type="number" value={newMaint.km ?? ''} onChange={(e) => setNewMaint({ ...newMaint, km: Number(e.target.value) })} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>備考</label>
              <input value={newMaint.note || ''} onChange={(e) => setNewMaint({ ...newMaint, note: e.target.value })} />
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

      {bulkRows !== null && (
        <Modal
          title="社用車台帳 まとめて一括編集"
          onClose={() => setBulkRows(null)}
          wide="x"
          footer={
            <>
              <button className="btn" onClick={() => setBulkRows(null)}>
                破棄して閉じる
              </button>
              <button className="btn btn-primary" onClick={saveBulkEdit} disabled={bulkSaving}>
                {bulkSaving ? '保存中…' : '✓ 変更を一括保存する'}
              </button>
            </>
          }
        >
          <div className="bulk-grid-toolbar">
            <button className="btn btn-sm bulk-grid-add-row" type="button" onClick={addBulkRow}>
              ＋ 車両行を追加（+1台）
            </button>
            <span className="bulk-grid-hint">※各セルを直接クリックして文字や数値を書き換えてください</span>
            <span className="bulk-grid-count">登録車両数: {bulkRows.length}台</span>
          </div>
          <div className="bulk-grid-wrap">
            <table className="bulk-grid">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>車両呼称（車名/色）*</th>
                  <th>ナンバープレート *</th>
                  <th>型式</th>
                  <th>車検満了日 *</th>
                  <th>12ヶ月点検日</th>
                  <th>現在積算（km）</th>
                  <th>次回オイル目安</th>
                  <th>装着タイヤ</th>
                  <th>削除</th>
                </tr>
              </thead>
              <tbody>
                {bulkRows.map((v, idx) => (
                  <tr key={v.id || idx}>
                    <td className="bulk-no">{idx + 1}</td>
                    <td>
                      <input value={v.name} onChange={(e) => updateBulkRow(idx, { name: e.target.value })} />
                    </td>
                    <td>
                      <input value={v.plate} onChange={(e) => updateBulkRow(idx, { plate: e.target.value })} />
                    </td>
                    <td>
                      <input value={v.modelType} onChange={(e) => updateBulkRow(idx, { modelType: e.target.value })} />
                    </td>
                    <td>
                      <input type="date" value={v.shakenDate} onChange={(e) => updateBulkRow(idx, { shakenDate: e.target.value })} />
                    </td>
                    <td>
                      <input type="date" value={v.checkDate} onChange={(e) => updateBulkRow(idx, { checkDate: e.target.value })} />
                    </td>
                    <td>
                      <input type="number" value={v.odometer} onChange={(e) => updateBulkRow(idx, { odometer: Number(e.target.value) })} />
                    </td>
                    <td>
                      <input type="number" value={v.oilKm} onChange={(e) => updateBulkRow(idx, { oilKm: Number(e.target.value) })} />
                    </td>
                    <td>
                      <select value={v.tire} onChange={(e) => updateBulkRow(idx, { tire: e.target.value })}>
                        {data.masters.tireTypes.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="bulk-del">
                      <button className="bulk-grid-del-btn" type="button" onClick={() => removeBulkRow(idx)} aria-label="この行を削除">
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}
