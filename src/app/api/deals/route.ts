import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { Deal } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function mapRowToDeal(row: any): Deal {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    subtitle: row.subtitle || undefined,
    description: row.description || undefined,
    imageUrl: row.image_url || undefined,
    piecesCount: Number(row.pieces_count) || 1,
    originalPrice: Number(row.original_price) || 0,
    discountPercentage: Number(row.discount_percentage) || 0,
    salePrice: Number(row.sale_price) || 0,
    isFreeDelivery: row.is_free_delivery ?? true,
    isActive: row.is_active ?? true,
    isFeatured: row.is_featured ?? false,
    sortOrder: Number(row.sort_order) || 9999,
    badgeText: row.badge_text || undefined,
    createdAt: row.created_at,
  };
}

// GET /api/deals — list all active deals (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const featured = searchParams.get('featured') === 'true';

    let query = supabaseServer
      .from('deals')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (featured) {
      query = query.eq('is_featured', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('GET /api/deals error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ deals: (data || []).map(mapRowToDeal) });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
