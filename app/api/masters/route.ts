import { NextRequest, NextResponse } from 'next/server';
import { loadData, saveData } from '@/lib/store';
import { MasterKey } from '@/lib/types';
import { ADMIN_COOKIE, isAdminCookieValid } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!isAdminCookieValid(req.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ success: false, message: '管理者ログインが必要です。' }, { status: 401 });
  }
  const { category, items }: { category: MasterKey; items: string[] } = await req.json();
  const data = await loadData();
  data.masters[category] = items || [];
  await saveData({
    reports: data.reports,
    vehicles: data.vehicles,
    drivers: data.drivers,
    masters: data.masters,
  });
  return NextResponse.json({ success: true });
}
