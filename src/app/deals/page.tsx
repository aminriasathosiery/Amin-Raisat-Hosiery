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
    <div className="min-h-screen bg-gray-50 dark:bg-[#1A1A1A]">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[#B89555] to-[#A68444] text-white py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="w-8 h-8" />
            <h1 className="text-4xl md:text-5xl font-bold">Special Deals</h1>
          </div>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
            Exclusive bundle offers at unbeatable prices. Limited time deals with free delivery across Pakistan!
          </p>
        </div>
      </div>

      {/* Deals Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {deals.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Deals Available</h2>
            <p className="text-gray-600 dark:text-gray-400">Check back soon for exciting bundle offers!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deals.map((deal) => (
              <Link
                key={deal.id}
                href={`/deals/${deal.slug}`}
                className="group bg-white dark:bg-[#22211E] rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700"
              >
                <div className="relative aspect-square overflow-hidden">
                  {deal.imageUrl ? (
                    <Image
                      src={deal.imageUrl}
                      alt={deal.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                      <Package className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  {deal.badgeText && (
                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 bg-[#B89555] text-white text-xs font-bold rounded-full">
                        {deal.badgeText}
                      </span>
                    </div>
                  )}
                  {deal.discountPercentage > 0 && (
                    <div className="absolute top-3 right-3">
                      <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                        <Percent className="w-3 h-3" />
                        {deal.discountPercentage}% OFF
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-5 space-y-3">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-[#B89555] transition-colors">
                    {deal.name}
                  </h3>
                  {deal.subtitle && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">{deal.subtitle}</p>
                  )}

                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Package className="w-4 h-4" />
                    <span>{deal.piecesCount} pieces included</span>
                  </div>

                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      {deal.discountPercentage > 0 && (
                        <span className="text-sm text-gray-400 line-through">
                          {formatPKR(deal.originalPrice)}
                        </span>
                      )}
                      <span className="text-2xl font-bold text-[#B89555] dark:text-[#C9A96A]">
                        {formatPKR(deal.salePrice)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    {deal.isFreeDelivery && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                        <Truck className="w-3 h-3" />
                        Free Delivery
                      </span>
                    )}
                    {deal.isFeatured && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-600 dark:text-yellow-400">
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
