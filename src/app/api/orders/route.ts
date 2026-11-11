import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseServer, createAdminClient, isSupabaseConfigured } from '@/lib/supabase';
import { INITIAL_SHIPPING_SETTINGS, INITIAL_SITE_SETTINGS } from '@/data/initialData';
import { resolveVariantPricing } from '@/lib/pricing';
import { calculateOrderDelivery, normalizeShippingSettings } from '@/lib/delivery';
import { fetchAuthoritativeSettings } from '@/lib/settingsServer';
import { revalidatePublicStoreCache, CACHE_TAGS } from '@/lib/catalogServer';
import { buildOrderCreatedOutboxJobs, enqueueOutboxJobsSafely } from '@/lib/whatsappOutbox';
import { verifyAdminSession } from '@/lib/auth/adminAuth';

const isUuid = (id?: string | null): boolean =>
  typeof id === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      userId,
      customerName,
      customerPhone,
      customerEmail,
      customerType,
      address,
      city,
      province,
      orderNotes,
      paymentMethod,
      paymentReference,
      paymentScreenshotUrl,
      items,
      idempotencyKey: bodyIdempotencyKey,
    } = body;

    const cleanName = customerName?.trim();
    const cleanPhone = customerPhone?.trim();
    const cleanAddress = address?.trim();
    const cleanCity = city?.trim();
    const rawIdempotencyKey =
      (typeof bodyIdempotencyKey === 'string' && bodyIdempotencyKey.trim()) ||
      req.headers.get('Idempotency-Key')?.trim() ||
      req.headers.get('x-idempotency-key')?.trim() ||
      undefined;
    const idempotencyKey = rawIdempotencyKey ? rawIdempotencyKey.slice(0, 128) : undefined;

    if (
      !cleanName ||
      !cleanPhone ||
      cleanPhone.length < 10 ||
      !cleanAddress ||
      !cleanCity ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        { error: 'Please provide valid customer details, delivery address, and order items.' },
        { status: 400 }
      );
    }

    const cleanPaymentMethod = (paymentMethod || 'cod').trim().toLowerCase();
    if (!['cod', 'bank_transfer'].includes(cleanPaymentMethod)) {
      return NextResponse.json(
        { error: 'Unsupported payment method selected.' },
        { status: 400 }
      );
    }
    if (cleanPaymentMethod !== 'cod' && !paymentScreenshotUrl) {
      return NextResponse.json(
        { error: 'Payment receipt screenshot is required for Direct Bank Transfer orders.' },
        { status: 400 }
      );
    }

    const totalItemCount = items.reduce(
      (sum: number, it: any) => sum + Math.max(1, Math.floor(Number(it.quantity) || 1)),
      0
    );
    if (totalItemCount < 1) {
      return NextResponse.json(
        { error: 'Please add at least 1 item to place an order.' },
        { status: 400 }
      );
    }

    let dbClient = supabaseServer;
    try {
      dbClient = createAdminClient();
    } catch {
      // Fallback to supabaseServer if service key not configured
    }

    // 1. Collect targeted IDs so we NEVER scan whole product_variants or deals tables
    const requestedVariantIds = Array.from(
      new Set(
        items
          .filter((it: any) => !it.dealId && isUuid(it.variantId))
          .map((it: any) => it.variantId as string)
      )
    );
    const requestedProductIds = Array.from(
      new Set(
        items
          .filter((it: any) => !it.dealId && isUuid(it.productId))
          .map((it: any) => it.productId as string)
      )
    );
    const requestedDealIds = Array.from(
      new Set(items.filter((it: any) => isUuid(it.dealId)).map((it: any) => it.dealId as string))
    );

    // 2. Parallel reads: live settings + targeted variants + targeted deals (+ idempotency fast-check)
    let shipping = normalizeShippingSettings(INITIAL_SHIPPING_SETTINGS);
    let adminWhatsapp = INITIAL_SITE_SETTINGS.whatsapp;
    let dbVariants: any[] = [];
    let dbDeals: any[] = [];

    if (isSupabaseConfigured()) {
      const variantsQuery =
        requestedVariantIds.length > 0 && requestedProductIds.length === 0
          ? dbClient
              .from('product_variants')
              .select('id, product_id, quality, sleeve, size, color, color_hex, price, discount_percentage, sale_price, stock, is_available, is_archived, products(id, name, slug)')
              .in('id', requestedVariantIds)
          : requestedProductIds.length > 0
            ? dbClient
                .from('product_variants')
                .select('id, product_id, quality, sleeve, size, color, color_hex, price, discount_percentage, sale_price, stock, is_available, is_archived, products(id, name, slug)')
                .in('product_id', requestedProductIds)
            : Promise.resolve({ data: [] as any[] });

      const dealsQuery =
        requestedDealIds.length > 0
          ? dbClient
              .from('deals')
              .select('id, name, slug, pieces_count, original_price, discount_percentage, sale_price, is_free_delivery, is_active, image_url')
              .in('id', requestedDealIds)
              .eq('is_active', true)
          : Promise.resolve({ data: [] as any[] });

      const existingOrderQuery = idempotencyKey
        ? dbClient
            .from('orders')
            .select('*, order_items(*)')
            .eq('idempotency_key', idempotencyKey)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null });

      const [settingsRes, variantsRes, dealsRes, existingRes] = await Promise.all([
        fetchAuthoritativeSettings(dbClient).catch(() => INITIAL_SITE_SETTINGS),
        variantsQuery,
        dealsQuery,
        existingOrderQuery,
      ]);

      // Return immediately if idempotency key already succeeded
      if (existingRes?.data && !existingRes.error) {
        return NextResponse.json(
          {
            success: true,
            deduplicated: true,
            order: mapDbOrderToClient(existingRes.data),
          },
          { status: 200 }
        );
      }

      shipping = normalizeShippingSettings(settingsRes.shipping);
      adminWhatsapp = settingsRes.whatsapp || INITIAL_SITE_SETTINGS.whatsapp;
      dbVariants = ((variantsRes as any)?.data || []).filter((v: any) => v.is_archived !== true);
      dbDeals = (dealsRes as any)?.data || [];
    }

    // 3. Authoritative verification of all items, stock & pricing
    let subtotal = 0;

    const verifiedItems = items.map((clientItem: any) => {
      const qty = Math.max(1, Math.floor(Number(clientItem.quantity) || 1));

      if (clientItem.dealId) {
        const deal = dbDeals.find((d) => d.id === clientItem.dealId && d.is_active !== false);
        if (!deal) {
          throw new Error(
            `The deal "${clientItem.dealName || clientItem.dealId}" is no longer active or does not exist.`
          );
        }

        const originalPrice = Number(deal.original_price) || 0;
        const discountPercentage = Number(deal.discount_percentage) || 0;
        const salePrice = Number(deal.sale_price) || originalPrice;
        const unitPrice = salePrice;
        const itemTotal = unitPrice * qty;
        subtotal += itemTotal;

        return {
          dealId: deal.id,
          dealName: deal.name || clientItem.dealName || 'Special Deal',
          dealSlug: deal.slug || clientItem.dealSlug || '',
          piecesCount: Number(deal.pieces_count) || Number(clientItem.piecesCount) || 1,
          originalPrice,
          discountPercentage,
          unitPrice,
          isFreeDelivery: Boolean(deal.is_free_delivery),
          quantity: qty,
          totalPrice: itemTotal,
          image: deal.image_url || clientItem.image || null,
        };
      }

      const variant = dbVariants.find(
        (v) =>
          v.id === clientItem.variantId ||
          (v.product_id === clientItem.productId &&
            v.quality === clientItem.quality &&
            v.sleeve === clientItem.sleeve &&
            v.size === clientItem.size &&
            (!clientItem.color || !v.color || v.color === clientItem.color))
      );

      if (!variant) {
        throw new Error(
          `The item "${clientItem.productName || 'Selected Item'}" is currently unavailable or does not exist in our catalog.`
        );
      }

      const currentStock = Number(variant.stock) || 0;
      if (variant.is_available === false || currentStock < qty) {
        const nameLabel = variant.products?.name || clientItem.productName || 'Item';
        throw new StockConflictError(
          currentStock <= 0
            ? `"${nameLabel}" (${variant.color ? `${variant.color} / ` : ''}${variant.size}) is currently out of stock.`
            : `Only ${currentStock} unit(s) available for "${nameLabel}" (${variant.color ? `${variant.color} / ` : ''}${variant.size}).`
        );
      }

      const productName = variant.products?.name || clientItem.productName || 'Hosiery Product';
      const pricing = resolveVariantPricing(variant);
      const unitPrice = pricing.salePrice;
      const itemTotal = unitPrice * qty;
      subtotal += itemTotal;

      return {
        productId: variant.product_id || clientItem.productId || null,
        variantId: variant.id,
        productName,
        quality: clientItem.quality || variant.quality || 'High Quality',
        sleeve: clientItem.sleeve || variant.sleeve || 'Sleeveless',
        size: clientItem.size || variant.size || 'L',
        color: clientItem.color || variant.color || null,
        colorHex: clientItem.colorHex || variant.color_hex || null,
        unitPrice,
        originalPrice: pricing.originalPrice,
        discountPercentage: pricing.discountPercentage,
        quantity: qty,
        totalPrice: itemTotal,
        image: clientItem.image || null,
      };
    });

    const deliveryCalc = calculateOrderDelivery(verifiedItems, shipping);
    const totalPhysicalPieces = deliveryCalc.totalPhysicalPieces;

    if (totalPhysicalPieces < shipping.minOrderQty) {
      return NextResponse.json(
        {
          error: `Minimum order quantity is ${shipping.minOrderQty} piece${shipping.minOrderQty > 1 ? 's' : ''}.`,
        },
        { status: 400 }
      );
    }

    if (totalPhysicalPieces > shipping.maxOrderQty) {
      return NextResponse.json(
        { error: `Maximum order limit is ${shipping.maxOrderQty} pieces per order.` },
        { status: 400 }
      );
    }

    const deliveryFee = deliveryCalc.deliveryFee;
    const totalAmount = subtotal + deliveryFee;
    const uniqueSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    const orderNumber = `ARH-${Date.now().toString().slice(-6)}-${uniqueSuffix}`;
    let orderId = `ord-${Date.now()}-${uniqueSuffix}`;
    const assignedCustomerType =
      customerType || (isUuid(userId) ? 'REGISTERED' : 'GUEST');
    const defaultPaymentStatus =
      cleanPaymentMethod === 'cod' ? 'COD_PENDING' : 'PENDING_VERIFICATION';
    const createdAt = new Date().toISOString();

    const orderPayload: any = {
      order_number: orderNumber,
      user_id: isUuid(userId) ? userId : null,
      customer_type: assignedCustomerType,
      customer_name: cleanName,
      customer_phone: cleanPhone,
      customer_email: customerEmail?.trim() || null,
      address: cleanAddress,
      city: cleanCity,
      province: province?.trim() || 'Punjab',
      order_notes: orderNotes?.trim() || null,
      subtotal,
      delivery_fee: deliveryFee,
      total_amount: totalAmount,
      payment_method: cleanPaymentMethod,
      payment_reference: paymentReference?.trim() || null,
      payment_screenshot_url: paymentScreenshotUrl || null,
      payment_status: defaultPaymentStatus,
      status: 'Pending',
    };

    const itemsPayload = verifiedItems.map((it: any) => {
      if (it.dealId) {
        return {
          product_name: it.dealName,
          is_deal_item: true,
          deal_id: it.dealId,
          deal_name: it.dealName,
          deal_slug: it.dealSlug,
          deal_pieces_count: it.piecesCount,
          deal_original_price: it.originalPrice,
          deal_discount_percentage: it.discountPercentage,
          deal_is_free_delivery: it.isFreeDelivery,
          unit_price: it.unitPrice,
          quantity: it.quantity,
          total_price: it.totalPrice,
          image_url: it.image || null,
        };
      }
      return {
        is_deal_item: false,
        product_id: isUuid(it.productId) ? it.productId : null,
        variant_id: isUuid(it.variantId) ? it.variantId : null,
        product_name: it.productName,
        quality: it.quality,
        sleeve: it.sleeve,
        size: it.size,
        color: it.color || null,
        color_hex: it.colorHex || null,
        unit_price: it.unitPrice,
        original_price: it.originalPrice,
        discount_percentage: it.discountPercentage,
        quantity: it.quantity,
        total_price: it.totalPrice,
        image_url: it.image || null,
      };
    });

    const outboxJobs = buildOrderCreatedOutboxJobs({
      orderKeyForDedupe: idempotencyKey || orderNumber,
      orderNumber,
      customerName: cleanName,
      customerPhone: cleanPhone,
      city: cleanCity,
      totalAmount,
      paymentMethod: cleanPaymentMethod,
      adminWhatsapp,
    });

    let deduplicated = false;
    let committedCreatedAt = createdAt;

    if (isSupabaseConfigured()) {
      // 4. Primary Atomic PostgreSQL Transaction RPC (Migration v14)
      const { data: rpcData, error: rpcError } = await dbClient.rpc('create_order_atomic', {
        p_idempotency_key: idempotencyKey || null,
        p_order: orderPayload,
        p_items: itemsPayload,
        p_notifications: outboxJobs,
      });

      const rpcMissing =
        rpcError &&
        (rpcError.code === '42883' ||
          rpcError.code === 'PGRST202' ||
          rpcError.message?.includes('create_order_atomic'));

      if (rpcError && !rpcMissing) {
        if (rpcError.message?.includes('INSUFFICIENT_STOCK:')) {
          const [, name, avail] = rpcError.message.split(':');
          return NextResponse.json(
            {
              error: `Insufficient stock for "${name || 'item'}": only ${avail || 0} left.`,
            },
            { status: 409 }
          );
        }
        if (rpcError.message?.includes('VARIANT_UNAVAILABLE:')) {
          const [, name] = rpcError.message.split(':');
          return NextResponse.json(
            { error: `Variant unavailable for "${name || 'item'}".` },
            { status: 409 }
          );
        }
        console.error('create_order_atomic RPC error:', rpcError);
        return NextResponse.json(
          { error: 'Unable to save your order safely. Please try again.' },
          { status: 500 }
        );
      }

      if (!rpcError && rpcData) {
        deduplicated = Boolean(rpcData.deduplicated);
        if (rpcData.order?.id) orderId = rpcData.order.id;
        if (rpcData.order?.order_number) {
          orderPayload.order_number = rpcData.order.order_number;
        }
        if (rpcData.order?.created_at) committedCreatedAt = rpcData.order.created_at;
        if (deduplicated) {
          const existingOrderObj = mapDbOrderToClient({
            ...rpcData.order,
            order_items: rpcData.items || [],
          });
          return NextResponse.json(
            { success: true, deduplicated: true, order: existingOrderObj },
            { status: 200 }
          );
        }
      } else {
        // Fallback path when migration_v14 SQL RPC is not yet installed:
        // Perform conditional atomic stock decrements + transactional compensation on failure.
        const decremented: Array<{ id: string; prevStock: number; qty: number }> = [];
        try {
          for (const item of verifiedItems) {
            if (item.variantId && isUuid(item.variantId)) {
              const targetVar = dbVariants.find((v) => v.id === item.variantId);
              if (!targetVar) continue;
              const currentStock = Number(targetVar.stock) || 0;
              if (currentStock < item.quantity) {
                throw new StockConflictError(
                  `Only ${currentStock} unit(s) remaining for "${item.productName}".`
                );
              }

              const { data: updRows, error: stockErr } = await dbClient
                .from('product_variants')
                .update({
                  stock: currentStock - item.quantity,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', item.variantId)
                .gte('stock', item.quantity)
                .select('id');

              if (stockErr || !updRows || updRows.length === 0) {
                throw new StockConflictError(
                  `"${item.productName}" just sold out or has insufficient stock.`
                );
              }
              decremented.push({ id: item.variantId, prevStock: currentStock, qty: item.quantity });
            }
          }

          const insertPayload = idempotencyKey
            ? { ...orderPayload, idempotency_key: idempotencyKey }
            : orderPayload;

          let { data: insertedOrder, error: ordErr } = await dbClient
            .from('orders')
            .insert(insertPayload)
            .select()
            .single();

          if (ordErr && (ordErr.message?.includes('idempotency_key') || ordErr.code === '42703')) {
            const retryRes = await dbClient
              .from('orders')
              .insert(orderPayload)
              .select()
              .single();
            insertedOrder = retryRes.data;
            ordErr = retryRes.error;
          }

          if (ordErr || !insertedOrder) {
            throw new Error(ordErr?.message || 'Failed to insert order header.');
          }

          orderId = insertedOrder.id;
          committedCreatedAt = insertedOrder.created_at || createdAt;

          const itemsWithOrderId = itemsPayload.map((row: any) => ({
            ...row,
            order_id: insertedOrder.id,
          }));

          const { error: itemsErr } = await dbClient.from('order_items').insert(itemsWithOrderId);
          if (itemsErr) {
            // Rollback incomplete order header before throwing so partial orders NEVER persist
            await dbClient.from('orders').delete().eq('id', insertedOrder.id);
            throw new Error(itemsErr.message || 'Failed to save order line items.');
          }

          await enqueueOutboxJobsSafely(dbClient, insertedOrder.id, outboxJobs);
        } catch (fallbackErr: any) {
          // Restore decremented stock cleanly on any failure
          for (const d of decremented) {
            try {
              const { data: cur } = await dbClient
                .from('product_variants')
                .select('stock')
                .eq('id', d.id)
                .single();
              if (cur) {
                await dbClient
                  .from('product_variants')
                  .update({ stock: (Number(cur.stock) || 0) + d.qty, updated_at: new Date().toISOString() })
                  .eq('id', d.id);
              }
            } catch {}
          }
          if (fallbackErr instanceof StockConflictError) {
            return NextResponse.json({ error: fallbackErr.message }, { status: 409 });
          }
          throw fallbackErr;
        }
      }

      revalidatePublicStoreCache([CACHE_TAGS.CATALOG]);
    }

    const order = {
      id: orderId,
      orderNumber: orderPayload.order_number,
      customerType: assignedCustomerType,
      customerName: cleanName,
      customerPhone: cleanPhone,
      customerEmail: customerEmail?.trim() || undefined,
      address: cleanAddress,
      city: cleanCity,
      province: province?.trim() || 'Punjab',
      orderNotes: orderNotes?.trim() || undefined,
      subtotal,
      deliveryFee,
      totalAmount,
      paymentMethod: cleanPaymentMethod,
      paymentReference: paymentReference?.trim() || undefined,
      paymentScreenshotUrl: paymentScreenshotUrl || undefined,
      paymentStatus: defaultPaymentStatus,
      status: 'Pending',
      items: verifiedItems,
      createdAt: committedCreatedAt,
    };

    return NextResponse.json({ success: true, deduplicated, order }, { status: 201 });
  } catch (err: any) {
    if (err instanceof StockConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error('Order API error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to place order. Please verify your items.' },
      { status: 400 }
    );
  }
}

