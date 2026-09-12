import { NextResponse } from 'next/server';
import { supabaseServer, createAdminClient, isSupabaseConfigured } from '@/lib/supabase';

import { verifyAdminSession } from '@/lib/auth/adminAuth';

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
        { error: 'Unauthorized. Admin session required.' },
        { status: 401 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, orders: [] });
    }

    const dbClient = getDbClient();
    const { data: orders, error } = await dbClient
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Admin GET orders error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const mappedOrders = (orders || []).map((o: any) => ({
      id: o.id,
      orderNumber: o.order_number,
      customerType: o.customer_type || (o.user_id ? 'REGISTERED' : 'GUEST'),
      customerName: o.customer_name,
      customerPhone: o.customer_phone,
      customerEmail: o.customer_email || undefined,
      address: o.address || o.shipping_address || '',
      city: o.city,
      province: o.province,
      orderNotes: o.order_notes || undefined,
      subtotal: Number(o.subtotal) || 0,
      deliveryFee: Number(o.delivery_fee) || 0,
      totalAmount: Number(o.total_amount) || 0,
      paymentMethod: o.payment_method || 'cod',
      paymentReference: o.payment_reference || undefined,
      paymentScreenshotUrl: o.payment_screenshot_url ? `/api/admin/orders/receipt?orderId=${o.id}` : undefined,
      paymentStatus: o.payment_status || (o.payment_method === 'cod' ? 'COD_PENDING' : 'PENDING_VERIFICATION'),
      paymentVerifiedAt: o.payment_verified_at || undefined,
      paymentVerifiedBy: o.payment_verified_by || undefined,
      paymentRejectionReason: o.payment_rejection_reason || undefined,
      status: o.status || 'Pending',
      createdAt: o.created_at,
      items: Array.isArray(o.order_items)
        ? o.order_items.map((it: any) => ({
            id: it.id,
            orderId: it.order_id,
            productId: it.product_id,
            variantId: it.variant_id,
            productName: it.product_name,
            quality: it.quality,
            sleeve: it.sleeve,
            size: it.size,
            unitPrice: Number(it.unit_price) || 0,
            quantity: Number(it.quantity) || 1,
            totalPrice: Number(it.total_price) || 0,
            image: it.image_url,
          }))
        : [],
    }));

    return NextResponse.json({ success: true, orders: mappedOrders });
  } catch (err: any) {
    console.error('Admin GET orders error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!verifyAdminSession(req)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin session required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const queryId = searchParams.get('id') || searchParams.get('orderId');

    let targetIds: string[] = [];

    if (queryId) {
      targetIds = [queryId.trim()];
    } else {
      try {
        const body = await req.json();
        if (body.orderId) {
          targetIds = [body.orderId.trim()];
        } else if (Array.isArray(body.orderIds)) {
          targetIds = body.orderIds.map((id: any) => String(id).trim()).filter(Boolean);
        }
      } catch {}
    }

    if (targetIds.length === 0) {
      return NextResponse.json(
        { error: 'Valid order ID or orderIds list is required for deletion.' },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: true,
        count: targetIds.length,
        deletedIds: targetIds,
        message: 'Order(s) deleted from local state.',
      });
    }

    const dbClient = getDbClient();

    // 1. Fetch matching orders to verify existence and extract storage file references
    let { data: existingOrders, error: fetchErr } = await dbClient
      .from('orders')
      .select('id, order_number')
      .in('id', targetIds);

    // If not found by UUID, attempt search by order_number
    if (!existingOrders || existingOrders.length === 0) {
      const { data: byOrderNumber } = await dbClient
        .from('orders')
        .select('id, order_number')
        .in('order_number', targetIds);
      if (byOrderNumber && byOrderNumber.length > 0) {
        existingOrders = byOrderNumber;
      }
    }

    if (fetchErr) {
      console.error('Fetch orders prior to delete error:', fetchErr);
      return NextResponse.json(
        { error: `Database error during order verification: ${fetchErr.message}` },
        { status: 500 }
      );
    }

    if (!existingOrders || existingOrders.length === 0) {
      return NextResponse.json(
        { error: `No matching order found with ID: ${targetIds.join(', ')}` },
        { status: 404 }
      );
    }

    const confirmedIds = existingOrders.map((o: any) => o.id);

    // 2. Clean dependent records safely (order_items, disconnect reviews)
    try {
      await dbClient.from('order_items').delete().in('order_id', confirmedIds);
    } catch (itemErr) {
      console.warn('Order items cascade delete notice:', itemErr);
    }

    try {
      await dbClient.from('reviews').update({ order_id: null }).in('order_id', confirmedIds);
    } catch (revErr) {
      console.warn('Reviews order_id disconnect notice:', revErr);
    }

    // 3. Delete order record(s) from database
    const { data: deletedRows, error: delErr } = await dbClient
      .from('orders')
      .delete()
      .in('id', confirmedIds)
      .select('id');

    if (delErr) {
      console.error('Authoritative orders delete error:', delErr);
      return NextResponse.json(
        { error: `Failed to delete order(s) from database: ${delErr.message}`, code: delErr.code },
        { status: 500 }
      );
    }

    if ((!deletedRows || deletedRows.length === 0) && confirmedIds.length > 0) {
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return NextResponse.json(
          {
            error:
              'Database deletion blocked by Supabase Row Level Security (RLS). SUPABASE_SERVICE_ROLE_KEY must be configured in server environment variables to grant permanent admin deletion authority.',
          },
          { status: 403 }
        );
      }
    }

    // 4. Clean up associated payment receipt files from Supabase Storage
    const storageCleanupResults: { url: string; success: boolean; error?: string }[] = [];
    for (const ord of existingOrders) {
      const screenshotUrl = (ord as any).payment_screenshot_url;
      if (screenshotUrl && typeof screenshotUrl === 'string') {
        const rawUrl = screenshotUrl;
        try {
          // Parse bucket and object path from Supabase storage public / signed URL format:
          // e.g. .../storage/v1/object/public/<bucket>/<path>
          const storageMatch = rawUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/?#]+)\/([^?#]+)/);
          if (storageMatch) {
            const bucket = decodeURIComponent(storageMatch[1]);
            const objectPath = decodeURIComponent(storageMatch[2]);
            const { error: removeErr } = await dbClient.storage.from(bucket).remove([objectPath]);
            if (removeErr) {
              console.warn(`Storage file removal failed for bucket '${bucket}', path '${objectPath}':`, removeErr);
              storageCleanupResults.push({ url: rawUrl, success: false, error: removeErr.message });
            } else {
              storageCleanupResults.push({ url: rawUrl, success: true });
            }
          }
        } catch (storageException: any) {
          console.warn('Storage cleanup exception for receipt:', storageException);
          storageCleanupResults.push({ url: rawUrl, success: false, error: storageException?.message });
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: confirmedIds.length,
      deletedIds: confirmedIds,
      deletedOrderNumbers: existingOrders.map((o: any) => o.order_number),
      storageCleanup: storageCleanupResults,
      message: `Permanently deleted ${confirmedIds.length} order(s) and dependent data successfully.`,
    });
  } catch (err: any) {
    console.error('API /api/admin/orders DELETE error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal Server Error during order deletion.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    if (!verifyAdminSession(req)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin session required.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json({ error: 'orderId and status are required' }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, orderId, status });
    }

    const dbClient = getDbClient();
    const { data: updated, error } = await dbClient
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select('*, order_items(*)')
      .single();

    if (error) {
      console.error('Admin PATCH order error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (err: any) {
    console.error('Admin PATCH order error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  return PATCH(req);
}


