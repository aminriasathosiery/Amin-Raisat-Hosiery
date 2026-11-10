import { NextResponse } from 'next/server';
import { supabaseServer, createAdminClient, isSupabaseConfigured } from '@/lib/supabase';
import { Product, ProductVariant, ProductMedia } from '@/types';
import { resolveVariantPricing } from '@/lib/pricing';
import {
  getVariantComboKey,
  validateVariantCombinations,
  ensureUniqueVariantSkus,
  normalizeVariantText,
} from '@/lib/variants';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const isUuid = (id?: string): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

const MEDIA_STORAGE_MAP: Record<string, string> = {
  '/images/products/sleevless high.jpeg': 'https://pqjpgexmupcuuqfzchhc.supabase.co/storage/v1/object/public/product-media/original_products/sleevless_high.jpeg',
  '/images/products/full sleeve high.jpeg': 'https://pqjpgexmupcuuqfzchhc.supabase.co/storage/v1/object/public/product-media/original_products/full_sleeve_high.jpeg',
  '/images/products/sleevless low.jpeg': 'https://pqjpgexmupcuuqfzchhc.supabase.co/storage/v1/object/public/product-media/original_products/sleevless_low.jpeg',
};



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

export async function GET(req: Request) {
  if (!verifyAdminSession(req)) {
    return NextResponse.json(
      { error: 'Unauthorized. Admin session required.' },
      { status: 401 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ products: [] });
  }

  try {
    const dbClient = getDbClient();

    const { data: prods, error } = await dbClient
      .from('products')
      .select('*, product_variants(*), product_media(*)')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('API /api/admin/products GET error:', error);
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    const formattedProducts: Product[] = (prods || []).map((p: any) => {
      const mediaList = Array.isArray(p.product_media) ? p.product_media : [];
      const videoMedia = mediaList.find((m: any) => m.media_type === 'video');
      const sizeGuideMedia = mediaList.find((m: any) => m.media_type === 'size_guide');

      return {
        id: p.id,
        categoryId: p.category_id,
        subcategoryId: p.subcategory_id,
        name: p.name,
        slug: p.slug,
        subtitle: p.subtitle || '',
        shortDescription: p.short_description || p.subtitle || '',
        description: p.description || '',
        features: Array.isArray(p.features) ? p.features : [],
        qualityComparison: p.quality_comparison || {},
        careInstructions: Array.isArray(p.care_instructions) ? p.care_instructions : [],
        shippingInfo: p.shipping_info || '',
        returnPolicy: 'Hassle-free exchange within 7 days of delivery for sizing or manufacturing defect.',
        videoUrl: p.video_url || videoMedia?.url || undefined,
        sizeGuideUrl: p.size_guide_url || sizeGuideMedia?.url || undefined,
        isPublished: p.is_published ?? true,
        sortOrder: Number(p.sort_order) || 9999,
        createdAt: p.created_at,
        colors: Array.isArray(p.colors) ? p.colors : [],
        variants: Array.isArray(p.product_variants)
          ? p.product_variants
              .filter((v: any) => v.is_archived !== true)
              .map((v: any) => {
              const pricing = resolveVariantPricing(v);
              return {
                id: v.id,
                productId: v.product_id,
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
            })
          : [],
        media: mediaList
          .filter((m: any) => m.media_type !== 'size_guide' && m.media_type !== 'video')
          .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
          .map((m: any) => ({
            id: m.id,
            productId: m.product_id,
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
    });

    return NextResponse.json({ products: formattedProducts });
  } catch (err: any) {
    console.error('API /api/admin/products GET exception:', err);
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
    const adminDb = getDbClient();
    const body: Product = await req.json();

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'Product name is required.' }, { status: 400 });
    }

    const isExisting = isUuid(body.id);
    // Mandatory Size Guide validation: must have sizeGuideUrl on creation
    if (!isExisting && (!body.sizeGuideUrl || !body.sizeGuideUrl.trim())) {
      return NextResponse.json({ error: 'Size Guide image is required.' }, { status: 400 });
    }

    // Validate color names upfront (case-insensitive uniqueness)
    const normalizedColors = Array.isArray(body.colors)
      ? body.colors.map((c) => ({ ...c, name: normalizeVariantText(c.name) })).filter((c) => c.name.length > 0)
      : [];
    const seenColorNames = new Set<string>();
    for (const col of normalizedColors) {
      const key = col.name.toLowerCase();
      if (seenColorNames.has(key)) {
        return NextResponse.json(
          { error: `Duplicate color "${col.name}" found. Each product color must have a unique name.` },
          { status: 400 }
        );
      }
      seenColorNames.add(key);
    }

    // Validate variant combinations upfront BEFORE any DB mutation
    const rawVariants = Array.isArray(body.variants) ? body.variants : [];
    const normalizedIncomingVariants = rawVariants.map((v) => ({
      ...v,
      quality: normalizeVariantText(v.quality || 'High Quality') || 'High Quality',
      sleeve: normalizeVariantText(v.sleeve || 'Sleeveless') || 'Sleeveless',
      size: normalizeVariantText(v.size || 'L') || 'L',
      color: normalizeVariantText(v.color) || undefined,
    }));

    const variantValidation = validateVariantCombinations(normalizedIncomingVariants);
    if (!variantValidation.valid) {
      return NextResponse.json(
        { error: 'Duplicate color and size combination. Please check your variants.' },
        { status: 400 }
      );
    }

    const hasColorVariants =
      normalizedColors.length > 0 || normalizedIncomingVariants.some((v) => Boolean(v.color));

    // 1. Resolve authoritative Product ID
    let productId = isExisting ? body.id : crypto.randomUUID();

    // 2. Slug Auto-Generation & Validation with Uniqueness Check
    const baseSlugText = body.slug?.trim() ? body.slug.trim() : body.name.trim();
    const baseSlug = generateSlug(baseSlugText);
    let autoSlug = baseSlug;

    let slugCounter = 1;
    while (true) {
      const { data: existingProductBySlug } = await adminDb
        .from('products')
        .select('id')
        .eq('slug', autoSlug)
        .neq('id', productId)
        .maybeSingle();

      if (!existingProductBySlug) {
        break; // Unique slug found
      }
      slugCounter++;
      autoSlug = `${baseSlug}-${slugCounter}`;
    }

    // 2. Normalize Category ID: Ensure valid UUID or find by slug
    let targetCatId: string | null = null;
    if (isUuid(body.categoryId)) {
      targetCatId = body.categoryId;
    } else if (body.categoryId) {
      const cleanSlug = body.categoryId.replace(/^cat-/, '');
      const { data: catData } = await adminDb
        .from('categories')
        .select('id')
        .or(`slug.eq.${body.categoryId},slug.eq.${cleanSlug}`)
        .limit(1)
        .maybeSingle();
      if (catData?.id) {
        targetCatId = catData.id;
      }
    }

    // 3. Normalize Subcategory ID: Ensure valid UUID or find by slug
    let targetSubcatId: string | null = null;
    if (body.subcategoryId && isUuid(body.subcategoryId)) {
      targetSubcatId = body.subcategoryId;
    } else if (body.subcategoryId) {
      const cleanSubSlug = body.subcategoryId.replace(/^sub-men-|^sub-women-|^sub-kids-|^sub-/, '');
      const { data: subData } = await adminDb
        .from('subcategories')
        .select('id')
        .or(`slug.eq.${body.subcategoryId},slug.eq.${cleanSubSlug}`)
        .limit(1)
        .maybeSingle();
      if (subData?.id) {
        targetSubcatId = subData.id;
      }
    }

    const productPayload: any = {
      id: productId,
      category_id: targetCatId,
      subcategory_id: targetSubcatId,
      name: body.name.trim(),
      slug: autoSlug,
      subtitle: body.subtitle?.trim() || '',
      description: body.description?.trim() || '',
      features: body.features || [],
      quality_comparison: body.qualityComparison || {},
      care_instructions: body.careInstructions || [],
      shipping_info: body.shippingInfo || '',
      is_published: body.isPublished ?? true,
      colors: normalizedColors,
      updated_at: new Date().toISOString(),
    };

    if (body.shortDescription !== undefined) {
      productPayload.short_description = body.shortDescription.trim();
    }
    if (body.videoUrl !== undefined) {
      productPayload.video_url = body.videoUrl?.trim() || null;
    } else {
      productPayload.video_url = null;
    }
    if (body.sizeGuideUrl !== undefined) {
      productPayload.size_guide_url = body.sizeGuideUrl.trim();
    }

    let savedProd: any = null;
    let prodErr: any = null;

    const res1 = await adminDb
      .from('products')
      .upsert(productPayload)
      .select()
      .single();

    savedProd = res1.data;
    prodErr = res1.error;

    if (
      prodErr &&
      (prodErr.code === 'PGRST204' ||
        prodErr.code === '42703' ||
        prodErr.message?.includes('does not exist') ||
        prodErr.message?.includes('colors'))
    ) {
      if (hasColorVariants && (prodErr.message?.includes('colors') || prodErr.message?.includes('product_variants'))) {
        return NextResponse.json(
          {
            error:
              'Database color variant schema migration is required before saving color variants. Please run supabase/migration_v12_atomic_variants_and_delivery.sql in Supabase SQL Editor. No existing variants were modified.',
          },
          { status: 400 }
        );
      }

      delete productPayload.short_description;
      delete productPayload.video_url;
      delete productPayload.size_guide_url;
      delete productPayload.colors;

      const res2 = await adminDb
        .from('products')
        .upsert(productPayload)
        .select()
        .single();
      savedProd = res2.data;
      prodErr = res2.error;
    }

    if (prodErr || !savedProd) {
      console.error('FULL SUPABASE PRODUCT INSERT ERROR:', prodErr);
      return NextResponse.json(
        {
          error: `Unable to save product details: ${prodErr?.message || 'Unknown database error'}`,
        },
        { status: 400 }
      );
    }

    const confirmedProdId = savedProd.id;

    // Fetch existing variants first (NEVER blindly delete before validating/matching!)
    const { data: existingVarsData, error: existingVarsErr } = await adminDb
      .from('product_variants')
      .select('*')
      .eq('product_id', confirmedProdId);

    if (existingVarsErr) {
      return NextResponse.json(
        { error: `Failed to inspect existing product variants: ${existingVarsErr.message}` },
        { status: 400 }
      );
    }

    const existingVars = existingVarsData || [];
    const existingByCombo = new Map<string, any>();
    for (const ev of existingVars) {
      existingByCombo.set(getVariantComboKey(ev), ev);
    }

    // Fetch external SKUs to ensure newly created variants have unique SKUs across the catalog
    const externalSkus = new Set<string>();
    try {
      const { data: otherSkus } = await adminDb
        .from('product_variants')
        .select('sku')
        .neq('product_id', confirmedProdId)
        .not('sku', 'is', null);
      for (const row of otherSkus || []) {
        if (row.sku && row.sku.trim()) {
          externalSkus.add(row.sku.trim().toUpperCase());
        }
      }
    } catch {}

    // Pre-assign unique SKUs (keep existing product variant SKUs intact unless duplicate inside same product)
    const prodPrefix =
      body.name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 4) || 'ARH';

    // Only enforce external SKU collision check on genuinely new variants
    const existingComboKeys = new Set(existingByCombo.keys());
    const newOnlyExternalCheck = new Set<string>();
    const preparedWithSkus = ensureUniqueVariantSkus(
      normalizedIncomingVariants.map((v) => {
        const comboKey = getVariantComboKey(v);
        const isMatchedExisting = existingComboKeys.has(comboKey);
        let sku = (v.sku || '').trim();
        if (!isMatchedExisting && sku && externalSkus.has(sku.toUpperCase())) {
          // Ensure genuinely new variant SKU does not collide with another product
          let candidate = `${sku}-${prodPrefix}`.slice(0, 40);
          let n = 2;
          while (externalSkus.has(candidate.toUpperCase()) || newOnlyExternalCheck.has(candidate.toUpperCase())) {
            candidate = `${sku}-${n}`;
            n++;
          }
          newOnlyExternalCheck.add(candidate.toUpperCase());
          sku = candidate;
        }
        return { ...v, sku };
      }),
      prodPrefix
    );

    const variantsPayload = preparedWithSkus.map((v) => {
      const pricing = resolveVariantPricing(v);
      const comboKey = getVariantComboKey(v);
      const existingMatch = existingByCombo.get(comboKey);
      return {
        id: existingMatch?.id || (isUuid(v.id) ? v.id : crypto.randomUUID()),
        product_id: confirmedProdId,
        quality: v.quality,
        sleeve: v.sleeve,
        size: v.size,
        color: v.color || null,
        color_hex: v.colorHex || null,
        price: pricing.originalPrice,
        sale_price: pricing.isOnSale ? pricing.salePrice : null,
        discount_percentage: pricing.discountPercentage,
        stock: Math.max(0, Number(v.stock) || 0),
        sku: v.sku || '',
        is_available: v.isAvailable ?? true,
        updated_at: new Date().toISOString(),
      };
    });

    let savedVariants: any[] = [];
    if (variantsPayload.length > 0) {
      // First attempt atomic PostgreSQL transaction via RPC if deployed
      const { data: rpcVars, error: rpcErr } = await adminDb.rpc('sync_product_variants_atomic', {
        p_product_id: confirmedProdId,
        p_variants: variantsPayload,
      });

      const rpcUnavailable =
        rpcErr &&
        (rpcErr.code === 'PGRST202' ||
          rpcErr.code === '42883' ||
          rpcErr.message?.includes('Could not find the function') ||
          rpcErr.message?.includes('does not exist'));

      if (!rpcErr && Array.isArray(rpcVars)) {
        savedVariants = rpcVars;
      } else if (rpcErr && !rpcUnavailable) {
        console.error('FULL SUPABASE ATOMIC VARIANT SYNC ERROR:', rpcErr);
        const isDuplicate =
          rpcErr.code === '23505' ||
          rpcErr.message?.toLowerCase().includes('duplicate') ||
          rpcErr.message?.includes('unique_variant');
        return NextResponse.json(
          {
            error: isDuplicate
              ? 'Duplicate color and size combination. Please check your variants.'
              : `Unable to save variants: ${rpcErr.message}`,
          },
          { status: 400 }
        );
      } else {
        // Safe Idempotent TypeScript Fallback (No destructive delete-all before upsert!)
        const matchedExistingIds = new Set<string>();
        const toUpdate: any[] = [];
        const toInsert: any[] = [];

        for (const row of variantsPayload) {
          const comboKey = getVariantComboKey(row);
          const existingMatch = existingByCombo.get(comboKey);
          if (existingMatch) {
            matchedExistingIds.add(existingMatch.id);
            toUpdate.push({
              ...row,
              id: existingMatch.id,
            });
          } else {
            // Avoid colliding with an unremoved existing row ID
            const safeId = existingVars.some((ev) => ev.id === row.id) ? crypto.randomUUID() : row.id;
            toInsert.push({ ...row, id: safeId });
          }
        }

        const removedIds = existingVars
          .filter((ev) => !matchedExistingIds.has(ev.id))
          .map((ev) => ev.id);

        // 1. Update matched existing variants in-place (preserving exact variant IDs & order_items refs)
        for (const upd of toUpdate) {
          let { data: uData, error: uErr } = await adminDb
            .from('product_variants')
            .update({
              quality: upd.quality,
              sleeve: upd.sleeve,
              size: upd.size,
              color: upd.color,
              color_hex: upd.color_hex,
              price: upd.price,
              sale_price: upd.sale_price,
              discount_percentage: upd.discount_percentage,
              stock: upd.stock,
              sku: upd.sku,
              is_available: upd.is_available,
              updated_at: upd.updated_at,
            })
            .eq('id', upd.id)
            .select()
            .single();

          if (
            uErr &&
            !hasColorVariants &&
            (uErr.code === '42703' || uErr.code === 'PGRST204' || uErr.message?.includes('color'))
          ) {
            const { color: _c, color_hex: _ch, ...restUpd } = upd;
            const retryUpd = await adminDb
              .from('product_variants')
              .update({
                quality: restUpd.quality,
                sleeve: restUpd.sleeve,
                size: restUpd.size,
                price: restUpd.price,
                sale_price: restUpd.sale_price,
                discount_percentage: restUpd.discount_percentage,
                stock: restUpd.stock,
                sku: restUpd.sku,
                is_available: restUpd.is_available,
                updated_at: restUpd.updated_at,
              })
              .eq('id', upd.id)
              .select()
              .single();
            uData = retryUpd.data;
            uErr = retryUpd.error;
          }

          if (uErr) {
            console.error('Variant update error:', uErr);
            const missingColorSchema =
              hasColorVariants && (uErr.code === '42703' || uErr.code === 'PGRST204' || uErr.message?.includes('color'));
            return NextResponse.json(
              {
                error: missingColorSchema
                  ? 'Database color variant columns are missing. Please run supabase/migration_v12_atomic_variants_and_delivery.sql in Supabase SQL Editor.'
                  : 'Unable to update product variants. Duplicate color and size combinations are not allowed.',
              },
              { status: 400 }
            );
          }
          if (uData) savedVariants.push(uData);
        }

        // 2. Safely handle removed variants: archive if referenced by historical orders, delete if unreferenced
        if (removedIds.length > 0) {
          let referencedSet = new Set<string>();
          try {
            const { data: refRows } = await adminDb
              .from('order_items')
              .select('variant_id')
              .in('variant_id', removedIds);
            for (const r of refRows || []) {
              if (r.variant_id) referencedSet.add(r.variant_id);
            }
          } catch {}

          const referencedRemoved = removedIds.filter((id) => referencedSet.has(id));
          const unreferencedRemoved = removedIds.filter((id) => !referencedSet.has(id));

          if (referencedRemoved.length > 0) {
            await adminDb
              .from('product_variants')
              .update({
                is_available: false,
                stock: 0,
                updated_at: new Date().toISOString(),
              })
              .in('id', referencedRemoved);
          }

          if (unreferencedRemoved.length > 0) {
            await adminDb.from('product_variants').delete().in('id', unreferencedRemoved);
          }
        }

        // 3. Insert genuinely new combinations
        if (toInsert.length > 0) {
          let { data: insertedVars, error: insErr } = await adminDb
            .from('product_variants')
            .insert(toInsert)
            .select();

          if (
            insErr &&
            !hasColorVariants &&
            (insErr.code === '42703' || insErr.code === 'PGRST204' || insErr.message?.includes('color'))
          ) {
            const fallbackIns = toInsert.map(({ color: _c, color_hex: _ch, ...rest }) => rest);
            const retryIns = await adminDb.from('product_variants').insert(fallbackIns).select();
            insertedVars = retryIns.data;
            insErr = retryIns.error;
          }

          if (insErr) {
            console.error('FULL SUPABASE VARIANT INSERT ERROR:', insErr);
            const missingColorSchema =
              hasColorVariants && (insErr.code === '42703' || insErr.code === 'PGRST204' || insErr.message?.includes('color'));
            const isDuplicate =
              insErr.code === '23505' ||
              insErr.message?.toLowerCase().includes('duplicate') ||
              insErr.message?.includes('unique_variant');

            return NextResponse.json(
              {
                error: missingColorSchema
                  ? 'Database color variant columns are missing. Please run supabase/migration_v12_atomic_variants_and_delivery.sql in Supabase SQL Editor before saving color variants.'
                  : isDuplicate
                  ? 'Duplicate color and size combination. Please check your variants.'
                  : `Unable to save variants: ${insErr.message}`,
              },
              { status: 400 }
            );
          }
          if (insertedVars) savedVariants.push(...insertedVars);
        }
      }
    }

    // 2. Manage Media atomically
    await adminDb.from('product_media').delete().eq('product_id', confirmedProdId);

    let mediaPayload = (body.media || [])
      .filter((m) => m.type !== 'video' && m.type !== 'size_guide')
      .map((m, idx) => ({
        id: isUuid(m.id) ? m.id : crypto.randomUUID(),
        product_id: confirmedProdId,
        media_type: m.type || 'photo',
        url: m.url,
        alt_text: m.alt || `${body.name} photo`,
        title: m.title || '',
        display_order: m.displayOrder ?? idx + 1,
        variant_quality: m.variantQuality || null,
        variant_sleeve: m.variantSleeve || null,
        color: m.color || null,
      }));

    // Attach Video URL into media
    if (body.videoUrl && body.videoUrl.trim()) {
      mediaPayload.push({
        id: crypto.randomUUID(),
        product_id: confirmedProdId,
        media_type: 'video',
        url: body.videoUrl.trim(),
        alt_text: `${body.name} Video Demo`,
        title: 'Video Demo',
        display_order: 98,
        variant_quality: null,
        variant_sleeve: null,
        color: null,
      });
    }

    // Attach Size Guide image into media
    if (body.sizeGuideUrl && body.sizeGuideUrl.trim()) {
      mediaPayload.push({
        id: crypto.randomUUID(),
        product_id: confirmedProdId,
        media_type: 'size_guide',
        url: body.sizeGuideUrl.trim(),
        alt_text: `${body.name} Size Guide`,
        title: 'Size Guide',
        display_order: 99,
        variant_quality: null,
        variant_sleeve: null,
        color: null,
      });
    }

    let savedMedia: any[] = [];
    if (mediaPayload.length > 0) {
      let { data: insertedMedia, error: mediaErr } = await adminDb
        .from('product_media')
        .insert(mediaPayload)
        .select();

      if (mediaErr && (mediaErr.message?.includes('color') || mediaErr.code === '42703')) {
        const fallbackMedia = mediaPayload.map(({ color, ...rest }) => rest);
        const retryRes = await adminDb.from('product_media').insert(fallbackMedia).select();
        insertedMedia = retryRes.data;
        mediaErr = retryRes.error;
      }

      if (mediaErr) {
        console.error('FULL SUPABASE MEDIA INSERT ERROR:', mediaErr);
        return NextResponse.json(
          {
            error: `Database Media Reference Save Failed: ${mediaErr.message}`,
            code: mediaErr.code,
            details: mediaErr.details,
            hint: mediaErr.hint,
          },
          { status: 400 }
        );
      }
      savedMedia = insertedMedia || [];
    }

    const finalProduct: Product = {
      id: savedProd.id,
      categoryId: savedProd.category_id,
      subcategoryId: savedProd.subcategory_id,
      name: savedProd.name,
      slug: savedProd.slug,
      subtitle: savedProd.subtitle || '',
      shortDescription: savedProd.short_description || body.shortDescription || savedProd.subtitle || '',
      description: savedProd.description || '',
      features: savedProd.features || [],
      qualityComparison: savedProd.quality_comparison || {},
      careInstructions: savedProd.care_instructions || [],
      shippingInfo: savedProd.shipping_info || '',
      returnPolicy: 'Hassle-free exchange within 7 days of delivery for sizing or manufacturing defect.',
      videoUrl: savedProd?.video_url || (body.videoUrl?.trim() ? body.videoUrl.trim() : undefined),
      sizeGuideUrl: savedProd?.size_guide_url || body.sizeGuideUrl || undefined,
      isPublished: savedProd.is_published,
      createdAt: savedProd.created_at,
      colors: Array.isArray(savedProd.colors) ? savedProd.colors : normalizedColors,
      variants: savedVariants.map((v: any) => {
        const pricing = resolveVariantPricing(v);
        return {
          id: v.id,
          productId: v.product_id,
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
          isAvailable: v.is_available,
        };
      }),
      media: savedMedia
        .filter((m: any) => m.media_type !== 'size_guide' && m.media_type !== 'video')
        .map((m: any) => ({
          id: m.id,
          productId: m.product_id,
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

    return NextResponse.json({ success: true, product: finalProduct }, { status: 200 });
  } catch (err: any) {
    console.error('API /api/admin/products POST exception:', err);
    return NextResponse.json({ error: err?.message || 'Failed to save product to database' }, { status: 500 });
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
    const adminDb = getDbClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required for deletion.' }, { status: 400 });
    }

    const { error } = await adminDb.from('products').delete().eq('id', id);

    if (error) {
      console.error('FULL SUPABASE PRODUCT DELETE ERROR:', error);
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `Product ${id} deleted successfully.` });
  } catch (err: any) {
    console.error('API /api/admin/products DELETE exception:', err);
    return NextResponse.json({ error: 'Failed to delete product from database.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  return POST(req);
}

export async function PATCH(req: Request) {
  return POST(req);
}

