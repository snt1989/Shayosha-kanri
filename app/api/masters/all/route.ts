import { NextRequest, NextResponse } from 'next/server';
import { loadData, saveData } from '@/lib/store';
import { MASTER_KEYS, Masters } from '@/lib/types';
import { ADMIN_COOKIE, isAdminCookieValid } from '@/lib/admin';
import { pushLog } from '@/lib/log';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!isAdminCookieValid(req.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ success: false, message: '管理者ログインが必要です。' }, { status: 401 });
  }
  const masters: Masters = await req.json();
  const data = await loadData();
  data.masters = masters;
  const total = MASTER_KEYS.reduce((sum, k) => sum + (masters[k]?.length || 0), 0);
  pushLog(data, {
    actor: 'admin',
    action: 'マスタ一括CSV取込',
    target: '全カテゴリ',
    detail: `${total}件`,
  });
  await saveData({
    reports: data.reports,
    vehicles: data.vehicles,
    drivers: data.drivers,
    masters: data.masters,
    logs: data.logs,
  });
  return NextResponse.json({ success: true });
}
