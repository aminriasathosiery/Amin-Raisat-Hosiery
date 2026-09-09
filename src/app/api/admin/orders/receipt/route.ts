import { NextResponse } from 'next/server';
import { supabaseServer, createAdminClient, isSupabaseConfigured } from '@/lib/supabase';
import { verifyAdminSession } from '@/lib/auth/adminAuth';

export const dynamic = 'force-dynamic';

function getDbClient() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      return createAdminClient();
    } catch {
      return supabaseServer;
    }
  }
  return supabaseServer;
}

export async function GET(req: Request) {
  try {
    if (!verifyAdminSession(req)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin session required to view payment receipts.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId') || searchParams.get('id');

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Storage not configured.' }, { status: 404 });
    }

    const db = getDbClient();
    const { data: order, error } = await db
      .from('orders')
      .select('id, order_number, payment_screenshot_url')
      .eq('id', orderId)
      .maybeSingle();

    if (error || !order || !order.payment_screenshot_url) {
      return NextResponse.json({ error: 'Payment receipt not found.' }, { status: 404 });
    }

    const rawUrl = order.payment_screenshot_url;
    let targetBucket = 'product-media';
    let storagePath = rawUrl;

    // If full URL, extract bucket and relative path
    const match = rawUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/?#]+)\/([^?#]+)/);
    if (match) {
      targetBucket = decodeURIComponent(match[1]);
      storagePath = decodeURIComponent(match[2]);
    } else if (rawUrl.startsWith('receipts/')) {
      storagePath = rawUrl;
    }

    // Generate a secure, time-limited 15-minute signed URL
    const { data: signedData, error: signErr } = await db.storage
      .from(targetBucket)
      .createSignedUrl(storagePath, 15 * 60);

    if (signErr || !signedData?.signedUrl) {
      console.error('Failed to create signed receipt URL:', signErr);
      return NextResponse.json({ error: 'Failed to generate secure receipt link.' }, { status: 500 });
    }

    // If requested with ?redirect=true or from browser image tag, redirect directly to signed URL
    const shouldRedirect = searchParams.get('redirect') === 'true' || req.headers.get('accept')?.includes('image/');
    if (shouldRedirect) {
      return NextResponse.redirect(signedData.signedUrl, 307);
    }

    return NextResponse.json({
      success: true,
      orderNumber: order.order_number,
      signedUrl: signedData.signedUrl,
      expiresIn: 900,
    });
  } catch (err: any) {
    console.error('Receipt proxy error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
