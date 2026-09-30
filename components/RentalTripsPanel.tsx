'use client';

import { useMemo, useState } from 'react';
import { AppData, Driver, RentalTrip } from '@/lib/types';
import { daysUntil, todayStr } from '@/lib/utils';
import { downloadCsv, rentalTripsToCsv } from '@/lib/csv';
import Modal from './Modal';

const OTHER = '__other__';

export default function RentalTripsPanel({
  data,
  currentDriver,
  onRequestDriverLogin,
  onSave,
  onDelete,
  rentalId,
  onRentalIdChange,
  onBack,
}: {
  data: AppData;
  currentDriver: Driver | null;
  onRequestDriverLogin: () => void;
  onSave: (t: RentalTrip) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  rentalId: string;
  onRentalIdChange: (id: string) => void;
  onBack: () => void;
}) {
  const [driverFilter, setDriverFilter] = useState('');
  const [form, setForm] = useState<{ rec: RentalTrip; pick: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const rentalById = useMemo(() => new Map(data.rentals.map((r) => [r.id, r])), [data.rentals]);
  const rentalLabel = (id: string) => {
    const r = rentalById.get(id);
    return r ? `${r.startDate} ${r.company} ${[r.carModel, r.plate].filter(Boolean).join(' ')}`.trim() : '（削除済み）';
  };
  const driverNames = useMemo(() => Array.from(new Set(data.rentalTrips.map((t) => t.driver))), [data.rentalTrips]);

  const rows = useMemo(
    () =>
      data.rentalTrips
        .filter((t) => (!rentalId || t.rentalId === rentalId) && (!driverFilter || t.driver === driverFilter))
        .sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt)),
    [data.rentalTrips, rentalId, driverFilter]
  );

  function guard(fn: () => void) {
    if (!currentDriver) return onRequestDriverLogin();
    fn();
  }
  function openNew() {
    guard(() => {
      setError('');
      const target = rentalId || (data.rentals.length ? [...data.rentals].sort((a, b) => b.startDate.localeCompare(a.startDate))[0].id : '');
      setForm({
        rec: { id: '', rentalId: target, date: todayStr(), driverId: currentDriver?.id, driver: `${currentDriver?.lastName} ${currentDriver?.firstName}`, note: '', createdAt: '' },
        pick: currentDriver?.id || '',
      });
    });
  }
  function openEdit(t: RentalTrip) {
    guard(() => {
      setError('');
      setForm({ rec: { ...t }, pick: t.driverId && data.drivers.some((d) => d.id === t.driverId) ? t.driverId : OTHER });
    });
  }
  async function remove(t: RentalTrip) {
    if (!currentDriver) return onRequestDriverLogin();
    if (!confirm(`${t.date} ${t.driver} の運行記録を削除しますか？`)) return;
    await onDelete(t.id);
  }
  function pickDriver(v: string) {
    if (!form) return;
    if (v === OTHER) return setForm({ pick: v, rec: { ...form.rec, driverId: undefined, driver: '' } });
    const d = data.drivers.find((x) => x.id === v);
    setForm({ pick: v, rec: { ...form.rec, driverId: v, driver: d ? `${d.lastName} ${d.firstName}` : '' } });
  }
  async function submit() {
    if (!form) return;
    const { rec } = form;
    if (!rec.rentalId) return setError('レンタカーを選んでください。（先にレンタカーを登録してください）');
    if (!rec.date) return setError('運転日を入力してください。');
    if (!rec.driver.trim()) return setError('運転者を選ぶか、名前を入力してください。');
    setSaving(true);
    setError('');
    try {
      await onSave({ ...rec, driver: rec.driver.trim() });
      setForm(null);
    } catch (e) {
      setError((e as Error)?.message || '保存できませんでした。');
    } finally {
      setSaving(false);
    }
  }

  const picked = form ? data.drivers.find((d) => d.id === form.pick) : null;
  const days = picked ? daysUntil(picked.licenseExpiry) : null;
  const licenseMsg = !picked ? '' : days === null ? '免許の有効期限が未設定です。' : days < 0 ? '免許の有効期限が切れています。' : days <= 30 ? `免許の有効期限まであと${days}日です。` : '';

  return (
    <div>
      <div className="card">
        <div className="toolbar2">
          <div>
            <h3 className="card-title" style={{ marginBottom: 4 }}>
              📋 レンタカー 運行記録 <span className="pill pill-slate">誰が運転したかを別で管理</span>
            </h3>
            <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>
              レンタカーを運転した日と運転者を記録します。運転者が変わったら、その都度追加してください。
            </div>
          </div>
          <div className="actions">
            <button className="btn btn-sm" onClick={onBack}>
              ← レンタカー登録へ戻る
            </button>
            <button className="btn btn-sm" onClick={() => downloadCsv(`レンタカー運行記録_${todayStr()}.csv`, rentalTripsToCsv(rows, data.rentals))} disabled={rows.length === 0}>
              ⬇ CSV出力
            </button>
            <button className="btn btn-primary btn-sm" onClick={openNew} disabled={data.rentals.length === 0}>
              ＋ 運行記録を登録
            </button>
          </div>
        </div>

        {!currentDriver && (
          <div className="alert-item warn" style={{ margin: '10px 0' }}>
            <span>🪪</span>
            <div style={{ flex: 1 }}>運行記録の登録・変更をするには、先に運転者としてログインしてください。</div>
            <button className="btn btn-sm btn-primary" onClick={onRequestDriverLogin}>
              運転者としてログイン
            </button>
          </div>
        )}
        {data.rentals.length === 0 && <div className="empty-state">先に「レンタカー登録」でレンタカーを登録してください</div>}

        {data.rentals.length > 0 && (
          <>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '12px 0' }}>
              <select value={rentalId} onChange={(e) => onRentalIdChange(e.target.value)} style={{ padding: '8px 10px', border: '1px solid var(--slate-300)', borderRadius: 8 }}>
                <option value="">すべてのレンタカー</option>
                {[...data.rentals].sort((a, b) => b.startDate.localeCompare(a.startDate)).map((r) => (
                  <option key={r.id} value={r.id}>{rentalLabel(r.id)}</option>
                ))}
              </select>
              <select value={driverFilter} onChange={(e) => setDriverFilter(e.target.value)} style={{ padding: '8px 10px', border: '1px solid var(--slate-300)', borderRadius: 8 }}>
                <option value="">すべての運転者</option>
                {driverNames.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="pill pill-slate" style={{ alignSelf: 'center' }}>{rows.length}件</span>
            </div>

            {rows.length === 0 ? (
              <div className="empty-state">運行記録はありません</div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>運転日</th>
                      <th>運転者</th>
                      <th>レンタカー</th>
                      <th>備考</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((t) => (
                      <tr key={t.id}>
                        <td>{t.date}</td>
                        <td>
                          {t.driver}
                          {!t.driverId && <span className="cell-sub">台帳外</span>}
                        </td>
                        <td>{rentalLabel(t.rentalId)}</td>
                        <td>{t.note || '-'}</td>
                        <td>
                          <div className="eactions">
                            <button className="btn btn-sm" onClick={() => openEdit(t)}>編集</button>
                            <button className="btn btn-sm btn-danger" onClick={() => remove(t)}>削除</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {form && (
        <Modal
          title={form.rec.id ? '運行記録を編集' : '運行記録を登録'}
          onClose={() => setForm(null)}
          footer={
            <>
              <button className="btn" onClick={() => setForm(null)}>キャンセル</button>
              <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? '保存中…' : '登録する'}</button>
            </>
          }
        >
          {error && <div className="alert-item warn" style={{ marginBottom: 10 }}>{error}</div>}
          <div className="field">
            <label>レンタカー</label>
            <select value={form.rec.rentalId} onChange={(e) => setForm({ ...form, rec: { ...form.rec, rentalId: e.target.value } })}>
              {[...data.rentals].sort((a, b) => b.startDate.localeCompare(a.startDate)).map((r) => (
                <option key={r.id} value={r.id}>{rentalLabel(r.id)}</option>
              ))}
            </select>
          </div>
          <div className="field-row">
            <div className="field">
              <label>運転日</label>
              <input type="date" value={form.rec.date} onChange={(e) => setForm({ ...form, rec: { ...form.rec, date: e.target.value } })} />
            </div>
            <div className="field">
              <label>運転者</label>
              <select value={form.pick} onChange={(e) => pickDriver(e.target.value)}>
                {data.drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.lastName} {d.firstName}</option>
                ))}
                <option value={OTHER}>その他（台帳にない人）</option>
              </select>
            </div>
          </div>
          {form.pick === OTHER && (
            <div className="field">
              <label>運転者の名前</label>
              <input value={form.rec.driver} placeholder="例: ○○商事 佐藤" onChange={(e) => setForm({ ...form, rec: { ...form.rec, driver: e.target.value } })} />
            </div>
          )}
          {licenseMsg && <div className="alert-item warn" style={{ marginBottom: 10 }}>{licenseMsg}</div>}
          <div className="field">
            <label>備考（区間・用件など、任意）</label>
            <input value={form.rec.note} onChange={(e) => setForm({ ...form, rec: { ...form.rec, note: e.target.value } })} />
          </div>
        </Modal>
      )}
    </div>
  );
}
