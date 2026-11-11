import { NextResponse } from 'next/server';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase';
import { verifyAdminSession } from '@/lib/auth/adminAuth';
import { isWhatsAppCloudConfigured, processNotificationOutbox } from '@/lib/whatsappOutbox';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getDbClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (
    !serviceKey ||
    serviceKey.length < 20 ||
    serviceKey.includes('PASTE_') ||
    serviceKey.startsWith('sb_publishable_')
  ) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is required for notification outbox management.'
    );
  }
  return createAdminClient();
}

export async function GET(req: Request) {
  try {
    if (!verifyAdminSession(req)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin session required.' },
        { status: 401 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: true,
        cloudApiConfigured: isWhatsAppCloudConfigured(),
        notifications: [],
      });
    }

    const dbClient = getDbClient();
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId')?.trim();
    const statusFilter = searchParams.get('status')?.trim();
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 40));

    let query = dbClient
      .from('notification_outbox')
      .select('id, order_id, channel, recipient_type, recipient_phone, event_type, status, attempts, max_attempts, last_error, provider_message_id, sent_at, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (orderId) query = query.eq('order_id', orderId);
    if (statusFilter && statusFilter !== 'all') query = query.eq('status', statusFilter);

    const { data, error } = await query;
    if (error) {
      // Migration v14 not applied yet
      if (error.code === '42P01' || error.message?.includes('notification_outbox')) {
        return NextResponse.json({
          success: true,
          cloudApiConfigured: isWhatsAppCloudConfigured(),
          notifications: [],
          migrationPending: true,
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      cloudApiConfigured: isWhatsAppCloudConfigured(),
      notifications: data || [],
    });
  } catch (err: any) {
    if (err?.message?.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!verifyAdminSession(req)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin session required.' },
        { status: 401 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    const body = await req.json().catch(() => ({}));
    const jobId = typeof body?.jobId === 'string' ? body.jobId.trim() : undefined;
    const limit = Math.min(25, Math.max(1, Number(body?.limit) || 10));

    const dbClient = getDbClient();

    if (jobId) {
      // Reset single failed/manual job before re-dispatch
      await dbClient
        .from('notification_outbox')
        .update({
          status: 'pending',
          next_retry_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    }

    const result = await processNotificationOutbox(dbClient, {
      limit,
      onlyJobId: jobId,
    });

    return NextResponse.json({
      success: true,
      cloudApiConfigured: isWhatsAppCloudConfigured(),
      ...result,
    });
  } catch (err: any) {
    if (err?.message?.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return NextResponse.json({ error: err?.message || 'Failed to process notifications' }, { status: 500 });
  }
}

