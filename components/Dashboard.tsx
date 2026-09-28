'use client';

import { AppData } from '@/lib/types';
import { daysUntil, todayStr } from '@/lib/utils';

export default function Dashboard({ data }: { data: AppData }) {
  const today = todayStr();
  const todayReports = data.reports.filter((r) => r.date === today);
  const outNow = data.reports.filter((r) => r.date === today && !r.postDone);
  const ngAlcohol = data.reports.filter(
    (r) => parseFloat(r.preAlcohol || '0') > 0 || (r.postDone && parseFloat(r.postAlcohol || '0') > 0)
  );

  const shakenAlerts = data.vehicles
    .map((v) => ({ v, days: daysUntil(v.shakenDate) }))
    .filter((x) => x.days !== null && x.days <= 30)
    .sort((a, b) => (a.days ?? 0) - (b.days ?? 0));

  const oilAlerts = data.vehicles.filter((v) => v.oilKm - v.odometer <= 1000);

  const licenseAlerts = data.drivers
    .map((d) => ({ d, days: daysUntil(d.licenseExpiry) }))
    .filter((x) => x.days !== null && x.days <= 30)
    .sort((a, b) => (a.days ?? 0) - (b.days ?? 0));

  return (
    <div>
      <div className="grid grid-4">
        <div className="stat-tile">
          <div className="label">本日の日報件数</div>
          <div className="value">{todayReports.length}</div>
        </div>
        <div className={`stat-tile ${outNow.length > 0 ? 'warn' : 'ok'}`}>
          <div className="label">現在出庫中（未帰着）</div>
          <div className="value">{outNow.length}</div>
        </div>
        <div className="stat-tile">
          <div className="label">登録車両数</div>
          <div className="value">{data.vehicles.length}</div>
        </div>
        <div className="stat-tile">
          <div className="label">登録運転者数</div>
          <div className="value">{data.drivers.length}</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3 className="card-title">⚠️ 車検・点検アラート（30日以内）</h3>
          {shakenAlerts.length === 0 ? (
            <div className="empty-state">直近の車検予定はありません</div>
          ) : (
            <div className="alert-list">
              {shakenAlerts.map(({ v, days }) => (
                <div key={v.id} className={`alert-item ${days !== null && days < 0 ? 'danger' : 'warn'}`}>
                  <span>🚗</span>
                  <div>
                    <strong>{v.name}</strong>（{v.plate}）— 車検満了日 {v.shakenDate}
                    {days !== null && (days < 0 ? `（${-days}日超過）` : `（あと${days}日）`)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <h3 className="card-title" style={{ marginTop: 18 }}>
            🛢️ オイル交換アラート（残り1,000km以内）
          </h3>
          {oilAlerts.length === 0 ? (
            <div className="empty-state">対象車両はありません</div>
          ) : (
            <div className="alert-list">
              {oilAlerts.map((v) => (
                <div key={v.id} className="alert-item warn">
                  <span>🛢️</span>
                  <div>
                    <strong>{v.name}</strong> — 現在 {v.odometer.toLocaleString()}km / 交換目安{' '}
                    {v.oilKm.toLocaleString()}km
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="card-title">🪪 免許更新アラート（30日以内）</h3>
          {licenseAlerts.length === 0 ? (
            <div className="empty-state">直近の免許更新予定はありません</div>
          ) : (
            <div className="alert-list">
              {licenseAlerts.map(({ d, days }) => (
                <div key={d.id} className={`alert-item ${days !== null && days < 0 ? 'danger' : 'warn'}`}>
                  <span>🪪</span>
                  <div>
                    <strong>
                      {d.lastName} {d.firstName}
                    </strong>
                    （{d.dept}）— 更新期日 {d.licenseExpiry}
                    {days !== null && (days < 0 ? `（${-days}日超過）` : `（あと${days}日）`)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <h3 className="card-title" style={{ marginTop: 18 }}>
            🍺 アルコールチェック 検知記録
          </h3>
          {ngAlcohol.length === 0 ? (
            <div className="empty-state">検知された記録はありません</div>
          ) : (
            <div className="alert-list">
              {ngAlcohol.slice(0, 5).map((r) => (
                <div key={r.id} className="alert-item danger">
                  <span>🍺</span>
                  <div>
                    {r.date} {r.driver}（出発前 {r.preAlcohol}mg/L
                    {r.postDone ? ` / 帰着後 ${r.postAlcohol}mg/L` : ''}）
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">📋 本日の運行状況</h3>
        {todayReports.length === 0 ? (
          <div className="empty-state">本日の日報はまだありません</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>運転者</th>
                  <th>車両</th>
                  <th>行先</th>
                  <th>出発時刻</th>
                  <th>状態</th>
                </tr>
              </thead>
              <tbody>
                {todayReports.map((r) => (
                  <tr key={r.id}>
                    <td>{r.driver}</td>
                    <td>{r.vehicleName}</td>
                    <td>{r.destination}</td>
                    <td>{r.preTime}</td>
                    <td>
                      {r.postDone ? (
                        <span className="pill pill-green">帰着済</span>
                      ) : (
                        <span className="pill pill-amber">出庫中</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
