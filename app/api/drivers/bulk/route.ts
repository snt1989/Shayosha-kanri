import { NextRequest, NextResponse } from 'next/server';
import { loadData, saveData } from '@/lib/store';
import { Driver } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const list: Driver[] = await req.json();
  const data = await loadData();
  data.drivers = list || [];
  await saveData({
    reports: data.reports,
    vehicles: data.vehicles,
    drivers: data.drivers,
    masters: data.masters,
  });
  return NextResponse.json({ success: true, count: data.drivers.length });
}
