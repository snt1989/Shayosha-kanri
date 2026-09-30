import { NextRequest, NextResponse } from 'next/server';
import { loadData, saveData } from '@/lib/store';
import { ADMIN_COOKIE, isAdminCookieValid } from '@/lib/admin';
import { pushLog } from '@/lib/log';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadData();
  const target = data.rentals.find((x) => x.id === id);
  if (!target) {
    return NextResponse.json({ success: false, message: '記録が見つかりません。' }, { status: 404 });
  }
  data.rentals = data.rentals.filter((x) => x.id !== id);
  pushLog(data, {
    actor: isAdminCookieValid(req.cookies.get(ADMIN_COOKIE)?.value) ? 'admin' : 'user',
    action: 'レンタカー削除',
    target: `${target.startDate} ${target.driver} / ${target.company}`,
    detail: target.destination,
  });
  await saveData({
    reports: data.reports,
    vehicles: data.vehicles,
    drivers: data.drivers,
    masters: data.masters,
    logs: data.logs,
    rentals: data.rentals,
  });
  return NextResponse.json({ success: true });
}
