import { NextResponse } from 'next/server';
import { loadData } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await loadData();
  return NextResponse.json(data);
}
