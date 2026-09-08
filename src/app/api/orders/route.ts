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
      isWholesale: clientIsWholesale,
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

    // 1. Fetch live settings from Supabase if configured
    let minOrderQty = INITIAL_SHIPPING_SETTINGS.minOrderQty;
    let baseDeliveryCharge = INITIAL_SHIPPING_SETTINGS.baseDeliveryCharge;
    let freeDeliveryThreshold = INITIAL_SHIPPING_SETTINGS.freeDeliveryThreshold;
    let wholesaleMinQty = 12;

    if (isSupabaseConfigured()) {
      try {
        const { data: shipData } = await supabaseServer
          .from('shipping_settings')
          .select('*')
          .limit(1)
          .single();

        if (shipData) {
          minOrderQty = Number(shipData.min_order_qty) || minOrderQty;
          baseDeliveryCharge = Number(shipData.base_delivery_charge) || baseDeliveryCharge;
          freeDeliveryThreshold = Number(shipData.free_delivery_threshold) || freeDeliveryThreshold;
        }

        const { data: siteData } = await supabaseServer
          .from('site_settings')
          .select('wholesale_min_qty')
          .limit(1)
          .single();
        if (siteData?.wholesale_min_qty) {
          wholesaleMinQty = Number(siteData.wholesale_min_qty) || wholesaleMinQty;
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
    const hasWholesale =
      Boolean(clientIsWholesale) ||
      items.some((it: any) => Boolean(it.isWholesale)) ||
      totalItemCount >= wholesaleMinQty;

    let subtotal = 0;
    let totalSavings = 0;

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
      let retailPrice = 0;
      let wholesalePrice = 0;
      let productName = clientItem.productName || 'Hosiery Product';

      if (variant) {
        retailPrice = Number(variant.sale_price) || Number(variant.price) || 480;
        wholesalePrice =
          variant.wholesale_price !== undefined &&
          variant.wholesale_price !== null &&
          !isNaN(Number(variant.wholesale_price))
            ? Number(variant.wholesale_price)
            : Math.round(retailPrice * 0.82);
      } else {
        const initialVar =
          initialVariantsMap.get(clientItem.variantId) ||
          initialVariantsMap.get(
            `${clientItem.productId}_${clientItem.quality}_${clientItem.sleeve}_${clientItem.size}`
          );
        if (initialVar) {
          retailPrice = Number(initialVar.salePrice) || Number(initialVar.price) || 480;
          wholesalePrice =
            initialVar.wholesalePrice !== undefined &&
            initialVar.wholesalePrice !== null &&
            !isNaN(Number(initialVar.wholesalePrice))
              ? Number(initialVar.wholesalePrice)
              : Math.round(retailPrice * 0.82);
          productName = initialVar.productName || productName;
        } else {
          retailPrice = Number(clientItem.regularPrice || clientItem.unitPrice) || 480;
          wholesalePrice =
            clientItem.wholesalePrice !== undefined &&
            clientItem.wholesalePrice !== null &&
            !isNaN(Number(clientItem.wholesalePrice))
              ? Number(clientItem.wholesalePrice)
              : Math.round(retailPrice * 0.82);
        }
      }

      // Check wholesale criteria for this item
      const isItemWholesale = Boolean(clientItem.isWholesale) || hasWholesale;
      unitPrice = isItemWholesale ? wholesalePrice : retailPrice;

      const itemTotal = unitPrice * qty;
      const normalTotal = retailPrice * qty;
      subtotal += itemTotal;
      if (normalTotal > itemTotal) {
        totalSavings += normalTotal - itemTotal;
      }

      return {
        productId: clientItem.productId || null,
        variantId: variant?.id || clientItem.variantId || null,
        productName,
        quality: clientItem.quality || variant?.quality || 'High Quality',
        sleeve: clientItem.sleeve || variant?.sleeve || 'Sleeveless',
        size: clientItem.size || variant?.size || 'L',
        unitPrice,
        regularPrice: retailPrice,
        wholesalePrice,
        isWholesale: isItemWholesale,
        quantity: qty,
        totalPrice: itemTotal,
        image: clientItem.image || null,
      };
    });

    // Enforce MOQ check
    if (hasWholesale && totalItemCount < wholesaleMinQty) {
      return NextResponse.json(
        {
          error: `Wholesale order quantity requirement not met. Minimum ${wholesaleMinQty} pieces required for wholesale pricing.`,
        },
        { status: 400 }
      );
    }

    if (!hasWholesale && totalItemCount < 1) {
      return NextResponse.json(
        {
          error: 'Please add at least 1 item to place an order.',
        },
        { status: 400 }
      );
    }

    // Determine final delivery fee
    let deliveryFee = baseDeliveryCharge;
    if (totalItemCount >= freeDeliveryThreshold || hasWholesale) {
      deliveryFee = 0;
    }

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
          is_wholesale: hasWholesale,
          wholesale_discount: totalSavings,
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
      isWholesale: hasWholesale,
      wholesaleDiscount: totalSavings > 0 ? totalSavings : undefined,
      items: verifiedItems,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (err: any) {
    console.error('Order API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    let dbClient = supabaseServer;
    try {
      dbClient = createAdminClient();
    } catch {}

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
      paymentScreenshotUrl: o.payment_screenshot_url || undefined,
      paymentStatus: o.payment_status || (o.payment_method === 'cod' ? 'COD_PENDING' : 'PENDING_VERIFICATION'),
      paymentVerifiedAt: o.payment_verified_at || undefined,
      paymentVerifiedBy: o.payment_verified_by || undefined,
      paymentRejectionReason: o.payment_rejection_reason || undefined,
      status: o.status || 'Pending',
      isWholesale: o.is_wholesale ?? false,
      wholesaleDiscount: o.wholesale_discount ? Number(o.wholesale_discount) : undefined,
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
            regularPrice: it.regular_price ? Number(it.regular_price) : undefined,
            wholesalePrice: it.wholesale_price ? Number(it.wholesale_price) : undefined,
            isWholesale: it.is_wholesale ?? false,
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
