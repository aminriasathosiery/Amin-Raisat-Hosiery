import { NextResponse } from 'next/server';
import { supabaseServer, createAdminClient, isSupabaseConfigured } from '@/lib/supabase';
import { Product } from '@/types';
import { resolveVariantPricing } from '@/lib/pricing';
import { revalidatePublicStoreCache, CACHE_TAGS } from '@/lib/catalogServer';
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
      colors: Array.isArray(original.colors) ? original.colors : [],
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
    if (original.cover_image !== undefined) {
      duplicatePayload.cover_image = original.cover_image;
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
      delete duplicatePayload.colors;
      delete duplicatePayload.cover_image;

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

    // 4. Duplicate Variants with guaranteed unique SKUs
    const originalVariants = (original.product_variants || []).filter((v: any) => v.is_archived !== true);
    const { data: allExistingSkus } = await db.from('product_variants').select('sku').not('sku', 'is', null);
    const usedSkus = new Set<string>(
      (allExistingSkus || []).map((r: any) => (r.sku || '').trim().toUpperCase()).filter(Boolean)
    );
    const shortCopyTag = newProductId.slice(0, 4).toUpperCase();

    const duplicateVariantsPayload = originalVariants.map((v: any, idx: number) => {
      const pricing = resolveVariantPricing(v);
      let candidateSku = v.sku ? `${v.sku.replace(/-COPY.*$/i, '')}-${shortCopyTag}` : `ARH-${shortCopyTag}-${idx + 1}`;
      let counterSuffix = 2;
      while (usedSkus.has(candidateSku.toUpperCase())) {
        candidateSku = `${v.sku || 'ARH'}-${shortCopyTag}-${counterSuffix}`;
        counterSuffix++;
      }
      usedSkus.add(candidateSku.toUpperCase());

      return {
        id: crypto.randomUUID(),
        product_id: newProductId,
        quality: v.quality,
        sleeve: v.sleeve,
        size: v.size,
        color: v.color || null,
        color_hex: v.color_hex || null,
        price: pricing.originalPrice,
        sale_price: pricing.isOnSale ? pricing.salePrice : null,
        discount_percentage: pricing.discountPercentage,
        stock: v.stock,
        sku: candidateSku,
        is_available: v.is_available ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    let insertedVariants: any[] = [];
    if (duplicateVariantsPayload.length > 0) {
      let { data: vData, error: vErr } = await db
        .from('product_variants')
        .insert(duplicateVariantsPayload)
        .select();

      if (vErr && (vErr.message?.includes('color') || vErr.message?.includes('discount_percentage') || vErr.code === '42703')) {
        const fallbackPayload = duplicateVariantsPayload.map(({ color: _c, color_hex: _ch, discount_percentage: _dp, ...rest }: any) => rest);
        const retryRes = await db
          .from('product_variants')
          .insert(fallbackPayload)
          .select();
        vData = retryRes.data;
        vErr = retryRes.error;
      }

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
      color: m.color || null,
      created_at: new Date().toISOString(),
    }));

    let insertedMedia: any[] = [];
    if (duplicateMediaPayload.length > 0) {
      let { data: mData, error: mErr } = await db
        .from('product_media')
        .insert(duplicateMediaPayload)
        .select();

      if (mErr && (mErr.message?.includes('color') || mErr.code === '42703')) {
        const fallbackMedia = duplicateMediaPayload.map(({ color: _c, ...rest }: any) => rest);
        const retryM = await db.from('product_media').insert(fallbackMedia).select();
        mData = retryM.data;
        mErr = retryM.error;
      }

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
      videoUrl: insertedProduct.video_url || original.video_url || originalMedia.find((m: any) => m.media_type === 'video')?.url || undefined,
      sizeGuideUrl: insertedProduct.size_guide_url || original.size_guide_url || originalMedia.find((m: any) => m.media_type === 'size_guide')?.url || undefined,
      coverImage: insertedProduct.cover_image || original.cover_image || undefined,
      isPublished: true,
      createdAt: insertedProduct.created_at,
      colors: Array.isArray(insertedProduct.colors) ? insertedProduct.colors : (Array.isArray(original.colors) ? original.colors : []),
      variants: insertedVariants.map((v: any) => {
        const pricing = resolveVariantPricing(v);
        return {
          id: v.id,
          productId: newProductId,
          quality: v.quality,
          sleeve: v.sleeve,
          size: v.size,
          color: v.color || undefined,
          colorHex: v.color_hex || undefined,
          price: pricing.originalPrice,
          discountPercentage: pricing.discountPercentage,
          salePrice: pricing.isOnSale ? pricing.salePrice : pricing.originalPrice,
          stock: Number(v.stock) || 0,
          sku: v.sku || '',
          isAvailable: v.is_available ?? true,
        };
      }),
      media: insertedMedia
        .filter((m: any) => m.media_type !== 'size_guide' && m.media_type !== 'video')
        .map((m: any) => ({
          id: m.id,
          productId: newProductId,
          type: m.media_type || 'photo',
          url: m.url,
          alt: m.alt_text || '',
          title: m.title || '',
          displayOrder: m.display_order || 0,
          variantQuality: m.variant_quality || undefined,
          variantSleeve: m.variant_sleeve || undefined,
          color: m.color || undefined,
        })),
    };

    revalidatePublicStoreCache([CACHE_TAGS.CATALOG, CACHE_TAGS.CATEGORIES]);
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
