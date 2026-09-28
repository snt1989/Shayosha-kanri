'use client';

import { useEffect, useState } from 'react';
import { AppData, Driver, Masters, Report, Vehicle } from '@/lib/types';
import Header from './Header';
import StatBar from './StatBar';
import AlertsPanel from './AlertsPanel';
import ReportsTab from './ReportsTab';
import VehiclesTab from './VehiclesTab';
import DriversTab from './DriversTab';
import MastersTab from './MastersTab';
import AdminLoginModal from './AdminLoginModal';

type Tab = 'reports' | 'vehicles' | 'drivers' | 'masters';
type SyncStatus = 'idle' | 'saving' | 'error';

async function jsonFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.message || `リクエストに失敗しました (${res.status})`);
    throw err;
  }
  return body;
}

export default function FleetApp() {
  const [tab, setTab] = useState<Tab>('reports');
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminConfigured, setAdminConfigured] = useState(true);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [quickReportTrigger, setQuickReportTrigger] = useState(0);

  useEffect(() => {
    load();
    checkAdminSession();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const d = await jsonFetch('/api/data');
      setData(d);
      setSyncStatus('idle');
    } catch (e) {
      setError('データの読み込みに失敗しました。ページを再読み込みしてください。');
      setSyncStatus('error');
    } finally {
      setLoading(false);
    }
  }

  async function checkAdminSession() {
    try {
      const res = await jsonFetch('/api/admin/session');
      setIsAdmin(Boolean(res.isAdmin));
      setAdminConfigured(Boolean(res.configured));
    } catch {
      // ignore
    }
  }

  async function withSync<T>(fn: () => Promise<T>): Promise<T> {
    setSyncStatus('saving');
    try {
      const result = await fn();
      await load();
      setSyncStatus('idle');
      return result;
    } catch (e) {
      setSyncStatus('error');
      throw e;
    }
  }

  async function saveReport(r: Report) {
    return withSync(() => jsonFetch('/api/reports', { method: 'POST', body: JSON.stringify(r) }));
  }
  async function deleteReport(id: string) {
    return withSync(() => jsonFetch(`/api/reports/${id}`, { method: 'DELETE' }));
  }
  async function saveVehicle(v: Vehicle) {
    return withSync(() => jsonFetch('/api/vehicles', { method: 'POST', body: JSON.stringify(v) }));
  }
  async function deleteVehicle(id: string) {
    return withSync(() => jsonFetch(`/api/vehicles/${id}`, { method: 'DELETE' }));
  }
  async function bulkSaveVehicles(list: Vehicle[]) {
    return withSync(() => jsonFetch('/api/vehicles/bulk', { method: 'POST', body: JSON.stringify(list) }));
  }
  async function saveDriver(d: Driver) {
    return withSync(() => jsonFetch('/api/drivers', { method: 'POST', body: JSON.stringify(d) }));
  }
  async function deleteDriver(id: string) {
    return withSync(() => jsonFetch(`/api/drivers/${id}`, { method: 'DELETE' }));
  }
  async function bulkSaveDrivers(list: Driver[]) {
    return withSync(() => jsonFetch('/api/drivers/bulk', { method: 'POST', body: JSON.stringify(list) }));
  }
  async function saveMasterCategory(category: keyof Masters, items: string[]) {
    return withSync(() => jsonFetch('/api/masters', { method: 'POST', body: JSON.stringify({ category, items }) }));
  }
  async function saveAllMasters(masters: Masters) {
    return withSync(() => jsonFetch('/api/masters/all', { method: 'POST', body: JSON.stringify(masters) }));
  }

  async function handleAdminLogin(password: string) {
    try {
      await jsonFetch('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
      setIsAdmin(true);
      setShowAdminLogin(false);
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e?.message || 'ログインに失敗しました。' };
    }
  }

  async function handleAdminLogout() {
    try {
      await jsonFetch('/api/admin/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setIsAdmin(false);
  }

  function handleQuickReport() {
    setTab('reports');
    setQuickReportTrigger((n) => n + 1);
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
      <Header
        tab={tab}
        onTabChange={setTab}
        syncStatus={syncStatus}
        isAdmin={isAdmin}
        onOpenAdminLogin={() => setShowAdminLogin(true)}
        onLogoutAdmin={handleAdminLogout}
        onQuickReport={handleQuickReport}
      />

      <div className="statbar">
        <StatBar data={data} />
      </div>

      <main className="main">
        {tab === 'reports' && (
          <>
            <AlertsPanel data={data} />
            <ReportsTab
              data={data}
              onSave={saveReport}
              onDelete={deleteReport}
              openTrigger={quickReportTrigger}
            />
          </>
        )}
        {tab === 'vehicles' && (
          <VehiclesTab data={data} onSave={saveVehicle} onDelete={deleteVehicle} onBulkSave={bulkSaveVehicles} />
        )}
        {tab === 'drivers' && (
          <DriversTab data={data} onSave={saveDriver} onDelete={deleteDriver} onBulkSave={bulkSaveDrivers} />
        )}
        {tab === 'masters' && (
          <MastersTab
            masters={data.masters}
            isAdmin={isAdmin}
            adminConfigured={adminConfigured}
            onSaveCategory={saveMasterCategory}
            onSaveAll={saveAllMasters}
            onRequestLogin={() => setShowAdminLogin(true)}
          />
        )}
      </main>

      <div className="footer-note">
        社用車管理クラウド — Next.js / Vercel 上で稼働中
        {!data.persistent && '（Upstash Redis が未設定のため、再デプロイでデータが消える可能性があります）'}
      </div>

      {showAdminLogin && <AdminLoginModal onClose={() => setShowAdminLogin(false)} onLogin={handleAdminLogin} />}
    </div>
  );
}
