'use client';

import { useEffect, useState } from 'react';
import { AppData, Driver, Masters, Report, Reservation, Vehicle } from '@/lib/types';
import Header from './Header';
import StatBar from './StatBar';
import DashboardTab from './DashboardTab';
import ReportsTab from './ReportsTab';
import MaintenanceTab from './MaintenanceTab';
import AdminTab from './AdminTab';
import AdminLoginModal from './AdminLoginModal';
import DriverLoginModal from './DriverLoginModal';

type Tab = 'dashboard' | 'reports' | 'maintenance' | 'admin';
type SyncStatus = 'idle' | 'saving' | 'error';
const DRIVER_SESSION_KEY = 'fleet_current_driver_id';

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
  const [quickReportTrigger, setQuickReportTrigger] = useState<number | null>(null);
  const [returnCheckinRequest, setReturnCheckinRequest] = useState<{ id: string; token: number } | null>(null);
  const [currentDriverId, setCurrentDriverId] = useState<string | null>(null);
  const [showDriverLogin, setShowDriverLogin] = useState(false);

  useEffect(() => {
    load();
    checkAdminSession();
    try {
      const saved = localStorage.getItem(DRIVER_SESSION_KEY);
      if (saved) setCurrentDriverId(saved);
    } catch {
      // ignore（プライベートブラウズ等でlocalStorageが使えない場合は無視）
    }
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

  // 保存後にサーバーの最新データへ静かに同期するための再取得。
  // load() と違って画面全体を「読み込み中…」に差し替えず、タブや各画面の
  // 入力途中の状態を保ったままデータだけを更新する。
  async function refreshData() {
    try {
      const d = await jsonFetch('/api/data');
      setData(d);
    } catch {
      // 表示中のデータはそのまま維持し、同期エラー表示のみ行う
      setSyncStatus('error');
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
      await refreshData();
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
  // 予約は重複などで失敗する（409）のが通常の動作なので、その場合は「同期エラー」表示にしない
  async function reservationRequest(url: string, init: RequestInit) {
    setSyncStatus('saving');
    try {
      const result = await jsonFetch(url, init);
      await refreshData();
      setSyncStatus('idle');
      return result;
    } catch (e) {
      setSyncStatus((e as { status?: number }).status ? 'idle' : 'error');
      throw e;
    }
  }
  async function saveReservation(r: Reservation) {
    return reservationRequest('/api/reservations', { method: 'POST', body: JSON.stringify(r) });
  }
  async function deleteReservation(id: string) {
    return reservationRequest(`/api/reservations/${id}`, { method: 'DELETE' });
  }
  async function resolveMaintRequest(id: string, done: boolean) {
    return withSync(() => jsonFetch(`/api/reports/${id}/maint-request`, { method: 'POST', body: JSON.stringify({ done }) }));
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
    setQuickReportTrigger(Date.now());
  }
  function handleQuickReportHandled() {
    setQuickReportTrigger(null);
  }

  function handleReturnCheckin(id: string) {
    setTab('reports');
    setReturnCheckinRequest({ id, token: Date.now() });
  }
  function handleReturnCheckinHandled() {
    setReturnCheckinRequest(null);
  }

  function handleSelectDriver(driver: Driver) {
    setCurrentDriverId(driver.id);
    setShowDriverLogin(false);
    try {
      localStorage.setItem(DRIVER_SESSION_KEY, driver.id);
    } catch {
      // ignore
    }
  }

  function handleDriverLogout() {
    setCurrentDriverId(null);
    try {
      localStorage.removeItem(DRIVER_SESSION_KEY);
    } catch {
      // ignore
    }
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

  const currentDriver = data.drivers.find((d) => d.id === currentDriverId) || null;

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
        currentDriverName={currentDriver ? `${currentDriver.lastName} ${currentDriver.firstName}` : null}
        onOpenDriverLogin={() => setShowDriverLogin(true)}
        onDriverLogout={handleDriverLogout}
      />

      <div className="statbar">
        <StatBar data={data} />
      </div>

      <main className="main">
        {tab === 'dashboard' && (
          <DashboardTab
            data={data}
            onReturnCheckin={handleReturnCheckin}
            onOpenMaintenance={() => setTab('maintenance')}
            currentDriver={currentDriver}
            onSaveReservation={saveReservation}
            onDeleteReservation={deleteReservation}
          />
        )}
        {tab === 'reports' && (
          <ReportsTab
            data={data}
            onSave={saveReport}
            onDelete={deleteReport}
            onSaveDriver={saveDriver}
            openTrigger={quickReportTrigger}
            onQuickReportHandled={handleQuickReportHandled}
            returnCheckinRequest={returnCheckinRequest}
            onReturnCheckinHandled={handleReturnCheckinHandled}
            currentDriver={currentDriver}
            isAdmin={isAdmin}
            onRequestLogin={() => setShowAdminLogin(true)}
          />
        )}
        {tab === 'maintenance' && <MaintenanceTab data={data} onSave={saveVehicle} onResolveRequest={resolveMaintRequest} />}
        {tab === 'admin' && (
          <AdminTab
            data={data}
            isAdmin={isAdmin}
            adminConfigured={adminConfigured}
            onSaveVehicle={saveVehicle}
            onDeleteVehicle={deleteVehicle}
            onBulkSaveVehicles={bulkSaveVehicles}
            onSaveDriver={saveDriver}
            onDeleteDriver={deleteDriver}
            onBulkSaveDrivers={bulkSaveDrivers}
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
      {showDriverLogin && (
        <DriverLoginModal drivers={data.drivers} onClose={() => setShowDriverLogin(false)} onSelect={handleSelectDriver} />
      )}
    </div>
  );
}
