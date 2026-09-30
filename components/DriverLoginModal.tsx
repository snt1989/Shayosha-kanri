'use client';

import { useState } from 'react';
import { Driver } from '@/lib/types';
import Modal from './Modal';

export default function DriverLoginModal({
  drivers,
  onClose,
  onSelect,
}: {
  drivers: Driver[];
  onClose: () => void;
  onSelect: (driver: Driver) => void;
}) {
  const [query, setQuery] = useState('');

  const filtered = drivers.filter((d) => {
    const q = query.trim();
    if (!q) return true;
    return `${d.lastName}${d.firstName}`.includes(q) || d.dept.includes(q) || d.empId.includes(q);
  });

  return (
    <Modal title="🪪 運転者としてログイン" onClose={onClose} footer={<button className="btn" onClick={onClose}>キャンセル</button>}>
      <p style={{ fontSize: 12.5, color: 'var(--slate-600)', marginTop: 0 }}>
        運転者台帳から自分の名前を選んでください。パスワードは不要です。ログインすると、出発登録の際に運転者情報が自動入力されます。
      </p>
      <div className="field">
        <label>氏名・部署・社員番号で検索</label>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="例：山田" autoFocus />
      </div>
      {filtered.length === 0 ? (
        <div className="empty-state">
          {drivers.length === 0 ? '運転者が登録されていません。管理画面（管理者ログインが必要）の運転者台帳から登録してください。' : '該当する運転者が見つかりません。'}
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
