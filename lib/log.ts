import { AppData, LogEntry } from './types';

const MAX_LOGS = 500;

export function pushLog(data: AppData, entry: Omit<LogEntry, 'id' | 'at'>) {
  const log: LogEntry = {
    id: 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    at: new Date().toISOString(),
    ...entry,
  };
  data.logs = [log, ...(data.logs || [])].slice(0, MAX_LOGS);
  return data;
}
