import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const isAuthenticated = verifyAdminSession(req);
  if (!isAuthenticated) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true });
}
