'use client';

import React from 'react';
import Link from 'next/link';
import { useStore } from '@/context/StoreContext';
import { ChevronRight, ShieldCheck, Truck, Phone, Package, Mail } from 'lucide-react';
import { WhatsAppIcon } from '@/components/common/WhatsAppIcon';
import { getWhatsAppUrl, DISPLAY_WHATSAPP_NUMBER, BUSINESS_EMAIL, EMAIL_URL } from '@/lib/whatsapp';

export default function AboutPage() {
  const { settings } = useStore();

  return (
    <div className="min-h-[85vh] py-12 bg-light-bg dark:bg-[#11110F] text-charcoal-900 dark:text-[#F4F1E9] transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-charcoal-500 dark:text-[#B8B3A8] mb-6">
          <Link href="/" className="hover:text-[#B89555] dark:hover:text-[#C9A96A] transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3 h-3 text-charcoal-400 dark:text-[#6E6A62]" />
          <span className="font-semibold text-charcoal-900 dark:text-[#F4F1E9]">About Us</span>
        </div>

        {/* Header */}
        <div className="border-b border-light-border dark:border-[#34322D] pb-6 mb-8">
          <span className="text-[10px] font-bold text-[#B89555] dark:text-[#C9A96A] uppercase tracking-widest block">
            Brand Heritage
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-charcoal-900 dark:text-[#F4F1E9] mt-1 tracking-tight">
            About {settings.brandName}
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-600 dark:text-[#B8B3A8] mt-2 leading-relaxed">
            Crafting genuine 100% fine combed cotton hosiery essentials and innerwear in Pakistan.
          </p>
        </div>

        {/* Story Content */}
        <div className="space-y-8 text-xs sm:text-sm text-charcoal-700 dark:text-[#B8B3A8] leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-charcoal-900 dark:text-[#F4F1E9]">
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
            <h2 className="text-lg sm:text-xl font-bold text-charcoal-900 dark:text-[#F4F1E9]">
              The Amin Raisat Standard
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="space-y-1">
                <h4 className="font-bold text-charcoal-900 dark:text-[#F4F1E9] text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#B89555] dark:text-[#C9A96A]" />
                  Two Quality Tiers
                </h4>
                <p className="text-xs text-charcoal-500 dark:text-[#8E8A80]">
                  Offering distinct High Quality (anti-sag taped collar and seams) and Standard Quality (folded seams) options.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-charcoal-900 dark:text-[#F4F1E9] text-xs flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Free Delivery on 3+ Pieces
                </h4>
                <p className="text-xs text-charcoal-500 dark:text-[#8E8A80]">
                  100% Free Nationwide Delivery on 3+ pieces across all Pakistan cities. 1 piece is a valid order with standard Rs. 200 delivery.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-charcoal-900 dark:text-[#F4F1E9] text-xs flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-[#B89555] dark:text-[#C9A96A]" />
                  1 Piece Valid Order
                </h4>
                <p className="text-xs text-charcoal-500 dark:text-[#8E8A80]">
                  Order individually or stock up. Every single customer order is packed with retail master craftsmanship.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-charcoal-900 dark:text-[#F4F1E9]">
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
                className="inline-flex items-center gap-2 bg-champagne-500 hover:bg-champagne-400 text-charcoal-950 text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all active:scale-[0.99]"
              >
                <Package className="w-4 h-4" />
                <span>Shop Collection</span>
              </Link>
              <a
                href={EMAIL_URL}
                id="about-email-btn"
                className="inline-flex items-center gap-2 bg-light-elevated dark:bg-[#22211E] hover:bg-light-hover dark:hover:bg-[#2A2925] border border-light-border dark:border-[#34322D] text-charcoal-900 dark:text-[#F4F1E9] text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all active:scale-[0.99]"
                aria-label={`Email ${BUSINESS_EMAIL}`}
              >
                <Mail className="w-4 h-4 text-[#B89555] dark:text-[#C9A96A]" />
                <span>{BUSINESS_EMAIL}</span>
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
