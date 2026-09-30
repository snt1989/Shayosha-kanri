import { AppData, DEFAULT_EMP_ID_RULE, Driver, EmpIdRule } from './types';

export function formatEmpId(rule: EmpIdRule, n: number): string {
  return `${rule.prefix}${String(n).padStart(Math.max(1, rule.digits), '0')}`;
}

// 既存の社員番号（同じ接頭辞＋数字）の最大値+1 と rule.next の大きい方。重複を避けるための実効的な次番号。
export function effectiveNext(rule: EmpIdRule, drivers: Pick<Driver, 'empId'>[]): number {
  let max = 0;
  for (const d of drivers) {
    if (d.empId && d.empId.startsWith(rule.prefix)) {
      const tail = d.empId.slice(rule.prefix.length);
      if (/^\d+$/.test(tail)) max = Math.max(max, parseInt(tail, 10));
    }
  }
  return Math.max(rule.next, max + 1);
}

export function previewEmpId(data: Pick<AppData, 'empIdRule' | 'drivers'>): string {
  const rule = data.empIdRule || DEFAULT_EMP_ID_RULE;
  return formatEmpId(rule, effectiveNext(rule, data.drivers));
}

// 社員番号が空欄の運転者に採番する（data.empIdRule.next も進める）。採番した件数を返す。
export function assignMissingEmpIds(data: AppData, targets: Driver[]): number {
  let n = 0;
  for (const d of targets) {
    if (d.empId && d.empId.trim()) continue;
    const rule = data.empIdRule || DEFAULT_EMP_ID_RULE;
    const cur = effectiveNext(rule, data.drivers.concat(targets));
    d.empId = formatEmpId(rule, cur);
    data.empIdRule = { ...rule, next: cur + 1 };
    n++;
  }
  return n;
}
