'use client';

import { useMemo, useState } from 'react';
import { AppData, Driver, RENTAL_STATUSES, Rental, RentalOperator, RentalStatus } from '@/lib/types';
import { daysUntil, todayStr } from '@/lib/utils';
import { downloadCsv, rentalsToCsv } from '@/lib/csv';
import Modal from './Modal';

type Mode = 'edit' | 'start' | 'return';

const yen = (n?: number) => (n ? `${n.toLocaleString()} 円` : '-');
const statusPill: Record<RentalStatus, string> = {
  予約済: 'pill-slate',
  貸出中: 'pill-amber',
  返却済: 'pill-green',
  キャンセル: 'pill-slate',
};

const emptyRental = (data: AppData, d: Driver | null): Rental => ({
  id: '',
  status: '予約済',
  company: data.masters.rentalCompanies[0] || '',
  carClass: data.masters.rentalCarClasses[0] || '',
  carModel: '',
  plate: '',
  reservationNo: '',
  driverId: d?.id,
  driver: d ? `${d.lastName} ${d.firstName}` : '',
  dept: d?.dept || '',
  operators: [],
  purpose: '',
  destination: '',
  startDate: todayStr(),
  endDate: todayStr(),
  pickupPlace: '',
  returnPlace: '',
  estimateCost: 0,
  cost: 0,
  startKm: 0,
  endKm: 0,
  fuelFull: true,
  damageNote: '',
  notes: '',
  createdAt: '',
});

