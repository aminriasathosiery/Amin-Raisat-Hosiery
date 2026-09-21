'use client';

import React from 'react';
import Link from 'next/link';
import { useStore } from '@/context/StoreContext';
import { ChevronRight, ShieldCheck, Truck, Package, Mail } from 'lucide-react';
import { WhatsAppIcon } from '@/components/common/WhatsAppIcon';
import { getWhatsAppUrl, DISPLAY_WHATSAPP_NUMBER, BUSINESS_EMAIL, EMAIL_URL } from '@/lib/whatsapp';

export default function AboutPage() {
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
          <span className="font-semibold text-[#1D2730]">About Us</span>
        </div>

        {/* Header */}
        <div className="border-b border-[#D8D0C3] pb-6 mb-8">
          <span className="text-[10px] font-bold text-[#C99A3D] uppercase tracking-widest block">
            Brand Heritage
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1D2730] mt-1 tracking-tight">
            About {settings.brandName}
          </h1>
          <p className="text-xs sm:text-sm text-[#66717C] mt-2 leading-relaxed">
            Crafting genuine 100% fine combed cotton hosiery essentials and innerwear in Pakistan.
          </p>
        </div>

        {/* Story Content */}
        <div className="space-y-8 text-xs sm:text-sm text-[#66717C] leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#1D2730]">
              Our Heritage in Faisalabad
            </h2>
            <p>
              Founded and managed by <strong>Muhammad Amin</strong>, {settings.brandName} has been producing premium combed cotton vests and innerwear for retailers and everyday consumers across Pakistan.
            </p>
            <p>
              Operating directly from Faisalabad — the textile heartland of Pakistan — our factory maintains rigorous yarn selection, computerized circular knitting, and precision seam stitching to ensure our vests maintain their shape and soft feel after countless washes.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-[#1D2730]">
              The Amin Raisat Standard
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="space-y-1">
                <h4 className="font-bold text-[#1D2730] text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#C99A3D]" />
                  Two Quality Tiers
                </h4>
                <p className="text-xs text-[#66717C]">
                  Offering distinct High Quality (anti-sag taped collar and seams) and Standard Quality (folded seams) options.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-[#1D2730] text-xs flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#2F7D5A]" />
                  Free Delivery on 3+ Pieces
                </h4>
                <p className="text-xs text-[#66717C]">
                  100% Free Nationwide Delivery on 3+ pieces across all Pakistan cities. 1 piece is a valid order with standard Rs. 200 delivery.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-[#1D2730] text-xs flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-[#C99A3D]" />
                  1 Piece Valid Order
                </h4>
                <p className="text-xs text-[#66717C]">
                  Order individually or stock up. Every single customer order is packed with retail master craftsmanship.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#1D2730]">
              Direct Contact &amp; Inquiries
            </h2>
            <p>
              For customer support, order tracking assistance, or garment sizing questions, reach out directly:
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <a
                href={getWhatsAppUrl(settings?.whatsapp || DISPLAY_WHATSAPP_NUMBER)}
                target="_blank"
                rel="noopener noreferrer"
                id="about-whatsapp-btn"
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all active:scale-[0.99]"
              >
                <WhatsAppIcon size={14} className="text-white fill-current" />
                <span>WhatsApp ({settings?.whatsapp || DISPLAY_WHATSAPP_NUMBER})</span>
              </a>
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 bg-[#23384D] hover:bg-[#182B3D] text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all active:scale-[0.99]"
              >
                <Package className="w-4 h-4" />
                <span>Shop Collection</span>
              </Link>
              <a
                href={EMAIL_URL}
                id="about-email-btn"
                className="inline-flex items-center gap-2 bg-white hover:bg-[#EEE8DC] border border-[#D8D0C3] text-[#1D2730] text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all active:scale-[0.99]"
                aria-label={`Email ${BUSINESS_EMAIL}`}
              >
                <Mail className="w-4 h-4 text-[#C99A3D]" />
                <span>{BUSINESS_EMAIL}</span>
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
