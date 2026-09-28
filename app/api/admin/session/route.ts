import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminPasswordConfigured, isAdminCookieValid } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cookieVal = req.cookies.get(ADMIN_COOKIE)?.value;
  return NextResponse.json({
    isAdmin: isAdminCookieValid(cookieVal),
    configured: adminPasswordConfigured(),
  });
}
