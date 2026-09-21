'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { useStore } from '@/context/StoreContext';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, Truck } from 'lucide-react';
import { createCartWhatsAppMessage, DISPLAY_WHATSAPP_NUMBER } from '@/lib/whatsapp';
import { WhatsAppIcon } from '@/components/common/WhatsAppIcon';
import { CartItem, ProductSize } from '@/types';

const SIZES: ProductSize[] = ['S', 'M', 'L', 'XL', 'XXL'];

function getCartItemImage(item: CartItem): string {
  if (item.type === 'deal') {
    return item.dealImage || '/images/products/sleevless high.jpeg';
  }
  if (item.image && item.image.trim() !== '') return item.image;
  if (item.quality === 'High Quality') {
    if (item.sleeve === 'Full Sleeve') return '/images/products/full sleeve high.jpeg';
    return '/images/products/sleevless high.jpeg';
  }
  return '/images/products/sleevless low.jpeg';
}

export default function CartPage() {
  const {
    items,
    updateQuantity,
    updateItemSize,
    removeItem,
    totalQuantity,
    subtotal,
    deliveryFee,
    totalAmount,
    isFreeDeliveryUnlocked,
    piecesNeededForFreeDelivery,
  } = useCart();
  const { settings, products } = useStore();

  const freeThreshold = settings.shipping?.freeDeliveryThreshold || 3;
  const whatsappUrl = createCartWhatsAppMessage(items, subtotal, deliveryFee, totalAmount, settings?.whatsapp || DISPLAY_WHATSAPP_NUMBER);

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center space-y-4 bg-[#F7F3EA] text-[#1D2730] min-h-[75vh] flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto text-[#C99A3D] border border-[#D8D0C3] shadow-sm">
          <ShoppingBag className="w-8 h-8 stroke-[2.2]" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1D2730]">Your Cart is Empty</h1>
        <p className="text-xs sm:text-sm text-[#66717C] max-w-md mx-auto">
          Explore our fine combed cotton essentials and select your size and style.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 bg-[#23384D] hover:bg-[#182B3D] text-[#F7F3EA] font-bold text-xs py-3 px-6 rounded-xl shadow-xs transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Explore Collection</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 bg-[#F7F3EA] min-h-[85vh] text-[#1D2730]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1D2730] tracking-tight">
            Shopping Cart ({totalQuantity} {totalQuantity === 1 ? 'piece' : 'pieces'})
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Items List (Left Col) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Free Delivery Bar */}
            <div className="p-4 bg-white rounded-2xl border border-[#D8D0C3] shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#C99A3D]" />
                  {isFreeDeliveryUnlocked ? (
                    <span className="text-[#2F7D5A] font-bold">
                      ✓ 100% FREE DELIVERY UNLOCKED ({freeThreshold}+ Pieces)
                    </span>
                  ) : (
                    <span className="text-[#66717C]">
                      Add <strong className="text-[#C99A3D]">{piecesNeededForFreeDelivery} more piece{piecesNeededForFreeDelivery > 1 ? 's' : ''}</strong> for Free Delivery
                    </span>
                  )}
                </span>
                <span className="text-xs font-bold text-[#66717C]">
                  {Math.min(totalQuantity, freeThreshold)}/{freeThreshold} pcs
                </span>
              </div>
              <div className="w-full bg-[#EEE8DC] rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    isFreeDeliveryUnlocked ? 'bg-[#2F7D5A]' : 'bg-[#C99A3D]'
                  }`}
                  style={{ width: `${Math.min(100, (totalQuantity / freeThreshold) * 100)}%` }}
                />
              </div>
            </div>

            {/* Item rows with In-Place Size & Quantity Editing */}
            <div className="bg-white rounded-2xl border border-[#D8D0C3] shadow-sm divide-y divide-[#D8D0C3] overflow-hidden">
              {items.map((item) => {
                if (item.type === 'deal') {
                  // Deal item display
                  return (
                    <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#EEE8DC]/50 rounded-xl overflow-hidden relative flex-shrink-0 border border-[#D8D0C3] p-1">
                        <Image
                          src={item.dealImage || '/images/products/sleevless high.jpeg'}
                          alt={item.dealName}
                          fill
                          sizes="80px"
                          className="object-contain object-center"
                        />
                      </div>

                      <div className="flex-1 space-y-1 w-full sm:w-auto">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-sm text-[#1D2730]">
                            {item.dealName}
                          </h3>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-[#66717C] hover:text-[#B8423A] transition-colors p-1"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          <span className="text-[10px] font-semibold bg-[#EEE8DC]/60 border border-[#D8D0C3] text-[#66717C] px-2 py-0.5 rounded">
                            {item.piecesCount} pieces
                          </span>
                          <span className="text-[10px] font-semibold bg-[#B8423A]/10 border border-[#B8423A]/30 text-[#B8423A] px-2 py-0.5 rounded">
                            {item.discountPercentage}% OFF
                          </span>
                          {item.isFreeDelivery && (
                            <span className="text-[10px] font-semibold bg-[#2F7D5A]/10 border border-[#2F7D5A]/30 text-[#2F7D5A] px-2 py-0.5 rounded">
                              Free Delivery
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#D8D0C3]">
                          {/* Quantity Stepper for deals */}
                          <div className="flex items-center border border-[#D8D0C3] rounded-xl bg-[#EEE8DC]/40 overflow-hidden">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-8 h-8 flex items-center justify-center text-[#1D2730] hover:bg-[#EEE8DC] transition-colors font-bold"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-10 text-center text-xs font-bold text-[#1D2730]">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center text-[#1D2730] hover:bg-[#EEE8DC] transition-colors font-bold"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Total Item Price */}
                          <div className="text-right min-w-[80px]">
                            <div className="font-extrabold text-sm text-[#C99A3D]">
                              Rs. {(item.unitPrice * item.quantity).toLocaleString()}
                            </div>
                            <div className="text-[10px] text-[#66717C]">
                              Rs. {item.unitPrice}/deal
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // Product item display
                  const matchingProd = products.find((p) => p.id === item.productId);
                  const availableItemSizes = matchingProd
                    ? Array.from(new Set(matchingProd.variants.filter((v) => v.sleeve === item.sleeve).map((v) => v.size)))
                    : SIZES;

                  return (
                    <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#EEE8DC]/50 rounded-xl overflow-hidden relative flex-shrink-0 border border-[#D8D0C3] p-1">
                        <Image
                          src={getCartItemImage(item)}
                          alt={item.productName}
                          fill
                          sizes="80px"
                          className="object-contain object-center"
                        />
                      </div>

                      <div className="flex-1 space-y-1 w-full sm:w-auto">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-sm text-[#1D2730]">
                            {item.productName}
                          </h3>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-[#66717C] hover:text-[#B8423A] transition-colors p-1"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          <span className="text-[10px] font-semibold bg-[#EEE8DC]/60 border border-[#D8D0C3] text-[#66717C] px-2 py-0.5 rounded">
                            {item.quality}
                          </span>
                          <span className="text-[10px] font-semibold bg-[#EEE8DC]/60 border border-[#D8D0C3] text-[#66717C] px-2 py-0.5 rounded">
                            {item.sleeve}
                          </span>
                        </div>

                        {/* In-Place Size Selector Pills */}
                        <div className="flex items-center gap-1.5 pt-2">
                          <span className="text-[11px] font-semibold text-[#66717C]">Size:</span>
                          <div className="flex items-center gap-1 flex-wrap">
                            {(availableItemSizes.length > 0 ? availableItemSizes : SIZES).map((sz) => (
                              <button
                                key={sz}
                                type="button"
                                onClick={() => updateItemSize(item.id, sz)}
                                className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-all ${
                                  item.size === sz
                                    ? 'bg-[#23384D] text-[#F7F3EA] border-[#23384D]'
                                    : 'bg-[#EEE8DC]/50 text-[#1D2730] border-[#D8D0C3] hover:border-[#C99A3D]'
                                }`}
                              >
                                {sz}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#D8D0C3]">
                        {/* Quantity Stepper (1+ pieces) */}
                        <div className="flex items-center border border-[#D8D0C3] rounded-xl bg-[#EEE8DC]/40 overflow-hidden">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center text-[#1D2730] hover:bg-[#EEE8DC] transition-colors font-bold"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-10 text-center text-xs font-bold text-[#1D2730]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center text-[#1D2730] hover:bg-[#EEE8DC] transition-colors font-bold"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Total Item Price */}
                        <div className="text-right min-w-[80px]">
                          <div className="font-extrabold text-sm text-[#C99A3D]">
                            Rs. {(item.unitPrice * item.quantity).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-[#66717C]">
                            Rs. {item.unitPrice}/pc
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>

          {/* Cart Summary (Right Col) */}
          <div className="lg:col-span-4">
            <div className="bg-white p-6 rounded-2xl border border-[#D8D0C3] shadow-sm space-y-4 sticky top-24">
              <h2 className="text-sm font-bold text-[#1D2730] border-b border-[#D8D0C3] pb-3">
                Order Summary
              </h2>

              <div className="space-y-2.5 text-xs text-[#66717C]">
                <div className="flex justify-between">
                  <span>Total Pieces</span>
                  <span className="font-semibold text-[#1D2730]">{totalQuantity} pcs</span>
                </div>

                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#1D2730]">Rs. {subtotal.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Nationwide Delivery</span>
                  {deliveryFee === 0 ? (
                    <span className="text-[#2F7D5A] font-bold">FREE</span>
                  ) : (
                    <span className="font-semibold text-[#1D2730]">Rs. {deliveryFee}</span>
                  )}
                </div>

                <div className="border-t border-[#D8D0C3] pt-3 flex justify-between items-baseline">
                  <span className="font-bold text-sm text-[#1D2730]">Total Amount</span>
                  <span className="text-xl font-extrabold text-[#C99A3D]">
                    Rs. {totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="pt-2 space-y-2.5">
                <Link
                  href="/checkout"
                  className="w-full py-3.5 bg-[#23384D] hover:bg-[#182B3D] text-[#F7F3EA] font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors active:scale-[0.99]"
                >
                  <span>Proceed to Express Checkout</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </Link>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="cart-page-whatsapp-btn"
                  className="w-full py-3 bg-white hover:bg-[#EEE8DC]/50 text-[#1D2730] border border-[#D8D0C3] font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-2xs"
                >
                  <WhatsAppIcon size={16} className="text-[#25D366] fill-current" />
                  <span>Order Directly via WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