class StockConflictError extends Error {}

function mapDbOrderToClient(o: any) {
  return {
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
    const isAdmin = verifyAdminSession(req);
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get('orderNumber')?.trim();
    const phone = searchParams.get('phone')?.trim();

    let dbClient = supabaseServer;
    try {
      dbClient = createAdminClient();
    } catch {}

    // Unauthenticated visitors cannot list all orders
    if (!isAdmin) {
      if (!orderNumber || !phone || phone.length < 7) {
        return NextResponse.json(
          { error: 'Unauthorized. Admin session required to view order records.' },
          { status: 401 }
        );
      }

      const { data: matchedOrder, error: matchErr } = await dbClient
        .from('orders')
        .select('*, order_items(*)')
        .eq('order_number', orderNumber)
        .eq('customer_phone', phone)
        .maybeSingle();

      if (matchErr || !matchedOrder) {
        return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
      }

      const sanitized = {
        orderNumber: matchedOrder.order_number,
        status: matchedOrder.status,
        customerName: matchedOrder.customer_name,
        city: matchedOrder.city,
        subtotal: Number(matchedOrder.subtotal) || 0,
        deliveryFee: Number(matchedOrder.delivery_fee) || 0,
        totalAmount: Number(matchedOrder.total_amount) || 0,
        paymentMethod: matchedOrder.payment_method,
        paymentStatus: matchedOrder.payment_status,
        createdAt: matchedOrder.created_at,
        items: Array.isArray(matchedOrder.order_items)
          ? matchedOrder.order_items.map((it: any) => ({
              productName: it.deal_name || it.product_name,
              isDealItem: Boolean(it.deal_id),
              dealName: it.deal_name || undefined,
              quality: it.quality,
              sleeve: it.sleeve,
              size: it.size,
              quantity: Number(it.quantity) || 1,
              totalPrice: Number(it.total_price) || 0,
            }))
          : [],
      };

      return NextResponse.json({ success: true, order: sanitized });
    }

    const userId = searchParams.get('userId');
    let query = dbClient
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: orders, error } = await query;
    if (error) {
      console.error('Fetch orders error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      orders: (orders || []).map(mapDbOrderToClient),
    });
  } catch (err: any) {
    console.error('GET orders error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!verifyAdminSession(req)) {
    return NextResponse.json(
      { error: 'Unauthorized. Admin session required.' },
      { status: 401 }
    );
  }
  return NextResponse.json({ error: 'Please use /api/admin/orders for deletions.' }, { status: 400 });
}

export async function PATCH(req: Request) {
  if (!verifyAdminSession(req)) {
    return NextResponse.json(
      { error: 'Unauthorized. Admin session required.' },
      { status: 401 }
    );
  }
  return NextResponse.json({ error: 'Please use /api/admin/orders for order updates.' }, { status: 400 });
}

export async function PUT(req: Request) {
  return PATCH(req);
}
