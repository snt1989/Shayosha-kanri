import { NextRequest, NextResponse } from 'next/server';
import { loadData, saveData } from '@/lib/store';
import { Vehicle } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const v: Vehicle = await req.json();
  if (!v.id) {
    v.id = 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  if (!v.maintHistory) v.maintHistory = [];

  const data = await loadData();
  const idx = data.vehicles.findIndex((x) => x.id === v.id);
  if (idx >= 0) {
    data.vehicles[idx] = v;
  } else {
    data.vehicles.push(v);
  }

  await saveData({
    reports: data.reports,
    vehicles: data.vehicles,
    drivers: data.drivers,
    masters: data.masters,
  });

  return NextResponse.json({ success: true, id: v.id });
}
