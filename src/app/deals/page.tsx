import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Deal } from '@/types';
import { formatPKR } from '@/lib/pricing';
import { Zap, Package, Percent, Truck, CheckCircle } from 'lucide-react';

import { fetchActiveDeals } from '@/lib/deals';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DealsPage() {
  const deals = await fetchActiveDeals();

  return (
    <div className="min-h-screen bg-[#F7F3EA] text-[#1D2730]">
      {/* Hero Section */}
      <div className="bg-[#23384D] text-[#F7F3EA] py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="w-8 h-8 text-[#C99A3D]" />
            <h1 className="text-4xl md:text-5xl font-bold">Special Deals</h1>
          </div>
          <p className="text-lg md:text-xl text-[#F7F3EA]/90 max-w-2xl mx-auto">
            Exclusive bundle offers at unbeatable prices. Limited time deals with free delivery across Pakistan!
          </p>
        </div>
      </div>

      {/* Deals Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {deals.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-[#66717C] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#1D2730] mb-2">No Deals Available</h2>
            <p className="text-[#66717C]">Check back soon for exciting bundle offers!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deals.map((deal) => (
              <Link
                key={deal.id}
                href={`/deals/${deal.slug}`}
                className="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-[#D8D0C3]"
              >
                <div className="relative aspect-square overflow-hidden bg-[#EEE8DC]/50">
                  {deal.imageUrl ? (
                    <Image
                      src={deal.imageUrl}
                      alt={deal.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#EEE8DC]/50 flex items-center justify-center">
                      <Package className="w-16 h-16 text-[#66717C]" />
                    </div>
                  )}
                  {deal.badgeText && (
                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 bg-[#C99A3D] text-[#1D2730] text-xs font-bold rounded-full">
                        {deal.badgeText}
                      </span>
                    </div>
                  )}
                  {deal.discountPercentage > 0 && (
                    <div className="absolute top-3 right-3">
                      <span className="px-3 py-1 bg-[#B8423A] text-white text-xs font-bold rounded-full flex items-center gap-1">
                        <Percent className="w-3 h-3" />
                        {deal.discountPercentage}% OFF
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-5 space-y-3">
                  <h3 className="text-lg font-bold text-[#1D2730] group-hover:text-[#C99A3D] transition-colors">
                    {deal.name}
                  </h3>
                  {deal.subtitle && (
                    <p className="text-sm text-[#66717C]">{deal.subtitle}</p>
                  )}

                  <div className="flex items-center gap-2 text-sm text-[#66717C]">
                    <Package className="w-4 h-4" />
                    <span>{deal.piecesCount} pieces included</span>
                  </div>

                  <div className="pt-3 border-t border-[#D8D0C3]">
                    <div className="flex items-center gap-2">
                      {deal.discountPercentage > 0 && (
                        <span className="text-sm text-[#66717C] line-through">
                          {formatPKR(deal.originalPrice)}
                        </span>
                      )}
                      <span className="text-2xl font-bold text-[#C99A3D]">
                        {formatPKR(deal.salePrice)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    {deal.isFreeDelivery && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#2F7D5A]">
                        <Truck className="w-3 h-3" />
                        Free Delivery
                      </span>
                    )}
                    {deal.isFeatured && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#C99A3D]">
                        <CheckCircle className="w-3 h-3" />
                        Featured
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
