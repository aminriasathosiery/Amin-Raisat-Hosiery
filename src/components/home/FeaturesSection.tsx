'use client';

import React from 'react';
import { Truck, ShieldCheck, PhoneCall } from 'lucide-react';
import { useStore } from '@/context/StoreContext';

export const FeaturesSection: React.FC = () => {
  const { settings } = useStore();
  const freeThreshold = settings.shipping?.freeDeliveryThreshold ?? 3;
  const minOrder = settings.shipping?.minOrderQty ?? 1;
  const baseCharge = settings.shipping?.baseDeliveryCharge ?? 200;

  return (
    <section className="py-14 bg-light-elevated dark:bg-dark-surface border-b border-light-border dark:border-dark-border transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-[10px] font-bold text-[#A07D38] dark:text-gold-500 uppercase tracking-widest">
            Quality Assurance
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-charcoal-900 dark:text-gray-100 mt-1">
            Built with Trust &amp; True Cotton Craftsmanship
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-500 dark:text-gray-400 mt-1.5 font-normal">
            Pure combed cotton hosiery essentials engineered for long-lasting wear and daily comfort.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1: Delivery Terms */}
          <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-light-border dark:border-dark-border card-hover-lift flex flex-col justify-between shadow-sm dark:shadow-card">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-xl bg-champagne-50 dark:bg-dark-surface border border-light-border dark:border-dark-border text-[#A07D38] dark:text-gold-400 flex items-center justify-center shadow-xs">
                <Truck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-charcoal-900 dark:text-gray-100">Nationwide Free Delivery</h3>
              <p className="text-xs text-charcoal-600 dark:text-gray-400 leading-relaxed font-normal">
                Order from {minOrder} piece. Orders of <strong className="text-[#A07D38] dark:text-gold-400">{freeThreshold} or more pieces</strong> unlock <strong className="text-emerald-700 dark:text-emerald-400">100% FREE DELIVERY</strong> anywhere in Pakistan.
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-light-border dark:border-dark-border flex items-center justify-between text-xs font-semibold text-charcoal-700 dark:text-gray-300">
              <span className="text-[#A07D38] dark:text-gold-400">Free at {freeThreshold}+ Pieces</span>
              <span>Cash on Delivery</span>
            </div>
          </div>

          {/* Feature 2: 100% Combed Cotton */}
          <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-light-border dark:border-dark-border card-hover-lift flex flex-col justify-between shadow-sm dark:shadow-card">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-xl bg-champagne-50 dark:bg-dark-surface border border-light-border dark:border-dark-border text-[#A07D38] dark:text-gold-400 flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-charcoal-900 dark:text-gray-100">100% Fine Combed Cotton</h3>
              <p className="text-xs text-charcoal-600 dark:text-gray-400 leading-relaxed font-normal">
                Soft against the skin, sweat-absorbent, and designed to maintain its shape wash after wash with anti-sag seam construction.
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-light-border dark:border-dark-border flex items-center justify-between text-xs font-semibold text-charcoal-700 dark:text-gray-300">
              <span>Anti-Sag Neck Seams</span>
              <span>Natural Breathability</span>
            </div>
          </div>

          {/* Feature 3: Direct Support */}
          <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-light-border dark:border-dark-border card-hover-lift flex flex-col justify-between shadow-sm dark:shadow-card">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-xl bg-champagne-50 dark:bg-dark-surface border border-light-border dark:border-dark-border text-[#A07D38] dark:text-gold-400 flex items-center justify-center shadow-xs">
                <PhoneCall className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-charcoal-900 dark:text-gray-100">Direct Owner Assistance</h3>
              <p className="text-xs text-charcoal-600 dark:text-gray-400 leading-relaxed font-normal">
                Contact Muhammad Amin directly via WhatsApp or phone for immediate help with sizing, bulk queries, and order tracking.
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-light-border dark:border-dark-border flex items-center justify-between text-xs font-semibold text-charcoal-700 dark:text-gray-300">
              <span>Phone: {settings.phone}</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">WhatsApp Ready</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
