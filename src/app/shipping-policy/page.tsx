'use client';

import React from 'react';
import Link from 'next/link';
import { useStore } from '@/context/StoreContext';
import { ChevronRight, Truck, CheckCircle2 } from 'lucide-react';

export default function ShippingPolicyPage() {
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
          <span className="font-semibold text-charcoal-900 dark:text-[#F4F1E9]">Shipping Policy</span>
        </div>

        {/* Header */}
        <div className="border-b border-light-border dark:border-[#34322D] pb-6 mb-8">
          <span className="text-[10px] font-bold text-[#B89555] dark:text-[#C9A96A] uppercase tracking-widest block">
            Nationwide Delivery Details
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-charcoal-900 dark:text-[#F4F1E9] mt-1 tracking-tight">
            Shipping &amp; Delivery Policy
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-600 dark:text-[#B8B3A8] mt-2 leading-relaxed">
            Transparent, honest delivery terms for all customer orders across Pakistan.
          </p>
        </div>

        {/* Policy Content */}
        <div className="space-y-6 text-xs sm:text-sm text-charcoal-700 dark:text-[#B8B3A8] leading-relaxed">
          <div className="p-6 sm:p-8 bg-white dark:bg-[#191917] rounded-2xl border border-light-border dark:border-[#34322D] shadow-sm space-y-3">
            <h2 className="font-bold text-[#B89555] dark:text-[#C9A96A] text-base flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Core Order &amp; Delivery Rules
            </h2>
            <ul className="space-y-2 text-xs text-charcoal-800 dark:text-[#F4F1E9]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>1 Piece is a Valid Order:</strong> No minimum order quantity restrictions (minimum 1 piece).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Standard Delivery Fee:</strong> Flat Rs. {settings.shipping.baseDeliveryCharge || 200} across Pakistan for orders of 1 or 2 pieces.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Free Delivery on {settings.shipping.freeDeliveryThreshold || 3}+ Pieces:</strong> Orders containing {settings.shipping.freeDeliveryThreshold || 3} or more pieces automatically qualify for <strong className="text-emerald-700 dark:text-emerald-400">100% Free Delivery</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Maximum Order Quantity:</strong> Up to {settings.shipping.maxOrderQty || 100} pieces per order online.
                </span>
              </li>
            </ul>
          </div>

          <section className="space-y-2">
            <h3 className="font-bold text-charcoal-900 dark:text-[#F4F1E9] text-sm">Delivery Timelines</h3>
            <p>
              Orders are dispatched within 24–48 hours of confirmation. Major cities (Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad, Multan, Gujranwala, Sialkot, Peshawar, etc.) typically arrive within 2 to 4 business days. Regional and remote destinations may take 3 to 6 business days.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-charcoal-900 dark:text-[#F4F1E9] text-sm">Accepted Payment Methods</h3>
            <p>
              We accept multiple secure payment methods across Pakistan:
            </p>
            <ul className="pl-4 list-disc space-y-1">
              <li><strong>Cash on Delivery (COD):</strong> Pay the courier rider in cash upon receiving your parcel at your doorstep.</li>
              <li><strong>Direct Bank Transfer:</strong> Transfer to our official Bank Al Habib business account.</li>
              <li><strong>Mobile Wallets:</strong> Instant transfers via JazzCash, EasyPaisa, and SadaPay.</li>
            </ul>
            <p className="pt-1">
              For complete account numbers and transfer details, visit our{' '}
              <Link href="/payment-info" className="text-[#B89555] dark:text-[#C9A96A] font-bold hover:underline">
                Payment Information Page &rarr;
              </Link>
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-charcoal-900 dark:text-[#F4F1E9] text-sm">Order Tracking &amp; Inquiries</h3>
            <p>
              Once your parcel is booked with the courier service, we share your tracking number via SMS or WhatsApp ({settings.whatsapp}). For any questions regarding your shipment, feel free to message Muhammad Amin directly.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
