'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Deal } from '@/types';
import { formatPKR } from '@/lib/pricing';
import { Package, Percent, Truck, CheckCircle, ArrowLeft, ShoppingCart, Info } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export function DealDetailClient({ deal }: { deal: Deal }) {
  const router = useRouter();
  const { addItem, setBuyNowItem } = useCart();

  const dealCartItem = {
    id: `deal_${deal.id}`,
    type: 'deal' as const,
    dealId: deal.id,
    dealName: deal.name,
    dealSlug: deal.slug,
    dealImage: deal.imageUrl,
    piecesCount: deal.piecesCount,
    originalPrice: deal.originalPrice,
    discountPercentage: deal.discountPercentage,
    unitPrice: deal.salePrice,
    isFreeDelivery: deal.isFreeDelivery,
    quantity: 1,
    size: '',
  };

  const handleAddToCart = () => {
    addItem(dealCartItem);
  };

  const handleBuyNow = () => {
    // ISOLATION: Use setBuyNowItem so the deal purchase is completely isolated
    // from the persistent cart — exactly the same pattern as VariantSelector/ProductCard.
    setBuyNowItem(dealCartItem);
    router.push('/checkout?buyNow=1');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1A1A1A]">
      {/* Breadcrumb */}
      <div className="bg-white dark:bg-[#22211E] border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link
            href="/deals"
            className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-[#B89555] dark:hover:text-[#C9A96A] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Deals
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Section */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white dark:bg-[#22211E] shadow-sm">
              {deal.imageUrl ? (
                <Image
                  src={deal.imageUrl}
                  alt={deal.name}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                  <Package className="w-24 h-24 text-gray-400" />
                </div>
              )}
              {deal.badgeText && (
                <div className="absolute top-4 left-4">
                  <span className="px-4 py-2 bg-[#B89555] text-white text-sm font-bold rounded-full">
                    {deal.badgeText}
                  </span>
                </div>
              )}
              {deal.discountPercentage > 0 && (
                <div className="absolute top-4 right-4">
                  <span className="px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-full flex items-center gap-2">
                    <Percent className="w-4 h-4" />
                    {deal.discountPercentage}% OFF
                  </span>
                </div>
              )}
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4">
              {deal.isFreeDelivery && (
                <div className="flex items-center gap-3 p-4 bg-white dark:bg-[#22211E] rounded-xl border border-gray-200 dark:border-gray-700">
                  <Truck className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Free Delivery</span>
                </div>
              )}
              <div className="flex items-center gap-3 p-4 bg-white dark:bg-[#22211E] rounded-xl border border-gray-200 dark:border-gray-700">
                <Package className="w-5 h-5 text-[#B89555] dark:text-[#C9A96A]" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">{deal.piecesCount} Pieces</span>
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                {deal.name}
              </h1>
              {deal.subtitle && (
                <p className="text-lg text-gray-600 dark:text-gray-400">{deal.subtitle}</p>
              )}
            </div>

            {/* Pricing */}
            <div className="p-6 bg-white dark:bg-[#22211E] rounded-2xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                {deal.discountPercentage > 0 && (
                  <span className="text-xl text-gray-400 line-through">
                    {formatPKR(deal.originalPrice)}
                  </span>
                )}
                <span className="text-4xl font-bold text-[#B89555] dark:text-[#C9A96A]">
                  {formatPKR(deal.salePrice)}
                </span>
                {deal.discountPercentage > 0 && (
                  <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-bold rounded-full">
                    {deal.discountPercentage}% OFF
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Info className="w-4 h-4" />
                <span>Bundle price for {deal.piecesCount} pieces</span>
              </div>
            </div>

            {/* Description */}
            {deal.description && (
              <div className="p-6 bg-white dark:bg-[#22211E] rounded-2xl border border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white mb-3">Description</h3>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">{deal.description}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAddToCart}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-[#B89555] hover:bg-[#A68444] text-white font-bold rounded-xl transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
                Add to Cart
              </button>
              <button
                onClick={handleBuyNow}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 font-bold rounded-xl transition-colors"
              >
                Buy Now
              </button>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span>100% Original</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span>Cash on Delivery</span>
              </div>
              {deal.isFreeDelivery && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span>Free Shipping</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
