'use client';

import { AppData, Driver, MAINT_URGENCIES, Reservation } from '@/lib/types';
import { openMaintRequests, todayStr } from '@/lib/utils';
import AlertsPanel from './AlertsPanel';
import UsageCalendar from './UsageCalendar';

export default function DashboardTab({
  data,
  onReturnCheckin,
  onOpenMaintenance,
  currentDriver,
  onSaveReservation,
  onDeleteReservation,
}: {
  data: AppData;
  onReturnCheckin: (id: string) => void;
  onOpenMaintenance: () => void;
  currentDriver?: Driver | null;
  onSaveReservation: (r: Reservation) => Promise<unknown>;
  onDeleteReservation: (id: string) => Promise<unknown>;
}) {
  const today = todayStr();
  const openReports = [...data.reports]
    .filter((r) => !r.postDone)
    .sort((a, b) => (a.date + a.preTime).localeCompare(b.date + b.preTime));
  const maintRequests = openMaintRequests(data.reports);

  return (
    <div>
      <div className="card" style={{ marginBottom: 14 }}>
        <h3 className="card-title" style={{ marginBottom: 4 }}>
          📊 ダッシュボード
        </h3>
        <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>
          車検・点検・免許更新・アルコールチェックのアラート、帰着未登録の日報、整備依頼、車両の使用・予約カレンダーをまとめて確認できます。
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

      <div className="card" style={{ marginBottom: 14 }}>
        <h3 className="card-title">
          🔧 整備依頼（対応待ち）
          {maintRequests.length > 0 && <span className="pill pill-red" style={{ marginLeft: 8 }}>{maintRequests.length}件</span>}
        </h3>
        {maintRequests.length === 0 ? (
          <div className="empty-state">対応待ちの整備依頼はありません</div>
        ) : (
          <div className="alert-list">
            {maintRequests.map((r) => {
              const urgent = r.maintRequestUrgency === MAINT_URGENCIES[2];
              return (
                <div key={r.id} className={`alert-item ${urgent ? 'danger' : 'warn'}`}>
                  <span>🔧</span>
                  <div style={{ flex: 1 }}>
                    <strong>{r.vehicleName}</strong>
                    {r.plate ? `（${r.plate}）` : ''}— {r.maintRequestType || '整備'}
                    {r.maintRequestUrgency && r.maintRequestUrgency !== MAINT_URGENCIES[0] && (
                      <span className={`pill ${urgent ? 'pill-red' : 'pill-amber'}`} style={{ marginLeft: 6 }}>
                        {r.maintRequestUrgency}
                      </span>
                    )}
                    <div style={{ fontSize: 12, marginTop: 2 }}>
                      {r.maintRequestNote}　依頼: {r.date} {r.driver}
                    </div>
                  </div>
                  <button className="btn btn-sm btn-primary" onClick={onOpenMaintenance}>
                    整備台帳で対応
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <UsageCalendar
        data={data}
        currentDriver={currentDriver}
        onSaveReservation={onSaveReservation}
        onDeleteReservation={onDeleteReservation}
      />

      <AlertsPanel data={data} standalone />
    </div>
  );
}
