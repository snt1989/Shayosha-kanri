import { NextRequest, NextResponse } from 'next/server';
import { loadData, saveData } from '@/lib/store';
import { Driver } from '@/lib/types';
import { ADMIN_COOKIE, isAdminCookieValid } from '@/lib/admin';
import { pushLog } from '@/lib/log';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const d: Driver = await req.json();
  const isNew = !d.id;
  if (!d.id) {
    d.id = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  const isAdminReq = isAdminCookieValid(req.cookies.get(ADMIN_COOKIE)?.value);
  const data = await loadData();
  const idx = data.drivers.findIndex((x) => x.id === d.id);
  if (idx >= 0) {
    data.drivers[idx] = d;
  } else {
    data.drivers.push(d);
  }

  pushLog(data, {
    actor: isAdminReq ? 'admin' : 'user',
    action: isNew || idx < 0 ? '運転者新規登録' : '運転者更新',
    target: `${d.lastName} ${d.firstName}`,
    detail: d.dept,
  });

  await saveData({
    reports: data.reports,
    vehicles: data.vehicles,
    drivers: data.drivers,
    masters: data.masters,
    logs: data.logs,
  });

  return NextResponse.json({ success: true, id: d.id });
}
