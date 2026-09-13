'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useStore } from '@/context/StoreContext';
import { PaymentMethodType, ProductSize } from '@/types';
import {
  ArrowLeft,
  Lock,
  Building2,
  Banknote,
  CheckCircle2,
  Upload,
  Smartphone,
  Minus,
  Plus,
  Truck,
  Trash2,
} from 'lucide-react';

const SIZES: ProductSize[] = ['S', 'M', 'L', 'XL', 'XXL'];

const PAKISTAN_PROVINCES = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Islamabad Capital Territory',
  'Azad Jammu & Kashmir',
  'Gilgit-Baltistan',
];

const POPULAR_CITIES = [
  'Faisalabad',
  'Lahore',
  'Karachi',
  'Rawalpindi',
  'Islamabad',
  'Multan',
  'Gujranwala',
  'Peshawar',
  'Quetta',
  'Sialkot',
  'Hyderabad',
  'Bahawalpur',
  'Sargodha',
  'Gujrat',
  'Sheikhupura',
  'Jhang',
  'Rahim Yar Khan',
  'Kasur',
  'Mardan',
  'Sahiwal',
];

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isBuyNowParam = searchParams.get('buyNow') === '1';

  const {
    items: cartItems,
    totalQuantity: cartTotalQuantity,
    subtotal: cartSubtotal,
    deliveryFee: cartDeliveryFee,
    totalAmount: cartTotalAmount,
    updateQuantity,
    updateItemSize,
    removeItem,
    clearCart,
    buyNowItem,
    updateBuyNowItem,
    clearBuyNow,
  } = useCart();
  const { settings, products, createOrder, uploadMediaFile } = useStore();

  const isBuyNow = isBuyNowParam && Boolean(buyNowItem);
  const items = isBuyNow && buyNowItem ? [buyNowItem] : cartItems;

  const totalQuantity = isBuyNow && buyNowItem ? buyNowItem.quantity : cartTotalQuantity;
  const subtotal = isBuyNow && buyNowItem ? buyNowItem.unitPrice * buyNowItem.quantity : cartSubtotal;

  const freeDeliveryThreshold = settings.shipping?.freeDeliveryThreshold || 3;
  const baseDeliveryCharge = settings.shipping?.baseDeliveryCharge ?? 200;

  // Check if any deal has free delivery
  const hasFreeDeliveryDeal = items.some((it) => it.type === 'deal' && it.isFreeDelivery);
  const isFreeDeliveryUnlocked = hasFreeDeliveryDeal || totalQuantity >= freeDeliveryThreshold;
  const deliveryFee = totalQuantity === 0 ? 0 : isFreeDeliveryUnlocked ? 0 : baseDeliveryCharge;
  const totalAmount = subtotal + deliveryFee;
  const piecesNeededForFree = hasFreeDeliveryDeal ? 0 : Math.max(0, freeDeliveryThreshold - totalQuantity);

  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState('');
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState('');
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Checkout Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    whatsappNumber: '',
    email: '',
    address: '',
    city: 'Lahore',
    customCity: '',
    province: 'Punjab',
    orderNotes: '',
    paymentMethod: 'cod' as PaymentMethodType,
    paymentReference: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Cart Empty State
  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4 bg-light-bg dark:bg-[#11110F] text-charcoal-900 dark:text-[#F4F1E9] min-h-[70vh] flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-charcoal-900 dark:text-[#F4F1E9]">Your cart is empty</h1>
        <p className="text-xs text-charcoal-500 dark:text-[#8E8A80]">Please select items before proceeding to checkout.</p>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 bg-champagne-500 hover:bg-champagne-400 text-charcoal-950 text-xs font-bold py-3 px-6 rounded-xl shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Explore Shop
        </Link>
      </div>
    );
  }

  // CHECKOUT & DELIVERY FORM
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    const cleanPhone = formData.phone.trim().replace(/[\s-]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid Pakistani mobile number (e.g. 03001234567).');
      return;
    }

    if (!formData.address.trim()) {
      setErrorMsg('Please provide your complete street delivery address.');
      return;
    }

    const finalCity = formData.city === 'Other' ? formData.customCity.trim() : formData.city;
    if (!finalCity) {
      setErrorMsg('Please select or specify your city.');
      return;
    }

    const isDigitalPayment = formData.paymentMethod !== 'cod';
    if (isDigitalPayment && !paymentScreenshotUrl) {
      setErrorMsg('Please upload your payment screenshot before placing the order.');
      return;
    }

    try {
      setIsSubmitting(true);

      const orderPayload = {
        userId: undefined,
        customerType: 'GUEST' as const,
        customerName: formData.fullName.trim(),
        customerPhone: formData.phone.trim(),
        customerEmail: formData.email.trim() || undefined,
        address: formData.address.trim(),
        city: finalCity,
        province: formData.province,
        orderNotes: formData.orderNotes.trim() || undefined,
        subtotal,
        deliveryFee,
        totalAmount,
        paymentMethod: formData.paymentMethod,
        paymentReference: formData.paymentReference.trim() || undefined,
        paymentScreenshotUrl: paymentScreenshotUrl || undefined,
        items: items.map((it) => {
          if (it.type === 'deal') {
            // Deal item
            return {
              id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              orderId: '',
              dealId: it.dealId,
              dealName: it.dealName,
              dealSlug: it.dealSlug,
              piecesCount: it.piecesCount,
              originalPrice: it.originalPrice,
              discountPercentage: it.discountPercentage,
              unitPrice: it.unitPrice,
              quantity: it.quantity,
              totalPrice: it.unitPrice * it.quantity,
              image: it.dealImage,
              isFreeDelivery: it.isFreeDelivery,
            };
          } else {
            // Product item
            return {
              id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              orderId: '',
              productId: it.productId,
              variantId: it.variantId || it.id,
              productName: it.productName,
              quality: it.quality,
              sleeve: it.sleeve,
              size: it.size,
              unitPrice: it.unitPrice,
              originalPrice: it.originalPrice || it.unitPrice,
              discountPercentage: it.discountPercentage || 0,
              quantity: it.quantity,
              totalPrice: it.unitPrice * it.quantity,
              image: it.image,
            };
          }
        }),
      };

      const createdOrder = await createOrder(orderPayload);
      if (isBuyNow) {
        clearBuyNow();
      } else {
        clearCart();
      }
      router.push(`/order-confirmation/${createdOrder.id}`);
    } catch (err: any) {
      console.error('Checkout error:', err);
      setErrorMsg('Something went wrong placing your order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-12 bg-light-bg dark:bg-[#11110F] min-h-[85vh] text-charcoal-900 dark:text-[#F4F1E9] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-xs text-charcoal-500 dark:text-[#8E8A80] mb-6">
          <Link href="/cart" className="hover:text-[#B89555] dark:hover:text-[#C9A96A] flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Cart
          </Link>
          <span>/</span>
          <span className="font-bold text-charcoal-900 dark:text-[#F4F1E9]">Express Checkout</span>
        </div>

        <div className="border-b border-light-border dark:border-[#34322D] pb-4 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 dark:text-[#F4F1E9] tracking-tight">
                Checkout &amp; Delivery Details
              </h1>
              <p className="text-xs text-charcoal-600 dark:text-[#8E8A80] mt-1">
                Fast and secure delivery across Pakistan. Enter your recipient and delivery details below.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Customer & Delivery Info Form */}
            <div className="lg:col-span-7 space-y-6">
              {errorMsg && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 rounded-xl text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* 1. Recipient Information */}
              <div className="bg-white dark:bg-[#191917] rounded-2xl p-6 border border-light-border dark:border-[#34322D] shadow-sm space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-charcoal-900 dark:text-[#F4F1E9] border-b border-light-border dark:border-[#34322D] pb-3">
                  1. Recipient Details
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-charcoal-700 dark:text-[#D7D7D4]">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Muhammad Zubair"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl text-xs focus:outline-none focus:border-[#B89555]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-charcoal-700 dark:text-[#D7D7D4]">
                      Phone Number (for Courier Calls) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="03088666075"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl text-xs focus:outline-none focus:border-[#B89555]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-charcoal-700 dark:text-[#D7D7D4]">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl text-xs focus:outline-none focus:border-[#B89555]"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Shipping Address */}
              <div className="bg-white dark:bg-[#191917] rounded-2xl p-6 border border-light-border dark:border-[#34322D] shadow-sm space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-charcoal-900 dark:text-[#F4F1E9] border-b border-light-border dark:border-[#34322D] pb-3">
                  2. Shipping Address
                </h2>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-charcoal-700 dark:text-[#D7D7D4]">
                      Complete Street Address <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="House / Shop #, Street, Mohallah, Sector, Landmark..."
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl text-xs focus:outline-none focus:border-[#B89555]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-charcoal-700 dark:text-[#D7D7D4]">
                        City <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl text-xs focus:outline-none focus:border-[#B89555]"
                      >
                        {POPULAR_CITIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                        <option value="Other">Other City...</option>
                      </select>
                    </div>

                    {formData.city === 'Other' ? (
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-charcoal-700 dark:text-[#D7D7D4]">
                          Enter City Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Enter your city name"
                          value={formData.customCity}
                          onChange={(e) => setFormData({ ...formData, customCity: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl text-xs focus:outline-none focus:border-[#B89555]"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-charcoal-700 dark:text-[#D7D7D4]">
                          Province
                        </label>
                        <select
                          value={formData.province}
                          onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl text-xs focus:outline-none focus:border-[#B89555]"
                        >
                          {PAKISTAN_PROVINCES.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-charcoal-700 dark:text-[#D7D7D4]">
                      Order Notes (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Call before delivery, leave with neighbor..."
                      value={formData.orderNotes}
                      onChange={(e) => setFormData({ ...formData, orderNotes: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl text-xs focus:outline-none focus:border-[#B89555]"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Payment Method */}
              <div className="bg-white dark:bg-[#191917] rounded-2xl p-6 border border-light-border dark:border-[#34322D] shadow-sm space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-charcoal-900 dark:text-[#F4F1E9] border-b border-light-border dark:border-[#34322D] pb-3">
                  3. Payment Method
                </h2>

                <div className="space-y-3">
                  {/* Cash on Delivery */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      formData.paymentMethod === 'cod'
                        ? 'border-[#B89555] bg-champagne-50/50 dark:bg-[#22211E]'
                        : 'border-light-border dark:border-[#34322D] hover:bg-light-hover dark:hover:bg-[#1E1D1A]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={formData.paymentMethod === 'cod'}
                      onChange={() => setFormData({ ...formData, paymentMethod: 'cod' })}
                      className="mt-1 accent-[#B89555]"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Banknote className="w-4 h-4 text-[#B89555]" />
                        <span className="font-bold text-xs text-charcoal-900 dark:text-[#F4F1E9]">Cash on Delivery (COD)</span>
                      </div>
                      <p className="text-[11px] text-charcoal-500 dark:text-[#8E8A80] mt-0.5">
                        Pay cash safely upon receiving your parcel at your doorstep.
                      </p>
                    </div>
                  </label>

                  {/* Bank Transfer */}
                  {settings.paymentMethods?.bank_transfer?.enabled !== false && (
                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        formData.paymentMethod === 'bank_transfer'
                          ? 'border-[#B89555] bg-champagne-50/50 dark:bg-[#22211E]'
                          : 'border-light-border dark:border-[#34322D] hover:bg-light-hover dark:hover:bg-[#1E1D1A]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="bank_transfer"
                        checked={formData.paymentMethod === 'bank_transfer'}
                        onChange={() => setFormData({ ...formData, paymentMethod: 'bank_transfer' })}
                        className="mt-1 accent-[#B89555]"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-[#B89555]" />
                          <span className="font-bold text-xs text-charcoal-900 dark:text-[#F4F1E9]">Direct Bank Transfer</span>
                        </div>
                        <p className="text-[11px] text-charcoal-500 dark:text-[#8E8A80] mt-0.5">
                          Transfer to our official Meezan / Al Habib account and attach payment receipt.
                        </p>
                      </div>
                    </label>
                  )}

                  {/* JazzCash */}
                  {settings.paymentMethods?.jazzcash?.enabled !== false && (
                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        formData.paymentMethod === 'jazzcash'
                          ? 'border-[#B89555] bg-champagne-50/50 dark:bg-[#22211E]'
                          : 'border-light-border dark:border-[#34322D] hover:bg-light-hover dark:hover:bg-[#1E1D1A]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="jazzcash"
                        checked={formData.paymentMethod === 'jazzcash'}
                        onChange={() => setFormData({ ...formData, paymentMethod: 'jazzcash' })}
                        className="mt-1 accent-[#B89555]"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Smartphone className="w-4 h-4 text-red-600 dark:text-red-400" />
                          <span className="font-bold text-xs text-charcoal-900 dark:text-[#F4F1E9]">JazzCash</span>
                        </div>
                        <p className="text-[11px] text-charcoal-500 dark:text-[#8E8A80] mt-0.5">
                          Pay directly from your JazzCash app or mobile account.
                        </p>
                      </div>
                    </label>
                  )}

                  {/* EasyPaisa */}
                  {settings.paymentMethods?.easypaisa?.enabled !== false && (
                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        formData.paymentMethod === 'easypaisa'
                          ? 'border-[#B89555] bg-champagne-50/50 dark:bg-[#22211E]'
                          : 'border-light-border dark:border-[#34322D] hover:bg-light-hover dark:hover:bg-[#1E1D1A]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="easypaisa"
                        checked={formData.paymentMethod === 'easypaisa'}
                        onChange={() => setFormData({ ...formData, paymentMethod: 'easypaisa' })}
                        className="mt-1 accent-[#B89555]"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="font-bold text-xs text-charcoal-900 dark:text-[#F4F1E9]">EasyPaisa</span>
                        </div>
                        <p className="text-[11px] text-charcoal-500 dark:text-[#8E8A80] mt-0.5">
                          Instant EasyPaisa wallet transfer.
                        </p>
                      </div>
                    </label>
                  )}

                  {/* SadaPay */}
                  {settings.paymentMethods?.sadapay?.enabled !== false && (
                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        formData.paymentMethod === 'sadapay'
                          ? 'border-[#B89555] bg-champagne-50/50 dark:bg-[#22211E]'
                          : 'border-light-border dark:border-[#34322D] hover:bg-light-hover dark:hover:bg-[#1E1D1A]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="sadapay"
                        checked={formData.paymentMethod === 'sadapay'}
                        onChange={() => setFormData({ ...formData, paymentMethod: 'sadapay' })}
                        className="mt-1 accent-[#B89555]"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Smartphone className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                          <span className="font-bold text-xs text-charcoal-900 dark:text-[#F4F1E9]">SadaPay</span>
                        </div>
                        <p className="text-[11px] text-charcoal-500 dark:text-[#8E8A80] mt-0.5">
                          Zero-fee digital wallet &amp; debit card transfer.
                        </p>
                      </div>
                    </label>
                  )}
                </div>

                {/* Digital Payment Details & Screenshot Upload Box */}
                {formData.paymentMethod !== 'cod' && (
                  <div className="p-4 sm:p-5 bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl text-xs space-y-4 animate-in fade-in">
                    <div>
                      {formData.paymentMethod === 'bank_transfer' && (
                        <div className="space-y-1.5">
                          <p className="font-bold text-[#B89555] dark:text-[#C9A96A]">
                            {settings.paymentMethods?.bank_transfer?.bankName || settings.bankDetails?.bankName || 'Meezan Bank Ltd.'} Account Details:
                          </p>
                          <div className="space-y-1 font-mono text-[11px] text-charcoal-700 dark:text-[#B8B3A8]">
                            <p>• Account Title: <strong className="text-charcoal-900 dark:text-[#F4F1E9]">{settings.paymentMethods?.bank_transfer?.accountTitle || settings.bankDetails?.accountTitle || 'Muhammad Amin'}</strong></p>
                            <div className="flex items-center gap-2">
                              <span>• Account #: <strong className="text-charcoal-900 dark:text-[#F4F1E9]">{settings.paymentMethods?.bank_transfer?.accountNumber || settings.bankDetails?.accountNumber || '01010101010101'}</strong></span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(settings.paymentMethods?.bank_transfer?.accountNumber || settings.bankDetails?.accountNumber || '01010101010101', 'bt-acc')}
                                className="text-[#B89555] hover:underline"
                              >
                                {copiedKey === 'bt-acc' ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span>• IBAN: <strong className="text-charcoal-900 dark:text-[#F4F1E9]">{settings.paymentMethods?.bank_transfer?.iban || settings.bankDetails?.iban || 'PK00MEZN0000000000000000'}</strong></span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(settings.paymentMethods?.bank_transfer?.iban || settings.bankDetails?.iban || 'PK00MEZN0000000000000000', 'bt-iban')}
                                className="text-[#B89555] hover:underline"
                              >
                                {copiedKey === 'bt-iban' ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {formData.paymentMethod === 'jazzcash' && (
                        <div className="space-y-1.5">
                          <p className="font-bold text-red-600 dark:text-red-400">JazzCash Account Details:</p>
                          <div className="space-y-1 font-mono text-[11px] text-charcoal-700 dark:text-[#B8B3A8]">
                            <p>• Account Title: <strong className="text-charcoal-900 dark:text-[#F4F1E9]">{settings.paymentMethods?.jazzcash?.accountTitle || 'MUHAMMAD ZUBAIR'}</strong></p>
                            <div className="flex items-center gap-2">
                              <span>• JazzCash Number: <strong className="text-charcoal-900 dark:text-[#F4F1E9]">{settings.paymentMethods?.jazzcash?.accountNumber || '03088666075'}</strong></span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(settings.paymentMethods?.jazzcash?.accountNumber || '03088666075', 'jc-num')}
                                className="text-[#B89555] hover:underline"
                              >
                                {copiedKey === 'jc-num' ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {formData.paymentMethod === 'easypaisa' && (
                        <div className="space-y-1.5">
                          <p className="font-bold text-emerald-600 dark:text-emerald-400">EasyPaisa Account Details:</p>
                          <div className="space-y-1 font-mono text-[11px] text-charcoal-700 dark:text-[#B8B3A8]">
                            <p>• Account Title: <strong className="text-charcoal-900 dark:text-[#F4F1E9]">{settings.paymentMethods?.easypaisa?.accountTitle || 'MUHAMMAD ZUBAIR'}</strong></p>
                            <div className="flex items-center gap-2">
                              <span>• EasyPaisa Number: <strong className="text-charcoal-900 dark:text-[#F4F1E9]">{settings.paymentMethods?.easypaisa?.accountNumber || '03088666075'}</strong></span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(settings.paymentMethods?.easypaisa?.accountNumber || '03088666075', 'ep-num')}
                                className="text-[#B89555] hover:underline"
                              >
                                {copiedKey === 'ep-num' ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {formData.paymentMethod === 'sadapay' && (
                        <div className="space-y-1.5">
                          <p className="font-bold text-teal-600 dark:text-teal-400">SadaPay Account Details:</p>
                          <div className="space-y-1 font-mono text-[11px] text-charcoal-700 dark:text-[#B8B3A8]">
                            <p>• Account Title: <strong className="text-charcoal-900 dark:text-[#F4F1E9]">{settings.paymentMethods?.sadapay?.accountTitle || 'MUHAMMAD ZUBAIR'}</strong></p>
                            <div className="flex items-center gap-2">
                              <span>• SadaPay Number: <strong className="text-charcoal-900 dark:text-[#F4F1E9]">{settings.paymentMethods?.sadapay?.accountNumber || '03088666075'}</strong></span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(settings.paymentMethods?.sadapay?.accountNumber || '03088666075', 'sp-num')}
                                className="text-[#B89555] hover:underline"
                              >
                                {copiedKey === 'sp-num' ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="mt-2 text-[11px] text-charcoal-600 dark:text-[#B8B3A8]">
                        Exact Transfer Amount: <strong className="text-[#B89555] dark:text-[#C9A96A] text-xs font-bold">Rs. {totalAmount.toLocaleString()}</strong>
                      </div>
                    </div>

                    {/* Screenshot Upload UI */}
                    <div className="pt-3 border-t border-light-border dark:border-[#34322D] space-y-2">
                      <label className="block text-xs font-bold text-charcoal-900 dark:text-[#F4F1E9]">
                        Upload Payment Screenshot / Receipt <span className="text-rose-500">*</span>
                      </label>
                      <p className="text-[11px] text-charcoal-500 dark:text-[#8E8A80]">
                        Please attach a clear receipt showing transaction ID, amount, and date.
                      </p>

                      {paymentScreenshotUrl ? (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-emerald-300 dark:border-emerald-700 flex-shrink-0 bg-white dark:bg-black">
                              <img
                                src={receiptPreviewUrl || paymentScreenshotUrl}
                                alt="Payment receipt preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-bold text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Screenshot Attached
                              </p>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                Receipt secured &amp; ready to submit
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentScreenshotUrl('');
                              setReceiptPreviewUrl('');
                            }}
                            className="text-xs text-rose-600 hover:underline font-semibold"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="relative border-2 border-dashed border-light-border dark:border-[#34322D] hover:border-[#B89555] rounded-xl p-4 text-center transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            disabled={isUploadingScreenshot}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                setIsUploadingScreenshot(true);
                                const preview = URL.createObjectURL(file);
                                setReceiptPreviewUrl(preview);
                                const path = await uploadMediaFile(file, 'payment-receipts');
                                setPaymentScreenshotUrl(path);
                              } catch (uploadErr) {
                                console.error('Screenshot upload failed:', uploadErr);
                                setErrorMsg('Failed to upload screenshot. Please try another image.');
                                setReceiptPreviewUrl('');
                              } finally {
                                setIsUploadingScreenshot(false);
                              }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                            <Upload className={`w-5 h-5 text-[#B89555] ${isUploadingScreenshot ? 'animate-bounce' : ''}`} />
                            <span className="text-xs font-semibold text-charcoal-800 dark:text-[#F4F1E9]">
                              {isUploadingScreenshot ? 'Uploading Screenshot...' : 'Click or tap to upload receipt image'}
                            </span>
                            <span className="text-[10px] text-charcoal-400 dark:text-[#8E8A80]">
                              JPG, PNG, WebP up to 10MB
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Order Summary & In-Place Size/Qty Editing */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white dark:bg-[#191917] rounded-2xl p-6 border border-light-border dark:border-[#34322D] shadow-sm space-y-4 sticky top-24">
                <div className="flex items-center justify-between border-b border-light-border dark:border-[#34322D] pb-3">
                  <h2 className="text-sm font-bold text-charcoal-900 dark:text-[#F4F1E9]">
                    Order Summary
                  </h2>
                  <span className="text-xs text-charcoal-500 dark:text-[#8E8A80]">
                    {totalQuantity} {totalQuantity === 1 ? 'piece' : 'pieces'}
                  </span>
                </div>

                {/* Items List with In-Place Size & Quantity Editing */}
                <div className="space-y-4 divide-y divide-light-border dark:divide-[#34322D] max-h-96 overflow-y-auto pr-1">
                  {items.map((item) => {
                    if (item.type === 'deal') {
                      // Deal item display
                      return (
                        <div key={item.id} className="pt-4 first:pt-0 space-y-2 text-xs">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-charcoal-900 dark:text-[#F4F1E9]">{item.dealName}</p>
                              <p className="text-[11px] text-charcoal-500 dark:text-[#8E8A80]">
                                {item.piecesCount} pieces • {item.discountPercentage}% OFF
                              </p>
                              {item.isFreeDelivery && (
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                  Free Delivery
                                </p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="font-bold text-[#B89555] dark:text-[#C9A96A] text-sm">
                                Rs. {(item.unitPrice * item.quantity).toLocaleString()}
                              </span>
                              <p className="text-[10px] text-charcoal-400 dark:text-[#8E8A80]">
                                Rs. {item.unitPrice} / deal
                              </p>
                            </div>
                          </div>

                          {/* Quantity Stepper for deals (no size selection) */}
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <div className="flex items-center border border-light-border dark:border-[#34322D] rounded-lg bg-light-elevated dark:bg-[#1A1A18] overflow-hidden flex-shrink-0 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isBuyNow) {
                                    updateBuyNowItem({ quantity: Math.max(1, item.quantity - 1) });
                                  } else {
                                    updateQuantity(item.id, item.quantity - 1);
                                  }
                                }}
                                className="w-7 h-7 flex items-center justify-center text-charcoal-700 dark:text-[#D7D7D4] hover:bg-light-hover dark:hover:bg-[#262521] active:scale-90 transition-colors font-bold text-xs"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-7 text-center text-xs font-extrabold text-charcoal-900 dark:text-[#F4F1E9]">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (isBuyNow) {
                                    updateBuyNowItem({ quantity: item.quantity + 1 });
                                  } else {
                                    updateQuantity(item.id, item.quantity + 1);
                                  }
                                }}
                                className="w-7 h-7 flex items-center justify-center text-charcoal-700 dark:text-[#D7D7D4] hover:bg-light-hover dark:hover:bg-[#262521] active:scale-90 transition-colors font-bold text-xs"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      // Product item display
                      const matchingProd = products.find((p) => p.id === item.productId);
                      const availableSizes = matchingProd
                        ? Array.from(new Set(matchingProd.variants.filter((v) => v.sleeve === item.sleeve).map((v) => v.size)))
                        : SIZES;

                      return (
                        <div key={item.id} className="pt-4 first:pt-0 space-y-2 text-xs">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-charcoal-900 dark:text-[#F4F1E9]">{item.productName}</p>
                              <p className="text-[11px] text-charcoal-500 dark:text-[#8E8A80]">
                                {item.quality} • {item.sleeve}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="font-bold text-[#B89555] dark:text-[#C9A96A] text-sm">
                                Rs. {(item.unitPrice * item.quantity).toLocaleString()}
                              </span>
                              <p className="text-[10px] text-charcoal-400 dark:text-[#8E8A80]">
                                Rs. {item.unitPrice} / pc
                              </p>
                            </div>
                          </div>

                          {/* Interactive In-Place Controls: Size Pills + Quantity Stepper */}
                          <div className="flex items-center justify-between gap-2 pt-1">
                            {/* Size Pills */}
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-[10px] text-charcoal-500 dark:text-[#8E8A80] font-medium mr-1">Size:</span>
                              {(availableSizes.length > 0 ? availableSizes : SIZES).map((sz) => (
                                <button
                                  key={sz}
                                  type="button"
                                  onClick={() => {
                                    if (isBuyNow) {
                                      updateBuyNowItem({ size: sz });
                                    } else {
                                      updateItemSize(item.id, sz);
                                    }
                                  }}
                                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-all ${
                                    item.size === sz
                                      ? 'bg-champagne-500 text-charcoal-950 border-champagne-500 shadow-2xs'
                                      : 'bg-light-elevated dark:bg-[#22211E] text-charcoal-700 dark:text-[#B8B3A8] border-light-border dark:border-[#34322D] hover:border-[#B89555]/50'
                                  }`}
                                >
                                  {sz}
                                </button>
                              ))}
                            </div>

                            {/* Quantity Stepper */}
                            <div className="flex items-center border border-light-border dark:border-[#34322D] rounded-lg bg-light-elevated dark:bg-[#1A1A18] overflow-hidden flex-shrink-0 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isBuyNow) {
                                    updateBuyNowItem({ quantity: Math.max(1, item.quantity - 1) });
                                  } else {
                                    updateQuantity(item.id, item.quantity - 1);
                                  }
                                }}
                                className="w-7 h-7 flex items-center justify-center text-charcoal-700 dark:text-[#D7D7D4] hover:bg-light-hover dark:hover:bg-[#262521] active:scale-90 transition-colors font-bold text-xs"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-7 text-center text-xs font-extrabold text-charcoal-900 dark:text-[#F4F1E9]">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (isBuyNow) {
                                    updateBuyNowItem({ quantity: item.quantity + 1 });
                                  } else {
                                    updateQuantity(item.id, item.quantity + 1);
                                  }
                                }}
                                className="w-7 h-7 flex items-center justify-center text-charcoal-700 dark:text-[#D7D7D4] hover:bg-light-hover dark:hover:bg-[#262521] active:scale-90 transition-colors font-bold text-xs"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>

                {/* Free Delivery Bar in Order Summary */}
                <div className="p-3 bg-light-elevated dark:bg-[#22211E] rounded-xl border border-light-border dark:border-[#34322D] text-xs">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
                    <Truck className="w-4 h-4 flex-shrink-0" />
                    <span>
                      {isFreeDeliveryUnlocked
                        ? '✓ Free Nationwide Delivery Unlocked!'
                        : `Add ${piecesNeededForFree} more piece${piecesNeededForFree > 1 ? 's' : ''} for FREE delivery`}
                    </span>
                  </div>
                </div>

                {/* Pricing totals */}
                <div className="border-t border-light-border dark:border-[#34322D] pt-3 space-y-2 text-xs text-charcoal-600 dark:text-[#B8B3A8]">
                  <div className="flex justify-between">
                    <span>Subtotal ({totalQuantity} {totalQuantity === 1 ? 'piece' : 'pieces'})</span>
                    <span className="font-semibold text-charcoal-900 dark:text-[#F4F1E9]">Rs. {subtotal.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Delivery Fee</span>
                    <span className="font-semibold">
                      {deliveryFee === 0 ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">FREE Delivery</span>
                      ) : (
                        `Rs. ${deliveryFee}`
                      )}
                    </span>
                  </div>
                  <div className="border-t border-light-border dark:border-[#34322D] pt-3 flex justify-between text-base font-bold text-[#B89555] dark:text-[#C9A96A]">
                    <span>Total Amount</span>
                    <span>Rs. {totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-xl bg-champagne-500 hover:bg-champagne-400 disabled:opacity-50 text-charcoal-950 font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.99]"
                >
                  <Lock className="w-4 h-4 stroke-[2.2]" />
                  <span>{isSubmitting ? 'Placing Order...' : `Confirm & Place Order • Rs. ${totalAmount.toLocaleString()}`}</span>
                </button>

                <div className="text-[11px] text-center text-charcoal-500 dark:text-[#8E8A80] pt-1">
                  100% Fine Combed Cotton • Delivered across Pakistan
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
