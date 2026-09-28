import { NextRequest, NextResponse } from 'next/server';
import { loadData, saveData } from '@/lib/store';
import { Vehicle } from '@/lib/types';
import { ADMIN_COOKIE, isAdminCookieValid } from '@/lib/admin';
import { pushLog } from '@/lib/log';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const list: Vehicle[] = await req.json();
  const isAdminReq = isAdminCookieValid(req.cookies.get(ADMIN_COOKIE)?.value);
  const data = await loadData();
  data.vehicles = (list || []).map((v) => ({ ...v, maintHistory: v.maintHistory || [] }));
  pushLog(data, {
    actor: isAdminReq ? 'admin' : 'user',
    action: '車両一括更新（CSV／一括編集）',
    target: `${data.vehicles.length}件`,
  });
  await saveData({
    reports: data.reports,
    vehicles: data.vehicles,
    drivers: data.drivers,
    masters: data.masters,
    logs: data.logs,
  });
  return NextResponse.json({ success: true, count: data.vehicles.length });
}
