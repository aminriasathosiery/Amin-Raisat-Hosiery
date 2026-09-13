import { NextResponse } from 'next/server';
import { supabaseServer, isSupabaseConfigured } from '@/lib/supabase';
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

// GET /api/deals/[slug] — get a single active deal by slug (public)
export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    const { data, error } = await supabaseServer
      .from('deals')
      .select('*')
      .eq('slug', params.slug)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('GET /api/deals/[slug] error:', error);
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    return NextResponse.json({ deal: mapRowToDeal(data) });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
