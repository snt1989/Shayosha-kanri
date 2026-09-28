'use client';

import { useState } from 'react';
import { AppData, Masters, MasterKey } from '@/lib/types';
import MastersTab from './MastersTab';
import LogsTab from './LogsTab';

type AdminSection = 'masters' | 'logs';

export default function AdminTab({
  data,
  isAdmin,
  adminConfigured,
  onSaveCategory,
  onSaveAll,
  onRequestLogin,
  onClearLogs,
}: {
  data: AppData;
  isAdmin: boolean;
  adminConfigured: boolean;
  onSaveCategory: (category: MasterKey, items: string[]) => Promise<unknown>;
  onSaveAll: (masters: Masters) => Promise<unknown>;
  onRequestLogin: () => void;
  onClearLogs: () => Promise<unknown>;
}) {
  const [section, setSection] = useState<AdminSection>('masters');

  if (!isAdmin) {
    return (
      <div className="card">
        <div className="locked-panel">
          <div className="lock-ic">🔒</div>
          <h3>管理者ログインが必要です</h3>
          <p>
            各種マスタ設定・操作ログ／バックアップは、誤操作・改ざん防止のため管理者のみ利用できます。
          </p>
          <button className="btn btn-primary" onClick={onRequestLogin}>
            🔒 管理者ログイン
          </button>
          {!adminConfigured && (
            <p style={{ marginTop: 14, color: 'var(--amber-600)' }}>
              ※ サーバーに ADMIN_PASSWORD が未設定です。Vercelの環境変数を設定してください。
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 14 }}>
        <h3 className="card-title" style={{ marginBottom: 4 }}>
          🛠️ 管理画面
        </h3>
        <div style={{ fontSize: 12, color: 'var(--slate-500)', marginBottom: 12 }}>
          各種マスタ設定と操作ログ・バックアップをまとめて管理します。
        </div>
        <div className="subtabbar">
          <button className={`subtab ${section === 'masters' ? 'active' : ''}`} onClick={() => setSection('masters')}>
            <span>⚙️</span>各種マスタ設定
          </button>
          <button className={`subtab ${section === 'logs' ? 'active' : ''}`} onClick={() => setSection('logs')}>
            <span>🗂️</span>操作ログ・バックアップ
          </button>
        </div>
      </div>

      {section === 'masters' && (
        <MastersTab
          masters={data.masters}
          isAdmin={isAdmin}
          adminConfigured={adminConfigured}
          onSaveCategory={onSaveCategory}
          onSaveAll={onSaveAll}
          onRequestLogin={onRequestLogin}
        />
      )}
      {section === 'logs' && (
        <LogsTab
          data={data}
          isAdmin={isAdmin}
          adminConfigured={adminConfigured}
          onRequestLogin={onRequestLogin}
          onClearLogs={onClearLogs}
        />
      )}
    </div>
  );
}
