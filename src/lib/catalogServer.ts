import { unstable_cache, revalidateTag, revalidatePath } from 'next/cache';
import { supabaseServer, isServerSupabaseConfigured } from '@/lib/supabase/server';
import {
  Product,
  Category,
  Subcategory,
  HeroSlide,
  SiteSettings,
  Deal,
} from '@/types';
import {
  INITIAL_CATEGORIES,
  INITIAL_SUBCATEGORIES,
  INITIAL_SITE_SETTINGS,
  INITIAL_HERO_SLIDES,
} from '@/data/initialData';
import { resolveVariantPricing } from '@/lib/pricing';
import { fetchAuthoritativeSettings } from '@/lib/settingsServer';

export const CACHE_TAGS = {
  CATALOG: 'public-catalog',
  CATEGORIES: 'public-categories',
  HERO: 'public-hero',
  SETTINGS: 'public-settings',
  DEALS: 'public-deals',
  REVIEWS: 'public-reviews',
} as const;

export function revalidatePublicStoreCache(tags: string[] = Object.values(CACHE_TAGS)) {
  try {
    tags.forEach((tag) => revalidateTag(tag));
    revalidatePath('/', 'layout');
    revalidatePath('/shop');
    revalidatePath('/deals');
    revalidatePath('/shipping-policy');
  } catch (err) {
    console.warn('Revalidation notice:', err);
  }
}

export const getCachedPublicProducts = unstable_cache(
  async (): Promise<Product[]> => {
    if (!isServerSupabaseConfigured()) return [];

    try {
      const [{ data: prods, error }, { data: ratingRows }] = await Promise.all([
        supabaseServer
          .from('products')
          .select('*, product_variants(*), product_media(*)')
          .eq('is_published', true)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false }),
        supabaseServer
          .from('reviews')
          .select('product_id, rating')
          .eq('is_approved', true),
      ]);

      if (error || !Array.isArray(prods)) {
        return [];
      }

      const ratingsByProd = new Map<string, { sum: number; count: number }>();
      for (const row of ratingRows || []) {
        const entry = ratingsByProd.get(row.product_id) || { sum: 0, count: 0 };
        entry.sum += Number(row.rating) || 5;
        entry.count += 1;
        ratingsByProd.set(row.product_id, entry);
      }

      return prods.map((p: any) => {
        const mediaList = Array.isArray(p.product_media) ? p.product_media : [];
        const videoMedia = mediaList.find((m: any) => m.media_type === 'video');
        const sizeGuideMedia = mediaList.find((m: any) => m.media_type === 'size_guide');
        const ratingAgg = ratingsByProd.get(p.id);

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
          careInstructions: Array.isArray(p.care_instructions) ? p.care_instructions : [],
          shippingInfo: p.shipping_info || '',
          videoUrl: p.video_url || videoMedia?.url || undefined,
          sizeGuideUrl: p.size_guide_url || sizeGuideMedia?.url || undefined,
          coverImage: p.cover_image || undefined,
          rating: ratingAgg ? Number((ratingAgg.sum / ratingAgg.count).toFixed(1)) : 5.0,
          reviewsCount: ratingAgg ? ratingAgg.count : 0,
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
    } catch (err) {
      console.warn('getCachedPublicProducts notice:', err);
      return [];
    }
  },
  ['cached-public-products-v1'],
  { revalidate: 60, tags: [CACHE_TAGS.CATALOG, CACHE_TAGS.REVIEWS] }
);

