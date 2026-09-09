import { NextResponse } from 'next/server';
import { supabaseServer, createAdminClient, isSupabaseConfigured } from '@/lib/supabase';
import { HeroSlide } from '@/types';
import { INITIAL_HERO_SLIDES } from '@/data/initialData';
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
    return NextResponse.json({ slides: INITIAL_HERO_SLIDES });
  }

  try {
    let dbClient = supabaseServer;
    try {
      dbClient = createAdminClient();
    } catch {}

    const { data: slides, error } = await dbClient
      .from('hero_slides')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('API /api/admin/hero GET error:', error);
      return NextResponse.json({ slides: INITIAL_HERO_SLIDES });
    }

    const formatted: HeroSlide[] = (slides && slides.length > 0 ? slides : INITIAL_HERO_SLIDES).map((s: any) => ({
      id: s.id,
      deviceType: s.device_type || 'desktop',
      desktopImage: s.desktop_image,
      mobileImage: s.mobile_image || s.desktop_image,
      title: s.title || undefined,
      subtitle: s.subtitle || undefined,
      link: s.link || '/shop',
      buttonText: s.button_text || 'Shop Now',
      displayOrder: s.display_order || 0,
      isActive: s.is_active ?? true,
    }));

    return NextResponse.json({ slides: formatted });
  } catch (err: any) {
    console.error('API /api/admin/hero GET exception:', err);
    return NextResponse.json({ slides: INITIAL_HERO_SLIDES });
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
    const slide: HeroSlide = await req.json();

    if (!slide.desktopImage) {
      return NextResponse.json({ error: 'Desktop image is required.' }, { status: 400 });
    }

    const slideId = isUuid(slide.id) ? slide.id : crypto.randomUUID();
    const payload = {
      id: slideId,
      device_type: slide.deviceType || 'desktop',
      desktop_image: slide.desktopImage,
      mobile_image: slide.mobileImage || slide.desktopImage,
      title: slide.title || null,
      subtitle: slide.subtitle || null,
      link: slide.link || slide.buttonLink || '/shop',
      button_text: slide.buttonText || 'Shop Now',
      display_order: Number(slide.displayOrder) || 0,
      is_active: slide.isActive ?? true,
      updated_at: new Date().toISOString(),
    };

    const { data: savedSlide, error } = await adminDb
      .from('hero_slides')
      .upsert(payload)
      .select()
      .single();

    if (error || !savedSlide) {
      console.error('FULL SUPABASE HERO SAVE ERROR:', error);
      return NextResponse.json({ error: error?.message || 'Failed to save hero slide in DB' }, { status: 400 });
    }

    return NextResponse.json({ success: true, slide: savedSlide });
  } catch (err: any) {
    console.error('API /api/admin/hero POST exception:', err);
    return NextResponse.json({ error: err?.message || 'Failed to save hero slide' }, { status: 500 });
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

    if (!id) {
      return NextResponse.json({ error: 'Hero Slide ID is required for deletion.' }, { status: 400 });
    }

    const { error } = await adminDb.from('hero_slides').delete().eq('id', id);

    if (error) {
      console.error('FULL SUPABASE HERO DELETE ERROR:', error);
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Hero slide deleted successfully.' });
  } catch (err: any) {
    console.error('API /api/admin/hero DELETE exception:', err);
    return NextResponse.json({ error: 'Failed to delete hero slide.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  return POST(req);
}

export async function PATCH(req: Request) {
  return POST(req);
}
