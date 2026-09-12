'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/context/StoreContext';
import { ChevronRight, Phone, Mail, Check, Package } from 'lucide-react';
import { WhatsAppIcon } from '@/components/common/WhatsAppIcon';
import { getWhatsAppUrl, DISPLAY_WHATSAPP_NUMBER, BUSINESS_EMAIL } from '@/lib/whatsapp';

export default function ContactPage() {
  const { settings } = useStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;

    // Send via WhatsApp direct link
    const text = `Assalam-o-Alaikum Amin Raisat Hosiery,\nName: ${name}\nPhone: ${phone}\nMessage: ${message}`;
    const url = getWhatsAppUrl(settings?.whatsapp || DISPLAY_WHATSAPP_NUMBER, text);
    window.open(url, '_blank');

    setIsSent(true);
    setTimeout(() => {
      setIsSent(false);
      setName('');
      setPhone('');
      setMessage('');
    }, 2500);
  };

  return (
    <div className="min-h-[85vh] py-12 bg-light-bg dark:bg-[#11110F] text-charcoal-900 dark:text-[#F4F1E9] transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-charcoal-500 dark:text-[#B8B3A8] mb-6">
          <Link href="/" className="hover:text-[#B89555] dark:hover:text-[#C9A96A] transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3 h-3 text-charcoal-400 dark:text-[#6E6A62]" />
          <span className="font-semibold text-charcoal-900 dark:text-[#F4F1E9]">Contact Us</span>
        </div>

        {/* Header */}
        <div className="border-b border-light-border dark:border-[#34322D] pb-6 mb-8">
          <span className="text-[10px] font-bold text-[#B89555] dark:text-[#C9A96A] uppercase tracking-widest block">
            Direct Communication
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-charcoal-900 dark:text-[#F4F1E9] mt-1 tracking-tight">
            Get in Touch
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-600 dark:text-[#B8B3A8] mt-2 leading-relaxed">
            Have a question about fabric sizing, order placement, or tracking your delivery? We are available to help.
          </p>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left Column: Direct Info */}
          <div className="md:col-span-5 space-y-4">
            {/* WhatsApp Card */}
            <div className="p-6 bg-white dark:bg-[#191917] rounded-2xl border border-light-border dark:border-[#34322D] shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center shadow-xs">
                  <WhatsAppIcon size={20} className="text-white fill-current" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-charcoal-900 dark:text-[#F4F1E9]">WhatsApp (Fastest)</h3>
                  <p className="text-xs text-[#B89555] dark:text-[#C9A96A] font-bold">{settings?.whatsapp || DISPLAY_WHATSAPP_NUMBER}</p>
                </div>
              </div>
              <p className="text-xs text-charcoal-500 dark:text-[#8E8A80] leading-relaxed font-normal">
                Direct chat with owner Muhammad Amin for immediate order assistance, sizing recommendations, or delivery support.
              </p>
              <a
                href={getWhatsAppUrl(settings?.whatsapp || DISPLAY_WHATSAPP_NUMBER)}
                target="_blank"
                rel="noopener noreferrer"
                id="contact-whatsapp-link"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline pt-1"
              >
                <span>Open WhatsApp Chat &rarr;</span>
              </a>
            </div>

            {/* Retail Support Card */}
            <div className="p-6 bg-light-elevated dark:bg-[#191917] rounded-2xl border border-light-border dark:border-[#34322D] shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-champagne-500 text-charcoal-950 flex items-center justify-center font-bold">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-charcoal-900 dark:text-[#F4F1E9]">Order Desk</h3>
                  <p className="text-xs text-[#B89555] dark:text-[#C9A96A] font-bold">1 Piece Valid Order</p>
                </div>
              </div>
              <p className="text-xs text-charcoal-600 dark:text-[#B8B3A8] leading-relaxed">
                Enjoy hassle-free retail shopping with Free Nationwide Delivery on 3+ pieces across Pakistan.
              </p>
              <Link
                href="/shop"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B89555] dark:text-[#C9A96A] hover:underline"
              >
                <span>Browse Store Catalog &rarr;</span>
              </Link>
            </div>

            {/* Phone Card */}
            <div className="p-6 bg-white dark:bg-[#191917] rounded-2xl border border-light-border dark:border-[#34322D] shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] text-[#B89555] dark:text-[#C9A96A] flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-charcoal-900 dark:text-[#F4F1E9]">Direct Phone Call</h3>
                  <p className="text-xs text-charcoal-700 dark:text-[#B8B3A8] font-bold">{settings?.phone || settings?.whatsapp || DISPLAY_WHATSAPP_NUMBER}</p>
                </div>
              </div>
              <p className="text-xs text-charcoal-500 dark:text-[#8E8A80] leading-relaxed font-normal">
                Available daily for customer inquiries across all cities of Pakistan.
              </p>
            </div>

            {/* Email Card */}
            <div className="p-6 bg-white dark:bg-[#191917] rounded-2xl border border-light-border dark:border-[#34322D] shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] text-[#B89555] dark:text-[#C9A96A] flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-charcoal-900 dark:text-[#F4F1E9]">Email Support</h3>
                  <a
                    href={`mailto:${settings?.email || BUSINESS_EMAIL}`}
                    id="contact-email-link"
                    className="text-xs text-charcoal-600 dark:text-[#B8B3A8] hover:text-[#B89555] dark:hover:text-[#C9A96A] transition-colors truncate block font-medium"
                  >
                    {settings?.email || BUSINESS_EMAIL}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Message Form */}
          <div className="md:col-span-7 bg-white dark:bg-[#191917] p-6 sm:p-8 rounded-2xl border border-light-border dark:border-[#34322D] shadow-sm space-y-4">
            <h2 className="text-base font-bold text-charcoal-900 dark:text-[#F4F1E9] border-b border-light-border dark:border-[#34322D] pb-3">
              Send a Direct Message
            </h2>

            {isSent && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Redirecting to WhatsApp with your message...</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Usman Ali"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] text-charcoal-900 dark:text-[#F4F1E9] rounded-xl text-xs focus:outline-none focus:border-[#B89555] dark:focus:border-[#C9A96A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">
                  Mobile / WhatsApp Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 03001234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] text-charcoal-900 dark:text-[#F4F1E9] rounded-xl text-xs focus:outline-none focus:border-[#B89555] dark:focus:border-[#C9A96A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">
                  Message / Inquiry *
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Ask about order tracking, custom sizing, or delivery..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] text-charcoal-900 dark:text-[#F4F1E9] rounded-xl text-xs focus:outline-none focus:border-[#B89555] dark:focus:border-[#C9A96A] resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-champagne-500 hover:bg-champagne-400 text-charcoal-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                <span>Send Message via WhatsApp</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