export const getCachedPublicCategories = unstable_cache(
  async (): Promise<{ categories: Category[]; subcategories: Subcategory[] }> => {
    if (!isServerSupabaseConfigured()) {
      return { categories: INITIAL_CATEGORIES, subcategories: INITIAL_SUBCATEGORIES };
    }

    try {
      const [catRes, subRes] = await Promise.all([
        supabaseServer.from('categories').select('*').order('display_order', { ascending: true }),
        supabaseServer.from('subcategories').select('*').order('display_order', { ascending: true }),
      ]);

      const categories: Category[] =
        catRes.data && catRes.data.length > 0
          ? catRes.data.map((c: any) => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              description: c.description || '',
              image: c.image_url,
              isActive: c.is_active ?? true,
              displayOrder: c.display_order || 0,
              sizeType: c.size_type || 'alphabetic',
              availableSizes: Array.isArray(c.available_sizes)
                ? c.available_sizes
                : ['S', 'M', 'L', 'XL', 'XXL'],
            }))
          : INITIAL_CATEGORIES;

      const subcategories: Subcategory[] =
        subRes.data && subRes.data.length > 0
          ? subRes.data.map((s: any) => ({
              id: s.id,
              categoryId: s.category_id,
              name: s.name,
              slug: s.slug,
              description: s.description || '',
              image: s.image_url,
              isActive: s.is_active ?? true,
              displayOrder: s.display_order || 0,
            }))
          : INITIAL_SUBCATEGORIES;

      return { categories, subcategories };
    } catch {
      return { categories: INITIAL_CATEGORIES, subcategories: INITIAL_SUBCATEGORIES };
    }
  },
  ['cached-public-categories-v1'],
  { revalidate: 60, tags: [CACHE_TAGS.CATEGORIES] }
);

export const getCachedHeroSlides = unstable_cache(
  async (): Promise<HeroSlide[]> => {
    if (!isServerSupabaseConfigured()) return INITIAL_HERO_SLIDES;

    try {
      const { data, error } = await supabaseServer
        .from('hero_slides')
        .select('*')
        .order('display_order', { ascending: true });

      if (error || !data || data.length === 0) {
        return INITIAL_HERO_SLIDES;
      }

      const mapped: HeroSlide[] = data.map((s: any) => ({
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
        updatedAt: s.updated_at || undefined,
      }));

      return mapped;
    } catch {
      return INITIAL_HERO_SLIDES;
    }
  },
  ['cached-public-hero-slides-v1'],
  { revalidate: 60, tags: [CACHE_TAGS.HERO] }
);

export const getCachedPublicSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    if (!isServerSupabaseConfigured()) return INITIAL_SITE_SETTINGS;
    try {
      return await fetchAuthoritativeSettings(supabaseServer);
    } catch {
      return INITIAL_SITE_SETTINGS;
    }
  },
  ['cached-public-settings-v1'],
  { revalidate: 60, tags: [CACHE_TAGS.SETTINGS] }
);

export const getCachedFeaturedDeals = unstable_cache(
  async (): Promise<Deal[]> => {
    if (!isServerSupabaseConfigured()) return [];
    try {
      const { data, error } = await supabaseServer
        .from('deals')
        .select('*')
        .eq('is_active', true)
        .eq('is_featured', true)
        .order('sort_order', { ascending: true });

      if (error || !Array.isArray(data)) return [];
      return data.map((row: any) => ({
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
      }));
    } catch {
      return [];
    }
  },
  ['cached-featured-deals-v1'],
  { revalidate: 60, tags: [CACHE_TAGS.DEALS] }
);

export const getCachedActiveDeals = unstable_cache(
  async (): Promise<Deal[]> => {
    if (!isServerSupabaseConfigured()) return [];
    try {
      const { data, error } = await supabaseServer
        .from('deals')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error || !Array.isArray(data)) return [];
      return data.map((row: any) => ({
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
      }));
    } catch {
      return [];
    }
  },
  ['cached-active-deals-v1'],
  { revalidate: 60, tags: [CACHE_TAGS.DEALS] }
);

/**
 * Strips bulky product-detail-only fields (long descriptions, care lists, features,
 * and extra color gallery photos) for fast RootLayout SSR catalog hydration across
 * /, /shop, /category/*, /cart, /checkout. Detail pages fetch full product on demand.
 */
export function buildSlimCatalogSummaries(products: Product[]): Product[] {
  return products.map((p) => {
    // Keep only non-color fallback image (up to 1) when coverImage is unset
    const fallbackMedia = !p.coverImage
      ? (p.media || []).filter((m) => !m.color).slice(0, 1)
      : [];
    return {
      ...p,
      description: '',
      features: [],
      careInstructions: [],
      shippingInfo: '',
      sizeGuideUrl: '',
      media: fallbackMedia.length > 0 ? fallbackMedia : (p.coverImage ? [] : (p.media || []).slice(0, 1)),
    };
  });
}

