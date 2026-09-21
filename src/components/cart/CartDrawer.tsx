'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { X, Trash2, Plus, Minus, ShoppingBag, Truck, ArrowRight } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useStore } from '@/context/StoreContext';
import { createCartWhatsAppMessage, DISPLAY_WHATSAPP_NUMBER } from '@/lib/whatsapp';
import { WhatsAppIcon } from '@/components/common/WhatsAppIcon';
import { CartItem, ProductSize } from '@/types';

const SIZES: ProductSize[] = ['S', 'M', 'L', 'XL', 'XXL'];

// Authentic thumbnail resolution
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

export const CartDrawer: React.FC = () => {
  const pathname = usePathname();
  const {
    items,
    isDrawerOpen,
    closeDrawer,
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

  // Auto close drawer only when route actually changes
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      closeDrawer();
    }
  }, [pathname, closeDrawer]);

  // Lock body scroll while drawer is open + Escape key handler
  useEffect(() => {
    if (!isDrawerOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDrawer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDrawerOpen, closeDrawer]);

  if (!isDrawerOpen) return null;

  const freeThreshold = settings.shipping?.freeDeliveryThreshold || 3;
  const whatsappUrl = createCartWhatsAppMessage(items, subtotal, deliveryFee, totalAmount, settings?.whatsapp || DISPLAY_WHATSAPP_NUMBER);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none" aria-labelledby="cart-drawer-title" role="dialog" aria-modal="true">
      {/* 1. Backdrop */}
      <div
        onClick={closeDrawer}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        aria-hidden="true"
      />

      {/* 2. Drawer Panel */}
      <div className="fixed inset-y-0 right-0 flex max-w-full z-50 pointer-events-auto">
        <aside className="w-screen max-w-[100vw] sm:max-w-[440px] bg-white border-l border-[#D8D0C3] shadow-2xl flex flex-col h-full text-[#1D2730] animate-in slide-in-from-right duration-300 overflow-hidden">
          
          {/* DRAWER HEADER */}
          <div className="flex-shrink-0 px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[#D8D0C3] flex items-center justify-between bg-white">
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className="w-10 h-10 rounded-xl bg-[#23384D] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <h2 id="cart-drawer-title" className="font-bold text-[#1D2730] text-base leading-tight truncate">
                  Shopping Cart
                </h2>
                <p className="text-xs text-[#66717C] font-medium truncate">
                  {totalQuantity} {totalQuantity === 1 ? 'piece' : 'pieces'} selected
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={closeDrawer}
              className="w-11 h-11 flex items-center justify-center text-[#66717C] hover:text-[#1D2730] rounded-xl hover:bg-[#EEE8DC] active:scale-95 transition-all flex-shrink-0"
              aria-label="Close shopping cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* FREE DELIVERY PROGRESS BAR */}
          <div className="flex-shrink-0 px-4 py-3 bg-[#EEE8DC] border-b border-[#D8D0C3]">
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5 gap-2">
              <span className="min-w-0 flex-1 flex items-center gap-1.5 leading-snug">
                <Truck className="w-3.5 h-3.5 text-[#C99A3D] flex-shrink-0" />
                {isFreeDeliveryUnlocked ? (
                  <span className="text-[#2F7D5A] font-bold">
                    ✓ Free Delivery Unlocked across Pakistan!
                  </span>
                ) : (
                  <span className="text-[#1D2730]">
                    Add <strong className="text-[#C99A3D]">{piecesNeededForFreeDelivery} more piece{piecesNeededForFreeDelivery > 1 ? 's' : ''}</strong> for Free Delivery
                  </span>
                )}
              </span>
              <span className="text-[11px] font-bold text-[#66717C] flex-shrink-0">
                {Math.min(totalQuantity, freeThreshold)}/{freeThreshold} pcs
              </span>
            </div>
            <div className="w-full bg-[#D8D0C3] rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isFreeDeliveryUnlocked ? 'bg-[#2F7D5A]' : 'bg-[#C99A3D]'
                }`}
                style={{ width: `${Math.min(100, (totalQuantity / freeThreshold) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10.5px] text-[#66717C] mt-1.5 font-medium">
              <span>1 pc is a valid order</span>
              <span className="text-[#C99A3D] font-semibold">{freeThreshold}+ pcs: Free Delivery</span>
            </div>
          </div>

          {/* SCROLLABLE CART ITEMS LIST WITH IN-PLACE EDITING */}
          <div className="flex-1 overflow-y-auto min-h-0 p-3.5 sm:p-4 space-y-3.5 divide-y divide-[#D8D0C3] overscroll-contain">
            {items.length === 0 ? (
              <div className="text-center py-14 px-4 space-y-4">
                <div className="w-14 h-14 bg-[#EEE8DC] rounded-2xl flex items-center justify-center mx-auto text-[#66717C] border border-[#D8D0C3]">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-[#1D2730] text-base">Your Cart is Empty</h3>
                  <p className="text-xs text-[#66717C] max-w-xs mx-auto">
                    Browse our premium combed cotton hosiery essentials and select your sizes.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/shop"
                    onClick={closeDrawer}
                    className="inline-flex items-center justify-center gap-2 bg-[#23384D] hover:bg-[#182B3D] text-white font-bold text-xs py-3 px-6 rounded-xl shadow-xs transition-colors"
                  >
                    Start Shopping
                  </Link>
                </div>
              </div>
            ) : (
              items.map((item) => {
                if (item.type === 'deal') {
                  // Deal item display
                  return (
                    <div key={item.id} className="pt-3.5 first:pt-0 flex gap-3 sm:gap-3.5 items-start">
                      <div className="w-16 h-16 xs:w-18 xs:h-18 bg-[#EEE8DC] rounded-xl overflow-hidden relative flex-shrink-0 border border-[#D8D0C3] p-1">
                        <Image
                          src={item.dealImage || '/images/products/sleevless high.jpeg'}
                          alt={item.dealName}
                          fill
                          sizes="72px"
                          className="object-contain object-center"
                        />
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-1.5">
                            <h4 className="font-bold text-xs sm:text-sm text-[#1D2730] leading-snug break-words line-clamp-2">
                              {item.dealName}
                            </h4>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="w-7 h-7 flex items-center justify-center text-[#66717C] hover:text-[#B8423A] transition-colors rounded-lg hover:bg-rose-50 flex-shrink-0 -mr-1"
                              aria-label={`Remove ${item.dealName}`}
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            <span className="text-[10px] font-semibold bg-[#EEE8DC] border border-[#D8D0C3] text-[#1D2730] px-1.5 py-0.5 rounded">
                              {item.piecesCount} pieces
                            </span>
                            <span className="text-[10px] font-semibold bg-rose-50 border border-rose-200 text-[#B8423A] px-1.5 py-0.5 rounded">
                              {item.discountPercentage}% OFF
                            </span>
                            {item.isFreeDelivery && (
                              <span className="text-[10px] font-semibold bg-emerald-50 border border-emerald-200 text-[#2F7D5A] px-1.5 py-0.5 rounded">
                                Free Delivery
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Product item display
                const itemImg = getCartItemImage(item);
                const matchingProd = products.find((p) => p.id === item.productId);
                const availableItemSizes = matchingProd
                  ? Array.from(new Set(matchingProd.variants.filter((v) => v.sleeve === item.sleeve).map((v) => v.size)))
                  : SIZES;

                return (
                  <div key={item.id} className="pt-3.5 first:pt-0 flex gap-3 sm:gap-3.5 items-start">
                    {/* Responsive Thumbnail */}
                    <div className="w-16 h-16 xs:w-18 xs:h-18 bg-[#EEE8DC] rounded-xl overflow-hidden relative flex-shrink-0 border border-[#D8D0C3] p-1">
                      <Image
                        src={itemImg}
                        alt={`${item.productName} - ${item.quality} ${item.sleeve}`}
                        fill
                        sizes="72px"
                        className="object-contain object-center"
                      />
                    </div>

                    {/* Details Column */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        {/* Title & Remove Button */}
                        <div className="flex items-start justify-between gap-1.5">
                          <h4 className="font-bold text-xs sm:text-sm text-[#1D2730] leading-snug break-words line-clamp-2">
                            {item.productName}
                          </h4>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="w-7 h-7 flex items-center justify-center text-[#66717C] hover:text-[#B8423A] transition-colors rounded-lg hover:bg-rose-50 flex-shrink-0 -mr-1"
                            aria-label={`Remove ${item.productName}`}
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Variant Badges */}
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          <span className="text-[10px] font-semibold bg-[#EEE8DC] border border-[#D8D0C3] text-[#1D2730] px-1.5 py-0.5 rounded">
                            {item.quality}
                          </span>
                          <span className="text-[10px] font-semibold bg-[#EEE8DC] border border-[#D8D0C3] text-[#1D2730] px-1.5 py-0.5 rounded">
                            {item.sleeve}
                          </span>
                        </div>

                        {/* In-Place Size Selector Pills */}
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-[#66717C]">Size:</span>
                          <div className="flex items-center gap-1 flex-wrap">
                            {(availableItemSizes.length > 0 ? availableItemSizes : SIZES).map((sz) => (
                              <button
                                key={sz}
                                type="button"
                                onClick={() => updateItemSize(item.id, sz)}
                                className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-all ${
                                  item.size === sz
                                    ? 'bg-[#23384D] text-white border-[#23384D] shadow-2xs'
                                    : 'bg-white text-[#1D2730] border-[#D8D0C3] hover:border-[#C99A3D]'
                                }`}
                              >
                                {sz}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Quantity Stepper & Pricing */}
                      <div className="flex items-center justify-between mt-3 pt-0.5 gap-2">
                        {/* Quantity Stepper (min 1, bounds protected) */}
                        <div className="flex items-center border border-[#D8D0C3] rounded-lg bg-[#EEE8DC] overflow-hidden flex-shrink-0 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center text-[#1D2730] hover:bg-[#E8E1D3] active:scale-90 transition-colors font-bold text-xs"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-xs font-extrabold text-[#1D2730]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center text-[#1D2730] hover:bg-[#E8E1D3] active:scale-90 transition-colors font-bold text-xs"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Price Breakdown */}
                        <div className="text-right min-w-0">
                          <div className="text-xs sm:text-sm font-extrabold text-[#C99A3D] truncate">
                            Rs. {(item.unitPrice * item.quantity).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-[#66717C] truncate">
                            Rs. {item.unitPrice} / piece
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* STICKY BOTTOM SUMMARY & CHECKOUT ACTIONS */}
          {items.length > 0 && (
            <div className="flex-shrink-0 px-4 sm:px-5 py-3.5 sm:py-4 bg-[#EEE8DC] border-t border-[#D8D0C3] space-y-2.5 shadow-elevation pb-[max(1rem,env(safe-area-inset-bottom))]">
              {/* Cost Calculation Rows */}
              <div className="space-y-1.5 text-xs text-[#66717C]">
                <div className="flex justify-between items-center">
                  <span>Subtotal ({totalQuantity} {totalQuantity === 1 ? 'piece' : 'pieces'})</span>
                  <span className="font-semibold text-[#1D2730]">Rs. {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Delivery Fee</span>
                  <span className="font-semibold">
                    {deliveryFee === 0 ? (
                      <span className="text-[#2F7D5A] font-bold">FREE DELIVERY</span>
                    ) : (
                      `Rs. ${deliveryFee}`
                    )}
                  </span>
                </div>
                <div className="border-t border-[#D8D0C3] pt-2 flex justify-between items-center text-sm sm:text-base font-extrabold text-[#C99A3D]">
                  <span>Total Amount</span>
                  <span>Rs. {totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Action Buttons: Proceed to Checkout & Order on WhatsApp */}
              <div className="space-y-2 pt-1">
                <Link
                  href="/checkout"
                  onClick={closeDrawer}
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-extrabold text-xs tracking-wide uppercase transition-all duration-200 shadow-sm bg-[#23384D] hover:bg-[#182B3D] text-white active:scale-[0.99]"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </Link>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="cart-drawer-whatsapp-btn"
                  className="w-full min-h-[40px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs bg-[#25D366] hover:bg-[#1EBE5D] text-white transition-all shadow-xs active:scale-[0.99]"
                >
                  <WhatsAppIcon size={16} className="text-white fill-current" />
                  <span>Order on WhatsApp</span>
                </a>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
