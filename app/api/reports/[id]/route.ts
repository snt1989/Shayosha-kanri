import { NextRequest, NextResponse } from 'next/server';
import { loadData, saveData } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await loadData();
  const before = data.reports.length;
  data.reports = data.reports.filter((r) => r.id !== id);
  if (data.reports.length === before) {
    return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
  }
  await saveData({
    reports: data.reports,
    vehicles: data.vehicles,
    drivers: data.drivers,
    masters: data.masters,
  });
  return NextResponse.json({ success: true });
}
