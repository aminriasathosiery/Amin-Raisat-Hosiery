'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useStore } from '@/context/StoreContext';
import { ProductGallery } from '@/components/product/ProductGallery';
import { VariantSelector } from '@/components/product/VariantSelector';
import { ProductReviews } from '@/components/product/ProductReviews';
import { SleeveType, ProductSize } from '@/types';
import { ChevronRight, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { DISPLAY_WHATSAPP_NUMBER } from '@/lib/whatsapp';

export default function ProductDetailPage() {
  const params = useParams();

  const slug = params?.slug as string;
  const { products, categories, subcategories, settings, isLoading } = useStore();

  const product = products.find((p) => p.slug === slug || p.id === slug) || products[0];

  // Variant Selections State
  const [selectedSleeve, setSelectedSleeve] = useState<SleeveType>(() => {
    return product?.variants?.[0]?.sleeve || 'Sleeveless';
  });
  const [selectedSize, setSelectedSize] = useState<ProductSize>('L');

  // Accordion Sections State
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    description: true,
    care: false,
    shipping: false,
    returns: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-light-bg dark:bg-[#11110F]">
        <div className="w-9 h-9 border-4 border-[#B89555] dark:border-[#C9A96A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center bg-light-bg dark:bg-[#11110F]">
        <h1 className="text-2xl font-bold text-charcoal-900 dark:text-[#F4F1E9]">Product Not Found</h1>
        <p className="text-xs text-charcoal-500 dark:text-[#B8B3A8] mt-2">The product you requested does not exist or has been moved.</p>
        <Link
          href="/shop"
          className="mt-6 inline-block bg-champagne-500 text-charcoal-950 text-xs font-bold py-3 px-6 rounded-xl shadow-xs"
        >
          Return to Catalog
        </Link>
      </div>
    );
  }

  const category = categories.find((c) => c.id === product.categoryId || c.slug === product.categoryId);
  const subcategory = subcategories.find((s) => s.id === product.subcategoryId || s.slug === product.subcategoryId);

  const reviewsCount = product.reviews?.length || 0;
  const avgRating =
    reviewsCount > 0
      ? (product.reviews!.reduce((sum, r) => sum + r.rating, 0) / reviewsCount).toFixed(1)
      : null;

  return (
    <div className="min-h-screen py-10 bg-light-bg dark:bg-[#11110F] text-charcoal-900 dark:text-[#F4F1E9] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-charcoal-500 dark:text-[#B8B3A8] mb-8 flex-wrap">
          <Link href="/" className="hover:text-[#B89555] dark:hover:text-[#C9A96A] transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3 h-3 text-charcoal-400 dark:text-[#6E6A62]" />
          <Link href="/shop" className="hover:text-[#B89555] dark:hover:text-[#C9A96A] transition-colors">
            Shop
          </Link>
          {category && (
            <>
              <ChevronRight className="w-3 h-3 text-charcoal-400 dark:text-[#6E6A62]" />
              <Link href={`/category/${category.slug}`} className="hover:text-[#B89555] dark:hover:text-[#C9A96A] capitalize transition-colors">
                {category.name}&apos;s Collection
              </Link>
            </>
          )}
          {subcategory && (
            <>
              <ChevronRight className="w-3 h-3 text-charcoal-400 dark:text-[#6E6A62]" />
              <Link
                href={`/category/${category?.slug || 'men'}/${subcategory.slug}`}
                className="hover:text-[#B89555] dark:hover:text-[#C9A96A] capitalize transition-colors"
              >
                {subcategory.name}
              </Link>
            </>
          )}
          <ChevronRight className="w-3 h-3 text-charcoal-400 dark:text-[#6E6A62]" />
          <span className="font-semibold text-charcoal-900 dark:text-[#F4F1E9] truncate max-w-[200px] sm:max-w-none">{product.name}</span>
        </nav>

        {/* Main Product Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Column: Dynamic Variant Media Gallery */}
          <div className="lg:col-span-6">
            <ProductGallery
              media={product.media}
              productName={product.name}
              selectedSleeve={selectedSleeve}
              videoUrl={product.videoUrl}
            />
          </div>

          {/* Right Column: Details & Variant Selection */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#96763D] dark:text-[#C9A96A] uppercase tracking-widest block">
                  {category ? category.name : 'Men'} &gt; {subcategory ? subcategory.name : 'Vests'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 dark:text-[#F4F1E9] mt-1 tracking-tight leading-tight">
                {product.name}
              </h1>

              {/* Short Description / Tagline */}
              {(product.shortDescription || product.subtitle) && (
                <p className="text-xs sm:text-sm text-charcoal-600 dark:text-[#B8B3A8] mt-1.5 font-normal leading-relaxed">
                  {product.shortDescription || product.subtitle}
                </p>
              )}

              {/* Rating Summary (Clickable to scroll to reviews) */}
              <div className="flex items-center gap-3 mt-3.5 pt-3.5 border-t border-light-border dark:border-[#34322D]">
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex items-center gap-1.5 text-left group hover:opacity-85 transition-opacity"
                  aria-label="View customer reviews"
                >
                  <div className="flex text-[#B89555] dark:text-[#C9A96A]">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= Math.round(Number(avgRating || 5)) ? 'fill-current' : 'text-charcoal-300 dark:text-[#6E6A62]'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-charcoal-900 dark:text-[#F4F1E9]">{avgRating || '5.0'}</span>
                  <span className="text-xs text-charcoal-500 dark:text-[#B8B3A8] group-hover:underline">
                    ({reviewsCount} {reviewsCount === 1 ? 'review' : 'reviews'})
                  </span>
                </button>
                <span className="text-charcoal-300 dark:text-[#6E6A62]">•</span>
                <span className="text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8]">Made in Faisalabad, Pakistan</span>
              </div>
            </div>

            {/* Reactive Variant Selector (Sleeve, Size, Price, Retail mode, Add to Cart, WhatsApp) */}
            <VariantSelector
              product={product}
              selectedSleeve={selectedSleeve}
              setSelectedSleeve={setSelectedSleeve}
              selectedSize={selectedSize}
              setSelectedSize={setSelectedSize}
            />

            {/* Clean Accordion Sections */}
            <div className="border-t border-light-border dark:border-[#34322D] divide-y divide-light-border dark:divide-[#34322D] pt-2 text-xs">
              {/* 1. Description & Key Features */}
              <div className="py-3.5">
                <button
                  onClick={() => toggleSection('description')}
                  className="w-full flex items-center justify-between font-bold text-charcoal-800 dark:text-[#F4F1E9] text-left py-1 hover:text-[#B89555] dark:hover:text-[#C9A96A] transition-colors"
                >
                  <span>Product Description &amp; Features</span>
                  {openSections.description ? <ChevronUp className="w-4 h-4 text-[#B89555] dark:text-[#C9A96A]" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openSections.description && (
                  <div className="pt-2 text-charcoal-600 dark:text-[#B8B3A8] space-y-2.5 font-normal leading-relaxed">
                    <p>{product.description}</p>
                    {product.features && product.features.length > 0 && (
                      <ul className="space-y-1.5 pl-4 list-disc text-charcoal-600 dark:text-[#B8B3A8]">
                        {product.features.map((feat, idx) => (
                          <li key={idx}>{feat}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              {/* 2. Care Instructions */}
              <div className="py-3.5">
                <button
                  onClick={() => toggleSection('care')}
                  className="w-full flex items-center justify-between font-bold text-charcoal-800 dark:text-[#F4F1E9] text-left py-1 hover:text-[#B89555] dark:hover:text-[#C9A96A] transition-colors"
                >
                  <span>Fabric Care Instructions</span>
                  {openSections.care ? <ChevronUp className="w-4 h-4 text-[#B89555] dark:text-[#C9A96A]" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openSections.care && (
                  <div className="pt-2 text-charcoal-600 dark:text-[#B8B3A8] font-normal">
                    <ul className="space-y-1.5 pl-4 list-disc">
                      {product.careInstructions.map((care, idx) => (
                        <li key={idx}>{care}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* 4. Shipping & Delivery Terms */}
              <div className="py-3.5">
                <button
                  onClick={() => toggleSection('shipping')}
                  className="w-full flex items-center justify-between font-bold text-charcoal-800 dark:text-[#F4F1E9] text-left py-1 hover:text-[#B89555] dark:hover:text-[#C9A96A] transition-colors"
                >
                  <span>Nationwide Pakistan Shipping &amp; Delivery</span>
                  {openSections.shipping ? <ChevronUp className="w-4 h-4 text-[#B89555] dark:text-[#C9A96A]" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openSections.shipping && (
                  <div className="pt-2 text-charcoal-600 dark:text-[#B8B3A8] space-y-1.5 font-normal leading-relaxed">
                    <p>{product.shippingInfo}</p>
                    <p className="font-semibold text-charcoal-900 dark:text-[#F4F1E9]">
                      • 1 piece is a valid order (Minimum order quantity is 1 piece).
                    </p>
                    <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                      • 100% FREE DELIVERY on 3+ pieces across Pakistan (Standard Rs. {settings.shipping?.baseDeliveryCharge ?? 200} delivery fee for 1 or 2 pieces).
                    </p>
                    <p>• Cash on Delivery (COD) and Direct Bank Transfer available.</p>
                  </div>
                )}
              </div>

              {/* 5. Exchange & Return Policy */}
              <div className="py-3.5">
                <button
                  onClick={() => toggleSection('returns')}
                  className="w-full flex items-center justify-between font-bold text-charcoal-800 dark:text-[#F4F1E9] text-left py-1 hover:text-[#B89555] dark:hover:text-[#C9A96A] transition-colors"
                >
                  <span>Exchange &amp; Return Policy ({settings.exchangeReturnDays || 7} Days)</span>
                  {openSections.returns ? <ChevronUp className="w-4 h-4 text-[#B89555] dark:text-[#C9A96A]" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openSections.returns && (
                  <div className="pt-2 text-charcoal-600 dark:text-[#B8B3A8] font-normal leading-relaxed">
                    <p>
                      {product.returnPolicy ||
                        'We offer a 7-day hassle-free exchange policy for any manufacturing defect or sizing mismatch. Product must remain unwashed and unworn.'}
                    </p>
                    <p className="mt-1 font-semibold text-[#96763D] dark:text-[#C9A96A]">
                      To initiate an exchange, message us directly on WhatsApp ({settings?.whatsapp || DISPLAY_WHATSAPP_NUMBER}).
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Customer Reviews Section */}
        <div id="reviews-section" className="scroll-mt-10">
          <ProductReviews
            productId={product.id}
            productName={product.name}
            reviews={product.reviews}
          />
        </div>
      </div>
    </div>
  );
}
