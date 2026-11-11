import { NextResponse } from 'next/server';
import { INITIAL_SITE_SETTINGS } from '@/data/initialData';
import { getCachedPublicSettings } from '@/lib/catalogServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Public read-only endpoint for authoritative shipping rules and store settings.
 * Served via Next.js unstable_cache with instant revalidateTag invalidation whenever
 * /api/admin/settings updates shipping or store rules.
 */
export async function GET() {
  const headers = {
    'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60',
  };

  try {
    const settings = await getCachedPublicSettings();
    return NextResponse.json({ settings }, { headers });
  } catch (err) {
    console.warn('API /api/settings GET fallback notice:', err);
    return NextResponse.json({ settings: INITIAL_SITE_SETTINGS }, { headers });
  }
}
