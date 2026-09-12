'use client';

import React from 'react';
import Link from 'next/link';
import { BrandHeroSlider } from '@/components/home/BrandHeroSlider';
import { BenefitsStrip } from '@/components/home/BenefitsStrip';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { FeaturesSection } from '@/components/home/FeaturesSection';
import { ProductCard } from '@/components/product/ProductCard';
import { useStore } from '@/context/StoreContext';
import { ArrowRight, ShoppingBag, PackageCheck } from 'lucide-react';
import { WhatsAppIcon } from '@/components/common/WhatsAppIcon';
import { getWhatsAppUrl, DISPLAY_WHATSAPP_NUMBER } from '@/lib/whatsapp';

export default function HomePage() {
  const { products, settings } = useStore();
  const activeProducts = products.filter((p) => p.isPublished);
  const homepageProducts = activeProducts.slice(0, 8);

  return (
    <div className="space-y-0 bg-light-bg dark:bg-[#11110F] text-charcoal-900 dark:text-[#F4F1E9] transition-colors duration-200">
      {/* 1. Full-Width Separate Desktop & Mobile Hero Slider */}
      <BrandHeroSlider />

      {/* 2. Promotional Benefits Strip Directly Below Hero Slider */}
      <BenefitsStrip />

      {/* 3. Main Categories Grid */}
      <CategoryGrid />

      {/* 4. Retail Delivery Guarantee Section */}
      <section className="py-10 bg-light-elevated dark:bg-[#191917] border-y border-light-border dark:border-[#34322D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-[11px] font-bold text-[#B89555] dark:text-[#C9A96A] uppercase tracking-wider block">
              Direct to Doorstep • 1 Piece Valid Order
            </span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-charcoal-900 dark:text-[#F4F1E9]">
              Free Nationwide Delivery on 3+ Pieces Across Pakistan.
            </h3>
            <p className="text-xs sm:text-sm text-charcoal-600 dark:text-[#B8B3A8]">
              Order 1 or 2 pieces with standard Rs. 200 delivery, or get 100% Free Delivery on any 3 or more garments.
            </p>
          </div>

          <Link
            href="/shop"
            className="flex-shrink-0 inline-flex items-center gap-2 bg-champagne-500 hover:bg-champagne-400 text-charcoal-950 font-bold text-xs py-3.5 px-6 rounded-xl shadow-xs transition-all active:scale-[0.99]"
          >
            <PackageCheck className="w-4 h-4" />
            <span>Shop Premium Collection</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* 5. Featured Available Products Section (Max 8 Products in 4x2 Grid) */}
      <section className="py-16 bg-white dark:bg-[#141412] border-b border-light-border dark:border-[#34322D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10">
            <div>
              <span className="text-[10px] font-bold text-[#B89555] dark:text-[#C9A96A] uppercase tracking-widest">
                Store Collection
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-charcoal-900 dark:text-[#F4F1E9] mt-1">
                Available Products
              </h2>
              <p className="text-xs sm:text-sm text-charcoal-500 dark:text-[#B8B3A8] mt-1 font-normal">
                Select your size and sleeve options directly to order online or via WhatsApp.
              </p>
            </div>

            <Link
              href="/shop"
              className="mt-4 sm:mt-0 inline-flex items-center gap-1.5 text-xs font-bold text-[#B89555] dark:text-[#C9A96A] hover:underline transition-colors"
            >
              <span>Explore Full Shop</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {homepageProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Prominent "View All Products" Button below products */}
          <div className="mt-12 text-center">
            <Link
              href="/shop"
              className="inline-flex items-center justify-center gap-2 bg-champagne-500 hover:bg-champagne-400 text-charcoal-950 font-bold text-xs py-3.5 px-8 rounded-xl shadow-xs transition-all active:scale-[0.99]"
            >
              <ShoppingBag className="w-4 h-4 stroke-[2.2]" />
              <span>View All Products</span>
              <ArrowRight className="w-4 h-4 ml-1 stroke-[2.2]" />
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Quality & Delivery Features */}
      <FeaturesSection />

      {/* 7. Direct WhatsApp Consultation Banner */}
      <section className="py-14 bg-light-elevated dark:bg-[#191917] border-t border-light-border dark:border-[#34322D] text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <span className="inline-block text-[10px] font-bold tracking-widest uppercase text-[#B89555] dark:text-[#C9A96A]">
            Direct Customer Support
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-charcoal-900 dark:text-[#F4F1E9] tracking-tight">
            Order or Inquire Directly with Muhammad Amin
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-500 dark:text-[#B8B3A8] max-w-xl mx-auto leading-relaxed font-normal">
            Have questions about fabric quality, sleeve styles, or delivery anywhere in Pakistan? We are available on WhatsApp.
          </p>
          <div className="pt-2 flex justify-center">
            <a
              href={getWhatsAppUrl(
                settings?.whatsapp || DISPLAY_WHATSAPP_NUMBER,
                'Assalam-o-Alaikum Amin Raisat Hosiery, I want to inquire about placing an order.'
              )}
              target="_blank"
              rel="noopener noreferrer"
              id="homepage-whatsapp-cta"
              className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs py-3.5 px-7 rounded-xl shadow-xs transition-all active:scale-[0.99]"
            >
              <WhatsAppIcon size={18} className="text-white fill-current" />
              <span>Chat on WhatsApp ({settings?.whatsapp || DISPLAY_WHATSAPP_NUMBER})</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
