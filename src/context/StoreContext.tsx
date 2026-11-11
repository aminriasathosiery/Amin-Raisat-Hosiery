'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  Product,
  Category,
  Subcategory,
  SiteSettings,
  Order,
  ProductVariant,
  ProductMedia,
  OrderStatus,
  ProductReview,
  HeroSlide,
  Deal,
} from '@/types';
import { DataStore } from '@/lib/store';
import { INITIAL_CATEGORIES, INITIAL_SUBCATEGORIES, INITIAL_SITE_SETTINGS, INITIAL_HERO_SLIDES } from '@/data/initialData';

function computeCategoriesWithCounts(
  prods: Product[],
  cats: Category[],
  subcats: Subcategory[]
): { categories: Category[]; subcategories: Subcategory[] } {
  const activeProducts = prods.filter((p) => p.isPublished);
  const subcatsWithCount = subcats.map((sub) => ({
    ...sub,
    productCount: activeProducts.filter(
      (p) => p.subcategoryId === sub.id || p.subcategoryId === sub.slug
    ).length,
  }));

  const catsWithCount = cats.map((cat) => ({
    ...cat,
    productCount: activeProducts.filter(
      (p) =>
        p.categoryId === cat.id ||
        p.categoryId === cat.slug ||
        (cat.slug === 'men' && (!p.categoryId || p.categoryId === 'cat-men')) ||
        (cat.slug === 'women' && p.categoryId === 'cat-women') ||
        (cat.slug === 'kids' && p.categoryId === 'cat-kids')
    ).length,
    subcategories: subcatsWithCount.filter((sub) => sub.categoryId === cat.id),
  }));

  return { categories: catsWithCount, subcategories: subcatsWithCount };
}

interface StoreContextType {
  products: Product[];
  categories: Category[];
  subcategories: Subcategory[];
  settings: SiteSettings;
  orders: Order[];
  reviews: ProductReview[];
  heroSlides: HeroSlide[];
  featuredDeals: Deal[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
  updateProductVariants: (productId: string, variants: ProductVariant[]) => Promise<void>;
  updateProductMedia: (productId: string, media: ProductMedia[]) => Promise<void>;
  saveProduct: (product: Product) => Promise<void>;
  duplicateProduct: (productId: string) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  saveCategory: (category: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  saveSubcategory: (subcategory: Subcategory) => Promise<void>;
  deleteSubcategory: (id: string) => Promise<void>;
  saveHeroSlide: (slide: HeroSlide) => Promise<void>;
  deleteHeroSlide: (id: string) => Promise<void>;
  uploadMediaFile: (file: File, folderOrBucket?: string, subfolder?: string) => Promise<string>;
  submitReview: (
    review: Omit<ProductReview, 'id' | 'createdAt' | 'isApproved'>,
    token?: string
  ) => Promise<ProductReview>;
  approveReview: (id: string, isApproved: boolean) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;
  updateSettings: (newSettings: SiteSettings) => Promise<void>;
  createOrder: (
    orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'status'> & { idempotencyKey?: string }
  ) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  bulkDeleteOrders: (orderIds: string[]) => Promise<void>;
  loadOrders: () => Promise<void>;
  loadReviews: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

interface StoreProviderProps {
  children: React.ReactNode;
  initialProducts?: Product[];
  initialCategories?: Category[];
  initialSubcategories?: Subcategory[];
  initialHeroSlides?: HeroSlide[];
  initialSettings?: SiteSettings;
  initialDeals?: Deal[];
}

export const StoreProvider: React.FC<StoreProviderProps> = ({
  children,
  initialProducts,
  initialCategories,
  initialSubcategories,
  initialHeroSlides,
  initialSettings,
  initialDeals,
}) => {
  const [products, setProducts] = useState<Product[]>(() => {
    if (initialProducts && initialProducts.length > 0) {
      return initialProducts;
    }
    return [];
  });
  const initialMapped = computeCategoriesWithCounts(
    initialProducts || [],
    initialCategories && initialCategories.length > 0 ? initialCategories : INITIAL_CATEGORIES,
    initialSubcategories && initialSubcategories.length > 0 ? initialSubcategories : INITIAL_SUBCATEGORIES
  );
  const [categories, setCategories] = useState<Category[]>(initialMapped.categories);
  const [subcategories, setSubcategories] = useState<Subcategory[]>(initialMapped.subcategories);
  const [settings, setSettings] = useState<SiteSettings>(() => initialSettings || INITIAL_SITE_SETTINGS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [featuredDeals] = useState<Deal[]>(() => initialDeals || []);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(() => {
    if (initialHeroSlides && initialHeroSlides.length > 0) {
      return initialHeroSlides;
    }
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('arh_hero_slides_v5');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {}
    }
    return INITIAL_HERO_SLIDES;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    // Do NOT flash a full-screen spinner if SSR already hydrated products!
    return !(initialProducts && initialProducts.length > 0);
  });

  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      setProducts(initialProducts);
    }
  }, [initialProducts]);

