import { SupabaseClient } from '@supabase/supabase-js';
import { INITIAL_SITE_SETTINGS } from '@/data/initialData';
import { SiteSettings } from '@/types';
import { normalizeShippingSettings } from '@/lib/delivery';

export function mapDatabaseSettings(siteData: any, shipData: any): SiteSettings {
  const shipping = normalizeShippingSettings(
    shipData
      ? {
          minOrderQty: shipData.min_order_qty,
          maxOrderQty: shipData.max_order_qty,
          baseDeliveryCharge: shipData.base_delivery_charge,
          freeDeliveryThreshold: shipData.free_delivery_threshold,
        }
      : INITIAL_SITE_SETTINGS.shipping
  );

  return {
    ...INITIAL_SITE_SETTINGS,
    brandName: siteData?.brand_name || INITIAL_SITE_SETTINGS.brandName,
    ownerName: siteData?.owner_name || INITIAL_SITE_SETTINGS.ownerName,
    phone: siteData?.phone || INITIAL_SITE_SETTINGS.phone,
    whatsapp: siteData?.whatsapp || INITIAL_SITE_SETTINGS.whatsapp,
    email: siteData?.email || INITIAL_SITE_SETTINGS.email,
    market: siteData?.market || INITIAL_SITE_SETTINGS.market,
    currency: siteData?.currency || INITIAL_SITE_SETTINGS.currency,
    shipping,
    bankDetails: {
      bankName: siteData?.bank_name || INITIAL_SITE_SETTINGS.bankDetails.bankName,
      accountTitle: siteData?.account_title || INITIAL_SITE_SETTINGS.bankDetails.accountTitle,
      accountNumber: siteData?.account_number || INITIAL_SITE_SETTINGS.bankDetails.accountNumber,
      iban: siteData?.iban || INITIAL_SITE_SETTINGS.bankDetails.iban,
      instructions: siteData?.bank_instructions || INITIAL_SITE_SETTINGS.bankDetails.instructions,
    },
    paymentMethods: siteData?.payment_methods || INITIAL_SITE_SETTINGS.paymentMethods,
    announcementStrips:
      Array.isArray(siteData?.announcement_strips) && siteData.announcement_strips.length > 0
        ? siteData.announcement_strips
        : INITIAL_SITE_SETTINGS.announcementStrips,
    isStoreOpen: siteData?.is_store_open ?? true,
    isCodEnabled: siteData?.payment_methods?.cod?.enabled ?? siteData?.is_cod_enabled ?? true,
    isBankTransferEnabled:
      siteData?.payment_methods?.bank_transfer?.enabled ?? siteData?.is_bank_transfer_enabled ?? true,
    isAnnouncementEnabled: siteData?.is_announcement_enabled ?? true,
    announcementText: siteData?.announcement_text || INITIAL_SITE_SETTINGS.announcementText,
    exchangeReturnDays:
      siteData?.exchange_return_days !== undefined && siteData?.exchange_return_days !== null
        ? Number(siteData.exchange_return_days)
        : 7,
    isWhatsAppFloatingEnabled: siteData?.is_whatsapp_floating_enabled ?? true,
  };
}

/**
 * Fetches latest authoritative site_settings & shipping_settings ordered by updated_at DESC.
 */
export async function fetchAuthoritativeSettings(db: SupabaseClient): Promise<SiteSettings> {
  const [siteRes, shipRes] = await Promise.all([
    db
      .from('site_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from('shipping_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return mapDatabaseSettings(siteRes.data, shipRes.data);
}

