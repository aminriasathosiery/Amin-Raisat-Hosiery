import { NextResponse } from 'next/server';
import { supabaseServer, createAdminClient, isSupabaseConfigured } from '@/lib/supabase';
import { INITIAL_SITE_SETTINGS } from '@/data/initialData';
import { SiteSettings } from '@/types';
import { fetchAuthoritativeSettings } from '@/lib/settingsServer';
import { normalizeShippingSettings } from '@/lib/delivery';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CANONICAL_SHIPPING_ID = 'a0000000-0000-0000-0000-000000000001';
const CANONICAL_SITE_ID = 'b0000000-0000-0000-0000-000000000001';

import { verifyAdminSession } from '@/lib/auth/adminAuth';

function getDbClient() {
  try {
    return createAdminClient();
  } catch {
    return supabaseServer;
  }
}

export async function GET(req: Request) {
  if (!verifyAdminSession(req)) {
    return NextResponse.json(
      { error: 'Unauthorized. Admin session required.' },
      { status: 401 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ settings: INITIAL_SITE_SETTINGS });
  }

  try {
    const db = getDbClient();
    const mergedSettings = await fetchAuthoritativeSettings(db);

    return NextResponse.json(
      { settings: mergedSettings },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('API /api/admin/settings GET error:', err);
    return NextResponse.json({ settings: INITIAL_SITE_SETTINGS });
  }
}

export async function POST(req: Request) {
  if (!verifyAdminSession(req)) {
    return NextResponse.json(
      { error: 'Unauthorized. Admin session required.' },
      { status: 401 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
  }

  try {
    const db = getDbClient();
    const body: SiteSettings = await req.json();

    if (!body) {
      return NextResponse.json({ error: 'Invalid settings body' }, { status: 400 });
    }

    // 1. Update Shipping Settings using normalized bounds (preserves explicit 0 for disabled threshold or free standard charge)
    const normalizedShipping = normalizeShippingSettings(body.shipping);
    const minQty = normalizedShipping.minOrderQty;
    const maxQty = normalizedShipping.maxOrderQty;
    const baseFee = normalizedShipping.baseDeliveryCharge;
    const threshold = normalizedShipping.freeDeliveryThreshold;

    // Get all existing shipping_settings rows
    const { data: existingShipRows } = await db.from('shipping_settings').select('id');
    const targetShipId = existingShipRows && existingShipRows.length > 0
      ? existingShipRows[0].id
      : CANONICAL_SHIPPING_ID;

    const { error: shipErr } = await db
      .from('shipping_settings')
      .upsert({
        id: targetShipId,
        min_order_qty: minQty,
        max_order_qty: maxQty,
        base_delivery_charge: baseFee,
        free_delivery_threshold: threshold,
        updated_at: new Date().toISOString(),
      });

    if (shipErr) {
      console.error('API /api/admin/settings shipping_settings update error:', shipErr);
      return NextResponse.json(
        { error: `Failed to save delivery settings: ${shipErr.message}` },
        { status: 400 }
      );
    }

    // If there were duplicate shipping_settings rows, update them as well or clean up
    if (existingShipRows && existingShipRows.length > 1) {
      for (let i = 1; i < existingShipRows.length; i++) {
        await db
          .from('shipping_settings')
          .update({
            min_order_qty: minQty,
            max_order_qty: maxQty,
            base_delivery_charge: baseFee,
            free_delivery_threshold: threshold,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingShipRows[i].id);
      }
    }

    // 2. Update Site Settings
    const { data: existingSiteRows } = await db.from('site_settings').select('id');
    const targetSiteId = existingSiteRows && existingSiteRows.length > 0
      ? existingSiteRows[0].id
      : CANONICAL_SITE_ID;

    const sitePayload: any = {
      id: targetSiteId,
      brand_name: body.brandName?.trim() || 'Amin Raisat Hosiery',
      owner_name: body.ownerName?.trim() || 'Muhammad Amin',
      phone: body.phone?.trim() || '03088666075',
      whatsapp: body.whatsapp?.trim() || '03088666075',
      email: body.email?.trim() || 'info@aminhosiery.com',
      market: body.market?.trim() || 'Pakistan',
      currency: body.currency?.trim() || 'PKR',
      bank_name: body.bankDetails?.bankName || 'Meezan Bank Ltd.',
      account_title: body.bankDetails?.accountTitle || 'Muhammad Amin',
      account_number: body.bankDetails?.accountNumber || '01010101010101',
      iban: body.bankDetails?.iban || 'PK00MEZN0000000000000000',
      bank_instructions: body.bankDetails?.instructions || '',
      is_store_open: body.isStoreOpen ?? true,
      is_announcement_enabled: body.isAnnouncementEnabled ?? true,
      is_whatsapp_floating_enabled: body.isWhatsAppFloatingEnabled ?? true,
      exchange_return_days: body.exchangeReturnDays ? Number(body.exchangeReturnDays) : 7,
      announcement_text: body.announcementText || '',
      updated_at: new Date().toISOString(),
    };

    if (body.announcementStrips) {
      sitePayload.announcement_strips = body.announcementStrips;
    }
    if (body.paymentMethods) {
      sitePayload.payment_methods = body.paymentMethods;
    }

    let { error: siteErr } = await db.from('site_settings').upsert(sitePayload);

    // If any column doesn't exist yet (PGRST204), fallback to core confirmed columns
    if (siteErr && siteErr.code === 'PGRST204') {
      const corePayload: any = {
        id: targetSiteId,
        brand_name: sitePayload.brand_name,
        owner_name: sitePayload.owner_name,
        phone: sitePayload.phone,
        whatsapp: sitePayload.whatsapp,
        email: sitePayload.email,
        market: sitePayload.market,
        currency: sitePayload.currency,
        bank_name: sitePayload.bank_name,
        account_title: sitePayload.account_title,
        account_number: sitePayload.account_number,
        iban: sitePayload.iban,
        is_store_open: sitePayload.is_store_open,
        announcement_text: sitePayload.announcement_text,
        updated_at: sitePayload.updated_at,
      };
      const retry = await db.from('site_settings').upsert(corePayload);
      siteErr = retry.error;
    }

    if (siteErr) {
      console.error('API /api/admin/settings site_settings update error:', siteErr);
    }

    // If duplicate site_settings rows exist, update them too
    if (existingSiteRows && existingSiteRows.length > 1) {
      for (let i = 1; i < existingSiteRows.length; i++) {
        await db
          .from('site_settings')
          .update(sitePayload)
          .eq('id', existingSiteRows[i].id);
      }
    }

    // Construct returned settings
    const updatedSettings: SiteSettings = {
      ...body,
      shipping: {
        minOrderQty: minQty,
        maxOrderQty: maxQty,
        baseDeliveryCharge: baseFee,
        freeDeliveryThreshold: threshold,
      },
    };

    return NextResponse.json({ success: true, settings: updatedSettings });
  } catch (err: any) {
    console.error('API /api/admin/settings POST error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  return POST(req);
}

export async function PATCH(req: Request) {
  return POST(req);
}
