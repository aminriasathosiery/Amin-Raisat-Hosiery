import { NextResponse } from 'next/server';
import { supabaseServer, createAdminClient, isSupabaseConfigured } from '@/lib/supabase';
import { Category, Subcategory } from '@/types';
import { INITIAL_CATEGORIES, INITIAL_SUBCATEGORIES } from '@/data/initialData';
import { verifyAdminSession } from '@/lib/auth/adminAuth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const isUuid = (id?: string): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export async function GET(req: Request) {
  if (!verifyAdminSession(req)) {
    return NextResponse.json(
      { error: 'Unauthorized. Admin session required.' },
      { status: 401 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ categories: INITIAL_CATEGORIES, subcategories: INITIAL_SUBCATEGORIES });
  }

  try {
    let dbClient = supabaseServer;
    try {
      dbClient = createAdminClient();
    } catch {}

    const [{ data: cats, error: cErr }, { data: subcats, error: sErr }] = await Promise.all([
      dbClient.from('categories').select('*').order('display_order', { ascending: true }),
      dbClient.from('subcategories').select('*').order('display_order', { ascending: true }),
    ]);

    if (cErr) {
      console.error('API /api/admin/categories GET category error:', cErr);
    }
    if (sErr) {
      console.error('API /api/admin/categories GET subcategory error:', sErr);
    }

    const formattedCats: Category[] = (cats && cats.length > 0 ? cats : INITIAL_CATEGORIES).map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description || '',
      image: c.image_url,
      isActive: c.is_active ?? true,
      displayOrder: c.display_order || 0,
    }));

    const formattedSubcats: Subcategory[] = (subcats && subcats.length > 0 ? subcats : INITIAL_SUBCATEGORIES).map((s: any) => ({
      id: s.id,
      categoryId: s.category_id,
      name: s.name,
      slug: s.slug,
      description: s.description || '',
      image: s.image_url,
      isActive: s.is_active ?? true,
      displayOrder: s.display_order || 0,
    }));

    return NextResponse.json({ categories: formattedCats, subcategories: formattedSubcats });
  } catch (err: any) {
    console.error('API /api/admin/categories GET exception:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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
    return NextResponse.json({ error: 'Supabase Database is not configured.' }, { status: 500 });
  }

  try {
    const adminDb = createAdminClient();
    const body = await req.json();
    const { type, data } = body;

    if (type === 'category') {
      const cat: Category = data;
      if (!cat.name?.trim()) {
        return NextResponse.json({ error: 'Category name is required.' }, { status: 400 });
      }

      const catId = isUuid(cat.id) ? cat.id : crypto.randomUUID();
      const slug = cat.slug
        ? cat.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
        : cat.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const payload = {
        id: catId,
        name: cat.name.trim(),
        slug: slug,
        description: cat.description || '',
        image_url: cat.image || null,
        is_active: cat.isActive ?? true,
        display_order: Number(cat.displayOrder) || 0,
        updated_at: new Date().toISOString(),
      };

      const { data: savedCat, error } = await adminDb
        .from('categories')
        .upsert(payload)
        .select()
        .single();

      if (error || !savedCat) {
        console.error('FULL SUPABASE CATEGORY SAVE ERROR:', error);
        return NextResponse.json({ error: error?.message || 'Failed to save category in DB' }, { status: 400 });
      }

      return NextResponse.json({ success: true, category: savedCat });
    }

    if (type === 'subcategory') {
      const sub: Subcategory = data;
      if (!sub.name?.trim()) {
        return NextResponse.json({ error: 'Subcategory name is required.' }, { status: 400 });
      }

      const subId = isUuid(sub.id) ? sub.id : crypto.randomUUID();
      const slug = sub.slug
        ? sub.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
        : sub.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');

      // Ensure parent category ID is valid UUID
      let targetCatId = sub.categoryId;
      if (!isUuid(targetCatId)) {
        const { data: catRecord } = await adminDb
          .from('categories')
          .select('id')
          .or(`slug.eq.${sub.categoryId},id.eq.${sub.categoryId}`)
          .limit(1)
          .single();
        if (catRecord?.id) {
          targetCatId = catRecord.id;
        }
      }

      const payload = {
        id: subId,
        category_id: targetCatId,
        name: sub.name.trim(),
        slug: slug,
        description: sub.description || '',
        image_url: sub.image || null,
        is_active: sub.isActive ?? true,
        display_order: Number(sub.displayOrder) || 0,
        updated_at: new Date().toISOString(),
      };

      const { data: savedSub, error } = await adminDb
        .from('subcategories')
        .upsert(payload)
        .select()
        .single();

      if (error || !savedSub) {
        console.error('FULL SUPABASE SUBCATEGORY SAVE ERROR:', error);
        return NextResponse.json({ error: error?.message || 'Failed to save subcategory in DB' }, { status: 400 });
      }

      return NextResponse.json({ success: true, subcategory: savedSub });
    }

    return NextResponse.json({ error: 'Invalid operation type.' }, { status: 400 });
  } catch (err: any) {
    console.error('API /api/admin/categories POST exception:', err);
    return NextResponse.json({ error: err?.message || 'Failed to save category to database' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!verifyAdminSession(req)) {
    return NextResponse.json(
      { error: 'Unauthorized. Admin session required.' },
      { status: 401 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });
  }

  try {
    const adminDb = createAdminClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type') || 'category';

    if (!id) {
      return NextResponse.json({ error: 'ID parameter is required for deletion.' }, { status: 400 });
    }

    const table = type === 'subcategory' ? 'subcategories' : 'categories';
    const { error } = await adminDb.from(table).delete().eq('id', id);

    if (error) {
      console.error(`FULL SUPABASE ${table} DELETE ERROR:`, error);
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `${type} deleted successfully.` });
  } catch (err: any) {
    console.error('API /api/admin/categories DELETE exception:', err);
    return NextResponse.json({ error: 'Failed to delete record from database.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  return POST(req);
}

export async function PATCH(req: Request) {
  return POST(req);
}
