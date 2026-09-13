import { supabaseServer } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Deal } from '@/types';

export function mapRowToDeal(row: any): Deal {
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

export async function fetchActiveDeals(featuredOnly = false): Promise<Deal[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    let query = supabaseServer
      .from('deals')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (featuredOnly) {
      query = query.eq('is_featured', true);
    }

    const { data, error } = await query;
    if (error) {
      console.error('fetchActiveDeals error:', error);
      return [];
    }

    return (data || []).map(mapRowToDeal);
  } catch (err) {
    console.error('fetchActiveDeals exception:', err);
    return [];
  }
}

export async function fetchDealBySlug(slug: string): Promise<Deal | null> {
  if (!isSupabaseConfigured() || !slug) {
    return null;
  }

  try {
    const { data, error } = await supabaseServer
      .from('deals')
      .select('*')
      .eq('slug', slug.trim())
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    return mapRowToDeal(data);
  } catch (err) {
    console.error('fetchDealBySlug exception:', err);
    return null;
  }
}
