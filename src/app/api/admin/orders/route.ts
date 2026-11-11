import { NextResponse } from 'next/server';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase';
import { verifyAdminSession } from '@/lib/auth/adminAuth';
import {
  buildOrderStatusOutboxJob,
  enqueueOutboxJobsSafely,
} from '@/lib/whatsappOutbox';

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
      'SUPABASE_SERVICE_ROLE_KEY is required for admin order operations. Please configure SUPABASE_SERVICE_ROLE_KEY in your server environment.'
    );
  }
  return createAdminClient();
}

function mapAdminOrder(o: any, includeFullDetails = false) {
  return {
    id: o.id,
    orderNumber: o.order_number,
    customerType: o.customer_type || (o.user_id ? 'REGISTERED' : 'GUEST'),
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    customerEmail: o.customer_email || undefined,
    address: includeFullDetails ? o.address || o.shipping_address || '' : o.address || '',
    city: o.city,
    province: o.province,
    orderNotes: o.order_notes || undefined,
    subtotal: Number(o.subtotal) || 0,
    deliveryFee: Number(o.delivery_fee) || 0,
    totalAmount: Number(o.total_amount) || 0,
    paymentMethod: o.payment_method || 'cod',
    paymentReference: o.payment_reference || undefined,
    paymentScreenshotUrl: o.payment_screenshot_url
      ? `/api/admin/orders/receipt?orderId=${o.id}`
      : undefined,
    paymentStatus:
      o.payment_status || (o.payment_method === 'cod' ? 'COD_PENDING' : 'PENDING_VERIFICATION'),
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
          isDealItem: Boolean(it.deal_id),
          dealId: it.deal_id || undefined,
          dealName: it.deal_name || undefined,
          dealPiecesCount: it.deal_pieces_count ? Number(it.deal_pieces_count) : undefined,
          dealIsFreeDelivery: it.deal_is_free_delivery ?? undefined,
          productName: it.deal_name || it.product_name,
          quality: it.quality,
          sleeve: it.sleeve,
          size: it.size,
          color: it.color || undefined,
          colorHex: it.color_hex || undefined,
          unitPrice: Number(it.unit_price) || 0,
          quantity: Number(it.quantity) || 1,
          totalPrice: Number(it.total_price) || 0,
          image: it.image_url,
        }))
      : [],
  };
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
        orders: [],
        pagination: { page: 1, limit: 20, totalCount: 0, totalPages: 1 },
      });
    }

    let dbClient;
    try {
      dbClient = getDbClient();
    } catch (err: any) {
      return NextResponse.json(
        {
          error:
            err?.message ||
            'SUPABASE_SERVICE_ROLE_KEY is required to view admin orders.',
        },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(req.url);
    const singleOrderId = searchParams.get('orderId')?.trim();

    // Lazy single-order detail fetch (called when opening View Order modal)
    if (singleOrderId) {
      const [ordRes, notifRes] = await Promise.all([
        dbClient
          .from('orders')
          .select('*, order_items(*)')
          .eq('id', singleOrderId)
          .single(),
        dbClient
          .from('notification_outbox')
          .select('id, recipient_type, recipient_phone, event_type, status, attempts, max_attempts, last_error, sent_at, created_at')
          .eq('order_id', singleOrderId)
          .order('created_at', { ascending: false })
          .then((r) => r, () => ({ data: [], error: null })),
      ]);

      if (ordRes.error || !ordRes.data) {
        return NextResponse.json(
          { error: ordRes.error?.message || 'Order not found.' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        order: mapAdminOrder(ordRes.data, true),
        notifications: Array.isArray((notifRes as any)?.data) ? (notifRes as any).data : [],
      });
    }

    // Server-side Paginated & Filtered List Query
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20));
    const statusFilter = searchParams.get('status')?.trim() || 'all';
    const paymentFilter = searchParams.get('paymentStatus')?.trim() || 'all';
    const q = searchParams.get('q')?.trim() || '';
    const dateFrom = searchParams.get('dateFrom')?.trim() || '';
    const dateTo = searchParams.get('dateTo')?.trim() || '';
    const includeStats = searchParams.get('includeStats') === '1';

    const listSelect =
      'id, order_number, user_id, customer_type, customer_name, customer_phone, city, province, subtotal, delivery_fee, total_amount, payment_method, payment_status, payment_screenshot_url, payment_verified_at, status, created_at, ' +
      'order_items(id, order_id, product_id, product_name, deal_id, deal_name, deal_pieces_count, deal_is_free_delivery, quality, sleeve, size, color, color_hex, unit_price, quantity, total_price, image_url)';

    let listQuery = dbClient
      .from('orders')
      .select(listSelect, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      listQuery = listQuery.eq('status', statusFilter);
    }
    if (paymentFilter !== 'all') {
      listQuery = listQuery.eq('payment_status', paymentFilter);
    }
    if (dateFrom) {
      listQuery = listQuery.gte('created_at', `${dateFrom}T00:00:00.000Z`);
    }
    if (dateTo) {
      listQuery = listQuery.lte('created_at', `${dateTo}T23:59:59.999Z`);
    }
    if (q) {
      const safeQ = q.replace(/[%_,]/g, ' ').trim();
      if (safeQ) {
        listQuery = listQuery.or(
          `order_number.ilike.%${safeQ}%,customer_name.ilike.%${safeQ}%,customer_phone.ilike.%${safeQ}%,city.ilike.%${safeQ}%`
        );
      }
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    listQuery = listQuery.range(from, to);

    const statsPromise = includeStats
      ? dbClient
          .from('orders')
          .select('status, payment_status, payment_method, payment_verified_at, total_amount')
      : Promise.resolve({ data: null, error: null });

    const [ordersRes, statsRes] = await Promise.all([listQuery, statsPromise]);

    if (ordersRes.error) {
      console.error('Admin GET orders error:', ordersRes.error);
      return NextResponse.json({ error: ordersRes.error.message }, { status: 500 });
    }

    const totalCount = ordersRes.count ?? (ordersRes.data || []).length;
    const mappedOrders = (ordersRes.data || []).map((o: any) => mapAdminOrder(o, false));

    let stats;
    if (includeStats && Array.isArray(statsRes?.data)) {
      const rows = statsRes.data as any[];
      stats = {
        total: rows.length,
        pendingVerification: rows.filter(
          (o) =>
            o.payment_status === 'PENDING_VERIFICATION' ||
            (o.payment_method !== 'cod' && o.status === 'Pending' && !o.payment_verified_at)
        ).length,
        pending: rows.filter((o) => o.status === 'Pending').length,
        confirmed: rows.filter(
          (o) => o.status === 'Confirmed' || o.status === 'Processing'
        ).length,
        processing: rows.filter(
          (o) =>
            o.status === 'Confirmed' ||
            o.status === 'Processing' ||
            o.status === 'Packed' ||
            o.status === 'Shipped'
        ).length,
        shipped: rows.filter((o) => o.status === 'Shipped').length,
        delivered: rows.filter((o) => o.status === 'Delivered').length,
        totalSales: rows.reduce(
          (sum, o) =>
            sum + (o.status !== 'Cancelled' && o.status !== 'Returned' ? Number(o.total_amount) || 0 : 0),
          0
        ),
        deliveredSales: rows
          .filter((o) => o.status === 'Delivered')
          .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0),
      };
    }

    return NextResponse.json({
      success: true,
      orders: mappedOrders,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      },
      ...(stats ? { stats } : {}),
    });
  } catch (err: any) {
    if (err?.message?.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
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

    const isUuid = (str: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    const uuidIds = targetIds.filter(isUuid);
    const orderNumberIds = targetIds.filter((id) => !isUuid(id));

    let existingOrders: any[] = [];

    if (uuidIds.length > 0) {
      const { data: byId, error: fetchErr } = await dbClient
        .from('orders')
        .select('id, order_number, payment_screenshot_url')
        .in('id', uuidIds);

      if (fetchErr) {
        console.error('Fetch orders prior to delete error:', fetchErr);
        return NextResponse.json(
          { error: 'Database error during order verification' },
          { status: 500 }
        );
      }
      if (byId) existingOrders.push(...byId);
    }

    if (orderNumberIds.length > 0) {
      const { data: byOrderNumber, error: fetchNumErr } = await dbClient
        .from('orders')
        .select('id, order_number, payment_screenshot_url')
        .in('order_number', orderNumberIds);

      if (fetchNumErr) {
        console.error('Fetch orders by order_number error:', fetchNumErr);
        return NextResponse.json(
          { error: 'Database error during order verification' },
          { status: 500 }
        );
      }
      if (byOrderNumber) existingOrders.push(...byOrderNumber);
    }

    if (existingOrders.length === 0) {
      return NextResponse.json(
        { error: `No matching order found with ID: ${targetIds.join(', ')}` },
        { status: 404 }
      );
    }

    const confirmedIds = existingOrders.map((o: any) => o.id);

    await Promise.all([
      dbClient.from('order_items').delete().in('order_id', confirmedIds),
      dbClient.from('reviews').update({ order_id: null }).in('order_id', confirmedIds),
    ]);

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
              'Database deletion blocked by Supabase Row Level Security (RLS). SUPABASE_SERVICE_ROLE_KEY must be configured in server environment variables.',
          },
          { status: 403 }
        );
      }
    }

    const storageCleanupResults: { url: string; success: boolean; error?: string }[] = [];
    for (const ord of existingOrders) {
      const screenshotUrl = (ord as any).payment_screenshot_url;
      if (screenshotUrl && typeof screenshotUrl === 'string') {
        try {
          const storageMatch = screenshotUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/?#]+)\/([^?#]+)/);
          if (storageMatch) {
            const bucket = decodeURIComponent(storageMatch[1]);
            const objectPath = decodeURIComponent(storageMatch[2]);
            const { error: removeErr } = await dbClient.storage.from(bucket).remove([objectPath]);
            storageCleanupResults.push({
              url: screenshotUrl,
              success: !removeErr,
              ...(removeErr ? { error: removeErr.message } : {}),
            });
          }
        } catch (storageException: any) {
          storageCleanupResults.push({ url: screenshotUrl, success: false, error: storageException?.message });
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
    if (err?.message?.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
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
      .select('id, order_number, customer_name, customer_phone, total_amount, status, updated_at')
      .single();

    if (error) {
      console.error('Admin PATCH order error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (updated) {
      const statusJob = buildOrderStatusOutboxJob({
        orderId: updated.id,
        orderNumber: updated.order_number,
        customerName: updated.customer_name,
        customerPhone: updated.customer_phone,
        newStatus: status,
        totalAmount: Number(updated.total_amount) || 0,
      });
      // Queue idempotently without delaying status update response
      await enqueueOutboxJobsSafely(dbClient, updated.id, [statusJob]);
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (err: any) {
    if (err?.message?.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error('Admin PATCH order error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  return PATCH(req);
}
