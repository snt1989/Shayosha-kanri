'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AppData, Driver, Report } from '@/lib/types';
import { genId, nowTimeStr, todayStr } from '@/lib/utils';
import { downloadCsv } from '@/lib/csv';
import Modal from './Modal';

const emptyReport = (data: AppData): Report => ({
  id: '',
  date: todayStr(),
  dept: data.masters.departments[0] || '',
  driverId: '',
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
  alcoholSkipped: false,
  tireOk: true,
  brakeOk: true,
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

const emptyQuickDriver = (data: AppData): Driver => ({
  id: '',
  lastName: '',
  firstName: '',
  empId: '',
  dept: data.masters.departments[0] || '',
  licenseType: data.masters.licenseTypes[0] || '',
  licenseExpiry: '',
  phone: '',
  licenseNo: '',
  notes: '本人登録（出発登録画面より）',
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
  onSaveDriver,
  openTrigger,
  isAdmin,
  onRequestLogin,
}: {
  data: AppData;
  onSave: (r: Report) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onSaveDriver: (d: Driver) => Promise<unknown>;
  openTrigger?: number;
  isAdmin: boolean;
  onRequestLogin: () => void;
}) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Report | null>(null);
  const [saving, setSaving] = useState(false);
  const [quickDriver, setQuickDriver] = useState<Driver | null>(null);
  const [savingDriver, setSavingDriver] = useState(false);
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

  const reportCodes = useMemo(() => {
    const sorted = [...data.reports].sort((a, b) => (a.date + a.preTime).localeCompare(b.date + b.preTime));
    const map = new Map<string, string>();
    sorted.forEach((r, idx) => map.set(r.id, `R-${101 + idx}`));
    return map;
  }, [data.reports]);

  function openNew() {
    setEditing(emptyReport(data));
  }
  function openEdit(r: Report) {
    if (!isAdmin) {
      onRequestLogin();
      return;
    }
    setEditing({ ...r });
  }
  function openReturnCheckin(r: Report) {
    setEditing({
      ...r,
      postDone: true,
      postTime: r.postTime || nowTimeStr(),
      postChecker: r.postChecker || data.masters.checkers[0] || '',
      postMethod: r.postMethod || data.masters.checkMethods[0] || '',
    });
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

  async function handleQuickDriverSave() {
    if (!quickDriver || !editing) return;
    if (!quickDriver.lastName || !quickDriver.firstName) {
      alert('氏名（姓・名）は必須です。');
      return;
    }
    const rec: Driver = { ...quickDriver, id: quickDriver.id || genId('d') };
    setSavingDriver(true);
    try {
      await onSaveDriver(rec);
      setEditing({ ...editing, driverId: rec.id, driverLast: rec.lastName, driverFirst: rec.firstName, dept: rec.dept || editing.dept });
      setQuickDriver(null);
    } finally {
      setSavingDriver(false);
    }
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
    if (!editing.driverLast || !editing.driverFirst || !editing.vehicleId || !editing.destination) {
      alert('運転者（姓・名）・車両・行先は必須です。');
      return;
    }
    const tripKm = editing.postDone ? Math.max(0, (editing.endKm || 0) - (editing.startKm || 0)) : 0;
    const driver = `${editing.driverLast} ${editing.driverFirst}`.trim();
    setSaving(true);
    try {
      await onSave({ ...editing, driver, tripKm });
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!isAdmin) {
      onRequestLogin();
      return;
    }
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
              確定済み日報の編集・削除は管理者ログインが必要です。
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
                    <td>
                      {r.date}
                      <span className="cell-sub">{reportCodes.get(r.id)}</span>
                    </td>
                    <td>
                      {r.driver}
                      {r.dept && <span className="pill pill-slate cell-sub-pill">{r.dept}</span>}
                    </td>
                    <td>
                      {r.vehicleName}
                      {r.plate && <span className="cell-sub">{r.plate}</span>}
                    </td>
                    <td>
                      {r.destination}
                      {r.purpose && <span className="cell-sub">{r.purpose}</span>}
                    </td>
                    <td>
                      {r.alcoholSkipped ? (
                        <span className="pill pill-slate">パス（免除）</span>
                      ) : parseFloat(r.preAlcohol || '0') > 0 ? (
                        <span className="pill pill-red">{r.preAlcohol}mg/L</span>
                      ) : (
                        <span className="pill pill-green">0.00</span>
                      )}
                    </td>
                    <td>
                      {!r.postDone ? (
                        <button className="btn btn-sm" style={{ background: 'var(--amber-50, #fffbeb)', borderColor: 'var(--amber-100, #fde68a)', color: 'var(--amber-600)' }} onClick={() => openReturnCheckin(r)}>
                          帰着登録する
                        </button>
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
                        {isAdmin ? '編集' : '🔒 編集'}
                      </button>{' '}
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(r.id)}>
                        {isAdmin ? '削除' : '🔒 削除'}
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
          tone="dark"
          title={editing.postDone ? '【帰着後】日報を編集' : editing.id ? '【運転前】出発登録を編集' : '【運転前】出発登録 & アルコール点呼'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn" onClick={() => setEditing(null)}>
                キャンセル
              </button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? '保存中…' : editing.id ? '保存する' : '出発を登録する（運行開始）'}
              </button>
            </>
          }
        >
          <div className="driverpick-row">
            <div className="field">
              <label>登録運転者から選択:</label>
              <select value={editing.driverId || ''} onChange={(e) => selectDriver(e.target.value)}>
                <option value="">-- 台帳から選択 --</option>
                {data.drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.lastName} {d.firstName}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn btn-sm"
              style={{ background: 'var(--green-50, #ecfdf5)', borderColor: 'var(--green-100, #a7f3d0)', color: 'var(--green-600)' }}
              onClick={() => setQuickDriver(emptyQuickDriver(data))}
            >
              🚗 本人登録
            </button>
          </div>

          <div className="field-row-4" style={{ marginBottom: 12 }}>
            <div className="field">
              <label>利用日 *</label>
              <input type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} />
            </div>
            <div className="field">
              <label>事業部 *</label>
              <select value={editing.dept} onChange={(e) => setEditing({ ...editing, dept: e.target.value })}>
                {data.masters.departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>運転者(姓) *</label>
              <input value={editing.driverLast} onChange={(e) => setEditing({ ...editing, driverLast: e.target.value })} />
            </div>
            <div className="field">
              <label>運転者(名) *</label>
              <input value={editing.driverFirst} onChange={(e) => setEditing({ ...editing, driverFirst: e.target.value })} />
            </div>
          </div>

          <div className="field-row-4" style={{ marginBottom: 12 }}>
            <div className="field">
              <label>使用車両 *</label>
              <select value={editing.vehicleId} onChange={(e) => selectVehicle(e.target.value)}>
                <option value="">選択してください</option>
                {data.vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>行先 *</label>
              <input value={editing.destination} onChange={(e) => setEditing({ ...editing, destination: e.target.value })} />
            </div>
            <div className="field">
              <label>用件</label>
              <input value={editing.purpose} onChange={(e) => setEditing({ ...editing, purpose: e.target.value })} />
            </div>
          </div>

          <div className="section-heading-row">
            <div className="section-heading">●【運転前】アルコールチェック &amp; 簡易点検</div>
            <label className="checkbox-field">
              <input type="checkbox" checked={!!editing.alcoholSkipped} onChange={(e) => setEditing({ ...editing, alcoholSkipped: e.target.checked })} />
              アルコールチェックをパス（免除）
            </label>
          </div>
          <div className="field-row-4" style={{ marginBottom: 4 }}>
            <div className="field">
              <label>出発時刻</label>
              <input type="time" value={editing.preTime} onChange={(e) => setEditing({ ...editing, preTime: e.target.value })} />
            </div>
            <div className="field">
              <label>検知器測定値（mg/L）</label>
              <input
                type="number"
                step="0.01"
                value={editing.preAlcohol}
                disabled={!!editing.alcoholSkipped}
                onChange={(e) => setEditing({ ...editing, preAlcohol: e.target.value })}
              />
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
          </div>
          <div className="check-row">
            <label className="checkbox-field">
              <input type="checkbox" checked={editing.tireOk} onChange={(e) => setEditing({ ...editing, tireOk: e.target.checked })} />
              タイヤ空気圧・外観キズ異常なし
            </label>
            <label className="checkbox-field">
              <input type="checkbox" checked={editing.brakeOk} onChange={(e) => setEditing({ ...editing, brakeOk: e.target.checked })} />
              ブレーキ・ランプ点灯良好
            </label>
          </div>

          <div className="field">
            <label>出発時メーター（km） *</label>
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
              帰着情報（運転後）も同時に今すぐ一括入力する
            </label>
          </div>
          {editing.postDone && (
            <>
              <div className="section-heading">帰着後点呼</div>
              <div className="field-row-4">
                <div className="field">
                  <label>帰着時刻</label>
                  <input type="time" value={editing.postTime} onChange={(e) => setEditing({ ...editing, postTime: e.target.value })} />
                </div>
                <div className="field">
                  <label>アルコール濃度（mg/L）</label>
                  <input type="number" step="0.01" value={editing.postAlcohol} onChange={(e) => setEditing({ ...editing, postAlcohol: e.target.value })} />
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

      {quickDriver && (
        <Modal
          title="🚗 本人登録（簡易運転者登録）"
          onClose={() => setQuickDriver(null)}
          footer={
            <>
              <button className="btn" onClick={() => setQuickDriver(null)}>
                キャンセル
              </button>
              <button className="btn btn-primary" onClick={handleQuickDriverSave} disabled={savingDriver}>
                {savingDriver ? '登録中…' : 'この内容で登録して選択する'}
              </button>
            </>
          }
        >
          <div className="field-row">
            <div className="field">
              <label>氏名（姓）*</label>
              <input value={quickDriver.lastName} onChange={(e) => setQuickDriver({ ...quickDriver, lastName: e.target.value })} />
            </div>
            <div className="field">
              <label>氏名（名）*</label>
              <input value={quickDriver.firstName} onChange={(e) => setQuickDriver({ ...quickDriver, firstName: e.target.value })} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>所属事業部</label>
              <select value={quickDriver.dept} onChange={(e) => setQuickDriver({ ...quickDriver, dept: e.target.value })}>
                {data.masters.departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>免許種別</label>
              <select value={quickDriver.licenseType} onChange={(e) => setQuickDriver({ ...quickDriver, licenseType: e.target.value })}>
                {data.masters.licenseTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>連絡先電話番号</label>
              <input value={quickDriver.phone} onChange={(e) => setQuickDriver({ ...quickDriver, phone: e.target.value })} />
            </div>
            <div className="field">
              <label>免許更新期日</label>
              <input type="date" value={quickDriver.licenseExpiry} onChange={(e) => setQuickDriver({ ...quickDriver, licenseExpiry: e.target.value })} />
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--slate-500)' }}>
            簡易登録です。免許証番号など詳細情報は「運転者台帳・免許」タブからいつでも追記できます。
          </div>
        </Modal>
      )}
    </div>
  );
}
