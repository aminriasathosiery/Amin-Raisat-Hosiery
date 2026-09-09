import { NextResponse } from 'next/server';
import { clearAdminSessionCookie } from '@/lib/auth/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Admin session terminated successfully.',
  });

  clearAdminSessionCookie(response);
  return response;
}
