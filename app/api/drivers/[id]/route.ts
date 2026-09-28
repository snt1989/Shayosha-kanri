import { NextRequest, NextResponse } from 'next/server';
import { loadData, saveData } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await loadData();
  const before = data.drivers.length;
  data.drivers = data.drivers.filter((d) => d.id !== id);
  if (data.drivers.length === before) {
    return NextResponse.json({ success: false }, { status: 404 });
  }
  await saveData({
    reports: data.reports,
    vehicles: data.vehicles,
    drivers: data.drivers,
    masters: data.masters,
  });
  return NextResponse.json({ success: true });
}
