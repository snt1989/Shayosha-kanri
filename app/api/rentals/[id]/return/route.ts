import { NextRequest, NextResponse } from 'next/server';
import { loadData, saveData } from '@/lib/store';
import { ADMIN_COOKIE, isAdminCookieValid } from '@/lib/admin';
import { pushLog } from '@/lib/log';

export const dynamic = 'force-dynamic';

const today = () => {
  const d = new Date(Date.now() + 9 * 3600 * 1000); // 日本時間
  return d.toISOString().slice(0, 10);
};

// レンタカーの返却。管理者でなくても押せる（返却した日を記録し、カレンダーの表示もその日まで）。
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: { date?: string } = await req.json().catch(() => ({}));
  const data = await loadData();
  const r = data.rentals.find((x) => x.id === id);
  if (!r) return NextResponse.json({ success: false, message: 'レンタカーが見つかりません。' }, { status: 404 });
  if (r.returnedAt) return NextResponse.json({ success: false, message: `すでに返却済みです（${r.returnedAt}）。` }, { status: 409 });

  let date = /^\d{4}-\d{2}-\d{2}$/.test(body.date || '') ? (body.date as string) : today();
  if (date < r.startDate) date = r.startDate;
  r.returnedAt = date;
  // 予定より早く返したときは、カレンダーに出る期間も返却日までにする
  if (date < r.endDate) r.endDate = date;

  pushLog(data, {
    actor: isAdminCookieValid(req.cookies.get(ADMIN_COOKIE)?.value) ? 'admin' : 'user',
    action: 'レンタカー返却',
    target: `${r.company} ${r.carModel || ''}`.trim(),
    detail: date,
  });
  await saveData({
    reports: data.reports,
    vehicles: data.vehicles,
    drivers: data.drivers,
    masters: data.masters,
    logs: data.logs,
    rentals: data.rentals,
  });
  return NextResponse.json({ success: true, returnedAt: date });
}
