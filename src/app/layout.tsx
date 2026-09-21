import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { StoreProvider } from '@/context/StoreContext';
import { CartProvider } from '@/context/CartContext';
import { PublicLayoutShell } from '@/components/layout/PublicLayoutShell';
import { DataStore } from '@/lib/store';
import { Product } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://aminraisathosiery.com'),
  title: "Amin Raisat Hosiery — Pure Cotton Vests & Innerwear Pakistan",
  description:
    "Shop premium 100% fine combed cotton Men's Vests in High Quality (taped seams) and Standard Quality. Nationwide delivery across Pakistan with Free Delivery on 3+ pieces.",
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
    description:
      'Premium 100% fine combed cotton vests and innerwear. Free Delivery on 3+ pieces across Pakistan.',
    siteName: 'Amin Raisat Hosiery',
    images: [{ url: '/logo2.png', width: 800, height: 300, alt: 'Amin Raisat Hosiery' }],
    locale: 'en_PK',
    type: 'website',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let initialProducts: Product[] = [];
  try {
    initialProducts = await DataStore.getProducts();
  } catch (err) {
    console.warn('RootLayout initial products fetch notice:', err);
  }

  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-[#F7F3EA] text-[#1D2730] antialiased selection:bg-[#C99A3D] selection:text-white">
        <ThemeProvider>
          <AuthProvider>
            <StoreProvider initialProducts={initialProducts}>
              <CartProvider>
                  <PublicLayoutShell>{children}</PublicLayoutShell>
              </CartProvider>
            </StoreProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
