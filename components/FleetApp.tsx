'use client';

import { useEffect, useState } from 'react';
import { AppData, Driver, Masters, Report, Vehicle } from '@/lib/types';
import Header from './Header';
import StatBar from './StatBar';
import DashboardTab from './DashboardTab';
import ReportsTab from './ReportsTab';
import VehiclesTab from './VehiclesTab';
import DriversTab from './DriversTab';
import AdminTab from './AdminTab';
import AdminLoginModal from './AdminLoginModal';

type Tab = 'dashboard' | 'reports' | 'vehicles' | 'drivers' | 'admin';
type SyncStatus = 'idle' | 'saving' | 'error';

async function jsonFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: Error & { status?: number } = new Error(body?.message || `リクエストに失敗しました (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return body;
}

export default function FleetApp() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminConfigured, setAdminConfigured] = useState(true);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [quickReportTrigger, setQuickReportTrigger] = useState(0);
  const [returnCheckinRequest, setReturnCheckinRequest] = useState<{ id: string; token: number } | null>(null);

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
    try {
      return await withSync(() => jsonFetch('/api/reports', { method: 'POST', body: JSON.stringify(r) }));
    } catch (e) {
      handleAdminApiError(e);
      throw e;
    }
  }
  async function deleteReport(id: string) {
    try {
      return await withSync(() => jsonFetch(`/api/reports/${id}`, { method: 'DELETE' }));
    } catch (e) {
      handleAdminApiError(e);
      throw e;
    }
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
  function handleAdminApiError(e: unknown) {
    const status = (e as { status?: number } | null)?.status;
    if (status === 401) {
      // 管理者セッションが無効（ログアウト済み・期限切れ・Cookie破棄など）。
      // 画面側の状態を必ず「未ログイン」に合わせ、管理マスタ画面をその場で再ロックする。
      setIsAdmin(false);
      alert('管理者セッションが無効です（ログアウト済み、または期限切れ）。再度ログインしてください。');
    }
  }
  async function saveMasterCategory(category: keyof Masters, items: string[]) {
    try {
      return await withSync(() => jsonFetch('/api/masters', { method: 'POST', body: JSON.stringify({ category, items }) }));
    } catch (e) {
      handleAdminApiError(e);
      throw e;
    }
  }
  async function saveAllMasters(masters: Masters) {
    try {
      return await withSync(() => jsonFetch('/api/masters/all', { method: 'POST', body: JSON.stringify(masters) }));
    } catch (e) {
      handleAdminApiError(e);
      throw e;
    }
  }
  async function clearLogs() {
    try {
      return await withSync(() => jsonFetch('/api/logs', { method: 'DELETE' }));
    } catch (e) {
      handleAdminApiError(e);
      throw e;
    }
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

  function handleReturnCheckin(id: string) {
    setTab('reports');
    setReturnCheckinRequest((cur) => ({ id, token: (cur?.token || 0) + 1 }));
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
        {tab === 'dashboard' && <DashboardTab data={data} onReturnCheckin={handleReturnCheckin} />}
        {tab === 'reports' && (
          <ReportsTab
            data={data}
            onSave={saveReport}
            onDelete={deleteReport}
            onSaveDriver={saveDriver}
            openTrigger={quickReportTrigger}
            returnCheckinRequest={returnCheckinRequest}
            isAdmin={isAdmin}
            onRequestLogin={() => setShowAdminLogin(true)}
          />
        )}
        {tab === 'vehicles' && (
          <VehiclesTab data={data} onSave={saveVehicle} onDelete={deleteVehicle} onBulkSave={bulkSaveVehicles} />
        )}
        {tab === 'drivers' && (
          <DriversTab data={data} onSave={saveDriver} onDelete={deleteDriver} onBulkSave={bulkSaveDrivers} />
        )}
        {tab === 'admin' && (
          <AdminTab
            data={data}
            isAdmin={isAdmin}
            adminConfigured={adminConfigured}
            onSaveCategory={saveMasterCategory}
            onSaveAll={saveAllMasters}
            onRequestLogin={() => setShowAdminLogin(true)}
            onClearLogs={clearLogs}
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
