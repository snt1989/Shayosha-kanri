import { NextRequest, NextResponse } from 'next/server';
import { loadData, saveData } from '@/lib/store';
import { Report } from '@/lib/types';
import { ADMIN_COOKIE, isAdminCookieValid } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const r: Report = await req.json();
  if (!r.id) {
    r.id = 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  r.driver = `${r.driverLast} ${r.driverFirst}`.trim();

  const data = await loadData();
  const idx = data.reports.findIndex((x) => x.id === r.id);

  // 既に「帰着済」として確定している日報の再編集（内容の書き換え）は、記録の改ざん防止のため
  // 管理者ログイン必須とする。新規登録や、まだ出庫中の日報を自分で帰着登録する操作は誰でも可能。
  if (idx >= 0 && data.reports[idx].postDone) {
    if (!isAdminCookieValid(req.cookies.get(ADMIN_COOKIE)?.value)) {
      return NextResponse.json(
        { success: false, message: '確定済みの日報を編集するには管理者ログインが必要です。' },
        { status: 401 }
      );
    }
  }

  if (idx >= 0) {
    data.reports[idx] = r;
  } else {
    data.reports.unshift(r);
  }

  if (r.postDone && r.vehicleId && r.endKm) {
    const v = data.vehicles.find((x) => x.id === r.vehicleId);
    if (v && r.endKm > v.odometer) {
      v.odometer = r.endKm;
    }
  }

  await saveData({
    reports: data.reports,
    vehicles: data.vehicles,
    drivers: data.drivers,
    masters: data.masters,
  });

  return NextResponse.json({ success: true, id: r.id });
}
