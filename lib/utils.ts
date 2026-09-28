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
