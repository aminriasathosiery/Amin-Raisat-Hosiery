import { NextResponse } from 'next/server';
import { supabaseServer, createAdminClient, isSupabaseConfigured } from '@/lib/supabase';
import { INITIAL_SHIPPING_SETTINGS } from '@/data/initialData';
import { resolveVariantPricing } from '@/lib/pricing';

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
    let dbDeals: any[] = [];
    if (isSupabaseConfigured()) {
      try {
        const { data: variantsData } = await supabaseServer
          .from('product_variants')
          .select('*, products(id, name, slug)');
        if (variantsData && variantsData.length > 0) {
          dbVariants = variantsData;
        }
      } catch (err) {
        console.warn('Could not fetch variants from Supabase:', err);
      }

      try {
        const { data: dealsData } = await supabaseServer
          .from('deals')
          .select('*')
          .eq('is_active', true);
        if (dealsData && dealsData.length > 0) {
          dbDeals = dealsData;
        }
      } catch (err) {
        console.warn('Could not fetch deals from Supabase:', err);
      }
    }

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

      // Check if this is a deal item
      if (clientItem.dealId) {
        // Deal item validation: must match an active deal in the database
        const deal = dbDeals.find((d) => d.id === clientItem.dealId && d.is_active !== false);
        if (!deal) {
          throw new Error(`The deal "${clientItem.dealName || clientItem.dealId}" is no longer active or does not exist.`);
        }

        const originalPrice = Number(deal.original_price) || 0;
        const discountPercentage = Number(deal.discount_percentage) || 0;
        const salePrice = Number(deal.sale_price) || originalPrice;
        const isFreeDelivery = Boolean(deal.is_free_delivery);

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
          isFreeDelivery,
          quantity: qty,
          totalPrice: itemTotal,
          image: deal.image_url || clientItem.image || null,
        };
      }

      // Product item validation against authoritative database variants
      const variant = dbVariants.find(
        (v) =>
          v.id === clientItem.variantId ||
          (v.product_id === clientItem.productId &&
            v.quality === clientItem.quality &&
            v.sleeve === clientItem.sleeve &&
            v.size === clientItem.size)
      );

      if (!variant) {
        throw new Error(
          `The item "${clientItem.productName || 'Selected Item'}" is currently unavailable or does not exist in our catalog.`
        );
      }

      const productName = variant.products?.name || clientItem.productName || 'Hosiery Product';
      const pricing = resolveVariantPricing(variant);

      const unitPrice = pricing.salePrice;
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
        originalPrice: pricing.originalPrice,
        discountPercentage: pricing.discountPercentage,
        quantity: qty,
        totalPrice: itemTotal,
        image: clientItem.image || null,
      };
    });

    // Determine final delivery fee: Free delivery if any VERIFIED deal grants free delivery OR total pieces >= freeDeliveryThreshold.
    // SECURITY: Use verifiedItems (server-validated) NOT raw client items to prevent tampering.
    const hasFreeDeliveryDeal = verifiedItems.some((it: any) => it.dealId && it.isFreeDelivery);
    const deliveryFee = hasFreeDeliveryDeal || totalItemCount >= freeDeliveryThreshold ? 0 : baseDeliveryCharge;
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

          const itemsPayload = verifiedItems.map((it: any) => {
            if (it.dealId) {
              // Deal item payload aligned with migration v10
              return {
                order_id: insertedOrder.id,
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
            } else {
              // Product item payload
              return {
                order_id: insertedOrder.id,
                is_deal_item: false,
                product_id: isUuid(it.productId) ? it.productId : null,
                variant_id: isUuid(it.variantId) ? it.variantId : null,
                product_name: it.productName,
                quality: it.quality,
                sleeve: it.sleeve,
                size: it.size,
                unit_price: it.unitPrice,
                original_price: it.originalPrice,
                discount_percentage: it.discountPercentage,
                quantity: it.quantity,
                total_price: it.totalPrice,
                image_url: it.image || null,
              };
            }
          });

          let { error: itemsErr } = await dbClient.from('order_items').insert(itemsPayload);
          if (itemsErr && (itemsErr.message?.includes('deal_') || itemsErr.message?.includes('original_price') || itemsErr.message?.includes('is_deal_item') || itemsErr.code === '42703')) {
            // Fallback: strip optional deal fields that might not exist in schema if migration v10 is pending
            const fallbackItemsPayload = itemsPayload.map(({ deal_id, deal_name, deal_slug, deal_pieces_count, deal_original_price, deal_discount_percentage, deal_is_free_delivery, is_deal_item, original_price, discount_percentage, ...rest }) => rest);
            const retryRes = await dbClient.from('order_items').insert(fallbackItemsPayload);
            itemsErr = retryRes.error;
          }
          if (itemsErr) {
            console.error('FULL SUPABASE ORDER ITEMS INSERT ERROR:', itemsErr);
          }

          // Decrement stock in product_variants safely (only for product items)
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
    return NextResponse.json(
      { error: err?.message || 'Failed to place order. Please verify your items.' },
      { status: 400 }
    );
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
