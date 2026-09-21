'use client';

import React from 'react';
import { Truck, ShieldCheck, PhoneCall } from 'lucide-react';
import { useStore } from '@/context/StoreContext';

export const FeaturesSection: React.FC = () => {
  const { settings } = useStore();
  const freeThreshold = settings.shipping?.freeDeliveryThreshold ?? 3;
  const minOrder = settings.shipping?.minOrderQty ?? 1;

  return (
    <section className="py-14 bg-[#EEE8DC] border-b border-[#D8D0C3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-[10px] font-bold text-[#C99A3D] uppercase tracking-widest">
            Quality Assurance
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1D2730] mt-1">
            Built with Trust &amp; True Cotton Craftsmanship
          </h2>
          <p className="text-xs sm:text-sm text-[#66717C] mt-1.5 font-normal">
            Pure combed cotton hosiery essentials engineered for long-lasting wear and daily comfort.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1: Delivery Terms */}
          <div className="bg-white p-6 rounded-2xl border border-[#D8D0C3] card-hover-lift flex flex-col justify-between shadow-sm">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-xl bg-[#EEE8DC] border border-[#D8D0C3] text-[#C99A3D] flex items-center justify-center shadow-xs">
                <Truck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#1D2730]">Nationwide Free Delivery</h3>
              <p className="text-xs text-[#66717C] leading-relaxed font-normal">
                Order from {minOrder} piece. Orders of <strong className="text-[#C99A3D]">{freeThreshold} or more pieces</strong> unlock <strong className="text-[#2F7D5A]">100% FREE DELIVERY</strong> anywhere in Pakistan.
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-[#D8D0C3] flex items-center justify-between text-xs font-semibold text-[#1D2730]">
              <span className="text-[#C99A3D]">Free at {freeThreshold}+ Pieces</span>
              <span>Cash on Delivery</span>
            </div>
          </div>

          {/* Feature 2: 100% Combed Cotton */}
          <div className="bg-white p-6 rounded-2xl border border-[#D8D0C3] card-hover-lift flex flex-col justify-between shadow-sm">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-xl bg-[#EEE8DC] border border-[#D8D0C3] text-[#C99A3D] flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#1D2730]">100% Fine Combed Cotton</h3>
              <p className="text-xs text-[#66717C] leading-relaxed font-normal">
                Soft against the skin, sweat-absorbent, and designed to maintain its shape wash after wash with anti-sag seam construction.
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-[#D8D0C3] flex items-center justify-between text-xs font-semibold text-[#1D2730]">
              <span>Anti-Sag Neck Seams</span>
              <span>Natural Breathability</span>
            </div>
          </div>

          {/* Feature 3: Direct Support */}
          <div className="bg-white p-6 rounded-2xl border border-[#D8D0C3] card-hover-lift flex flex-col justify-between shadow-sm">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-xl bg-[#EEE8DC] border border-[#D8D0C3] text-[#C99A3D] flex items-center justify-center shadow-xs">
                <PhoneCall className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#1D2730]">Direct Owner Assistance</h3>
              <p className="text-xs text-[#66717C] leading-relaxed font-normal">
                Contact Muhammad Amin directly via WhatsApp or phone for immediate help with sizing, bulk queries, and order tracking.
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-[#D8D0C3] flex items-center justify-between text-xs font-semibold text-[#1D2730]">
              <span>Phone: {settings.phone}</span>
              <span className="text-[#2F7D5A] font-bold">WhatsApp Ready</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
