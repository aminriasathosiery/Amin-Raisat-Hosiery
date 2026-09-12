import { NextResponse } from 'next/server';
import { supabaseServer, createAdminClient, isSupabaseConfigured } from '@/lib/supabase';
import { INITIAL_SHIPPING_SETTINGS, INITIAL_PRODUCTS } from '@/data/initialData';

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
    } = body;

    const cleanName = customerName?.trim();
    const cleanPhone = customerPhone?.trim();
    const cleanAddress = address?.trim();
    const cleanCity = city?.trim();

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

    // 1. Fetch live shipping settings from Supabase if configured
    let minOrderQty = 1;
    let baseDeliveryCharge = INITIAL_SHIPPING_SETTINGS.baseDeliveryCharge;
    let freeDeliveryThreshold = INITIAL_SHIPPING_SETTINGS.freeDeliveryThreshold;

    if (isSupabaseConfigured()) {
      try {
        const { data: shipData } = await supabaseServer
          .from('shipping_settings')
          .select('*')
          .limit(1)
          .single();

        if (shipData) {
          baseDeliveryCharge = Number(shipData.base_delivery_charge) || baseDeliveryCharge;
          freeDeliveryThreshold = Number(shipData.free_delivery_threshold) || freeDeliveryThreshold;
        }
      } catch (err) {
        console.warn('Could not fetch server shipping settings, using fallback', err);
      }
    }

    // 2. Fetch all products and variants from DB to calculate authoritative pricing
    let dbVariants: any[] = [];
    if (isSupabaseConfigured()) {
      try {
        const { data: variantsData } = await supabaseServer
          .from('product_variants')
          .select('*');
        if (variantsData && variantsData.length > 0) {
          dbVariants = variantsData;
        }
      } catch (err) {
        console.warn('Could not fetch variants from Supabase:', err);
      }
    }

    // Fallback dictionary for initial products
    const initialVariantsMap = new Map<string, any>();
    INITIAL_PRODUCTS.forEach((p) => {
      p.variants.forEach((v) => {
        initialVariantsMap.set(v.id, { ...v, productName: p.name });
        const compositeKey = `${p.id}_${v.quality}_${v.sleeve}_${v.size}`;
        initialVariantsMap.set(compositeKey, { ...v, productName: p.name });
      });
    });

    // 3. Authoritative verification of all items & compute subtotal
    const totalItemCount = items.reduce(
      (sum: number, it: any) => sum + Math.max(1, Number(it.quantity) || 1),
      0
    );

    if (totalItemCount < 1) {
      return NextResponse.json(
        { error: 'Please add at least 1 item to place an order.' },
        { status: 400 }
      );
    }

    let subtotal = 0;

    const verifiedItems = items.map((clientItem: any) => {
      const qty = Math.max(1, Number(clientItem.quantity) || 1);

      // Find variant in DB or in initial data
      let variant = dbVariants.find(
        (v) =>
          v.id === clientItem.variantId ||
          (v.product_id === clientItem.productId &&
            v.quality === clientItem.quality &&
            v.sleeve === clientItem.sleeve &&
            v.size === clientItem.size)
      );

      let unitPrice = 0;
      let productName = clientItem.productName || 'Hosiery Product';

      if (variant) {
        unitPrice = Number(variant.sale_price) || Number(variant.price) || 480;
      } else {
        const initialVar =
          initialVariantsMap.get(clientItem.variantId) ||
          initialVariantsMap.get(
            `${clientItem.productId}_${clientItem.quality}_${clientItem.sleeve}_${clientItem.size}`
          );
        if (initialVar) {
          unitPrice = Number(initialVar.salePrice) || Number(initialVar.price) || 480;
          productName = initialVar.productName || productName;
        } else {
          unitPrice = Number(clientItem.regularPrice || clientItem.unitPrice || clientItem.price) || 480;
        }
      }

      const itemTotal = unitPrice * qty;
      subtotal += itemTotal;

      return {
        productId: clientItem.productId || null,
        variantId: variant?.id || clientItem.variantId || null,
        productName,
        quality: clientItem.quality || variant?.quality || 'High Quality',
        sleeve: clientItem.sleeve || variant?.sleeve || 'Sleeveless',
        size: clientItem.size || variant?.size || 'L',
        unitPrice,
        quantity: qty,
        totalPrice: itemTotal,
        image: clientItem.image || null,
      };
    });

    // Determine final delivery fee: Free delivery if total pieces >= freeDeliveryThreshold (default 3)
    const deliveryFee = totalItemCount >= freeDeliveryThreshold ? 0 : baseDeliveryCharge;
    const totalAmount = subtotal + deliveryFee;
    const orderNumber = `ARH-${Date.now().toString().slice(-6)}`;
    let orderId = `ord-${Date.now()}`;
    const assignedCustomerType = customerType || (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId) ? 'REGISTERED' : 'GUEST');
    const defaultPaymentStatus = paymentMethod === 'cod' ? 'COD_PENDING' : 'PENDING_VERIFICATION';

    // 4. Save Order to Supabase Database
    if (isSupabaseConfigured()) {
      try {
        let dbClient = supabaseServer;
        try {
          dbClient = createAdminClient();
        } catch {
          // Fallback to supabaseServer if service key not configured
        }

        const orderPayload: any = {
          order_number: orderNumber,
          user_id: userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
            ? userId
            : null,
          customer_type: assignedCustomerType,
          customer_name: cleanName,
          customer_phone: cleanPhone,
          customer_email: customerEmail?.trim() || null,
          address: cleanAddress,
          city: cleanCity,
          province: province?.trim() || 'Punjab',
          order_notes: orderNotes?.trim() || null,
          subtotal: subtotal,
          delivery_fee: deliveryFee,
          total_amount: totalAmount,
          payment_method: paymentMethod || 'cod',
          payment_reference: paymentReference || null,
          payment_screenshot_url: paymentScreenshotUrl || null,
          payment_status: defaultPaymentStatus,
          status: 'Pending',
        };

        let { data: insertedOrder, error: ordErr } = await dbClient
          .from('orders')
          .insert(orderPayload)
          .select()
          .single();

        // If insert fails due to missing optional columns (e.g. schema migration pending), strip them and retry
        if (ordErr) {
          console.warn('Initial order insert failed, attempting clean fallback:', ordErr.message);
          const fallbackPayload: any = {
            order_number: orderNumber,
            customer_name: cleanName,
            customer_phone: cleanPhone,
            customer_email: customerEmail?.trim() || null,
            address: cleanAddress,
            city: cleanCity,
            province: province?.trim() || 'Punjab',
            order_notes: orderNotes?.trim() || null,
            subtotal: subtotal,
            delivery_fee: deliveryFee,
            total_amount: totalAmount,
            payment_method: paymentMethod || 'cod',
            payment_reference: paymentReference || null,
            status: 'Pending',
          };

          const retryRes = await dbClient
            .from('orders')
            .insert(fallbackPayload)
            .select()
            .single();
          insertedOrder = retryRes.data;
          ordErr = retryRes.error;
          if (ordErr) {
            console.error('Fallback order insert failed:', ordErr);
          }
        }

        if (!ordErr && insertedOrder) {
          orderId = insertedOrder.id;

          const isUuid = (id?: string | null) =>
            typeof id === 'string' &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

          const itemsPayload = verifiedItems.map((it: any) => ({
            order_id: insertedOrder.id,
            product_id: isUuid(it.productId) ? it.productId : null,
            variant_id: isUuid(it.variantId) ? it.variantId : null,
            product_name: it.productName,
            quality: it.quality,
            sleeve: it.sleeve,
            size: it.size,
            unit_price: it.unitPrice,
            quantity: it.quantity,
            total_price: it.totalPrice,
            image_url: it.image || null,
          }));

          const { error: itemsErr } = await dbClient.from('order_items').insert(itemsPayload);
          if (itemsErr) {
            console.error('FULL SUPABASE ORDER ITEMS INSERT ERROR:', itemsErr);
          }

          // Decrement stock in product_variants safely
          for (const item of verifiedItems) {
            if (item.variantId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.variantId)) {
              try {
                const targetVar = dbVariants.find((v) => v.id === item.variantId);
                if (targetVar) {
                  const newStock = Math.max(0, (targetVar.stock || 0) - item.quantity);
                  await dbClient
                    .from('product_variants')
                    .update({ stock: newStock, updated_at: new Date().toISOString() })
                    .eq('id', item.variantId);
                }
              } catch (stockErr) {
                console.warn('Stock decrement error:', stockErr);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Supabase server order insertion error', err);
      }
    }

    const order = {
      id: orderId,
      orderNumber,
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
      paymentMethod: paymentMethod || 'cod',
      paymentReference: paymentReference || undefined,
      paymentScreenshotUrl: paymentScreenshotUrl || undefined,
      paymentStatus: defaultPaymentStatus,
      status: 'Pending',
      items: verifiedItems,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (err: any) {
    console.error('Order API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { verifyAdminSession } from '@/lib/auth/adminAuth';

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

      // Guest order tracking: allow lookup of single order matching both orderNumber and phone
      const { data: matchedOrder, error: matchErr } = await dbClient
        .from('orders')
        .select('*, order_items(*)')
        .eq('order_number', orderNumber)
        .eq('customer_phone', phone)
        .maybeSingle();

      if (matchErr || !matchedOrder) {
        return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
      }

      // Sanitize: strip payment screenshot and private details
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
              productName: it.product_name,
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

    // Authenticated Admin flow
    const userId = searchParams.get('userId');
    let query = dbClient
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: orders, error } = await query;
    if (error) {
      console.error('Fetch orders error:', error);
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
