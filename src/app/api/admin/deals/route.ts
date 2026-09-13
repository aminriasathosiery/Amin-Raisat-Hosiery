import { NextResponse } from 'next/server';
import { supabaseServer, createAdminClient, isSupabaseConfigured } from '@/lib/supabase';
import { verifyAdminSession } from '@/lib/auth/adminAuth';
import { calculateSalePrice } from '@/lib/pricing';
import { Deal } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getDbClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || serviceKey.length < 20 || serviceKey.includes('PASTE_') || serviceKey.startsWith('sb_publishable_')) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin deals operations. Please configure SUPABASE_SERVICE_ROLE_KEY in your server environment.');
  }
  return createAdminClient();
}

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

// GET /api/admin/deals — list all deals (admin only)
export async function GET(req: Request) {
  if (!verifyAdminSession(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ deals: [] });
  }

  try {
    const db = getDbClient();
    const { data, error } = await db
      .from('deals')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('GET /api/admin/deals error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ deals: (data || []).map(mapRowToDeal) });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/admin/deals — create or update a deal
export async function POST(req: Request) {
  if (!verifyAdminSession(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured.' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const db = getDbClient();

    const rawName = (body.name || '').trim();
    if (!rawName) {
      return NextResponse.json({ error: 'Deal name is required.' }, { status: 400 });
    }

    const originalPrice = Math.max(0, Number(body.originalPrice) || 0);
    const discountPercentage = Math.min(99, Math.max(0, Number(body.discountPercentage) || 0));
    const salePrice = discountPercentage > 0
      ? calculateSalePrice(originalPrice, discountPercentage)
      : originalPrice;

    // Auto-generate slug if not provided
    let slug = (body.slug || '').trim();
    if (!slug) {
      slug = rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }

    const isUpdate = body.id && /^[0-9a-f-]{36}$/i.test(body.id);

    const payload: any = {
      name: rawName,
      slug,
      subtitle: (body.subtitle || '').trim() || null,
      description: (body.description || '').trim() || null,
      image_url: (body.imageUrl || '').trim() || null,
      pieces_count: Math.max(1, Number(body.piecesCount) || 1),
      original_price: originalPrice,
      discount_percentage: discountPercentage,
      sale_price: salePrice,
      is_free_delivery: body.isFreeDelivery !== false,
      is_active: body.isActive !== false,
      is_featured: body.isFeatured === true,
      sort_order: Number(body.sortOrder) || 9999,
      badge_text: (body.badgeText || '').trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (isUpdate) {
      payload.id = body.id;
    }

    const { data, error } = await db
      .from('deals')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('POST /api/admin/deals upsert error:', error);
      if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('deals_slug_key')) {
        return NextResponse.json(
          { error: 'A deal with this slug or name already exists. Please use a unique name or slug.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deal: mapRowToDeal(data) });
  } catch (err: any) {
    if (err?.message?.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error('POST /api/admin/deals exception:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/admin/deals?id=xxx — delete a deal
export async function DELETE(req: Request) {
  if (!verifyAdminSession(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured.' }, { status: 500 });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Deal ID required.' }, { status: 400 });
    }

    const db = getDbClient();
    const { error } = await db.from('deals').delete().eq('id', id);

    if (error) {
      console.error('DELETE /api/admin/deals error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.message?.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error('DELETE /api/admin/deals exception:', err);
  }
}

