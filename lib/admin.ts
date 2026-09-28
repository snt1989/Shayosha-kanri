import crypto from 'crypto';

export const ADMIN_COOKIE = 'fleet_admin_session';

function tokenFor(password: string): string {
  return crypto.createHash('sha256').update(password + ':fleet-admin-salt').digest('hex');
}

export function adminPasswordConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function checkAdminPassword(password: string): boolean {
  return adminPasswordConfigured() && password === process.env.ADMIN_PASSWORD;
}

export function adminSessionToken(): string {
  return tokenFor(process.env.ADMIN_PASSWORD || '');
}

export function isAdminCookieValid(cookieVal: string | undefined | null): boolean {
  if (!cookieVal || !adminPasswordConfigured()) return false;
  return cookieVal === adminSessionToken();
}
