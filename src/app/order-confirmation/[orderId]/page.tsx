'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useStore } from '@/context/StoreContext';
import { CheckCircle2, ArrowRight, Home } from 'lucide-react';
import { createOrderReceiptWhatsAppMessage, DISPLAY_WHATSAPP_NUMBER, BUSINESS_EMAIL } from '@/lib/whatsapp';
import { WhatsAppIcon } from '@/components/common/WhatsAppIcon';

export default function OrderConfirmationPage() {
  const params = useParams();
  const orderId = params?.orderId as string;
  const { orders, settings } = useStore();

  const order = orders.find((o) => o.id === orderId || o.orderNumber === orderId);

  if (!order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4 bg-light-bg dark:bg-[#11110F] text-charcoal-900 dark:text-[#F4F1E9] min-h-[70vh] flex flex-col items-center justify-center transition-colors duration-200">
        <h1 className="text-2xl font-bold text-charcoal-900 dark:text-[#F4F1E9]">Looking for Order...</h1>
        <p className="text-xs text-charcoal-500 dark:text-[#8E8A80]">
          If you just placed an order, please wait a moment or return to homepage.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-champagne-500 hover:bg-champagne-400 text-charcoal-950 text-xs font-bold py-3 px-6 rounded-xl shadow-xs"
        >
          <Home className="w-4 h-4" /> Go to Storefront
        </Link>
      </div>
    );
  }

  const whatsappUrl = createOrderReceiptWhatsAppMessage(order, settings?.whatsapp || DISPLAY_WHATSAPP_NUMBER);

  return (
    <div className="py-12 bg-light-bg dark:bg-[#11110F] min-h-[85vh] text-charcoal-900 dark:text-[#F4F1E9] transition-colors duration-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Success Header */}
        <div className="bg-white dark:bg-[#191917] rounded-2xl p-8 border border-light-border dark:border-[#34322D] shadow-sm text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-300 dark:border-emerald-800/60">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-800/60">
                Order Confirmed
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 dark:text-[#F4F1E9] mt-3 tracking-tight">
              Thank You, {order.customerName}!
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-600 dark:text-[#B8B3A8] mt-1 font-normal">
              Your order has been recorded. We will contact you at <strong className="text-[#B89555] dark:text-[#C9A96A]">{order.customerPhone}</strong> for dispatch confirmation.
            </p>
          </div>

          <div className="p-3.5 bg-light-elevated dark:bg-[#22211E] rounded-xl border border-light-border dark:border-[#34322D] max-w-sm mx-auto flex items-center justify-between">
            <span className="text-xs text-charcoal-500 dark:text-[#8E8A80] font-medium">Order Number:</span>
            <span className="text-sm font-bold text-[#B89555] dark:text-[#C9A96A] font-mono tracking-wider">
              #{order.orderNumber}
            </span>
          </div>

          {/* WhatsApp Direct Notification CTA */}
          <div className="pt-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              id="order-confirmation-whatsapp-btn"
              className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs py-3.5 px-6 rounded-xl shadow-xs transition-all w-full sm:w-auto"
            >
              <WhatsAppIcon size={16} className="text-white fill-current" />
              <span>Share Confirmation on WhatsApp ({settings?.whatsapp || DISPLAY_WHATSAPP_NUMBER})</span>
            </a>
          </div>
        </div>

        {/* Order Details & Summary Card */}
        <div className="bg-white dark:bg-[#191917] rounded-2xl p-6 sm:p-8 border border-light-border dark:border-[#34322D] shadow-sm space-y-6">
          <h2 className="text-base font-bold text-charcoal-900 dark:text-[#F4F1E9] border-b border-light-border dark:border-[#34322D] pb-3">
            Order Invoice &amp; Delivery Details
          </h2>

          {/* Customer & Shipping Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-charcoal-700 dark:text-[#B8B3A8]">
            <div className="p-4 rounded-xl bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] space-y-1">
              <span className="font-bold text-[#B89555] dark:text-[#C9A96A] block text-xs uppercase tracking-wider">
                Delivery Address
              </span>
              <p className="font-semibold text-charcoal-900 dark:text-[#F4F1E9]">{order.customerName}</p>
              <p>{order.address}</p>
              <p>{order.city}, {order.province}</p>
              <p className="pt-1 text-charcoal-900 dark:text-[#F4F1E9] font-mono font-medium">📞 {order.customerPhone}</p>
            </div>

            <div className="p-4 rounded-xl bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] space-y-1">
              <span className="font-bold text-[#B89555] dark:text-[#C9A96A] block text-xs uppercase tracking-wider">
                Payment &amp; Status
              </span>
              <p>
                Method:{' '}
                <strong className="text-charcoal-900 dark:text-[#F4F1E9] capitalize">
                  {order.paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : 'Direct Bank Transfer'}
                </strong>
              </p>
              <p>
                Order Status:{' '}
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-white dark:bg-[#191917] text-charcoal-900 dark:text-[#F4F1E9] border border-light-border dark:border-[#34322D]">
                  {order.status}
                </span>
              </p>
              <p className="text-[11px] text-charcoal-500 dark:text-[#8E8A80] pt-1">
                Date: {new Date(order.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Ordered Items List */}
          <div>
            <h3 className="text-xs font-bold text-charcoal-900 dark:text-[#F4F1E9] uppercase tracking-wider mb-3">
              Ordered Garments
            </h3>
            <div className="border border-light-border dark:border-[#34322D] rounded-xl overflow-hidden divide-y divide-light-border dark:divide-[#34322D]">
              {order.items.map((item, idx) => (
                <div key={idx} className="p-3.5 flex items-center justify-between text-xs bg-light-elevated dark:bg-[#22211E]">
                  <div>
                    <h4 className="font-bold text-charcoal-900 dark:text-[#F4F1E9]">{item.productName}</h4>
                    <p className="text-[11px] text-charcoal-500 dark:text-[#8E8A80]">
                      Quality: <strong>{item.quality}</strong> • Style: <strong>{item.sleeve}</strong> • Size: <strong>{item.size}</strong>
                    </p>
                    <p className="text-[11px] text-[#B89555] dark:text-[#C9A96A] font-medium mt-0.5">
                      {item.quantity} piece{item.quantity > 1 ? 's' : ''} x Rs. {item.unitPrice}
                    </p>
                  </div>
                  <div className="font-bold text-[#B89555] dark:text-[#C9A96A] text-xs">
                    Rs. {item.totalPrice.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Totals */}
          <div className="border-t border-light-border dark:border-[#34322D] pt-3 space-y-1.5 text-xs text-charcoal-700 dark:text-[#B8B3A8]">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-charcoal-900 dark:text-[#F4F1E9]">Rs. {order.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span className="font-semibold">
                {order.deliveryFee === 0 ? (
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">FREE Delivery</span>
                ) : (
                  `Rs. ${order.deliveryFee}`
                )}
              </span>
            </div>
            <div className="border-t border-light-border dark:border-[#34322D] pt-2 flex justify-between text-base font-bold text-[#B89555] dark:text-[#C9A96A]">
              <span>Total Payable</span>
              <span>Rs. {order.totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Support Help Note */}
        <p className="text-center text-xs text-charcoal-500 dark:text-[#8E8A80]">
          Need help with your order or tracking? Contact us on WhatsApp or email{' '}
          <a
            href={`mailto:${settings?.email || BUSINESS_EMAIL}`}
            id="order-confirmation-email-link"
            className="font-semibold text-[#B89555] dark:text-[#C9A96A] hover:underline"
          >
            {settings?.email || BUSINESS_EMAIL}
          </a>.
        </p>

        {/* Back navigation */}
        <div className="text-center pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B89555] dark:text-[#C9A96A] hover:text-[#96763D] dark:hover:text-[#D8BD88] transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            <span>Continue Shopping</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
