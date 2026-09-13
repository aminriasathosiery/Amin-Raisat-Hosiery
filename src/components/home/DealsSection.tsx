'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Deal } from '@/types';
import { formatPKR } from '@/lib/pricing';
import { Zap, Package, Percent, Truck, ArrowRight } from 'lucide-react';

export function DealsSection() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDeals() {
      try {
        const res = await fetch('/api/deals?featured=true');
        if (res.ok) {
          const data = await res.json();
          setDeals(data.deals || []);
        }
      } catch (err) {
        console.error('Failed to fetch featured deals:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDeals();
  }, []);

  if (loading) {
    return null;
  }

  if (deals.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-white dark:bg-[#141412] border-b border-light-border dark:border-[#34322D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10">
          <div>
            <span className="text-[10px] font-bold text-[#B89555] dark:text-[#C9A96A] uppercase tracking-widest flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Limited Time Offers
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-charcoal-900 dark:text-[#F4F1E9] mt-1">
              Special Deals
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-500 dark:text-[#B8B3A8] mt-1 font-normal">
              Exclusive bundle offers at unbeatable prices with free delivery.
            </p>
          </div>

          <Link
            href="/deals"
            className="mt-4 sm:mt-0 inline-flex items-center gap-1.5 text-xs font-bold text-[#B89555] dark:text-[#C9A96A] hover:underline transition-colors"
          >
            <span>View All Deals</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {deals.map((deal) => (
            <Link
              key={deal.id}
              href={`/deals/${deal.slug}`}
              className="group bg-light-elevated dark:bg-[#22211E] rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-light-border dark:border-[#34322D]"
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
                <h3 className="text-lg font-bold text-charcoal-900 dark:text-white group-hover:text-[#B89555] transition-colors">
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
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
