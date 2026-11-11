import { NextRequest, NextResponse } from 'next/server';
import { getCachedActiveDeals, getCachedFeaturedDeals } from '@/lib/catalogServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/deals — list all active deals (cached with instant tag invalidation on admin edits)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const featured = searchParams.get('featured') === 'true';

    const deals = featured
      ? await getCachedFeaturedDeals()
      : await getCachedActiveDeals();

    return NextResponse.json(
      { deals },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
