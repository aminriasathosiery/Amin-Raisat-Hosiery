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
    <section className="py-16 bg-white border-b border-[#D8D0C3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10">
          <div>
            <span className="text-[10px] font-bold text-[#C99A3D] uppercase tracking-widest flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Limited Time Offers
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1D2730] mt-1">
              Special Deals
            </h2>
            <p className="text-xs sm:text-sm text-[#66717C] mt-1 font-normal">
              Exclusive bundle offers at unbeatable prices with free delivery.
            </p>
          </div>

          <Link
            href="/deals"
            className="mt-4 sm:mt-0 inline-flex items-center gap-1.5 text-xs font-bold text-[#23384D] hover:text-[#C99A3D] transition-colors"
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
              className="group bg-[#F7F3EA] rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-[#D8D0C3]"
            >
              <div className="relative aspect-square overflow-hidden bg-white">
                {deal.imageUrl ? (
                  <Image
                    src={deal.imageUrl}
                    alt={deal.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-[#EEE8DC] flex items-center justify-center">
                    <Package className="w-16 h-16 text-[#66717C]" />
                  </div>
                )}
                {deal.badgeText && (
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 bg-[#23384D] text-white text-xs font-bold rounded-full">
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
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