  useEffect(() => {
    if (initialHeroSlides && initialHeroSlides.length > 0) {
      setHeroSlides(initialHeroSlides);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('arh_hero_slides_v5', JSON.stringify(initialHeroSlides));
        } catch {}
      }
    }
  }, [initialHeroSlides]);

  // Fast independent hero slides sync & live event listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncHeroSlides = () => {
      try {
        const cached = localStorage.getItem('arh_hero_slides_v5');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setHeroSlides(parsed);
          }
        }
      } catch {}
    };

    // Instant local storage check when no SSR slides were passed
    if (!initialHeroSlides || initialHeroSlides.length === 0) {
      syncHeroSlides();
      DataStore.getHeroSlides().then((slides) => {
        if (slides && slides.length > 0) {
          setHeroSlides(slides);
          try {
            localStorage.setItem('arh_hero_slides_v5', JSON.stringify(slides));
          } catch {}
        }
      }).catch((err) => console.warn('Fast hero fetch notice:', err));
    }

    // Listen for custom slide update events and cross-tab storage changes
    const handleUpdate = () => syncHeroSlides();
    window.addEventListener('arh_hero_slides_updated', handleUpdate);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'arh_hero_slides_v5') {
        syncHeroSlides();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('arh_hero_slides_updated', handleUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [initialHeroSlides]);

  const loadData = async () => {
    try {
      const [prods, cats, subcats, sets, slides] = await Promise.all([
        DataStore.getProducts(),
        DataStore.getCategories(),
        DataStore.getSubcategories(),
        DataStore.getSettings(),
        DataStore.getHeroSlides(),
      ]);

      const computed = computeCategoriesWithCounts(prods, cats, subcats);

      setProducts(prods);
      setCategories(computed.categories);
      setSubcategories(computed.subcategories);
      setSettings(sets);
      setHeroSlides(slides);
      setIsLoading(false);

      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
        DataStore.getReviews().then((revs) => {
          if (revs && revs.length > 0) setReviews(revs);
        }).catch((err) => console.warn('Non-critical reviews fetch notice:', err));
      }
    } catch (err) {
      console.error('Failed to load store data:', err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
    const hasInitialHydration = Boolean(initialProducts && initialProducts.length > 0);
    // Avoid 7 redundant client-side fetches on public storefront when SSR already hydrated the catalog
    if (isAdminRoute || !hasInitialHydration) {
      loadData();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateProductVariants = async (productId: string, variants: ProductVariant[]) => {
    await DataStore.updateProductVariants(productId, variants);
    await loadData();
  };

  const updateProductMedia = async (productId: string, media: ProductMedia[]) => {
    await DataStore.updateProductMedia(productId, media);
    await loadData();
  };

  const saveProduct = async (product: Product) => {
    await DataStore.saveProduct(product);
    await loadData();
  };

  const duplicateProduct = async (productId: string) => {
    const duplicated = await DataStore.duplicateProduct(productId);
    await loadData();
    return duplicated;
  };

  const deleteProduct = async (id: string) => {
    await DataStore.deleteProduct(id);
    await loadData();
  };

  const saveCategory = async (category: Category) => {
    await DataStore.saveCategory(category);
    await loadData();
  };

  const deleteCategory = async (id: string) => {
    await DataStore.deleteCategory(id);
    await loadData();
  };

  const saveSubcategory = async (subcategory: Subcategory) => {
    await DataStore.saveSubcategory(subcategory);
    await loadData();
  };

  const deleteSubcategory = async (id: string) => {
    await DataStore.deleteSubcategory(id);
    await loadData();
  };

  const uploadMediaFile = async (file: File, folderOrBucket = 'product-media', subfolder?: string) => {
    return await DataStore.uploadMediaFile(file, folderOrBucket, subfolder);
  };

  const submitReview = async (
    reviewData: Omit<ProductReview, 'id' | 'createdAt' | 'isApproved'>,
    token?: string
  ) => {
    const rev = await DataStore.submitReview(reviewData, token);
    await loadData();
    return rev;
  };

  const loadReviews = async () => {
    try {
      const revs = await DataStore.getReviews();
      if (revs && Array.isArray(revs)) {
        setReviews(revs);
      }
    } catch (err) {
      console.warn('Reviews fetch notice:', err);
    }
  };

  const approveReview = async (id: string, isApproved: boolean) => {
    await DataStore.approveReview(id, isApproved);
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isApproved } : r))
    );
    await loadReviews();
  };

  const deleteReview = async (id: string) => {
    await DataStore.deleteReview(id);
    setReviews((prev) => prev.filter((r) => r.id !== id));
    await loadReviews();
  };

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  // Listen for live settings updates (cross-tab & same-tab)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleSettingsUpdated = () => {
      DataStore.getSettings()
        .then((fresh) => setSettings(fresh))
        .catch(() => {});
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'arh_settings_v3' && e.newValue) {
        try {
          setSettings(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener('arh_settings_updated', handleSettingsUpdated);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('arh_settings_updated', handleSettingsUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const updateSettings = async (newSettings: SiteSettings) => {
    await DataStore.updateSettings(newSettings);
    setSettings(newSettings);
    const fresh = await DataStore.getSettings();
    setSettings(fresh);
  };

  const createOrder = async (
    orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'status'> & { idempotencyKey?: string }
  ) => {
    const order = await DataStore.createOrder(orderData);
    setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
    return order;
  };

  const saveHeroSlide = async (slide: HeroSlide) => {
    // Optimistically update hero slides immediately in memory and local storage
    setHeroSlides((prev) => {
      const idx = prev.findIndex((s) => s.id === slide.id);
      let updated: HeroSlide[];
      if (idx !== -1) {
        updated = [...prev];
        updated[idx] = { ...updated[idx], ...slide, updatedAt: new Date().toISOString() };
      } else {
        updated = [...prev, { ...slide, updatedAt: new Date().toISOString() }];
      }
      try {
        localStorage.setItem('arh_hero_slides_v5', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    await DataStore.saveHeroSlide(slide);
    const freshSlides = await DataStore.getHeroSlides();
    setHeroSlides(freshSlides);
  };

  const deleteHeroSlide = async (id: string) => {
    // Optimistically remove hero slide immediately
    setHeroSlides((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      try {
        localStorage.setItem('arh_hero_slides_v5', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    await DataStore.deleteHeroSlide(id);
    const freshSlides = await DataStore.getHeroSlides();
    setHeroSlides(freshSlides);
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    await DataStore.updateOrderStatus(orderId, status);
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId || o.orderNumber === orderId ? { ...o, status } : o))
    );
  };

  const deleteOrder = async (orderId: string) => {
    await DataStore.deleteOrder(orderId);
    setOrders((prev) => prev.filter((o) => o.id !== orderId && o.orderNumber !== orderId));
  };

  const bulkDeleteOrders = async (orderIds: string[]) => {
    await DataStore.deleteOrders(orderIds);
    setOrders((prev) => prev.filter((o) => !orderIds.includes(o.id) && !orderIds.includes(o.orderNumber)));
  };

  const loadOrders = async () => {
    try {
      const ords = await DataStore.getOrders();
      if (ords && Array.isArray(ords)) {
        setOrders(ords);
      }
    } catch (err) {
      console.warn('Orders fetch notice:', err);
    }
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        categories,
        subcategories,
        settings,
        orders,
        reviews,
        heroSlides,
        featuredDeals,
        isLoading,
        refreshData: loadData,
        updateProductVariants,
        updateProductMedia,
        saveProduct,
        duplicateProduct,
        deleteProduct,
        saveCategory,
        deleteCategory,
        saveSubcategory,
        deleteSubcategory,
        saveHeroSlide,
        deleteHeroSlide,
        uploadMediaFile,
        submitReview,
        approveReview,
        deleteReview,
        updateSettings,
        createOrder,
        updateOrderStatus,
        deleteOrder,
        bulkDeleteOrders,
        loadOrders,
        loadReviews,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
