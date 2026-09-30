'use client';

import { useState } from 'react';
import { Driver, EmpIdRule } from '@/lib/types';
import { effectiveNext, formatEmpId } from '@/lib/empId';

export default function EmpIdRuleCard({
  rule,
  drivers,
  onSave,
}: {
  rule: EmpIdRule;
  drivers: Driver[];
  onSave: (r: EmpIdRule & { assignMissing?: boolean }) => Promise<unknown>;
}) {
  const [prefix, setPrefix] = useState(rule.prefix);
  const [digits, setDigits] = useState(String(rule.digits));
  const [next, setNext] = useState(String(rule.next));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const d = Math.min(8, Math.max(1, parseInt(digits, 10) || 1));
  const n = Math.max(1, parseInt(next, 10) || 1);
  const draft: EmpIdRule = { prefix: prefix.trim(), digits: d, next: n };
  const missing = drivers.filter((x) => !x.empId?.trim()).length;
  const actualNext = effectiveNext(draft, drivers);

  async function save(assignMissing: boolean) {
    setBusy(true);
    setMsg('');
    try {
      await onSave({ ...draft, assignMissing });
      setMsg(assignMissing ? `保存し、社員番号が未設定の運転者に採番しました。` : '採番ルールを保存しました。');
    } catch {
      setMsg('保存できませんでした。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 className="card-title" style={{ marginBottom: 4 }}>
        🔢 社員番号の自動採番ルール
      </h3>
      <div style={{ fontSize: 12, color: 'var(--slate-500)', marginBottom: 12 }}>
        運転者を登録するとき、社員番号が空欄なら下のルールで自動的に番号を振ります（手入力・CSVの番号はそのまま優先されます）。
      </div>
      <div className="field-row">
        <div className="field">
          <label>接頭辞</label>
          <input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="例: EMP-" maxLength={12} />
        </div>
        <div className="field">
          <label>数字の桁数（ゼロ埋め）</label>
          <input type="number" min={1} max={8} value={digits} onChange={(e) => setDigits(e.target.value)} />
        </div>
        <div className="field">
          <label>次に振る番号</label>
          <input type="number" min={1} value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
      </div>
      <div style={{ fontSize: 13, margin: '4px 0 12px' }}>
        次に登録される運転者の社員番号: <b>{formatEmpId(draft, actualNext)}</b>
        {actualNext !== n && (
          <span style={{ color: 'var(--slate-500)', fontSize: 12 }}>（既存の番号との重複を避けて繰り上げています）</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn btn-primary btn-sm" onClick={() => save(false)} disabled={busy}>
          ルールを保存
        </button>
        <button className="btn btn-sm" onClick={() => save(true)} disabled={busy || missing === 0}>
          保存して未設定の運転者（{missing}名）に採番
        </button>
        {msg && <span style={{ fontSize: 12, color: 'var(--slate-600)' }}>{msg}</span>}
      </div>
    </div>
  );
}
