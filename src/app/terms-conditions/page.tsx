'use client';

import React from 'react';
import Link from 'next/link';
import { useStore } from '@/context/StoreContext';
import { ChevronRight } from 'lucide-react';

export default function TermsConditionsPage() {
  const { settings } = useStore();

  return (
    <div className="min-h-[85vh] py-12 bg-[#F7F3EA] text-[#1D2730]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#66717C] mb-6">
          <Link href="/" className="hover:text-[#C99A3D] transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3 h-3 text-[#66717C]" />
          <span className="font-semibold text-[#1D2730]">Terms &amp; Conditions</span>
        </div>

        {/* Header */}
        <div className="border-b border-[#D8D0C3] pb-6 mb-8">
          <span className="text-[10px] font-bold text-[#C99A3D] uppercase tracking-widest block">
            Customer Agreement
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1D2730] mt-1 tracking-tight">
            Terms &amp; Conditions
          </h1>
          <p className="text-xs sm:text-sm text-[#66717C] mt-2 leading-relaxed">
            Standard store terms and order conditions for {settings.brandName}.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6 text-xs sm:text-sm text-[#66717C] leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#1D2730]">1. Ordering &amp; Quantities</h2>
            <p>
              1 piece is a valid order (minimum order quantity is 1 piece). Customer orders containing 3 or more pieces are entitled to <strong className="text-[#2F7D5A]">100% Free Delivery</strong> across Pakistan. Orders containing 1 or 2 pieces incur a standard delivery fee of Rs. {settings.shipping?.baseDeliveryCharge ?? 200}.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#1D2730]">2. Pricing &amp; Currency</h2>
            <p>
              All prices displayed on {settings.brandName} are in Pakistani Rupees (PKR / Rs.). High Quality and Standard Quality garments are listed as separate product offerings with their own distinct specifications.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#1D2730]">3. Payment &amp; Verification</h2>
            <p>
              Orders placed via Cash on Delivery (COD) will be verified via SMS or WhatsApp confirmation prior to courier booking. For Direct Bank Transfer orders, payment verification occurs once proof of transfer is provided to our official WhatsApp (<strong className="text-[#C99A3D]">{settings.whatsapp}</strong>).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#1D2730]">4. Modifications &amp; Store Updates</h2>
            <p>
              {settings.brandName} reserves the right to update product stock, variant pricing, and shipping policies as needed without prior notice.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
