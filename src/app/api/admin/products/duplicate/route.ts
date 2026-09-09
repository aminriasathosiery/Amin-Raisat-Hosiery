import { NextResponse } from 'next/server';
import { supabaseServer, createAdminClient, isSupabaseConfigured } from '@/lib/supabase';
import { Product } from '@/types';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getDbClient() {
  try {
    return createAdminClient();
  } catch {
    return supabaseServer;
  }
}

import { verifyAdminSession } from '@/lib/auth/adminAuth';

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
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
    const db = getDbClient();
    const { productId } = await req.json();

    if (!productId) {
      return NextResponse.json({ error: 'Original Product ID is required for duplication.' }, { status: 400 });
    }

    // 1. Fetch complete original product with variants and media
    const { data: original, error: origErr } = await db
      .from('products')
      .select('*, product_variants(*), product_media(*)')
      .eq('id', productId)
      .single();

    if (origErr || !original) {
      console.error('Failed to find original product to duplicate:', origErr);
      return NextResponse.json({ error: 'Original product not found.' }, { status: 404 });
    }

    // 2. Generate new unique product ID and slug
    const newProductId = crypto.randomUUID();
    const baseDuplicateSlug = `${original.slug}-copy`;
    let candidateSlug = generateSlug(baseDuplicateSlug);

    // Verify slug uniqueness in database
    let counter = 1;
    while (true) {
      const { data: slugCheck } = await db
        .from('products')
        .select('id')
        .eq('slug', candidateSlug)
        .maybeSingle();

      if (!slugCheck) break; // Unique slug found
      counter++;
      candidateSlug = `${generateSlug(baseDuplicateSlug)}-${counter}`;
    }

    const duplicateName = `${original.name} (Copy)`;

    // 3. Create duplicate product payload
    const duplicatePayload: any = {
      id: newProductId,
      category_id: original.category_id,
      subcategory_id: original.subcategory_id,
      name: duplicateName,
      slug: candidateSlug,
      subtitle: original.subtitle || '',
      description: original.description || '',
      features: original.features || [],
      quality_comparison: original.quality_comparison || {},
      care_instructions: original.care_instructions || [],
      shipping_info: original.shipping_info || '',
      is_published: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (original.short_description !== undefined) {
      duplicatePayload.short_description = original.short_description;
    }
    if (original.video_url !== undefined) {
      duplicatePayload.video_url = original.video_url;
    }
    if (original.size_guide_url !== undefined) {
      duplicatePayload.size_guide_url = original.size_guide_url;
    }
    if (original.is_wholesale_enabled !== undefined) {
      duplicatePayload.is_wholesale_enabled = original.is_wholesale_enabled;
    }
    if (original.wholesale_min_qty !== undefined) {
      duplicatePayload.wholesale_min_qty = original.wholesale_min_qty;
    }

    let { data: insertedProduct, error: prodErr } = await db
      .from('products')
      .insert(duplicatePayload)
      .select()
      .single();

    // If optional columns not present in DB schema, omit and retry
    if (prodErr && (prodErr.code === 'PGRST204' || prodErr.code === '42703' || prodErr.message?.includes('does not exist'))) {
      delete duplicatePayload.short_description;
      delete duplicatePayload.video_url;
      delete duplicatePayload.size_guide_url;
      delete duplicatePayload.is_wholesale_enabled;
      delete duplicatePayload.wholesale_min_qty;

      const retryRes = await db
        .from('products')
        .insert(duplicatePayload)
        .select()
        .single();
      insertedProduct = retryRes.data;
      prodErr = retryRes.error;
    }

    if (prodErr || !insertedProduct) {
      console.error('Failed to insert duplicated product record:', prodErr);
      return NextResponse.json({ error: prodErr?.message || 'Failed to clone product' }, { status: 500 });
    }

    // 4. Duplicate Variants
    const originalVariants = original.product_variants || [];
    const duplicateVariantsPayload = originalVariants.map((v: any) => ({
      id: crypto.randomUUID(),
      product_id: newProductId,
      quality: v.quality,
      sleeve: v.sleeve,
      size: v.size,
      price: v.price,
      sale_price: v.sale_price,
      wholesale_price: v.wholesale_price,
      wholesale_tiers: v.wholesale_tiers,
      stock: v.stock,
      sku: v.sku ? `${v.sku}-COPY` : null,
      is_available: v.is_available ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    let insertedVariants: any[] = [];
    if (duplicateVariantsPayload.length > 0) {
      const { data: vData, error: vErr } = await db
        .from('product_variants')
        .insert(duplicateVariantsPayload)
        .select();

      if (vErr) {
        console.error('Failed to clone product variants:', vErr);
      } else {
        insertedVariants = vData || [];
      }
    }

    // 5. Duplicate Media (including Size Guide if attached in media)
    const originalMedia = original.product_media || [];
    const duplicateMediaPayload = originalMedia.map((m: any) => ({
      id: crypto.randomUUID(),
      product_id: newProductId,
      media_type: m.media_type || 'photo',
      url: m.url,
      alt_text: m.alt_text ? `${m.alt_text} (Copy)` : `${duplicateName}`,
      title: m.title || '',
      display_order: m.display_order || 0,
      variant_quality: m.variant_quality || null,
      variant_sleeve: m.variant_sleeve || null,
      created_at: new Date().toISOString(),
    }));

    let insertedMedia: any[] = [];
    if (duplicateMediaPayload.length > 0) {
      const { data: mData, error: mErr } = await db
        .from('product_media')
        .insert(duplicateMediaPayload)
        .select();

      if (mErr) {
        console.error('Failed to clone product media:', mErr);
      } else {
        insertedMedia = mData || [];
      }
    }

    // Format duplicated product object
    const finalDuplicatedProduct: Product = {
      id: newProductId,
      categoryId: insertedProduct.category_id,
      subcategoryId: insertedProduct.subcategory_id,
      name: duplicateName,
      slug: candidateSlug,
      subtitle: insertedProduct.subtitle || '',
      shortDescription: insertedProduct.short_description || original.short_description || insertedProduct.subtitle || '',
      description: insertedProduct.description || '',
      features: Array.isArray(insertedProduct.features) ? insertedProduct.features : [],
      qualityComparison: insertedProduct.quality_comparison || {},
      careInstructions: Array.isArray(insertedProduct.care_instructions) ? insertedProduct.care_instructions : [],
      shippingInfo: insertedProduct.shipping_info || '',
      returnPolicy: 'Hassle-free exchange within 7 days of delivery for sizing or manufacturing defect.',
      videoUrl: insertedProduct.video_url || original.video_url || undefined,
      sizeGuideUrl: insertedProduct.size_guide_url || original.size_guide_url || undefined,
      isPublished: true,
      isWholesaleEnabled: insertedProduct.is_wholesale_enabled ?? true,
      wholesaleMinQty: Number(insertedProduct.wholesale_min_qty) || 12,
      createdAt: insertedProduct.created_at,
      variants: insertedVariants.map((v: any) => ({
        id: v.id,
        productId: newProductId,
        quality: v.quality,
        sleeve: v.sleeve,
        size: v.size,
        price: Number(v.price) || 0,
        salePrice: v.sale_price ? Number(v.sale_price) : undefined,
        wholesalePrice: v.wholesale_price ? Number(v.wholesale_price) : Math.round((Number(v.price) || 480) * 0.82),
        wholesaleTiers: Array.isArray(v.wholesale_tiers) ? v.wholesale_tiers : undefined,
        stock: Number(v.stock) || 0,
        sku: v.sku || '',
        isAvailable: v.is_available ?? true,
      })),
      media: insertedMedia.map((m: any) => ({
        id: m.id,
        productId: newProductId,
        type: m.media_type || 'photo',
        url: m.url,
        alt: m.alt_text || '',
        title: m.title || '',
        displayOrder: m.display_order || 0,
        variantQuality: m.variant_quality || undefined,
        variantSleeve: m.variant_sleeve || undefined,
      })),
    };

    return NextResponse.json({
      success: true,
      message: 'Product duplicated successfully in Supabase.',
      product: finalDuplicatedProduct,
    }, { status: 201 });
  } catch (err: any) {
    console.error('API /api/admin/products/duplicate error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
