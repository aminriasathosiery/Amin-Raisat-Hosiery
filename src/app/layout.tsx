import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { StoreProvider } from '@/context/StoreContext';
import { CartProvider } from '@/context/CartContext';
import { PublicLayoutShell } from '@/components/layout/PublicLayoutShell';
import {
  getCachedPublicProducts,
  getCachedPublicCategories,
  getCachedHeroSlides,
  getCachedPublicSettings,
  getCachedFeaturedDeals,
  buildSlimCatalogSummaries,
} from '@/lib/catalogServer';
import { Product, Category, Subcategory, HeroSlide, SiteSettings, Deal } from '@/types';
import { INITIAL_CATEGORIES, INITIAL_SUBCATEGORIES, INITIAL_SITE_SETTINGS } from '@/data/initialData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  let freeThreshold = INITIAL_SITE_SETTINGS.shipping.freeDeliveryThreshold;
  try {
    const liveSettings = await getCachedPublicSettings();
    freeThreshold = liveSettings?.shipping?.freeDeliveryThreshold ?? freeThreshold;
  } catch {}

  const deliveryMetaPhrase =
    freeThreshold > 0
      ? `Free Delivery on ${freeThreshold}+ pieces across Pakistan.`
      : 'Nationwide delivery across Pakistan.';

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://aminraisathosiery.com'),
    title: 'Amin Raisat Hosiery — Pure Cotton Vests & Innerwear Pakistan',
    description: `Shop premium 100% fine combed cotton Men's Vests in High Quality (taped seams) and Standard Quality. Nationwide delivery across Pakistan with ${deliveryMetaPhrase}`,
    icons: {
      icon: '/logo2-bg.jpeg',
      shortcut: '/logo2-bg.jpeg',
      apple: '/logo2-bg.jpeg',
    },
    keywords: [
      'Amin Raisat Hosiery',
      'Men Vest Pakistan',
      'Cotton Banyan Pakistan',
      'Sando Vest',
      'Full Sleeve Vest',
      'Combed Cotton Innerwear',
      'Faisalabad Hosiery',
      'Premium Cotton Hosiery Pakistan',
    ],
    authors: [{ name: 'Muhammad Amin' }],
    openGraph: {
      title: 'Amin Raisat Hosiery — Pure Cotton Innerwear Pakistan',
      description: `Premium 100% fine combed cotton vests and innerwear. ${deliveryMetaPhrase}`,
      siteName: 'Amin Raisat Hosiery',
      images: [{ url: '/logo2.png', width: 800, height: 300, alt: 'Amin Raisat Hosiery' }],
      locale: 'en_PK',
      type: 'website',
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let initialProducts: Product[] = [];
  let initialCategories: Category[] = INITIAL_CATEGORIES;
  let initialSubcategories: Subcategory[] = INITIAL_SUBCATEGORIES;
  let initialHeroSlides: HeroSlide[] = [];
  let initialSettings: SiteSettings = INITIAL_SITE_SETTINGS;
  let initialDeals: Deal[] = [];
  try {
    const [prods, catData, slides, sets, deals] = await Promise.all([
      getCachedPublicProducts(),
      getCachedPublicCategories(),
      getCachedHeroSlides(),
      getCachedPublicSettings(),
      getCachedFeaturedDeals(),
    ]);
    initialProducts = buildSlimCatalogSummaries(prods);
    initialCategories = catData.categories;
    initialSubcategories = catData.subcategories;
    initialHeroSlides = slides;
    initialSettings = sets;
    initialDeals = deals;
  } catch (err) {
    console.warn('RootLayout initial data fetch notice:', err);
  }

  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-[#F7F3EA] text-[#1D2730] antialiased selection:bg-[#C99A3D] selection:text-white">
        <AuthProvider>
          <StoreProvider
            initialProducts={initialProducts}
            initialCategories={initialCategories}
            initialSubcategories={initialSubcategories}
            initialHeroSlides={initialHeroSlides}
            initialSettings={initialSettings}
            initialDeals={initialDeals}
          >
            <CartProvider>
              <PublicLayoutShell>{children}</PublicLayoutShell>
            </CartProvider>
          </StoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
