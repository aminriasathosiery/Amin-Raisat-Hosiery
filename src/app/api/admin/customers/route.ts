import { NextResponse } from 'next/server';
import { supabaseServer, isSupabaseConfigured } from '@/lib/supabase';
import { verifyAdminSession } from '@/lib/auth/adminAuth';

export async function GET(req: Request) {
  if (!verifyAdminSession(req)) {
    return NextResponse.json(
      { error: 'Unauthorized. Admin session required.' },
      { status: 401 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ profiles: [], addresses: [] });
  }

  try {
    const [profRes, addrRes] = await Promise.all([
      supabaseServer
        .from('customer_profiles')
        .select('*')
        .order('created_at', { ascending: false }),
      supabaseServer
        .from('customer_addresses')
        .select('*')
        .order('is_default', { ascending: false }),
    ]);

    const profiles = (profRes.data || []).map((p: any) => ({
      id: p.id,
      fullName: p.full_name,
      phone: p.phone || undefined,
      email: p.email || undefined,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    const addresses = (addrRes.data || []).map((a: any) => ({
      id: a.id,
      userId: a.user_id,
      addressType: a.address_type || 'shipping',
      fullName: a.full_name,
      phone: a.phone,
      address: a.address,
      city: a.city,
      province: a.province || 'Punjab',
      postalCode: a.postal_code || undefined,
      isDefault: a.is_default || false,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    }));

    return NextResponse.json({ profiles, addresses });
  } catch (err: any) {
    console.error('API /api/admin/customers error:', err);
    return NextResponse.json({ error: 'Failed to fetch customer data' }, { status: 500 });
  }
}