export default function RentalTab({
  data,
  currentDriver,
  onRequestDriverLogin,
  onSave,
  onDelete,
}: {
  data: AppData;
  currentDriver: Driver | null;
  onRequestDriverLogin: () => void;
  onSave: (r: Rental) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}) {
  const [statusFilter, setStatusFilter] = useState<'' | RentalStatus>('');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<{ rec: Rental; mode: Mode } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const today = todayStr();
  const month = today.slice(0, 7);

  const all = useMemo(
    () => [...data.rentals].sort((a, b) => (b.startDate + b.createdAt).localeCompare(a.startDate + a.createdAt)),
    [data.rentals]
  );
  const rows = useMemo(() => {
    const q = query.trim();
    return all.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (!q) return true;
      return [r.driver, r.company, r.carModel, r.plate, r.destination, r.purpose, r.reservationNo].some((s) => (s || '').includes(q));
    });
  }, [all, statusFilter, query]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    all.forEach((r) => (c[r.status] = (c[r.status] || 0) + 1));
    return c;
  }, [all]);
  const overdue = all.filter((r) => r.status === '貸出中' && r.endDate < today);
  const monthCost = all.filter((r) => r.status === '返却済' && r.endDate.startsWith(month)).reduce((s, r) => s + (r.cost || 0), 0);

  function guard(fn: () => void) {
    if (!currentDriver) {
      onRequestDriverLogin();
      return;
    }
    fn();
  }
  function openNew() {
    guard(() => {
      setError('');
      setForm({ rec: emptyRental(data, currentDriver), mode: 'edit' });
    });
  }
  function openMode(r: Rental, mode: Mode) {
    guard(() => {
      setError('');
      const rec = { ...r, operators: [...(r.operators || [])] };
      // 貸出開始のとき、運転者が未記録なら予約者本人を初期値にする
      if (mode === 'start' && rec.operators.length === 0 && rec.driver) rec.operators = [{ driverId: rec.driverId, name: rec.driver }];
      setForm({ rec, mode });
    });
  }
  async function remove(r: Rental) {
    if (!currentDriver) return onRequestDriverLogin();
    if (!confirm(`${r.startDate} ${r.driver} のレンタカー記録を削除しますか？`)) return;
    await onDelete(r.id);
  }

  async function submit() {
    if (!form) return;
    const { rec, mode } = form;
    if (!rec.company) return setError('レンタカー会社を選んでください。');
    if (!rec.startDate) return setError('利用開始日を入力してください。');
    if (rec.endDate && rec.endDate < rec.startDate) return setError('返却日は利用開始日以降にしてください。');
    const next: Rental = { ...rec };
    if (mode === 'start') {
      if (!rec.plate.trim()) return setError('借りた車のナンバーを入力してください。');
      if (!(rec.operators || []).length) return setError('運転する人を1人以上選んでください。');
      next.status = '貸出中';
    }
    if (mode === 'return') {
      if (rec.endKm && rec.startKm && rec.endKm < rec.startKm) return setError('返却メーターは出発メーター以上にしてください。');
      next.status = '返却済';
    }
    setSaving(true);
    setError('');
    try {
      await onSave(next);
      setForm(null);
    } catch (e) {
      setError((e as Error)?.message || '保存できませんでした。');
    } finally {
      setSaving(false);
    }
  }

  const set = <K extends keyof Rental>(k: K, v: Rental[K]) => form && setForm({ ...form, rec: { ...form.rec, [k]: v } });
  const numIn = (v: string) => (v === '' ? 0 : Math.max(0, Number(v) || 0));

  const ops = form?.rec.operators || [];
  const isChecked = (d: Driver) => ops.some((o) => o.driverId === d.id);
  function toggleOp(d: Driver) {
    const name = `${d.lastName} ${d.firstName}`;
    set('operators', isChecked(d) ? ops.filter((o) => o.driverId !== d.id) : [...ops, { driverId: d.id, name }]);
  }
  const extraOps = ops.filter((o) => !o.driverId);
  const [extraName, setExtraName] = useState('');
  function addExtra() {
    const n = extraName.trim();
    if (!n || ops.some((o) => o.name === n)) return;
    set('operators', [...ops, { name: n } as RentalOperator]);
    setExtraName('');
  }
  const licenseWarn = (d: Driver) => {
    const days = daysUntil(d.licenseExpiry);
    if (days === null) return '免許期限 未設定';
    if (days < 0) return '免許期限切れ';
    if (days <= 30) return `免許あと${days}日`;
    return '';
  };

  const rec = form?.rec;
  const showStart = form && (form.mode !== 'edit' || (rec && rec.status !== '予約済' && rec.status !== 'キャンセル'));
  const showReturn = form && (form.mode === 'return' || (form.mode === 'edit' && rec?.status === '返却済'));
  const showBase = form && form.mode === 'edit';
  const tripKm = rec && rec.endKm && rec.startKm ? rec.endKm - rec.startKm : 0;

  const modalTitle = !form
    ? ''
    : form.mode === 'start'
      ? '🔑 レンタカー 貸出開始'
      : form.mode === 'return'
        ? '↩️ レンタカー 返却登録'
        : rec?.id
          ? 'レンタカー記録を編集'
          : 'レンタカーを予約・登録';

  return (
    <div>
      <div className="card">
        <div className="toolbar2">
          <div>
            <h3 className="card-title" style={{ marginBottom: 4 }}>
              🚗 レンタカー管理 <span className="pill pill-slate">社用車とは別管理</span>
            </h3>
            <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>
              社用車が足りないとき・出張などで借りたレンタカーの予約 → 貸出 → 返却と費用を記録します。
            </div>
          </div>
          <div className="actions">
            <input
              className="search"
              placeholder="利用者・会社・行先などで検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ padding: '9px 12px', border: '1px solid var(--slate-300)', borderRadius: 8, minWidth: 180 }}
            />
            <button className="btn btn-sm" onClick={() => downloadCsv(`レンタカー記録_${todayStr()}.csv`, rentalsToCsv(all))} disabled={all.length === 0}>
              ⬇ CSV出力
            </button>
            <button className="btn btn-primary btn-sm" onClick={openNew}>
              ＋ レンタカーを予約・登録
            </button>
          </div>
        </div>

        {!currentDriver && (
          <div className="alert-item warn" style={{ margin: '10px 0' }}>
            <span>🪪</span>
            <div style={{ flex: 1 }}>レンタカーの登録・変更をするには、先に運転者としてログインしてください。</div>
            <button className="btn btn-sm btn-primary" onClick={onRequestDriverLogin}>
              運転者としてログイン
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '12px 0' }}>
          <span className="pill pill-amber">貸出中 {counts['貸出中'] || 0}件</span>
          <span className="pill pill-slate">予約済 {counts['予約済'] || 0}件</span>
          <span className="pill pill-green">今月の確定費用 {monthCost.toLocaleString()} 円</span>
          {overdue.length > 0 && <span className="pill pill-red">返却期限超過 {overdue.length}件</span>}
        </div>

        <div className="subtabbar">
          {(['', ...RENTAL_STATUSES] as const).map((s) => (
            <button key={s || 'all'} className={`subtab ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
              {s || 'すべて'}
              {s === '' ? `（${all.length}）` : `（${counts[s] || 0}）`}
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="empty-state">レンタカーの記録はありません</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>利用期間</th>
                  <th>レンタカー</th>
                  <th>利用者（予約者）</th>
                  <th>運転した人</th>
                  <th>行先・用件</th>
                  <th>金額</th>
                  <th>状態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.startDate}
                      {r.endDate !== r.startDate && <span className="cell-sub">〜 {r.endDate}</span>}
                    </td>
                    <td>
                      {r.company}
                      <span className="cell-sub">
                        {[r.carClass, r.carModel, r.plate].filter(Boolean).join(' / ') || '-'}
                      </span>
                      {r.reservationNo && <span className="cell-sub">予約番号 {r.reservationNo}</span>}
                    </td>
                    <td>
                      {r.driver}
                      <span className="cell-sub">{r.dept}</span>
                    </td>
                    <td>
                      {(r.operators || []).length === 0 ? (
                        <span style={{ color: 'var(--slate-400)' }}>{r.status === '予約済' || r.status === 'キャンセル' ? '-' : '未記録'}</span>
                      ) : (
                        (r.operators || []).map((o, i) => (
                          <div key={i}>{o.name}</div>
                        ))
                      )}
                    </td>
                    <td>
                      {r.destination || '-'}
                      {r.purpose && <span className="cell-sub">{r.purpose}</span>}
                    </td>
                    <td>
                      {r.status === '返却済' ? yen(r.cost) : yen(r.estimateCost)}
                      <span className="cell-sub">{r.status === '返却済' ? '確定' : '見積'}</span>
                      {r.status === '返却済' && r.endKm > 0 && r.startKm > 0 && <span className="cell-sub">走行 {r.endKm - r.startKm} km</span>}
                    </td>
                    <td>
                      <span className={`pill ${statusPill[r.status]}`}>{r.status}</span>
                      {r.status === '貸出中' && r.endDate < today && <span className="pill pill-red cell-sub-pill">期限超過</span>}
                      {r.status === '返却済' && r.damageNote && <span className="pill pill-red cell-sub-pill">申告あり</span>}
                    </td>
                    <td>
                      <div className="eactions">
                        {r.status === '予約済' && (
                          <button className="btn btn-sm btn-primary" onClick={() => openMode(r, 'start')}>
                            貸出開始
                          </button>
                        )}
                        {r.status === '貸出中' && (
                          <button className="btn btn-sm btn-primary" onClick={() => openMode(r, 'return')}>
                            返却登録
                          </button>
                        )}
                        <button className="btn btn-sm" onClick={() => openMode(r, 'edit')}>
                          編集
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => remove(r)}>
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {form && rec && (
        <Modal
          wide
          title={modalTitle}
          onClose={() => setForm(null)}
          footer={
            <>
              <button className="btn" onClick={() => setForm(null)}>
                キャンセル
              </button>
              <button className="btn btn-primary" onClick={submit} disabled={saving}>
                {saving ? '保存中…' : form.mode === 'start' ? '貸出開始として保存' : form.mode === 'return' ? '返却済として保存' : '保存する'}
              </button>
            </>
          }
        >
          {error && <div className="alert-item warn" style={{ marginBottom: 10 }}>{error}</div>}
          <div style={{ fontSize: 13, color: 'var(--slate-600)', marginBottom: 10 }}>
            利用者: <b>{rec.driver || '-'}</b>
            {rec.dept && `（${rec.dept}）`}
            {form.mode !== 'edit' && ` ／ ${rec.company} ${rec.startDate}〜${rec.endDate}`}
          </div>

          {showBase && (
            <>
              <div className="section-heading">予約内容</div>
              <div className="field-row">
                <div className="field">
                  <label>レンタカー会社</label>
                  <select value={rec.company} onChange={(e) => set('company', e.target.value)}>
                    {Array.from(new Set([...data.masters.rentalCompanies, rec.company].filter(Boolean))).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>予約番号</label>
                  <input value={rec.reservationNo} onChange={(e) => set('reservationNo', e.target.value)} />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>車種クラス</label>
                  <select value={rec.carClass} onChange={(e) => set('carClass', e.target.value)}>
                    {Array.from(new Set([...data.masters.rentalCarClasses, rec.carClass].filter(Boolean))).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>車種（任意）</label>
                  <input value={rec.carModel} placeholder="例: ヤリス" onChange={(e) => set('carModel', e.target.value)} />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>利用開始日</label>
                  <input type="date" value={rec.startDate} onChange={(e) => set('startDate', e.target.value)} />
                </div>
                <div className="field">
                  <label>返却予定日</label>
                  <input type="date" value={rec.endDate} onChange={(e) => set('endDate', e.target.value)} />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>出発店舗</label>
                  <input value={rec.pickupPlace} onChange={(e) => set('pickupPlace', e.target.value)} />
                </div>
                <div className="field">
                  <label>返却店舗</label>
                  <input value={rec.returnPlace} onChange={(e) => set('returnPlace', e.target.value)} />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>行先</label>
                  <input value={rec.destination} onChange={(e) => set('destination', e.target.value)} />
                </div>
                <div className="field">
                  <label>用件・レンタカーを使う理由</label>
                  <input value={rec.purpose} placeholder="例: 出張、社用車が全台使用中" onChange={(e) => set('purpose', e.target.value)} />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>見積金額（円）</label>
                  <input type="number" min={0} value={rec.estimateCost || ''} onChange={(e) => set('estimateCost', numIn(e.target.value))} />
                </div>
                <div className="field">
                  <label>状態</label>
                  <select value={rec.status} onChange={(e) => set('status', e.target.value as RentalStatus)}>
                    {RENTAL_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {form && (form.mode !== 'edit' || showStart) && (
            <>
              <div className="section-heading">運転した人（運転する人）</div>
              <div style={{ fontSize: 12, color: 'var(--slate-500)', marginBottom: 6 }}>
                運転者台帳から選んでください（複数可）。台帳にない人は下の欄から名前で追加できます。
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {data.drivers.map((d) => {
                  const warn = licenseWarn(d);
                  return (
                    <label key={d.id} className="btn btn-sm" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', cursor: 'pointer', background: isChecked(d) ? 'var(--green-100)' : undefined }}>
                      <input type="checkbox" checked={isChecked(d)} onChange={() => toggleOp(d)} style={{ width: 'auto' }} />
                      {d.lastName} {d.firstName}
                      {warn && <span className="pill pill-red">{warn}</span>}
                    </label>
                  );
                })}
              </div>
              {extraOps.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {extraOps.map((o) => (
                    <span key={o.name} className="pill pill-slate">
                      {o.name}（台帳外）
                      <button style={{ marginLeft: 4, border: 0, background: 'none', cursor: 'pointer' }} onClick={() => set('operators', ops.filter((x) => x !== o))}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input
                  value={extraName}
                  placeholder="台帳にない人の名前（例: ○○商事 佐藤）"
                  onChange={(e) => setExtraName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExtra(); } }}
                  style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--slate-300)', borderRadius: 8 }}
                />
                <button className="btn btn-sm" onClick={addExtra} disabled={!extraName.trim()}>
                  追加
                </button>
              </div>
            </>
          )}

          {showStart && (
            <>
              <div className="section-heading">貸出時</div>
              <div className="field-row">
                <div className="field">
                  <label>借りた車のナンバー</label>
                  <input value={rec.plate} placeholder="例: 品川 300 あ 12-34" onChange={(e) => set('plate', e.target.value)} />
                </div>
                <div className="field">
                  <label>出発メーター（km）</label>
                  <input type="number" min={0} value={rec.startKm || ''} onChange={(e) => set('startKm', numIn(e.target.value))} />
                </div>
              </div>
            </>
          )}

          {showReturn && (
            <>
              <div className="section-heading">返却時</div>
              <div className="field-row">
                <div className="field">
                  <label>返却メーター（km）{tripKm > 0 && ` ／ 走行 ${tripKm} km`}</label>
                  <input type="number" min={0} value={rec.endKm || ''} onChange={(e) => set('endKm', numIn(e.target.value))} />
                </div>
                <div className="field">
                  <label>確定金額（円）</label>
                  <input type="number" min={0} value={rec.cost || ''} placeholder={rec.estimateCost ? `見積 ${rec.estimateCost.toLocaleString()}` : ''} onChange={(e) => set('cost', numIn(e.target.value))} />
                </div>
              </div>
              <div className="field">
                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="checkbox" checked={rec.fuelFull} onChange={(e) => set('fuelFull', e.target.checked)} style={{ width: 'auto' }} />
                  満タン返却した
                </label>
              </div>
              <div className="field">
                <label>傷・事故・違反などの申告（なければ空欄）</label>
                <textarea rows={2} value={rec.damageNote} onChange={(e) => set('damageNote', e.target.value)} />
              </div>
            </>
          )}

          {(showBase || showReturn) && (
            <div className="field">
              <label>備考</label>
              <textarea rows={2} value={rec.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
