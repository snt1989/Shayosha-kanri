import { Driver, MASTER_KEYS, MASTER_LABELS, MasterKey, Masters, Vehicle } from './types';
import { genId } from './utils';

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function toCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c === '\r') {
      // skip; \n handles the row break
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/* ---------- vehicles ---------- */
const VEHICLE_HEADERS = ['id', '車両呼称', 'ナンバー', '型式', '車検満了日', '12ヶ月点検日', '積算走行km', 'オイル交換目安km', 'タイヤ種別'];

export function vehiclesToCsv(vehicles: Vehicle[]): string {
  const rows: (string | number)[][] = [VEHICLE_HEADERS];
  vehicles.forEach((v) => {
    rows.push([v.id, v.name, v.plate, v.modelType, v.shakenDate, v.checkDate, v.odometer, v.oilKm, v.tire]);
  });
  return toCsv(rows);
}

export function csvToVehicles(text: string, existing: Vehicle[]): Vehicle[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const looksLikeHeader = /[a-zA-Zぁ-んァ-ヶ一-龠]/.test(rows[0][1] || '') && rows[0][0] === 'id';
  const dataRows = looksLikeHeader ? rows.slice(1) : rows;
  const existingById = new Map(existing.map((v) => [v.id, v]));
  return dataRows.map((r) => {
    const id = (r[0] || '').trim() || genId('v');
    const prev = existingById.get(id);
    return {
      id,
      name: (r[1] || '').trim(),
      plate: (r[2] || '').trim(),
      modelType: (r[3] || '').trim(),
      shakenDate: (r[4] || '').trim(),
      checkDate: (r[5] || '').trim(),
      odometer: Number(r[6] || 0) || 0,
      oilKm: Number(r[7] || 0) || 0,
      tire: (r[8] || '').trim() || '夏タイヤ（ノーマル）',
      maintHistory: prev ? prev.maintHistory : [],
    };
  });
}

/* ---------- drivers ---------- */
const DRIVER_HEADERS = ['id', '氏名(姓)', '氏名(名)', '社員番号', '所属事業部', '免許種別', '免許更新期日', '連絡先電話番号', '免許証番号', '特記事項'];

export function driversToCsv(drivers: Driver[]): string {
  const rows: (string | number)[][] = [DRIVER_HEADERS];
  drivers.forEach((d) => {
    rows.push([d.id, d.lastName, d.firstName, d.empId, d.dept, d.licenseType, d.licenseExpiry, d.phone, d.licenseNo, d.notes]);
  });
  return toCsv(rows);
}

export function csvToDrivers(text: string): Driver[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const looksLikeHeader = rows[0][0] === 'id';
  const dataRows = looksLikeHeader ? rows.slice(1) : rows;
  return dataRows.map((r) => ({
    id: (r[0] || '').trim() || genId('d'),
    lastName: (r[1] || '').trim(),
    firstName: (r[2] || '').trim(),
    empId: (r[3] || '').trim(),
    dept: (r[4] || '').trim(),
    licenseType: (r[5] || '').trim(),
    licenseExpiry: (r[6] || '').trim(),
    phone: (r[7] || '').trim(),
    licenseNo: (r[8] || '').trim(),
    notes: (r[9] || '').trim(),
  }));
}

/* ---------- masters ---------- */
const MASTER_HEADERS = ['カテゴリキー', 'カテゴリ名', '登録名称'];

export function mastersToCsv(masters: Masters): string {
  const rows: (string | number)[][] = [MASTER_HEADERS];
  MASTER_KEYS.forEach((key) => {
    (masters[key] || []).forEach((name) => {
      rows.push([key, MASTER_LABELS[key], name]);
    });
  });
  return toCsv(rows);
}

export function csvToMasters(text: string): Masters {
  const rows = parseCsv(text);
  const result = { departments: [], checkers: [], checkMethods: [], maintTypes: [], tireTypes: [], licenseTypes: [] } as Masters;
  if (rows.length === 0) return result;
  const masterKeySet: readonly string[] = MASTER_KEYS;
  const labelToKey = new Map<string, MasterKey>(MASTER_KEYS.map((k) => [MASTER_LABELS[k], k]));
  const startIdx = masterKeySet.includes(rows[0][0]) || labelToKey.has(rows[0][0]) ? 0 : 1;
  for (let i = startIdx; i < rows.length; i++) {
    const r = rows[i];
    const rawKey = (r[0] || '').trim();
    const rawLabel = (r[1] || '').trim();
    const name = (r[2] || '').trim();
    if (!name) continue;
    const key: MasterKey | undefined = masterKeySet.includes(rawKey) ? (rawKey as MasterKey) : labelToKey.get(rawKey) || labelToKey.get(rawLabel);
    if (!key) continue;
    result[key].push(name);
  }
  return result;
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
