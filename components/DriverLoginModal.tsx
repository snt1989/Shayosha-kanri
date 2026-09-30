'use client';

import { useState } from 'react';
import { AppData, Driver } from '@/lib/types';
import Modal from './Modal';
import DriverOcrModal from './DriverOcrModal';

export default function DriverLoginModal({
  data,
  onClose,
  onSelect,
  onRegister,
  notice,
}: {
  data: AppData;
  onClose: () => void;
  onSelect: (driver: Driver) => void;
  // 免許証写真で運転者を登録し、そのままその運転者としてログインする
  onRegister: (driver: Driver) => Promise<unknown>;
  // 入力操作の途中でログインを求めるときの案内
  notice?: string | null;
}) {
  const drivers = data.drivers;
  const [query, setQuery] = useState('');
  const [showOcr, setShowOcr] = useState(false);

  const filtered = drivers.filter((d) => {
    const q = query.trim();
    if (!q) return true;
    return `${d.lastName}${d.firstName}`.includes(q) || d.dept.includes(q) || d.empId.includes(q);
  });

  // 写真登録の画面を開いている間はログイン画面を隠す（キャンセルすると検索の状態のままログイン画面に戻る）
  if (showOcr) {
    return <DriverOcrModal data={data} onClose={() => setShowOcr(false)} onSave={onRegister} />;
  }

  return (
    <Modal title="🪪 運転者としてログイン" onClose={onClose} footer={<button className="btn" onClick={onClose}>キャンセル</button>}>
      {notice && (
        <div className="alert-item warn" style={{ marginBottom: 12 }} role="alert">
          <span>🔒</span>
          <div style={{ flex: 1 }}>{notice}</div>
        </div>
      )}
      <p style={{ fontSize: 12.5, color: 'var(--slate-600)', marginTop: 0 }}>
        運転者台帳から自分の名前を選んでください。パスワードは不要です。初めての方は「免許証写真で自動登録」で登録すると、そのままログインします。ログインすると、出発登録の際に運転者情報が自動入力されます。
      </p>
      <button
        type="button"
        className="btn btn-sm"
        style={{ background: 'var(--green-50)', borderColor: 'var(--green-100)', color: 'var(--green-600)', marginBottom: 12 }}
        onClick={() => setShowOcr(true)}
      >
        📷 免許証写真で自動登録（未登録の方）
      </button>
      <div className="field">
        <label>氏名・部署・社員番号で検索</label>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="例：山田" autoFocus />
      </div>
      {filtered.length === 0 ? (
        <div className="empty-state">
          {drivers.length === 0 ? '運転者が登録されていません。上の「免許証写真で自動登録」から登録してください。' : '該当する運転者が見つかりません。未登録の場合は、上の「免許証写真で自動登録」から登録できます。'}
        </div>
      ) : (
        <div className="driver-login-list">
          {filtered.map((d) => (
            <button key={d.id} type="button" className="driver-login-item" onClick={() => onSelect(d)}>
              <span className="driver-login-name">
                {d.lastName} {d.firstName}
              </span>
              <span className="driver-login-meta">
                {d.dept}
                {d.empId ? `（${d.empId}）` : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
