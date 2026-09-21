'use client';

import React from 'react';
import Link from 'next/link';
import { BrandHeroSlider } from '@/components/home/BrandHeroSlider';
import { BenefitsStrip } from '@/components/home/BenefitsStrip';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { FeaturesSection } from '@/components/home/FeaturesSection';
import { DealsSection } from '@/components/home/DealsSection';
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
    <div className="space-y-0 bg-[#F7F3EA] text-[#1D2730]">
      {/* 1. Full-Width Separate Desktop & Mobile Hero Slider */}
      <BrandHeroSlider />

      {/* 2. Promotional Benefits Strip Directly Below Hero Slider */}
      <BenefitsStrip />

      {/* 3. Main Categories Grid */}
      <CategoryGrid />

      {/* 4. Retail Delivery Guarantee Section */}
      <section className="py-10 bg-[#EEE8DC] border-y border-[#D8D0C3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-[11px] font-bold text-[#C99A3D] uppercase tracking-wider block">
              Direct to Doorstep • 1 Piece Valid Order
            </span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-[#1D2730]">
              Free Nationwide Delivery on 3+ Pieces Across Pakistan.
            </h3>
            <p className="text-xs sm:text-sm text-[#66717C]">
              Order 1 or 2 pieces with standard Rs. 200 delivery, or get 100% Free Delivery on any 3 or more garments.
            </p>
          </div>

          <Link
            href="/shop"
            className="flex-shrink-0 inline-flex items-center gap-2 bg-[#23384D] hover:bg-[#182B3D] text-white font-bold text-xs py-3.5 px-6 rounded-xl shadow-xs transition-all active:scale-[0.99]"
          >
            <PackageCheck className="w-4 h-4" />
            <span>Shop Premium Collection</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* 5. Special Deals Section */}
      <DealsSection />

      {/* 6. Featured Available Products Section (Max 8 Products in 4x2 Grid) */}
      <section className="py-16 bg-white border-b border-[#D8D0C3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10">
            <div>
              <span className="text-[10px] font-bold text-[#C99A3D] uppercase tracking-widest">
                Store Collection
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#1D2730] mt-1">
                Available Products
              </h2>
              <p className="text-xs sm:text-sm text-[#66717C] mt-1 font-normal">
                Select your size and sleeve options directly to order online or via WhatsApp.
              </p>
            </div>

            <Link
              href="/shop"
              className="mt-4 sm:mt-0 inline-flex items-center gap-1.5 text-xs font-bold text-[#23384D] hover:text-[#C99A3D] transition-colors"
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
              className="inline-flex items-center justify-center gap-2 bg-[#23384D] hover:bg-[#182B3D] text-white font-bold text-xs py-3.5 px-8 rounded-xl shadow-xs transition-all active:scale-[0.99]"
            >
              <ShoppingBag className="w-4 h-4 stroke-[2.2]" />
              <span>View All Products</span>
              <ArrowRight className="w-4 h-4 ml-1 stroke-[2.2]" />
            </Link>
          </div>
        </div>
      </section>

      {/* 7. Quality & Delivery Features */}
      <FeaturesSection />

      {/* 8. Direct WhatsApp Consultation Banner */}
      <section className="py-14 bg-[#EEE8DC] border-t border-[#D8D0C3] text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <span className="inline-block text-[10px] font-bold tracking-widest uppercase text-[#C99A3D]">
            Direct Customer Support
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1D2730] tracking-tight">
            Order or Inquire Directly with Muhammad Amin
          </h2>
          <p className="text-xs sm:text-sm text-[#66717C] max-w-xl mx-auto leading-relaxed font-normal">
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
