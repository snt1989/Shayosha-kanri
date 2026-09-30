import { NextRequest, NextResponse } from 'next/server';
import { loadData, saveData } from '@/lib/store';
import { Rental } from '@/lib/types';
import { ADMIN_COOKIE, isAdminCookieValid } from '@/lib/admin';
import { pushLog } from '@/lib/log';

export const dynamic = 'force-dynamic';

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// レンタカー利用の登録・更新。社用車とは別管理。
export async function POST(req: NextRequest) {
  const r: Rental = await req.json();
  const isNew = !r.id;
  if (!r.id) r.id = 'rn' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  if (!r.driver || !r.startDate || !r.company) {
    return NextResponse.json({ success: false, message: 'レンタカー会社・登録者・利用開始日は必須です。' }, { status: 400 });
  }
  r.endDate = r.endDate || r.startDate;
  if (r.endDate < r.startDate) {
    return NextResponse.json({ success: false, message: '返却日は利用開始日以降にしてください。' }, { status: 400 });
  }
  r.operators = (Array.isArray(r.operators) ? r.operators : [])
    .map((o) => ({ ...(o.driverId ? { driverId: o.driverId } : {}), name: String(o.name || '').trim() }))
    .filter((o) => o.name);
  if (r.operators.length === 0) {
    return NextResponse.json({ success: false, message: '運転した人を1人以上選んでください。' }, { status: 400 });
  }
  r.cost = num(r.cost);
  r.startKm = num(r.startKm);
  r.endKm = num(r.endKm);
  r.createdAt = r.createdAt || new Date().toISOString();

  const data = await loadData();
  const idx = data.rentals.findIndex((x) => x.id === r.id);
  if (idx >= 0) data.rentals[idx] = r;
  else data.rentals.push(r);

  pushLog(data, {
    actor: isAdminCookieValid(req.cookies.get(ADMIN_COOKIE)?.value) ? 'admin' : 'user',
    action: isNew || idx < 0 ? 'レンタカー登録' : 'レンタカー更新',
    target: `${r.startDate} ${r.company} ${r.carModel || ''}`.trim(),
    detail: `運転者: ${r.operators.map((o) => o.name).join('・')}`,
  });

  await saveData({
    reports: data.reports,
    vehicles: data.vehicles,
    drivers: data.drivers,
    masters: data.masters,
    logs: data.logs,
    rentals: data.rentals,
  });
  return NextResponse.json({ success: true, id: r.id });
}
