import { NextRequest, NextResponse } from 'next/server';
import { loadData, saveData } from '@/lib/store';
import { Driver } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const d: Driver = await req.json();
  if (!d.id) {
    d.id = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  const data = await loadData();
  const idx = data.drivers.findIndex((x) => x.id === d.id);
  if (idx >= 0) {
    data.drivers[idx] = d;
  } else {
    data.drivers.push(d);
  }

  await saveData({
    reports: data.reports,
    vehicles: data.vehicles,
    drivers: data.drivers,
    masters: data.masters,
  });

  return NextResponse.json({ success: true, id: d.id });
}
