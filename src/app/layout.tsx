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
    icon: '/images/Favicon Logo.jpeg',
    shortcut: '/images/Favicon Logo.jpeg',
    apple: '/images/Favicon Logo.jpeg',
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
    images: [{ url: '/images/header logo.png', width: 800, height: 300, alt: 'Amin Raisat Hosiery' }],
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
    <html lang="en" suppressHydrationWarning className="light">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var stored = localStorage.getItem('arh_theme_mode');
                var theme = (stored === 'dark') ? 'dark' : 'light';
                if (theme === 'dark') {
                  document.documentElement.classList.remove('light');
                  document.documentElement.classList.add('dark');
                  document.documentElement.style.colorScheme = 'dark';
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                  document.documentElement.style.colorScheme = 'light';
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-light-bg dark:bg-dark-bg text-light-text dark:text-gray-100 antialiased selection:bg-gold-500 selection:text-black">
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
