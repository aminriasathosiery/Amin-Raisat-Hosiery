import { NextResponse } from 'next/server';
import { supabaseServer, isSupabaseConfigured } from '@/lib/supabase';
import { INITIAL_SITE_SETTINGS } from '@/data/initialData';
import { fetchAuthoritativeSettings } from '@/lib/settingsServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Public read-only endpoint for authoritative shipping rules and store settings.
 * Ensures storefront delivery banners, cart, and checkout always read live DB rules
 * with zero caching delay.
 */
export async function GET() {
  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  };

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ settings: INITIAL_SITE_SETTINGS }, { headers });
  }

  try {
    const settings = await fetchAuthoritativeSettings(supabaseServer);
    return NextResponse.json({ settings }, { headers });
  } catch (err) {
    console.warn('API /api/settings GET fallback notice:', err);
    return NextResponse.json({ settings: INITIAL_SITE_SETTINGS }, { headers });
  }
}

