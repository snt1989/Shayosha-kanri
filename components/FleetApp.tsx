'use client';

import { useEffect, useState } from 'react';
import { AppData, Driver, Masters, Report, Vehicle } from '@/lib/types';
import Dashboard from './Dashboard';
import ReportsTab from './ReportsTab';
import VehiclesTab from './VehiclesTab';
import DriversTab from './DriversTab';
import MastersTab from './MastersTab';

type Tab = 'dashboard' | 'reports' | 'vehicles' | 'drivers' | 'masters';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'ダッシュボード', icon: '📊' },
  { key: 'reports', label: '運転日報', icon: '📝' },
  { key: 'vehicles', label: '社用車台帳', icon: '🚗' },
  { key: 'drivers', label: '運転者台帳', icon: '🪪' },
  { key: 'masters', label: 'マスタ設定', icon: '⚙️' },
];

async function jsonFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!res.ok) {
    throw new Error(`リクエストに失敗しました (${res.status})`);
  }
  return res.json();
}

export default function FleetApp() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const d = await jsonFetch('/api/data');
      setData(d);
    } catch (e) {
      setError('データの読み込みに失敗しました。ページを再読み込みしてください。');
    } finally {
      setLoading(false);
    }
  }

  async function saveReport(r: Report) {
    const res = await jsonFetch('/api/reports', { method: 'POST', body: JSON.stringify(r) });
    await load();
    return res;
  }

  async function deleteReport(id: string) {
    await jsonFetch(`/api/reports/${id}`, { method: 'DELETE' });
    await load();
  }

  async function saveVehicle(v: Vehicle) {
    await jsonFetch('/api/vehicles', { method: 'POST', body: JSON.stringify(v) });
    await load();
  }

  async function deleteVehicle(id: string) {
    await jsonFetch(`/api/vehicles/${id}`, { method: 'DELETE' });
    await load();
  }

  async function saveDriver(d: Driver) {
    await jsonFetch('/api/drivers', { method: 'POST', body: JSON.stringify(d) });
    await load();
  }

  async function deleteDriver(id: string) {
    await jsonFetch(`/api/drivers/${id}`, { method: 'DELETE' });
    await load();
  }

  async function saveMasterCategory(category: keyof Masters, items: string[]) {
    await jsonFetch('/api/masters', { method: 'POST', body: JSON.stringify({ category, items }) });
    await load();
  }

  if (loading) {
    return (
      <div className="app-shell">
        <div className="main">
          <div className="empty-state">読み込み中…</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="app-shell">
        <div className="main">
          <div className="card">
            <div className="empty-state">{error || 'データがありません'}</div>
            <button className="btn btn-primary btn-block" onClick={load}>
              再読み込み
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-title">
          🚙 社用車管理クラウド
          <span className="app-badge">白ナンバー安全運転管理者対応</span>
        </div>
        <span className="app-badge">{data.persistent ? '💾 データ保存: 有効' : '⚠️ データ保存: 未設定（一時領域）'}</span>
      </header>

      <nav className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab-btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </nav>

      <main className="main">
        {tab === 'dashboard' && <Dashboard data={data} />}
        {tab === 'reports' && <ReportsTab data={data} onSave={saveReport} onDelete={deleteReport} />}
        {tab === 'vehicles' && <VehiclesTab data={data} onSave={saveVehicle} onDelete={deleteVehicle} />}
        {tab === 'drivers' && <DriversTab data={data} onSave={saveDriver} onDelete={deleteDriver} />}
        {tab === 'masters' && <MastersTab masters={data.masters} onSaveCategory={saveMasterCategory} />}
      </main>

      <div className="footer-note">
        社用車管理クラウド — Next.js / Vercel 上で稼働中
        {!data.persistent && '（Upstash Redis が未設定のため、再デプロイでデータが消える可能性があります）'}
      </div>
    </div>
  );
}
