import { NextResponse } from 'next/server';
import { supabaseServer, isSupabaseConfigured } from '@/lib/supabase';
import { INITIAL_CATEGORIES, INITIAL_SITE_SETTINGS } from '@/data/initialData';
import { resolveVariantPricing } from '@/lib/pricing';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  if (isSupabaseConfigured()) {
    try {
      const [{ data: products }, { data: categories }] = await Promise.all([
        supabaseServer.from('products').select('*, product_variants(*), product_media(*)').eq('is_published', true).order('sort_order', { ascending: true }),
        supabaseServer.from('categories').select('*, subcategories(*)').eq('is_active', true),
      ]);

      if (Array.isArray(products)) {
        const formatted = products.map((p: any) => {
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
            variants: Array.isArray(p.product_variants)
              ? p.product_variants.map((v: any) => {
                  const pricing = resolveVariantPricing(v);
                  return {
                    id: v.id,
                    productId: v.product_id,
                    quality: v.quality,
                    sleeve: v.sleeve,
                    size: v.size,
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
              })),
          };
        });

        return NextResponse.json({
          products: formatted,
          categories: categories || INITIAL_CATEGORIES,
          settings: INITIAL_SITE_SETTINGS,
        });
      }
    } catch (err) {
      console.warn('API Products live fetch error', err);
    }
  }

  return NextResponse.json({
    products: [],
    categories: INITIAL_CATEGORIES,
    settings: INITIAL_SITE_SETTINGS,
  });
}

