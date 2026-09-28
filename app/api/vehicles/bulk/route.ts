import { NextRequest, NextResponse } from 'next/server';
import { loadData, saveData } from '@/lib/store';
import { Vehicle } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const list: Vehicle[] = await req.json();
  const data = await loadData();
  data.vehicles = (list || []).map((v) => ({ ...v, maintHistory: v.maintHistory || [] }));
  await saveData({
    reports: data.reports,
    vehicles: data.vehicles,
    drivers: data.drivers,
    masters: data.masters,
  });
  return NextResponse.json({ success: true, count: data.vehicles.length });
}
