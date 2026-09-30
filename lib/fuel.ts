import { FuelLog } from './types';

// 燃費（km/L）を満タン法で計算する。
// 満タン給油ごとに「前回の満タン給油からの走行距離 ÷ その間に入れた給油量の合計」を求める。
// 最初の満タン給油は基準になるだけで、燃費は出ない。満タンでない給油は、次の満タン給油の分に足される。
export function computeEfficiency(logs: FuelLog[]): Map<string, number | null> {
  const result = new Map<string, number | null>();
  const byVehicle = new Map<string, FuelLog[]>();
  logs.forEach((l) => {
    const list = byVehicle.get(l.vehicleId) || [];
    list.push(l);
    byVehicle.set(l.vehicleId, list);
  });
  byVehicle.forEach((list) => {
    list.sort((a, b) => a.date.localeCompare(b.date) || a.km - b.km || a.createdAt.localeCompare(b.createdAt));
    let lastFullKm: number | null = null;
    let liters = 0;
    for (const l of list) {
      liters += l.liters;
      if (!l.full) {
        result.set(l.id, null);
        continue;
      }
      if (lastFullKm !== null && l.km > lastFullKm && liters > 0) result.set(l.id, (l.km - lastFullKm) / liters);
      else result.set(l.id, null);
      lastFullKm = l.km;
      liters = 0;
    }
  });
  return result;
}
