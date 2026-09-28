import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminPasswordConfigured, adminSessionToken, checkAdminPassword } from '@/lib/admin';
import { loadData, saveData } from '@/lib/store';
import { pushLog } from '@/lib/log';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!adminPasswordConfigured()) {
    return NextResponse.json(
      { success: false, message: 'サーバーに ADMIN_PASSWORD が設定されていません。Vercelの環境変数を設定してください。' },
      { status: 500 }
    );
  }

  const { password } = await req.json();
  if (!checkAdminPassword(password || '')) {
    return NextResponse.json({ success: false, message: 'パスワードが違います。' }, { status: 401 });
  }

  const data = await loadData();
  pushLog(data, { actor: 'admin', action: '管理者ログイン', target: '-' });
  await saveData({
    reports: data.reports,
    vehicles: data.vehicles,
    drivers: data.drivers,
    masters: data.masters,
    logs: data.logs,
  });

  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_COOKIE, adminSessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  return res;
}
