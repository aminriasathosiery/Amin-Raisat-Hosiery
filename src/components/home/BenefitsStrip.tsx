'use client';

import React from 'react';
import { Truck, PackageCheck, RotateCcw } from 'lucide-react';
import { useStore } from '@/context/StoreContext';

export const BenefitsStrip: React.FC = () => {
  const { settings } = useStore();
  const freeThreshold = settings.shipping?.freeDeliveryThreshold ?? 3;
  const returnDays = settings.exchangeReturnDays ?? 7;

  const benefits = [
    {
      id: 'free-delivery',
      icon: Truck,
      title: `FREE DELIVERY ON ${freeThreshold}+ PIECES`,
      subtitle: 'Nationwide dispatch across Pakistan',
    },
    {
      id: 'branded-packaging',
      icon: PackageCheck,
      title: 'DELIVER IN BRANDED FLYERS',
      subtitle: 'Secure & premium sealed packaging',
    },
    {
      id: 'easy-returns',
      icon: RotateCcw,
      title: 'EASY RETURNS & EXCHANGE',
      subtitle: `${returnDays}-day hassle-free sizing guarantee`,
    },
  ];

  return (
    <section
      aria-label="Store Benefits"
      className="relative z-10 w-full bg-white border-y border-[#D8D0C3]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#D8D0C3]">
          {benefits.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 sm:gap-3.5 py-2.5 md:py-1 ${
                  index === 0
                    ? 'md:pr-6'
                    : index === 1
                    ? 'md:px-6'
                    : 'md:pl-6'
                }`}
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#EEE8DC] border border-[#D8D0C3] flex items-center justify-center flex-shrink-0 text-[#C99A3D] shadow-xs">
                  <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px] stroke-[2.2]" />
                </div>
                
                <div className="min-w-0 flex-1">
                  <h3 className="text-[11.5px] sm:text-xs font-bold text-[#1D2730] uppercase tracking-wide truncate">
                    {item.title}
                  </h3>
                  <p className="text-[10.5px] sm:text-[11px] text-[#66717C] font-normal truncate mt-0.5">
                    {item.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
