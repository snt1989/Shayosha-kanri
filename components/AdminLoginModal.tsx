'use client';

import { useState } from 'react';
import Modal from './Modal';

export default function AdminLoginModal({
  onClose,
  onLogin,
}: {
  onClose: () => void;
  onLogin: (password: string) => Promise<{ success: boolean; message?: string }>;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const res = await onLogin(password);
      if (!res.success) {
        setError(res.message || 'ログインに失敗しました。');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="管理者ログイン"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            キャンセル
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={busy || !password}>
            {busy ? '確認中…' : 'ログイン'}
          </button>
        </>
      }
    >
      <p style={{ fontSize: 12.5, color: 'var(--slate-600)', marginTop: 0 }}>
        「各種マスタ設定」の編集には管理者パスワードが必要です。
      </p>
      <div className="field">
        <label>管理者パスワード</label>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />
      </div>
      {error && (
        <div className="notice-box" style={{ background: 'var(--red-50)', borderColor: 'var(--red-100)', color: 'var(--red-600)' }}>
          {error}
        </div>
      )}
    </Modal>
  );
}
