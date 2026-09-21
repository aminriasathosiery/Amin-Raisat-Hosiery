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
    setBuyNowItem(dealCartItem);
    router.push('/checkout?buyNow=1');
  };

  return (
    <div className="min-h-screen bg-[#F7F3EA] text-[#1D2730]">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-[#D8D0C3]">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link
            href="/deals"
            className="inline-flex items-center gap-2 text-sm text-[#66717C] hover:text-[#C99A3D] transition-colors"
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
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white border border-[#D8D0C3] shadow-sm">
              {deal.imageUrl ? (
                <Image
                  src={deal.imageUrl}
                  alt={deal.name}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full bg-[#EEE8DC]/50 flex items-center justify-center">
                  <Package className="w-24 h-24 text-[#66717C]" />
                </div>
              )}
              {deal.badgeText && (
                <div className="absolute top-4 left-4">
                  <span className="px-4 py-2 bg-[#C99A3D] text-[#1D2730] text-sm font-bold rounded-full">
                    {deal.badgeText}
                  </span>
                </div>
              )}
              {deal.discountPercentage > 0 && (
                <div className="absolute top-4 right-4">
                  <span className="px-4 py-2 bg-[#B8423A] text-white text-sm font-bold rounded-full flex items-center gap-2">
                    <Percent className="w-4 h-4" />
                    {deal.discountPercentage}% OFF
                  </span>
                </div>
              )}
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4">
              {deal.isFreeDelivery && (
                <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-[#D8D0C3]">
                  <Truck className="w-5 h-5 text-[#2F7D5A]" />
                  <span className="text-sm font-medium text-[#1D2730]">Free Delivery</span>
                </div>
              )}
              <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-[#D8D0C3]">
                <Package className="w-5 h-5 text-[#C99A3D]" />
                <span className="text-sm font-medium text-[#1D2730]">{deal.piecesCount} Pieces</span>
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#1D2730] mb-2">
                {deal.name}
              </h1>
              {deal.subtitle && (
                <p className="text-lg text-[#66717C]">{deal.subtitle}</p>
              )}
            </div>

            {/* Pricing */}
            <div className="p-6 bg-white rounded-2xl border border-[#D8D0C3]">
              <div className="flex items-center gap-3 mb-4">
                {deal.discountPercentage > 0 && (
                  <span className="text-xl text-[#66717C] line-through">
                    {formatPKR(deal.originalPrice)}
                  </span>
                )}
                <span className="text-4xl font-bold text-[#C99A3D]">
                  {formatPKR(deal.salePrice)}
                </span>
                {deal.discountPercentage > 0 && (
                  <span className="px-3 py-1 bg-[#B8423A]/10 text-[#B8423A] text-sm font-bold rounded-full border border-[#B8423A]/20">
                    {deal.discountPercentage}% OFF
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-[#66717C]">
                <Info className="w-4 h-4 text-[#C99A3D]" />
                <span>Bundle price for {deal.piecesCount} pieces</span>
              </div>
            </div>

            {/* Description */}
            {deal.description && (
              <div className="p-6 bg-white rounded-2xl border border-[#D8D0C3]">
                <h3 className="font-bold text-[#1D2730] mb-3">Description</h3>
                <p className="text-[#66717C] whitespace-pre-line">{deal.description}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAddToCart}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-white hover:bg-[#EEE8DC]/40 text-[#1D2730] border border-[#D8D0C3] font-bold rounded-xl transition-colors shadow-2xs"
              >
                <ShoppingCart className="w-5 h-5 text-[#C99A3D]" />
                Add to Cart
              </button>
              <button
                onClick={handleBuyNow}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-[#23384D] hover:bg-[#182B3D] text-[#F7F3EA] font-bold rounded-xl transition-colors shadow-xs"
              >
                Buy Now
              </button>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center gap-4 text-sm text-[#66717C]">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-[#2F7D5A]" />
                <span>100% Original</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-[#2F7D5A]" />
                <span>Cash on Delivery</span>
              </div>
              {deal.isFreeDelivery && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#2F7D5A]" />
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
