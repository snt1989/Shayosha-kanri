import { NextRequest, NextResponse } from 'next/server';
import { loadData, saveData } from '@/lib/store';
import { Report } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const r: Report = await req.json();
  if (!r.id) {
    r.id = 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  r.driver = `${r.driverLast} ${r.driverFirst}`.trim();

  const data = await loadData();
  const idx = data.reports.findIndex((x) => x.id === r.id);
  if (idx >= 0) {
    data.reports[idx] = r;
  } else {
    data.reports.unshift(r);
  }

  if (r.postDone && r.vehicleId && r.endKm) {
    const v = data.vehicles.find((x) => x.id === r.vehicleId);
    if (v && r.endKm > v.odometer) {
      v.odometer = r.endKm;
    }
  }

  await saveData({
    reports: data.reports,
    vehicles: data.vehicles,
    drivers: data.drivers,
    masters: data.masters,
  });

  return NextResponse.json({ success: true, id: r.id });
}
