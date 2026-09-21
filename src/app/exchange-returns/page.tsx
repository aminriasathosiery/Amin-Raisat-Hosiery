'use client';

import React from 'react';
import Link from 'next/link';
import { useStore } from '@/context/StoreContext';
import { ChevronRight, RefreshCw } from 'lucide-react';
import { WhatsAppIcon } from '@/components/common/WhatsAppIcon';
import { getWhatsAppUrl, DISPLAY_WHATSAPP_NUMBER } from '@/lib/whatsapp';

export default function ExchangeReturnsPage() {
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
          <span className="font-semibold text-[#1D2730]">Exchange &amp; Returns</span>
        </div>

        {/* Header */}
        <div className="border-b border-[#D8D0C3] pb-6 mb-8">
          <span className="text-[10px] font-bold text-[#C99A3D] uppercase tracking-widest block">
            Customer Satisfaction Guarantee
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1D2730] mt-1 tracking-tight">
            Exchange &amp; Returns Policy
          </h1>
          <p className="text-xs sm:text-sm text-[#66717C] mt-2 leading-relaxed">
            Hassle-free 7-day exchange process for our customers across Pakistan.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6 text-xs sm:text-sm text-[#66717C] leading-relaxed">
          <div className="p-6 sm:p-8 bg-white rounded-2xl border border-[#D8D0C3] shadow-sm space-y-3">
            <h2 className="font-bold text-[#C99A3D] text-base flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-[#23384D]" />
              {settings.exchangeReturnDays ?? 7}-Day Sizing &amp; Defect Exchange
            </h2>
            <p>
              At {settings.brandName}, customer satisfaction is our highest priority. If you ordered the wrong size or discovered a manufacturing flaw, we offer a straightforward exchange within <strong>{settings.exchangeReturnDays ?? 7} calendar days</strong> of receiving your parcel.
            </p>
          </div>

          <section className="space-y-2">
            <h3 className="font-bold text-[#1D2730] text-sm">Exchange Conditions</h3>
            <ul className="space-y-1.5 pl-4 list-disc text-[#66717C]">
              <li>The garment must be <strong>unwashed</strong> and <strong>unworn</strong> (except for brief sizing fit trial).</li>
              <li>Original tags and packaging should be retained where possible.</li>
              <li>Exchange requests must be submitted within {settings.exchangeReturnDays ?? 7} days of package delivery.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-[#1D2730] text-sm">How to Request an Exchange</h3>
            <ol className="space-y-2 pl-4 list-decimal text-[#66717C]">
              <li>
                Take a quick photo of the item and message our official WhatsApp support at <strong className="text-[#C99A3D]">{settings?.whatsapp || DISPLAY_WHATSAPP_NUMBER}</strong> with your <strong>Order Number</strong>.
              </li>
              <li>
                Let Muhammad Amin know your desired replacement size or construction option.
              </li>
              <li>
                We will promptly arrange the replacement dispatch to your address.
              </li>
            </ol>
          </section>

          {/* CTA with Official WhatsAppIcon */}
          <div className="pt-4">
            <a
              href={getWhatsAppUrl(
                settings?.whatsapp || DISPLAY_WHATSAPP_NUMBER,
                'Assalam-o-Alaikum Amin Raisat Hosiery, I would like to request an exchange for my order.'
              )}
              target="_blank"
              rel="noopener noreferrer"
              id="exchange-whatsapp-btn"
              className="inline-flex items-center gap-2 py-3.5 px-6 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold rounded-xl text-xs transition-all shadow-xs"
            >
              <WhatsAppIcon size={16} className="text-white fill-current" />
              <span>Initiate Exchange on WhatsApp ({settings?.whatsapp || DISPLAY_WHATSAPP_NUMBER})</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
