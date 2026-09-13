import {
  Category,
  Subcategory,
  Product,
  Order,
  SiteSettings,
  ProductVariant,
  ProductMedia,
  OrderStatus,
  ProductReview,
  HeroSlide,
  CustomerProfile,
  CustomerAddress,
  CustomerRecord,
} from '@/types';
import {
  INITIAL_CATEGORIES,
  INITIAL_SUBCATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_SITE_SETTINGS,
  INITIAL_HERO_SLIDES,
} from '@/data/initialData';
import { supabaseBrowser, isSupabaseConfigured } from './supabase/client';
import { resolveVariantPricing } from '@/lib/pricing';

const LOCAL_STORAGE_KEYS = {
  PRODUCTS: 'arh_products_v6',
  CATEGORIES: 'arh_categories_v3',
  SUBCATEGORIES: 'arh_subcategories_v3',
  SETTINGS: 'arh_settings_v3',
  ORDERS: 'arh_orders_v3',
  REVIEWS: 'arh_reviews_v3',
  HERO_SLIDES: 'arh_hero_slides_v4',
};

export class DataStore {
  private static isClient(): boolean {
    return typeof window !== 'undefined';
  }

  // ============================================================================
  // 1. FILE UPLOADER (SUPABASE STORAGE BUCKET -> PUBLIC CDN URL)
  // ============================================================================
  static async uploadMediaFile(
    file: File,
    folderOrBucket = 'product-media',
    subfolder?: string
  ): Promise<string> {
    // 1. Client-side File Validation
    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    const validExts = ['jpg', 'jpeg', 'png', 'webp'];
    const isMimeValid = file.type ? validMimes.includes(file.type.toLowerCase()) : false;
    const isExtValid = validExts.includes(fileExt);

    if (!isMimeValid && !isExtValid) {
      throw new Error('Please upload a valid image (JPG, PNG, or WebP).');
    }

    const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit
    if (file.size > MAX_SIZE_BYTES) {
      throw new Error('Image size is too large. Maximum allowed size is 10MB.');
    }

    // 2. Strict Bucket Resolution
    // Existing Supabase buckets: ONLY 'product-media' and 'hero-slides'.
    let targetBucket = 'product-media';
    if (
      folderOrBucket === 'hero-slides' ||
      folderOrBucket === 'hero' ||
      folderOrBucket === 'desktop-hero' ||
      folderOrBucket === 'mobile-hero'
    ) {
      targetBucket = 'hero-slides';
    } else {
      targetBucket = 'product-media';
    }

    // 3. Clean Folder Structure Organization
    let folderPath = '';
    if (subfolder && subfolder.trim()) {
      folderPath = subfolder.trim().replace(/^\/+|\/+$/g, '');
    } else if (folderOrBucket.includes('/')) {
      folderPath = folderOrBucket.trim().replace(/^\/+|\/+$/g, '');
    } else if (
      folderOrBucket === 'size-guides' ||
      folderOrBucket === 'size-guide' ||
      folderOrBucket === 'sizeguide'
    ) {
      folderPath = 'products/size-guide';
    } else if (folderOrBucket === 'payment-receipts' || folderOrBucket === 'receipts') {
      folderPath = 'receipts';
    } else if (targetBucket === 'hero-slides') {
      folderPath = '';
    } else {
      folderPath = 'products';
    }

    if (!isSupabaseConfigured()) {
      throw new Error('Supabase Storage is not configured. Media upload requires an active Supabase connection.');
    }

    try {
      const cleanName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .toLowerCase()
        .slice(0, 50);
      const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const fileName = `${uniqueSuffix}_${cleanName}.${fileExt || 'webp'}`;
      const storagePath = folderPath ? `${folderPath}/${fileName}` : fileName;

      const { data, error } = await supabaseBrowser.storage
        .from(targetBucket)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error(`Supabase storage upload error in bucket '${targetBucket}' at path '${storagePath}':`, error);
        const lowerMsg = (error.message || '').toLowerCase();
        if (lowerMsg.includes('bucket not found')) {
          throw new Error(`Storage bucket '${targetBucket}' not found.`);
        }
        if (
          lowerMsg.includes('quota') ||
          lowerMsg.includes('payload too large') ||
          lowerMsg.includes('storage limit') ||
          lowerMsg.includes('entity too large')
        ) {
          throw new Error('Image size is too large or storage quota exceeded.');
        }
        if (
          lowerMsg.includes('security policy') ||
          lowerMsg.includes('row-level security') ||
          lowerMsg.includes('permission denied') ||
          (error as any).statusCode === 403 ||
          (error as any).statusCode === '403'
        ) {
          throw new Error('Permission denied. Storage upload policy does not allow this action.');
        }
        throw new Error(`Image upload failed: ${error.message}`);
      }

      if (data) {
        if (folderOrBucket === 'payment-receipts' || folderOrBucket === 'receipts') {
          // Return private internal storage reference for receipts to shield from public exposure
          return storagePath;
        }
        const { data: publicUrlData } = supabaseBrowser.storage
          .from(targetBucket)
          .getPublicUrl(storagePath);
        if (publicUrlData?.publicUrl) {
          return publicUrlData.publicUrl;
        }
      }
      throw new Error('Failed to retrieve public URL for uploaded media.');
    } catch (err: any) {
      console.error('Supabase storage upload exception:', err);
      throw err instanceof Error ? err : new Error('Image upload failed. Please try again.');
    }
  }

  // ============================================================================
  // 2. CATEGORIES & SUBCATEGORIES CRUD
  // ============================================================================
  static async getSubcategories(): Promise<Subcategory[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabaseBrowser
          .from('subcategories')
          .select('*')
          .order('display_order', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map((s: any) => ({
            id: s.id,
            categoryId: s.category_id,
            name: s.name,
            slug: s.slug,
            description: s.description || '',
            image: s.image_url,
            isActive: s.is_active ?? true,
            displayOrder: s.display_order || 0,
          }));
        }
      } catch (err) {
        console.warn('Supabase subcategories fetch error', err);
      }
    }

    if (this.isClient()) {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.SUBCATEGORIES);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {}
      }
      localStorage.setItem(LOCAL_STORAGE_KEYS.SUBCATEGORIES, JSON.stringify(INITIAL_SUBCATEGORIES));
    }

    return INITIAL_SUBCATEGORIES;
  }

  static async saveSubcategory(subcat: Subcategory): Promise<void> {
    if (this.isClient()) {
      try {
        const res = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'subcategory', data: subcat }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          const errMsg = data?.error || 'Failed to save subcategory in database.';
          console.error('FULL SUPABASE SUBCATEGORY SAVE ERROR:', data);
          throw new Error(errMsg);
        }

        const savedSub: Subcategory = {
          id: data.subcategory.id,
          categoryId: data.subcategory.category_id,
          name: data.subcategory.name,
          slug: data.subcategory.slug,
          description: data.subcategory.description || '',
          image: data.subcategory.image_url,
          isActive: data.subcategory.is_active ?? true,
          displayOrder: data.subcategory.display_order || 0,
        };

        const subcategories = await this.getSubcategories();
        const index = subcategories.findIndex((s) => s.id === savedSub.id || s.id === subcat.id);
        if (index !== -1) {
          subcategories[index] = savedSub;
        } else {
          subcategories.push(savedSub);
        }
        localStorage.setItem(LOCAL_STORAGE_KEYS.SUBCATEGORIES, JSON.stringify(subcategories));
        return;
      } catch (err: any) {
        console.error('DataStore.saveSubcategory error:', err);
        throw err instanceof Error ? err : new Error('Failed to save subcategory to database');
      }
    }

    if (isSupabaseConfigured()) {
      const adminDb = supabaseBrowser;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subcat.id);
      const payload: any = {
        category_id: subcat.categoryId,
        name: subcat.name,
        slug: subcat.slug,
        description: subcat.description || '',
        image_url: subcat.image,
        is_active: subcat.isActive,
        display_order: subcat.displayOrder,
        updated_at: new Date().toISOString(),
      };
      if (isUuid) {
        payload.id = subcat.id;
      }

      const { error } = await adminDb.from('subcategories').upsert(payload);
      if (error) {
        console.error('FULL SUPABASE SUBCATEGORY ERROR:', error);
        throw new Error(error.message);
      }
    }
  }

  static async deleteSubcategory(id: string): Promise<void> {
    if (this.isClient()) {
      try {
        const res = await fetch(`/api/admin/categories?id=${encodeURIComponent(id)}&type=subcategory`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          const errMsg = data?.error || 'Failed to delete subcategory from database.';
          console.error('FULL SUPABASE SUBCATEGORY DELETE ERROR:', data);
          throw new Error(errMsg);
        }

        const subcategories = await this.getSubcategories();
        const filtered = subcategories.filter((s) => s.id !== id);
        localStorage.setItem(LOCAL_STORAGE_KEYS.SUBCATEGORIES, JSON.stringify(filtered));
        return;
      } catch (err: any) {
        console.error('DataStore.deleteSubcategory error:', err);
        throw err instanceof Error ? err : new Error('Failed to delete subcategory from database.');
      }
    }

    if (isSupabaseConfigured()) {
      const adminDb = supabaseBrowser;
      const { error } = await adminDb.from('subcategories').delete().eq('id', id);
      if (error) {
        console.error('FULL SUPABASE DELETE SUBCATEGORY ERROR:', error);
        throw new Error(error.message);
      }
    }
  }

  static async getCategories(): Promise<Category[]> {
    let categories: Category[] = INITIAL_CATEGORIES;
    const subcategories = await this.getSubcategories();
    const products = await this.getProducts();

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabaseBrowser
          .from('categories')
          .select('*')
          .order('display_order', { ascending: true });

        if (!error && data && data.length > 0) {
          categories = data.map((c: any) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            description: c.description || '',
            image: c.image_url,
            isActive: c.is_active ?? true,
            displayOrder: c.display_order || 0,
          }));
        }
      } catch (err) {
        console.warn('Supabase categories fetch error', err);
      }
    } else if (this.isClient()) {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.CATEGORIES);
      if (stored) {
        try {
          categories = JSON.parse(stored);
        } catch {}
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
      }
    }

    return categories.map((cat) => {
      const catProducts = products.filter((p) => (p.categoryId === cat.id || p.categoryId === cat.slug) && p.isPublished);
      return {
        ...cat,
        productCount: catProducts.length,
        subcategories: subcategories
          .filter((sub) => sub.categoryId === cat.id)
          .map((sub) => ({
            ...sub,
            productCount: catProducts.filter((p) => p.subcategoryId === sub.id || p.subcategoryId === sub.slug).length,
          })),
      };
    });
  }

  static async saveCategory(category: Category): Promise<void> {
    if (this.isClient()) {
      try {
        const res = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'category', data: category }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          const errMsg = data?.error || 'Failed to save category in database.';
          console.error('FULL SUPABASE CATEGORY SAVE ERROR:', data);
          throw new Error(errMsg);
        }

        const savedCat: Category = {
          id: data.category.id,
          name: data.category.name,
          slug: data.category.slug,
          description: data.category.description || '',
          image: data.category.image_url,
          isActive: data.category.is_active ?? true,
          displayOrder: data.category.display_order || 0,
        };

        const categories = await this.getCategories();
        const index = categories.findIndex((c) => c.id === savedCat.id || c.id === category.id);
        if (index !== -1) {
          categories[index] = savedCat;
        } else {
          categories.push(savedCat);
        }
        localStorage.setItem(LOCAL_STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
        return;
      } catch (err: any) {
        console.error('DataStore.saveCategory error:', err);
        throw err instanceof Error ? err : new Error('Failed to save category to database');
      }
    }

    if (isSupabaseConfigured()) {
      const adminDb = supabaseBrowser;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category.id);
      const payload: any = {
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        image_url: category.image,
        is_active: category.isActive,
        display_order: category.displayOrder,
        updated_at: new Date().toISOString(),
      };
      if (isUuid) {
        payload.id = category.id;
      }

      const { error } = await adminDb.from('categories').upsert(payload);
      if (error) {
        console.error('FULL SUPABASE CATEGORY ERROR:', error);
        throw new Error(error.message);
      }
    }
  }

  static async deleteCategory(id: string): Promise<void> {
    if (this.isClient()) {
      try {
        const res = await fetch(`/api/admin/categories?id=${encodeURIComponent(id)}&type=category`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          const errMsg = data?.error || 'Failed to delete category from database.';
          console.error('FULL SUPABASE CATEGORY DELETE ERROR:', data);
          throw new Error(errMsg);
        }

        const categories = await this.getCategories();
        const filtered = categories.filter((c) => c.id !== id);
        localStorage.setItem(LOCAL_STORAGE_KEYS.CATEGORIES, JSON.stringify(filtered));
        return;
      } catch (err: any) {
        console.error('DataStore.deleteCategory error:', err);
        throw err instanceof Error ? err : new Error('Failed to delete category from database.');
      }
    }

    if (isSupabaseConfigured()) {
      const adminDb = supabaseBrowser;
      const { error } = await adminDb.from('categories').delete().eq('id', id);
      if (error) {
        console.error('FULL SUPABASE DELETE CATEGORY ERROR:', error);
        throw new Error(error.message);
      }
    }
  }

  // ============================================================================
  // 3. PRODUCTS CRUD (MULTI-PRODUCT CATALOG WITH VARIANTS & MEDIA)
  // ============================================================================
  static async getProducts(): Promise<Product[]> {
    let products: Product[] = [];

    // 1. Client-side authoritative fetch through server API route
    if (this.isClient()) {
      try {
        const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
        const endpoint = isAdminRoute ? '/api/admin/products' : '/api/products';
        const res = await fetch(endpoint, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          // Trust the API response as authoritative. Do NOT filter out empty arrays —
          // an empty array means the database genuinely has 0 products.
          if (Array.isArray(data.products)) {
            products = data.products;
            try {
              localStorage.setItem(LOCAL_STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
            } catch {}
            // Return immediately — the API response is the single source of truth.
            const allReviews = await this.getReviews();
            return products.map((prod) => ({
              ...prod,
              reviews: allReviews.filter((r) => r.productId === prod.id && r.isApproved),
            }));
          }
        }
      } catch (apiErr) {
        console.warn('API /api/admin/products fetch notice, falling back to direct Supabase client:', apiErr);
      }
    }

    // 2. Direct Supabase Client fallback (for server components or offline/direct query)
    if (products.length === 0 && isSupabaseConfigured()) {
      try {
        const db = supabaseBrowser;
        const { data: prods, error } = await db
          .from('products')
          .select('*, product_variants(*), product_media(*)')
          .order('created_at', { ascending: false });

        if (!error && prods && prods.length > 0) {
          products = prods.map((p: any) => ({
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
            careInstructions: Array.isArray(p.care_instructions) ? p.care_instructions : INITIAL_PRODUCTS[0].careInstructions,
            shippingInfo: p.shipping_info || INITIAL_PRODUCTS[0].shippingInfo,
            returnPolicy: 'We offer hassle-free exchange within 7 days of delivery in case of sizing or defect issues. Product must be unwashed and in original condition.',
            videoUrl: p.video_url || p.product_media?.find((m: any) => m.media_type === 'video')?.url || undefined,
            sizeGuideUrl:
              p.size_guide_url ||
              p.product_media?.find((m: any) => m.media_type === 'size_guide')?.url ||
              INITIAL_PRODUCTS.find((ip) => ip.slug === p.slug || p.slug?.startsWith(ip.slug))?.sizeGuideUrl ||
              'https://pqjpgexmupcuuqfzchhc.supabase.co/storage/v1/object/public/product-media/products/f0000000-0000-0000-0000-000000000001/size-guide/arh_mens_vest_size_chart.webp',
            isPublished: p.is_published ?? true,
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
            media: Array.isArray(p.product_media)
              ? p.product_media
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
                  }))
              : [],
          }));
        }
      } catch (err) {
        console.warn('Supabase fetch failed, fallback to local store', err);
      }
    }

    // 3. Fallback only if Supabase is completely unconfigured
    if (products.length === 0 && !isSupabaseConfigured()) {
      if (this.isClient()) {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.PRODUCTS);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              products = parsed;
            }
          } catch {}
        }
      }
      if (products.length === 0) {
        products = INITIAL_PRODUCTS;
      }
    }

    // Attach approved customer reviews
    const allReviews = await this.getReviews();
    return products.map((prod) => ({
      ...prod,
      reviews: allReviews.filter((r) => r.productId === prod.id && r.isApproved),
    }));
  }

  static async getProductBySlug(slug: string): Promise<Product | null> {
    const products = await this.getProducts();
    return products.find((p) => p.slug === slug || p.id === slug) || null;
  }

  private static sanitizeProductsForLocalStorage(products: Product[]): Product[] {
    return products.map((prod) => {
      const sanitized = { ...prod };
      if (Array.isArray(sanitized.media)) {
        sanitized.media = sanitized.media.filter((m) => !m.url || !m.url.startsWith('data:image'));
      }
      return sanitized;
    });
  }

  static async saveProduct(product: Product): Promise<void> {
    if (this.isClient()) {
      try {
        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(product),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          const errMsg = data?.error || 'Failed to save product in database.';
          console.error('FULL SUPABASE / DB PRODUCT SAVE ERROR:', data);
          throw new Error(errMsg);
        }
        if (data.product) {
          try {
            const rawStored = localStorage.getItem(LOCAL_STORAGE_KEYS.PRODUCTS);
            const currentProds: Product[] = rawStored ? JSON.parse(rawStored) : [];
            const idx = currentProds.findIndex((p) => p.id === data.product.id || p.slug === data.product.slug);
            let nextProds: Product[];
            if (idx !== -1) {
              nextProds = currentProds.map((p, i) => (i === idx ? data.product : p));
            } else {
              nextProds = [data.product, ...currentProds];
            }
            localStorage.setItem(LOCAL_STORAGE_KEYS.PRODUCTS, JSON.stringify(nextProds));
          } catch {}
        }
        return;
      } catch (err: any) {
        console.error('DataStore.saveProduct error:', err);
        throw err instanceof Error ? err : new Error('Failed to save product to database');
      }
    }

    if (isSupabaseConfigured()) {
      const adminDb = supabaseBrowser;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product.id);
      const productPayload: any = {
        category_id: product.categoryId || null,
        subcategory_id: product.subcategoryId || null,
        name: product.name,
        slug: product.slug,
        subtitle: product.subtitle || '',
        description: product.description || '',
        features: product.features || [],
        quality_comparison: product.qualityComparison || {},
        care_instructions: product.careInstructions || [],
        shipping_info: product.shippingInfo || '',
        is_published: product.isPublished,
        updated_at: new Date().toISOString(),
      };
      if (isUuid) {
        productPayload.id = product.id;
      }

      const { data: savedProd, error: prodErr } = await adminDb
        .from('products')
        .upsert(productPayload)
        .select()
        .single();

      if (prodErr || !savedProd) {
        console.error('FULL SUPABASE PRODUCT ERROR:', prodErr);
        throw new Error(prodErr?.message || 'Database Product save failed.');
      }
    }
  }

  static async deleteProduct(id: string): Promise<void> {
    if (this.isClient()) {
      try {
        const res = await fetch(`/api/admin/products?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          const errMsg = data?.error || 'Failed to delete product from database.';
          console.error('FULL SUPABASE / DB PRODUCT DELETE ERROR:', data);
          throw new Error(errMsg);
        }
        try {
          const rawStored = localStorage.getItem(LOCAL_STORAGE_KEYS.PRODUCTS);
          if (rawStored) {
            const currentProds: Product[] = JSON.parse(rawStored);
            const filtered = currentProds.filter((p) => p.id !== id && p.slug !== id);
            localStorage.setItem(LOCAL_STORAGE_KEYS.PRODUCTS, JSON.stringify(filtered));
          }
        } catch {}
        return;
      } catch (err: any) {
        console.error('DataStore.deleteProduct error:', err);
        throw err instanceof Error ? err : new Error('Failed to delete product from database.');
      }
    }

    if (isSupabaseConfigured()) {
      const adminDb = supabaseBrowser;
      const { error } = await adminDb.from('products').delete().eq('id', id);
      if (error) {
        console.error('FULL SUPABASE DELETE ERROR:', error);
        throw new Error(error.message);
      }
    }
  }

  // ============================================================================
  // 4. ORDERS & GUEST CHECKOUT MANAGEMENT
  // ============================================================================
  static async getOrders(): Promise<Order[]> {
    if (this.isClient()) {
      try {
        const res = await fetch('/api/admin/orders', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.orders && Array.isArray(data.orders)) {
            return data.orders;
          }
        }
      } catch (err) {
        console.warn('API /api/admin/orders fetch notice:', err);
      }
    }

    return [];
  }

  static async createOrder(orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'status'>): Promise<Order> {
    if (this.isClient()) {
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.order) {
            const existing = await this.getOrders();
            const updated = [json.order, ...existing.filter((o) => o.id !== json.order.id)];
            localStorage.setItem(LOCAL_STORAGE_KEYS.ORDERS, JSON.stringify(updated));
            return json.order;
          }
        }
      } catch (err) {
        console.warn('API /api/orders error, falling back to direct persistence:', err);
      }
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ARH-${new Date().getFullYear()}-${randomSuffix}`;
    const id = `ord-${Date.now()}-${randomSuffix}`;

    const newOrder: Order = {
      ...orderData,
      id,
      orderNumber,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const adminDb = supabaseBrowser;
        const { data: insertedOrder, error: orderErr } = await adminDb
          .from('orders')
          .insert({
            order_number: orderNumber,
            customer_name: orderData.customerName,
            customer_phone: orderData.customerPhone,
            customer_email: orderData.customerEmail || null,
            address: orderData.address,
            city: orderData.city,
            province: orderData.province || 'Punjab',
            order_notes: orderData.orderNotes || null,
            subtotal: orderData.subtotal,
            delivery_fee: orderData.deliveryFee,
            total_amount: orderData.totalAmount,
            payment_method: orderData.paymentMethod || 'cod',
            payment_reference: orderData.paymentReference || null,
            status: 'Pending',
          })
          .select()
          .single();

        if (!orderErr && insertedOrder) {
          newOrder.id = insertedOrder.id;

          // Insert line items
          if (orderData.items && orderData.items.length > 0) {
            const itemsPayload = orderData.items.map((it) => {
              if (it.dealId) {
                // Deal item payload
                return {
                  order_id: insertedOrder.id,
                  deal_id: it.dealId,
                  deal_name: it.dealName,
                  deal_slug: it.dealSlug,
                  pieces_count: it.piecesCount,
                  original_price: it.originalPrice,
                  discount_percentage: it.discountPercentage,
                  unit_price: it.unitPrice,
                  is_free_delivery: it.isFreeDelivery,
                  quantity: it.quantity,
                  total_price: it.totalPrice,
                  image_url: it.image || null,
                };
              }
              // Product item payload
              return {
                order_id: insertedOrder.id,
                product_id: it.productId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(it.productId)
                  ? it.productId
                  : null,
                variant_id: it.variantId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(it.variantId)
                  ? it.variantId
                  : null,
                product_name: it.productName,
                quality: it.quality,
                sleeve: it.sleeve,
                size: it.size,
                unit_price: it.unitPrice,
                quantity: it.quantity,
                total_price: it.totalPrice,
                image_url: it.image,
              };
            });
            const adminDb = supabaseBrowser;
            await adminDb.from('order_items').insert(itemsPayload);
          }
        }
      } catch (err) {
        console.warn('Supabase createOrder error', err);
      }
    }

    if (this.isClient()) {
      const existing = await this.getOrders();
      const updated = [newOrder, ...existing];
      localStorage.setItem(LOCAL_STORAGE_KEYS.ORDERS, JSON.stringify(updated));
    }

    return newOrder;
  }

  static async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    if (this.isClient()) {
      try {
        const res = await fetch('/api/admin/orders', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, status }),
        });
        if (res.ok) {
          const orders = await this.getOrders();
          const index = orders.findIndex((o) => o.id === orderId || o.orderNumber === orderId);
          if (index !== -1) {
            orders[index].status = status;
            localStorage.setItem(LOCAL_STORAGE_KEYS.ORDERS, JSON.stringify(orders));
          }
          return;
        }
      } catch (err) {
        console.warn('API /api/admin/orders PATCH notice, fallback to direct:', err);
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const adminDb = supabaseBrowser;
        await adminDb
          .from('orders')
          .update({ status, updated_at: new Date().toISOString() })
          .or(`id.eq.${orderId},order_number.eq.${orderId}`);
      } catch (err) {
        console.warn('Supabase updateOrderStatus error', err);
      }
    }

    if (this.isClient()) {
      const orders = await this.getOrders();
      const index = orders.findIndex((o) => o.id === orderId || o.orderNumber === orderId);
      if (index !== -1) {
        orders[index].status = status;
        localStorage.setItem(LOCAL_STORAGE_KEYS.ORDERS, JSON.stringify(orders));
      }
    }
  }

  static async deleteOrder(orderId: string): Promise<void> {
    return this.deleteOrders([orderId]);
  }

  static async deleteOrders(orderIds: string[]): Promise<void> {
    const cleanIds = orderIds.map((id) => id.trim()).filter(Boolean);
    if (cleanIds.length === 0) return;

    if (this.isClient()) {
      try {
        const res = await fetch('/api/admin/orders', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderIds: cleanIds }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to delete order(s).');
        }

        const orders = await this.getOrders();
        const updated = orders.filter((o) => !cleanIds.includes(o.id) && !cleanIds.includes(o.orderNumber));
        localStorage.setItem(LOCAL_STORAGE_KEYS.ORDERS, JSON.stringify(updated));
        return;
      } catch (err) {
        console.error('API /api/admin/orders DELETE error:', err);
        throw err;
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const adminDb = supabaseBrowser;
        await adminDb.from('order_items').delete().in('order_id', cleanIds);
        await adminDb.from('reviews').update({ order_id: null }).in('order_id', cleanIds);
        const { error } = await adminDb.from('orders').delete().in('id', cleanIds);
        if (error) {
          throw new Error(error.message);
        }
      } catch (err: any) {
        console.error('Direct Supabase deleteOrders error:', err);
        throw err;
      }
    }

    if (this.isClient()) {
      const orders = await this.getOrders();
      const updated = orders.filter((o) => !cleanIds.includes(o.id) && !cleanIds.includes(o.orderNumber));
      localStorage.setItem(LOCAL_STORAGE_KEYS.ORDERS, JSON.stringify(updated));
    }
  }

  // ============================================================================
  // 5. HERO SLIDES CRUD (SEPARATE DESKTOP & MOBILE SLIDES)
  // ============================================================================
  static async getHeroSlides(deviceType?: 'desktop' | 'mobile'): Promise<HeroSlide[]> {
    if (isSupabaseConfigured()) {
      try {
        let query = supabaseBrowser.from('hero_slides').select('*').order('display_order', { ascending: true });
        if (deviceType) {
          query = query.eq('device_type', deviceType);
        }
        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          return data.map((s: any) => ({
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
        }
      } catch (err) {
        console.warn('Supabase getHeroSlides error', err);
      }
    }

    if (this.isClient()) {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.HERO_SLIDES);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const sorted = parsed.sort((a: HeroSlide, b: HeroSlide) => a.displayOrder - b.displayOrder);
            if (deviceType) {
              return sorted.filter((s: HeroSlide) => (s.deviceType || 'desktop') === deviceType);
            }
            return sorted;
          }
        } catch {}
      }
      localStorage.setItem(LOCAL_STORAGE_KEYS.HERO_SLIDES, JSON.stringify(INITIAL_HERO_SLIDES));
    }

    if (deviceType) {
      return INITIAL_HERO_SLIDES.filter((s) => (s.deviceType || 'desktop') === deviceType);
    }
    return INITIAL_HERO_SLIDES;
  }

  static async saveHeroSlide(slide: HeroSlide): Promise<void> {
    if (this.isClient()) {
      try {
        const res = await fetch('/api/admin/hero', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slide),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          const errMsg = data?.error || 'Failed to save hero slide in database.';
          console.error('FULL SUPABASE HERO SAVE ERROR:', data);
          throw new Error(errMsg);
        }

        const savedSlide: HeroSlide = {
          id: data.slide.id,
          deviceType: data.slide.device_type || 'desktop',
          desktopImage: data.slide.desktop_image,
          mobileImage: data.slide.mobile_image || data.slide.desktop_image,
          title: data.slide.title || undefined,
          subtitle: data.slide.subtitle || undefined,
          link: data.slide.link || '/shop',
          buttonText: data.slide.button_text || 'Shop Now',
          displayOrder: data.slide.display_order || 0,
          isActive: data.slide.is_active ?? true,
        };

        const slides = await this.getHeroSlides();
        const index = slides.findIndex((s) => s.id === savedSlide.id || s.id === slide.id);
        if (index !== -1) {
          slides[index] = savedSlide;
        } else {
          slides.push(savedSlide);
        }
        localStorage.setItem(LOCAL_STORAGE_KEYS.HERO_SLIDES, JSON.stringify(slides));
        return;
      } catch (err: any) {
        console.error('DataStore.saveHeroSlide error:', err);
        throw err instanceof Error ? err : new Error('Failed to save hero slide to database');
      }
    }

    if (isSupabaseConfigured()) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slide.id);
      const payload: any = {
        device_type: slide.deviceType || 'desktop',
        desktop_image: slide.desktopImage,
        mobile_image: slide.mobileImage || slide.desktopImage,
        title: slide.title || null,
        subtitle: slide.subtitle || null,
        link: slide.link || slide.buttonLink || '/shop',
        button_text: slide.buttonText || 'Shop Now',
        display_order: slide.displayOrder || 0,
        is_active: slide.isActive ?? true,
        updated_at: new Date().toISOString(),
      };
      if (isUuid) {
        payload.id = slide.id;
      }
      const adminDb = supabaseBrowser;
      const { error } = await adminDb.from('hero_slides').upsert(payload);
      if (error) {
        console.error('FULL SUPABASE HERO ERROR:', error);
        throw new Error(error.message);
      }
    }
  }

  static async deleteHeroSlide(id: string): Promise<void> {
    if (this.isClient()) {
      try {
        const res = await fetch(`/api/admin/hero?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          const errMsg = data?.error || 'Failed to delete hero slide from database.';
          console.error('FULL SUPABASE HERO DELETE ERROR:', data);
          throw new Error(errMsg);
        }

        const slides = await this.getHeroSlides();
        const filtered = slides.filter((s) => s.id !== id);
        localStorage.setItem(LOCAL_STORAGE_KEYS.HERO_SLIDES, JSON.stringify(filtered));
        return;
      } catch (err: any) {
        console.error('DataStore.deleteHeroSlide error:', err);
        throw err instanceof Error ? err : new Error('Failed to delete hero slide from database.');
      }
    }

    if (isSupabaseConfigured()) {
      const adminDb = supabaseBrowser;
      const { error } = await adminDb.from('hero_slides').delete().eq('id', id);
      if (error) {
        console.error('FULL SUPABASE DELETE HERO ERROR:', error);
        throw new Error(error.message);
      }
    }
  }

  private static sanitizeContactSettings(raw: SiteSettings): SiteSettings {
    const isOldPhone = (p?: string) => !p || p.includes('03018666075') || p.includes('923018666075');
    const isOldEmail = (e?: string) => !e || e.includes('amingoldriasathosiery') || e.includes('gmail.com');

    return {
      ...raw,
      phone: isOldPhone(raw.phone) ? INITIAL_SITE_SETTINGS.phone : raw.phone,
      whatsapp: isOldPhone(raw.whatsapp) ? INITIAL_SITE_SETTINGS.whatsapp : raw.whatsapp,
      email: isOldEmail(raw.email) ? INITIAL_SITE_SETTINGS.email : raw.email,
    };
  }

  // ============================================================================
  // 6. SITE SETTINGS & SHIPPING BUSINESS RULES
  // ============================================================================
  static async getSettings(): Promise<SiteSettings> {
    let settings: SiteSettings = INITIAL_SITE_SETTINGS;

    if (this.isClient()) {
      try {
        const res = await fetch('/api/admin/settings', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            const sanitized = this.sanitizeContactSettings(data.settings);
            try {
              localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(sanitized));
            } catch {}
            return sanitized;
          }
        }
      } catch (err) {
        console.warn('API /api/admin/settings fetch notice, using fallback:', err);
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const db = supabaseBrowser;
        const { data: siteData } = await db.from('site_settings').select('*').limit(1).single();
        const { data: shipData } = await db.from('shipping_settings').select('*').limit(1).single();

        if (siteData || shipData) {
          settings = {
            ...INITIAL_SITE_SETTINGS,
            brandName: siteData?.brand_name || INITIAL_SITE_SETTINGS.brandName,
            ownerName: siteData?.owner_name || INITIAL_SITE_SETTINGS.ownerName,
            phone: siteData?.phone || INITIAL_SITE_SETTINGS.phone,
            whatsapp: siteData?.whatsapp || INITIAL_SITE_SETTINGS.whatsapp,
            email: siteData?.email || INITIAL_SITE_SETTINGS.email,
            market: siteData?.market || INITIAL_SITE_SETTINGS.market,
            currency: siteData?.currency || INITIAL_SITE_SETTINGS.currency,
            shipping: {
              minOrderQty: shipData?.min_order_qty !== undefined && shipData?.min_order_qty !== null ? Math.min(1, Number(shipData.min_order_qty)) : 1,
              maxOrderQty: shipData?.max_order_qty ?? INITIAL_SITE_SETTINGS.shipping.maxOrderQty,
              baseDeliveryCharge: shipData ? Number(shipData.base_delivery_charge) : INITIAL_SITE_SETTINGS.shipping.baseDeliveryCharge,
              freeDeliveryThreshold: shipData?.free_delivery_threshold ?? INITIAL_SITE_SETTINGS.shipping.freeDeliveryThreshold,
            },
            bankDetails: {
              bankName: siteData?.bank_name || INITIAL_SITE_SETTINGS.bankDetails.bankName,
              accountTitle: siteData?.account_title || INITIAL_SITE_SETTINGS.bankDetails.accountTitle,
              accountNumber: siteData?.account_number || INITIAL_SITE_SETTINGS.bankDetails.accountNumber,
              iban: siteData?.iban || INITIAL_SITE_SETTINGS.bankDetails.iban,
            },
            paymentMethods: siteData?.payment_methods || INITIAL_SITE_SETTINGS.paymentMethods,
            announcementStrips: siteData?.announcement_strips || INITIAL_SITE_SETTINGS.announcementStrips,
            isStoreOpen: siteData?.is_store_open ?? true,
            announcementText: siteData?.announcement_text || INITIAL_SITE_SETTINGS.announcementText,
          };
        }
      } catch (err) {
        console.warn('Supabase settings fetch error', err);
      }
    } else if (this.isClient()) {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.SETTINGS);
      if (stored) {
        try {
          settings = JSON.parse(stored);
        } catch {}
      }
    }

    const sanitized = this.sanitizeContactSettings(settings);
    if (this.isClient()) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(sanitized));
      } catch {}
    }

    return sanitized;
  }

  static async updateSettings(settings: SiteSettings): Promise<void> {
    if (this.isClient()) {
      try {
        const res = await fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to save settings to database');
        }
        localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings || settings));
        return;
      } catch (err: any) {
        console.error('Store.updateSettings API error:', err);
        throw err instanceof Error ? err : new Error('Failed to update store settings.');
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const adminDb = supabaseBrowser;
        const siteUpdatePayload: any = {
            brand_name: settings.brandName,
            owner_name: settings.ownerName,
            phone: settings.phone,
            whatsapp: settings.whatsapp,
            email: settings.email,
            market: settings.market,
            currency: settings.currency,
            bank_name: settings.bankDetails.bankName,
            account_title: settings.bankDetails.accountTitle,
            account_number: settings.bankDetails.accountNumber,
            iban: settings.bankDetails.iban,
            bank_instructions: settings.bankDetails.instructions || '',
            is_store_open: settings.isStoreOpen,
            is_announcement_enabled: settings.isAnnouncementEnabled,
            is_whatsapp_floating_enabled: settings.isWhatsAppFloatingEnabled,
            exchange_return_days: settings.exchangeReturnDays || 7,
            announcement_text: settings.announcementText,
            updated_at: new Date().toISOString(),
        };
        if (settings.announcementStrips) {
          siteUpdatePayload.announcement_strips = settings.announcementStrips;
        }
        if (settings.paymentMethods) {
          siteUpdatePayload.payment_methods = settings.paymentMethods;
        }
        await adminDb
          .from('site_settings')
          .update(siteUpdatePayload)
          .eq('id', 'b0000000-0000-0000-0000-000000000001');

        await adminDb
          .from('shipping_settings')
          .update({
            min_order_qty: settings.shipping.minOrderQty,
            max_order_qty: settings.shipping.maxOrderQty,
            base_delivery_charge: settings.shipping.baseDeliveryCharge,
            free_delivery_threshold: settings.shipping.freeDeliveryThreshold,
            updated_at: new Date().toISOString(),
          })
          .eq('id', 'a0000000-0000-0000-0000-000000000001');
      } catch (err) {
        console.warn('Direct adminDb settings update warning:', err);
      }
    }
  }

  static async duplicateProduct(productId: string): Promise<Product> {
    if (this.isClient()) {
      const res = await fetch('/api/admin/products/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to duplicate product in database.');
      }
      return data.product;
    }
    throw new Error('Duplication must be invoked in client context');
  }

  // ============================================================================
  // 7. CUSTOMER REVIEWS CRUD
  // ============================================================================
  static async getReviews(productId?: string): Promise<ProductReview[]> {
    if (this.isClient()) {
      try {
        const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
        const url = isAdminRoute
          ? '/api/admin/reviews'
          : productId
          ? `/api/reviews?productId=${encodeURIComponent(productId)}`
          : '/api/reviews';
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.reviews && Array.isArray(data.reviews)) {
            if (!productId) {
              try {
                localStorage.setItem(LOCAL_STORAGE_KEYS.REVIEWS, JSON.stringify(data.reviews));
              } catch {}
            }
            return data.reviews;
          }
        }
      } catch (err) {
        console.warn('API /api/reviews fetch notice, falling back:', err);
      }
    }

    if (isSupabaseConfigured()) {
      try {
        let query = supabaseBrowser
          .from('reviews')
          .select('*')
          .order('created_at', { ascending: false });

        if (productId) {
          query = query.eq('product_id', productId);
        }

        const { data, error } = await query;

        if (!error && data) {
          return data.map((r: any) => ({
            id: r.id,
            productId: r.product_id,
            customerName: r.customer_name,
            customerCity: r.customer_city || '',
            rating: r.rating,
            comment: r.comment,
            createdAt: r.created_at,
            isApproved: r.is_approved ?? true,
          }));
        }
      } catch (err) {
        console.warn('Supabase getReviews error', err);
      }
    }

    if (this.isClient()) {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.REVIEWS);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (productId) {
            return parsed.filter((r: any) => r.productId === productId);
          }
          return parsed;
        } catch {}
      }
    }
    return [];
  }

  static async submitReview(
    review: Omit<ProductReview, 'id' | 'createdAt' | 'isApproved'>,
    token?: string
  ): Promise<ProductReview> {
    if (this.isClient()) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers,
        body: JSON.stringify(review),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || 'Failed to submit review. Please try again.');
      }

      if (json.success && json.review) {
        const existing = await this.getReviews();
        const updated = [json.review, ...existing.filter((r) => r.id !== json.review.id)];
        localStorage.setItem(LOCAL_STORAGE_KEYS.REVIEWS, JSON.stringify(updated));
        return json.review;
      }
    }

    const newReview: ProductReview = {
      ...review,
      id: `rev-${Date.now()}`,
      createdAt: new Date().toISOString(),
      isApproved: false,
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabaseBrowser
          .from('reviews')
          .insert({
            product_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(review.productId)
              ? review.productId
              : null,
            customer_name: review.customerName,
            customer_city: review.customerCity || null,
            rating: review.rating,
            comment: review.comment,
            is_approved: false,
          })
          .select()
          .single();

        if (!error && data) {
          newReview.id = data.id;
        }
      } catch (err) {
        console.warn('Supabase submitReview error', err);
      }
    }

    if (this.isClient()) {
      const existing = await this.getReviews();
      const updated = [newReview, ...existing];
      localStorage.setItem(LOCAL_STORAGE_KEYS.REVIEWS, JSON.stringify(updated));
    }

    return newReview;
  }

  static async updateReviewApproval(reviewId: string, isApproved: boolean): Promise<void> {
    if (this.isClient()) {
      const res = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, isApproved }),
      });
      if (res.ok) {
        const reviews = await this.getReviews();
        const index = reviews.findIndex((r) => r.id === reviewId);
        if (index !== -1) {
          reviews[index].isApproved = isApproved;
          try {
            localStorage.setItem(LOCAL_STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
          } catch {}
        }
        return;
      }
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || 'Failed to update review approval.');
    }
  }

  static async approveReview(reviewId: string, isApproved: boolean): Promise<void> {
    return this.updateReviewApproval(reviewId, isApproved);
  }

  static async updateProductVariants(productId: string, variants: ProductVariant[]): Promise<void> {
    const products = await this.getProducts();
    const product = products.find((p) => p.id === productId);
    if (product) {
      product.variants = variants;
      await this.saveProduct(product);
    }
  }

  static async updateProductMedia(productId: string, media: ProductMedia[]): Promise<void> {
    const products = await this.getProducts();
    const product = products.find((p) => p.id === productId);
    if (product) {
      product.media = media;
      await this.saveProduct(product);
    }
  }

  static async deleteReview(reviewId: string): Promise<void> {
    if (this.isClient()) {
      const res = await fetch(`/api/admin/reviews?id=${encodeURIComponent(reviewId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const reviews = await this.getReviews();
        const filtered = reviews.filter((r) => r.id !== reviewId);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEYS.REVIEWS, JSON.stringify(filtered));
        } catch {}
        return;
      }
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || 'Failed to delete review.');
    }
  }

  // ============================================================================
  // 8. CUSTOMER MANAGEMENT FOR ADMIN
  // ============================================================================
  static async getCustomers(): Promise<CustomerRecord[]> {
    let profiles: CustomerProfile[] = [];
    let addresses: CustomerAddress[] = [];
    const orders = await this.getOrders();

    if (this.isClient()) {
      try {
        const res = await fetch('/api/admin/customers');
        if (res.ok) {
          const json = await res.json();
          if (json.profiles) profiles = json.profiles;
          if (json.addresses) addresses = json.addresses;
        }
      } catch (err) {
        console.warn('API /api/admin/customers fetch warning:', err);
      }
    }

    if (profiles.length === 0 && isSupabaseConfigured()) {
      try {
        const { data: profData, error: profErr } = await supabaseBrowser
          .from('customer_profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (profErr) {
          console.error('[DataStore.getCustomers] Supabase customer_profiles error:', {
            message: profErr.message,
            code: profErr.code,
            details: profErr.details,
            hint: profErr.hint,
          });
        }

        if (!profErr && profData) {
          profiles = profData.map((p: any) => ({
            id: p.id,
            fullName: p.full_name,
            phone: p.phone || undefined,
            email: p.email || undefined,
            createdAt: p.created_at,
            updatedAt: p.updated_at,
          }));
        }

        const { data: addrData, error: addrErr } = await supabaseBrowser
          .from('customer_addresses')
          .select('*');

        if (!addrErr && addrData) {
          addresses = addrData.map((a: any) => ({
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
        }
      } catch (err: any) {
        console.error('[DataStore.getCustomers] Exception loading customers:', err);
      }
    }

    if (this.isClient() && profiles.length === 0) {
      const localProf = localStorage.getItem('arh_customer_profile');
      if (localProf) {
        try {
          const p = JSON.parse(localProf);
          profiles = [p];
        } catch {}
      }
      const localAddrs = localStorage.getItem('arh_customer_addresses');
      if (localAddrs) {
        try {
          addresses = JSON.parse(localAddrs);
        } catch {}
      }
    }

    // Map existing profiles
    const customerMap = new Map<string, CustomerRecord>();

    profiles.forEach((p) => {
      const custOrders = orders.filter(
        (o) =>
          (o.userId && o.userId === p.id) ||
          (p.email && o.customerEmail && o.customerEmail.toLowerCase() === p.email.toLowerCase()) ||
          (p.phone && o.customerPhone && o.customerPhone.replace(/\D/g, '') === p.phone.replace(/\D/g, ''))
      );
      const custAddrs = addresses.filter((a) => a.userId === p.id);
      const totalSpent = custOrders.reduce((sum, o) => (o.status !== 'Cancelled' ? sum + o.totalAmount : sum), 0);

      const effectiveName =
        p.fullName && p.fullName !== 'Customer' && p.fullName.trim().length > 0
          ? p.fullName
          : custOrders[0]?.customerName || custAddrs[0]?.fullName || p.fullName || 'Valued Customer';

      customerMap.set(p.id, {
        id: p.id,
        fullName: effectiveName,
        email: p.email,
        phone: p.phone || custOrders[0]?.customerPhone || custAddrs[0]?.phone,
        createdAt: p.createdAt || new Date().toISOString(),
        updatedAt: p.updatedAt,
        addresses: custAddrs,
        orders: custOrders,
        totalSpent,
        totalOrders: custOrders.length,
      });
    });

    // Also synthesize customer profiles from orders if not already in customer_profiles
    orders.forEach((o) => {
      const key = o.userId || o.customerEmail?.toLowerCase() || o.customerPhone;
      if (!key) return;

      const alreadyExists = Array.from(customerMap.values()).some(
        (c) =>
          (o.userId && c.id === o.userId) ||
          (o.customerEmail && c.email?.toLowerCase() === o.customerEmail.toLowerCase()) ||
          (o.customerPhone && c.phone?.replace(/\D/g, '') === o.customerPhone.replace(/\D/g, ''))
      );

      if (!alreadyExists) {
        const matchingOrders = orders.filter(
          (m) =>
            (o.userId && m.userId === o.userId) ||
            (o.customerEmail && m.customerEmail?.toLowerCase() === o.customerEmail.toLowerCase()) ||
            (o.customerPhone && m.customerPhone?.replace(/\D/g, '') === o.customerPhone.replace(/\D/g, ''))
        );
        const totalSpent = matchingOrders.reduce((sum, m) => (m.status !== 'Cancelled' ? sum + m.totalAmount : sum), 0);

        customerMap.set(o.userId || `cust-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, {
          id: o.userId || `guest-${Date.now()}`,
          fullName: o.customerName || 'Customer',
          email: o.customerEmail || undefined,
          phone: o.customerPhone || undefined,
          createdAt: o.createdAt,
          addresses: [
            {
              id: `addr-${o.id}`,
              userId: o.userId || '',
              addressType: 'shipping',
              fullName: o.customerName,
              phone: o.customerPhone,
              address: o.address,
              city: o.city,
              province: o.province,
              isDefault: true,
              createdAt: o.createdAt,
            },
          ],
          orders: matchingOrders,
          totalSpent,
          totalOrders: matchingOrders.length,
        });
      }
    });

    return Array.from(customerMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}
