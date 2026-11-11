import { NextResponse } from 'next/server';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase';
import { verifyAdminSession } from '@/lib/auth/adminAuth';
import { processNotificationOutbox } from '@/lib/whatsappOutbox';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isAuthorizedCronOrAdmin(req: Request): boolean {
  if (verifyAdminSession(req)) return true;
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization') || '';
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  return false;
}

export async function POST(req: Request) {
  if (!isAuthorizedCronOrAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true, processed: 0 });
  }

  try {
    const dbClient = createAdminClient();
    const result = await processNotificationOutbox(dbClient, { limit: 20 });
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    if (err?.message?.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return NextResponse.json({ error: 'Outbox processing failed' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}

