import { NextResponse } from 'next/server';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase';
import { verifyAdminSession } from '@/lib/auth/adminAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// POST /api/admin/products/reorder — update product sort orders
export async function POST(req: Request) {
  if (!verifyAdminSession(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured.' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { products } = body;

    if (!Array.isArray(products)) {
      return NextResponse.json({ error: 'Invalid request: products array required' }, { status: 400 });
    }

    let db;
    try {
      db = createAdminClient();
    } catch (keyErr: any) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY is required for admin database operations. Please configure it in your server environment.' },
        { status: 503 }
      );
    }

    // Update each product's sort_order
    const updates = products.map((p: { id: string; sortOrder: number }) => 
      db.from('products').update({ sort_order: p.sortOrder }).eq('id', p.id)
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('POST /api/admin/products/reorder error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
