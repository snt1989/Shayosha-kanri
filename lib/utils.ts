import { MAINT_URGENCIES, Report } from './types';

export function todayStr(): string {
  const d = new Date();
  const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return tz.toISOString().slice(0, 10);
}

export function nowTimeStr(): string {
  const d = new Date();
  return d.toTimeString().slice(0, 5);
}

export function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + 'T00:00:00');
  if (isNaN(target.getTime())) return null;
  const today = new Date(todayStr() + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function fmtDate(dateStr: string): string {
  if (!dateStr) return '-';
  return dateStr;
}

export function genId(prefix: string): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function maintUrgencyRank(urgency?: string): number {
  const i = (MAINT_URGENCIES as readonly string[]).indexOf(urgency || '');
  return i < 0 ? 0 : i;
}

// 対応待ちの整備依頼（緊急度の高い順、同じなら古い順）
export function openMaintRequests(reports: Report[]): Report[] {
  return reports
    .filter((r) => r.maintRequest && !r.maintRequestDone)
    .sort(
      (a, b) =>
        maintUrgencyRank(b.maintRequestUrgency) - maintUrgencyRank(a.maintRequestUrgency) ||
        (a.date + a.preTime).localeCompare(b.date + b.preTime)
    );
}
