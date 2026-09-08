import { NextResponse } from 'next/server';
import { supabaseServer, createAdminClient, isSupabaseConfigured } from '@/lib/supabase';
import { Product, ProductVariant, ProductMedia } from '@/types';
import { INITIAL_PRODUCTS } from '@/data/initialData';
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

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ products: INITIAL_PRODUCTS });
  }

  try {
    const dbClient = getDbClient();

    const { data: prods, error } = await dbClient
      .from('products')
      .select('*, product_variants(*), product_media(*)')
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
        sizeGuideUrl:
          p.size_guide_url ||
          sizeGuideMedia?.url ||
          INITIAL_PRODUCTS.find((ip) => ip.slug === p.slug || p.slug?.startsWith(ip.slug))?.sizeGuideUrl ||
          'https://pqjpgexmupcuuqfzchhc.supabase.co/storage/v1/object/public/product-media/products/f0000000-0000-0000-0000-000000000001/size-guide/arh_mens_vest_size_chart.webp',
        isPublished: p.is_published ?? true,
        isWholesaleEnabled: p.is_wholesale_enabled ?? true,
        wholesaleMinQty: p.wholesale_min_qty ? Number(p.wholesale_min_qty) : 12,
        createdAt: p.created_at,
        variants: Array.isArray(p.product_variants)
          ? p.product_variants.map((v: any) => ({
              id: v.id,
              productId: v.product_id,
              quality: v.quality,
              sleeve: v.sleeve,
              size: v.size,
              price: Number(v.price) || 0,
              salePrice: v.sale_price ? Number(v.sale_price) : undefined,
              wholesalePrice: v.wholesale_price !== undefined && v.wholesale_price !== null && !isNaN(Number(v.wholesale_price))
                ? Number(v.wholesale_price)
                : Math.round((Number(v.price) || 480) * 0.82),
              wholesaleTiers: Array.isArray(v.wholesale_tiers) ? v.wholesale_tiers : undefined,
              stock: Number(v.stock) || 0,
              sku: v.sku || '',
              isAvailable: v.is_available ?? true,
            }))
          : [],
        media: mediaList
          .filter((m: any) => m.media_type !== 'size_guide')
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
      updated_at: new Date().toISOString(),
    };

    if (body.shortDescription !== undefined) {
      productPayload.short_description = body.shortDescription.trim();
    }
    if (body.videoUrl !== undefined) {
      productPayload.video_url = body.videoUrl.trim();
    }
    if (body.sizeGuideUrl !== undefined) {
      productPayload.size_guide_url = body.sizeGuideUrl.trim();
    }
    if (body.isWholesaleEnabled !== undefined) {
      productPayload.is_wholesale_enabled = body.isWholesaleEnabled;
    }
    if (body.wholesaleMinQty !== undefined) {
      productPayload.wholesale_min_qty = Number(body.wholesaleMinQty) || 12;
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

    if (prodErr && (prodErr.code === 'PGRST204' || prodErr.code === '42703' || prodErr.message?.includes('does not exist'))) {
      // Omit optional wholesale & new columns if schema migration hasn't added them yet
      delete productPayload.is_wholesale_enabled;
      delete productPayload.wholesale_min_qty;
      delete productPayload.short_description;
      delete productPayload.video_url;
      delete productPayload.size_guide_url;

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
          error: `Database Product Save Failed: ${prodErr?.message || 'Unknown DB error'}`,
          code: prodErr?.code,
          details: prodErr?.details,
          hint: prodErr?.hint,
        },
        { status: 400 }
      );
    }

    const confirmedProdId = savedProd.id;

    // 1. Manage Variants atomically
    await adminDb.from('product_variants').delete().eq('product_id', confirmedProdId);

    let savedVariants: any[] = [];
    if (body.variants && body.variants.length > 0) {
      const buildVariantsPayload = (includeWholesale: boolean) =>
        body.variants.map((v) => {
          const item: any = {
            id: isUuid(v.id) ? v.id : crypto.randomUUID(),
            product_id: confirmedProdId,
            quality: v.quality || 'High Quality',
            sleeve: v.sleeve || 'Sleeveless',
            size: v.size || 'L',
            price: Number(v.price) || 0,
            sale_price: v.salePrice ? Number(v.salePrice) : null,
            stock: Number(v.stock) || 0,
            sku: v.sku || '',
            is_available: v.isAvailable ?? true,
            updated_at: new Date().toISOString(),
          };
          if (includeWholesale) {
            const rawV = v as any;
            if (rawV.wholesalePrice !== undefined && rawV.wholesalePrice !== null) {
              item.wholesale_price = Number(rawV.wholesalePrice);
            } else if (rawV.wholesale_price !== undefined && rawV.wholesale_price !== null) {
              item.wholesale_price = Number(rawV.wholesale_price);
            }
            if (rawV.wholesaleTiers !== undefined) {
              item.wholesale_tiers = rawV.wholesaleTiers;
            } else if (rawV.wholesale_tiers !== undefined) {
              item.wholesale_tiers = rawV.wholesale_tiers;
            }
          }
          return item;
        });

      let { data: insertedVars, error: varErr } = await adminDb
        .from('product_variants')
        .insert(buildVariantsPayload(true))
        .select();

      if (varErr && varErr.code === 'PGRST204') {
        const retryRes = await adminDb
          .from('product_variants')
          .insert(buildVariantsPayload(false))
          .select();
        insertedVars = retryRes.data;
        varErr = retryRes.error;
      }

      if (varErr) {
        console.error('FULL SUPABASE VARIANT INSERT ERROR:', varErr);
        return NextResponse.json(
          {
            error: `Database Variant Save Failed: ${varErr.message}`,
            code: varErr.code,
            details: varErr.details,
            hint: varErr.hint,
          },
          { status: 400 }
        );
      }
      savedVariants = insertedVars || [];
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
      });
    }

    let savedMedia: any[] = [];
    if (mediaPayload.length > 0) {
      const { data: insertedMedia, error: mediaErr } = await adminDb
        .from('product_media')
        .insert(mediaPayload)
        .select();

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
      videoUrl: savedProd.video_url || body.videoUrl || undefined,
      sizeGuideUrl: savedProd.size_guide_url || body.sizeGuideUrl || undefined,
      isPublished: savedProd.is_published,
      isWholesaleEnabled: savedProd.is_wholesale_enabled,
      wholesaleMinQty: savedProd.wholesale_min_qty,
      createdAt: savedProd.created_at,
      variants: savedVariants.map((v: any) => ({
        id: v.id,
        productId: v.product_id,
        quality: v.quality,
        sleeve: v.sleeve,
        size: v.size,
        price: Number(v.price) || 0,
        salePrice: v.sale_price ? Number(v.sale_price) : undefined,
        wholesalePrice: v.wholesale_price !== undefined && v.wholesale_price !== null && !isNaN(Number(v.wholesale_price))
          ? Number(v.wholesale_price)
          : Math.round((Number(v.price) || 480) * 0.82),
        wholesaleTiers: v.wholesale_tiers || undefined,
        stock: Number(v.stock) || 0,
        sku: v.sku || '',
        isAvailable: v.is_available,
      })),
      media: savedMedia
        .filter((m: any) => m.media_type !== 'size_guide')
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
        })),
    };

    return NextResponse.json({ success: true, product: finalProduct }, { status: 200 });
  } catch (err: any) {
    console.error('API /api/admin/products POST exception:', err);
    return NextResponse.json({ error: err?.message || 'Failed to save product to database' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
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

