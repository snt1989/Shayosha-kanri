'use client';

import { AppData } from '@/lib/types';
import AlertsPanel from './AlertsPanel';

export default function DashboardTab({ data }: { data: AppData }) {
  return (
    <div>
      <div className="card" style={{ marginBottom: 14 }}>
        <h3 className="card-title" style={{ marginBottom: 4 }}>
          📊 ダッシュボード
        </h3>
        <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>
          車検・点検・免許更新・アルコールチェックのアラートをまとめて確認できます。
        </div>
      </div>
      <AlertsPanel data={data} standalone />
    </div>
  );
}
