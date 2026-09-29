'use client';

import { AppData } from '@/lib/types';
import { todayStr } from '@/lib/utils';
import AlertsPanel from './AlertsPanel';

export default function DashboardTab({ data, onReturnCheckin }: { data: AppData; onReturnCheckin: (id: string) => void }) {
  const today = todayStr();
  const openReports = [...data.reports]
    .filter((r) => !r.postDone)
    .sort((a, b) => (a.date + a.preTime).localeCompare(b.date + b.preTime));

  return (
    <div>
      <div className="card" style={{ marginBottom: 14 }}>
        <h3 className="card-title" style={{ marginBottom: 4 }}>
          📊 ダッシュボード
        </h3>
        <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>
          車検・点検・免許更新・アルコールチェックのアラートと、帰着未登録の日報をまとめて確認できます。
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <h3 className="card-title">
          🚙 帰着登録が済んでいない日報
          {openReports.length > 0 && <span className="pill pill-amber" style={{ marginLeft: 8 }}>{openReports.length}件</span>}
        </h3>
        {openReports.length === 0 ? (
          <div className="empty-state">帰着未登録の日報はありません</div>
        ) : (
          <div className="alert-list">
            {openReports.map((r) => {
              const overdue = r.date < today;
              return (
                <div key={r.id} className={`alert-item ${overdue ? 'danger' : 'warn'}`}>
                  <span>🚗</span>
                  <div style={{ flex: 1 }}>
                    <strong>
                      {r.date} {r.driver}
                    </strong>
                    （{r.vehicleName}）— {r.destination}
                    {r.purpose ? ` / ${r.purpose}` : ''}　出発 {r.preTime}
                    {overdue && '（日付超過）'}
                  </div>
                  <button className="btn btn-sm btn-primary" onClick={() => onReturnCheckin(r.id)}>
                    帰着登録する
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AlertsPanel data={data} standalone />
    </div>
  );
}
