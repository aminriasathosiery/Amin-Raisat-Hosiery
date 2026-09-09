import { NextResponse } from 'next/server';
import {
  validateAdminPassword,
  createAdminSessionToken,
  setAdminSessionCookie,
} from '@/lib/auth/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Admin password is required.' },
        { status: 400 }
      );
    }

    const isValid = validateAdminPassword(password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Incorrect password. Access denied.' },
        { status: 401 }
      );
    }

    const token = createAdminSessionToken();
    const response = NextResponse.json({
      success: true,
      message: 'Admin authentication successful.',
    });

    setAdminSessionCookie(response, token);
    return response;
  } catch (err: any) {
    console.error('Admin login error:', err);
    return NextResponse.json(
      { error: 'Internal server error during authentication.' },
      { status: 500 }
    );
  }
}
