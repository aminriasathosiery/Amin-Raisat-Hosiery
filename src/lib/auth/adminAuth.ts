import crypto from 'crypto';
import { NextResponse } from 'next/server';

export const ADMIN_COOKIE_NAME = 'arh_admin_session_v1';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSecretKey(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'arh_admin_default_secure_secret_seed_2026_pk'
  );
}

export function validateAdminPassword(password: string): boolean {
  if (!password || typeof password !== 'string') return false;
  const configuredPassword = process.env.ADMIN_PASSWORD || 'Amin7866@';
  // Constant time comparison to prevent timing attacks
  const inputBuffer = Buffer.from(password.trim());
  const targetBuffer = Buffer.from(configuredPassword.trim());
  if (inputBuffer.length !== targetBuffer.length) return false;
  return crypto.timingSafeEqual(inputBuffer, targetBuffer);
}

export function createAdminSessionToken(): string {
  const issuedAt = Date.now();
  const randomBytes = crypto.randomBytes(16).toString('hex');
  const payload = `${issuedAt}:${randomBytes}`;
  const hmac = crypto.createHmac('sha256', getSecretKey());
  hmac.update(payload);
  const signature = hmac.digest('hex');
  return `${payload}:${signature}`;
}

export function verifySessionToken(token?: string | null): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split(':');
  if (parts.length !== 3) return false;

  const [timestampStr, randomBytes, signature] = parts;
  const issuedAt = parseInt(timestampStr, 10);
  if (isNaN(issuedAt)) return false;

  // Check expiration
  if (Date.now() - issuedAt > SESSION_DURATION_MS) return false;
  if (issuedAt > Date.now() + 60000) return false; // Clock skew protection

  const payload = `${timestampStr}:${randomBytes}`;
  const hmac = crypto.createHmac('sha256', getSecretKey());
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}

export function extractTokenFromRequest(req: Request): string | null {
  // 1. Check Cookie header
  const cookieHeader = req.headers.get('cookie') || '';
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    for (const c of cookies) {
      if (c.startsWith(`${ADMIN_COOKIE_NAME}=`)) {
        return decodeURIComponent(c.slice(ADMIN_COOKIE_NAME.length + 1));
      }
    }
  }

  // 2. Check Authorization header: Bearer <token>
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  // 3. Check X-Admin-Token header
  const customHeader = req.headers.get('x-admin-token');
  if (customHeader) {
    return customHeader.trim();
  }

  return null;
}

export function verifyAdminSession(req: Request): boolean {
  const token = extractTokenFromRequest(req);
  return verifySessionToken(token);
}

export function setAdminSessionCookie(response: NextResponse, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  });
}

export function clearAdminSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
