'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { X, Trash2, Plus, Minus, ShoppingBag, Truck, ArrowRight, AlertCircle, Package } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useStore } from '@/context/StoreContext';
import { createCartWhatsAppMessage, DISPLAY_WHATSAPP_NUMBER } from '@/lib/whatsapp';
import { WhatsAppIcon } from '@/components/common/WhatsAppIcon';
import { CartItem } from '@/types';

// Guarantee authentic thumbnail resolution
function getCartItemImage(item: CartItem): string {
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
    cartMode,
    isDrawerOpen,
    closeDrawer,
    updateQuantity,
    removeItem,
    modeConflict,
    switchCartModeAndAdd,
    clearModeConflict,
    totalQuantity,
    subtotal,
    regularSubtotal,
    wholesaleSubtotal,
    totalSavings,
    deliveryFee,
    totalAmount,
    isFreeDeliveryUnlocked,
    piecesNeededForFreeDelivery,
    hasWholesaleItems,
    wholesaleQuantity,
    isWholesaleMinimumMet,
    wholesalePiecesNeeded,
    wholesaleMinQty,
  } = useCart();
  const { settings } = useStore();

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

  const minRetailQty = settings.shipping?.minOrderQty || 1;
  const isRetailMinMet = totalQuantity >= minRetailQty;
  const canCheckout = hasWholesaleItems ? isWholesaleMinimumMet : isRetailMinMet;
  const freeThreshold = settings.shipping?.freeDeliveryThreshold || 3;
  const whatsappUrl = createCartWhatsAppMessage(items, subtotal, deliveryFee, totalAmount, settings?.whatsapp || DISPLAY_WHATSAPP_NUMBER);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none" aria-labelledby="cart-drawer-title" role="dialog" aria-modal="true">
      {/* 1. Backdrop */}
      <div
        onClick={closeDrawer}
        className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        aria-hidden="true"
      />

      {/* 2. Drawer Panel Positioning */}
      <div className="fixed inset-y-0 right-0 flex max-w-full z-50 pointer-events-auto">
        <aside className="w-screen max-w-[100vw] sm:max-w-[420px] bg-white dark:bg-[#151513] border-l border-light-border dark:border-[#34322D] shadow-2xl flex flex-col h-full text-charcoal-900 dark:text-[#F4F1E9] animate-in slide-in-from-right duration-300 overflow-hidden">
          
          {/* ========================================================================= */}
          {/* DRAWER HEADER (Fixed Row) */}
          {/* ========================================================================= */}
          <div className="flex-shrink-0 px-4 sm:px-5 py-3.5 sm:py-4 border-b border-light-border dark:border-[#34322D] flex items-center justify-between bg-white dark:bg-[#191917]">
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className="w-10 h-10 rounded-xl bg-champagne-500 text-charcoal-950 flex items-center justify-center flex-shrink-0 shadow-xs">
                <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <h2 id="cart-drawer-title" className="font-bold text-charcoal-900 dark:text-[#F4F1E9] text-base leading-tight truncate">
                  Your Cart
                </h2>
                <p className="text-xs text-charcoal-500 dark:text-[#8E8A80] font-medium truncate">
                  {totalQuantity} {totalQuantity === 1 ? 'piece' : 'pieces'} {hasWholesaleItems ? '• Wholesale Order' : 'selected'}
                </p>
              </div>
            </div>

            {/* Close Button with 44px min touch target */}
            <button
              type="button"
              onClick={closeDrawer}
              className="w-11 h-11 flex items-center justify-center text-charcoal-500 dark:text-[#8E8A80] hover:text-charcoal-900 dark:hover:text-[#F4F1E9] rounded-xl hover:bg-light-hover dark:hover:bg-[#22211E] active:scale-95 transition-all flex-shrink-0"
              aria-label="Close shopping cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switch Conflict Notification */}
          {modeConflict && (
            <div className="p-4 bg-amber-500/10 dark:bg-amber-950/40 border-b border-amber-500/30 text-xs animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <p className="font-bold text-charcoal-900 dark:text-[#F4F1E9]">
                    Switch to {modeConflict.targetMode === 'wholesale' ? 'Wholesale' : 'Retail'} Mode?
                  </p>
                  <p className="text-charcoal-600 dark:text-[#B8B3A8] text-[11px] leading-relaxed">
                    Your cart currently has {modeConflict.currentMode} items. Adding this item will start a dedicated {modeConflict.targetMode} order.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => switchCartModeAndAdd(modeConflict.incomingItem)}
                      className="px-3 py-1.5 bg-champagne-500 hover:bg-champagne-400 text-charcoal-950 rounded-lg text-xs font-bold shadow-xs transition-colors"
                    >
                      Clear &amp; Start {modeConflict.targetMode === 'wholesale' ? 'Wholesale' : 'Retail'}
                    </button>
                    <button
                      type="button"
                      onClick={clearModeConflict}
                      className="px-3 py-1.5 bg-white dark:bg-[#22211E] text-charcoal-700 dark:text-[#B8B3A8] rounded-lg text-xs font-semibold border border-light-border dark:border-[#34322D] hover:bg-light-hover dark:hover:bg-[#2A2925] transition-colors"
                    >
                      Keep Current Cart
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* WHOLESALE STATUS & FREE DELIVERY PROGRESS BAR (Fixed Row) */}
          {/* ========================================================================= */}
          <div className="flex-shrink-0">
            {hasWholesaleItems ? (
              <div className="px-4 py-3 bg-champagne-50/70 dark:bg-[#1C1B17] border-b border-light-border dark:border-[#34322D]">
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5 gap-2">
                  <span className="min-w-0 flex-1 leading-snug">
                    {isWholesaleMinimumMet ? (
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <span>✓</span> Wholesale Minimum Met ({wholesaleQuantity} pcs)
                      </span>
                    ) : (
                      <span className="text-[#A07D38] dark:text-[#C9A96A] font-bold">
                        Add {wholesalePiecesNeeded} more piece{wholesalePiecesNeeded > 1 ? 's' : ''} for Wholesale
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] font-bold text-charcoal-600 dark:text-[#A6A29A] flex-shrink-0">
                    {wholesaleQuantity}/{wholesaleMinQty} pcs
                  </span>
                </div>
                <div className="w-full bg-light-border dark:bg-[#2A2925] rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      isWholesaleMinimumMet ? 'bg-emerald-500' : 'bg-champagne-500'
                    }`}
                    style={{ width: `${Math.min(100, (wholesaleQuantity / wholesaleMinQty) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10.5px] text-charcoal-500 dark:text-[#8E8A80] mt-1.5 font-medium">
                  <span>Minimum {wholesaleMinQty} pcs</span>
                  <span className="text-[#A07D38] dark:text-[#C9A96A] font-bold">100% Free Nationwide Delivery</span>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 bg-light-elevated dark:bg-[#1A1A18] border-b border-light-border dark:border-[#34322D]">
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5 gap-2">
                  <span className="min-w-0 flex-1 flex items-center gap-1.5 leading-snug">
                    <Truck className="w-3.5 h-3.5 text-[#A07D38] dark:text-[#C9A96A] flex-shrink-0" />
                    {isFreeDeliveryUnlocked ? (
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                        ✓ Free Nationwide Delivery Unlocked!
                      </span>
                    ) : (
                      <span className="text-charcoal-700 dark:text-[#D7D7D4]">
                        Add <strong className="text-[#A07D38] dark:text-[#C9A96A]">{piecesNeededForFreeDelivery} more piece{piecesNeededForFreeDelivery > 1 ? 's' : ''}</strong> for Free Delivery
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] font-bold text-charcoal-600 dark:text-[#A6A29A] flex-shrink-0">
                    {Math.min(totalQuantity, freeThreshold)}/{freeThreshold} pcs
                  </span>
                </div>
                <div className="w-full bg-light-border dark:bg-[#2A2925] rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      isFreeDeliveryUnlocked ? 'bg-emerald-500' : 'bg-champagne-500'
                    }`}
                    style={{ width: `${Math.min(100, (totalQuantity / freeThreshold) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10.5px] text-charcoal-500 dark:text-[#8E8A80] mt-1.5 font-medium">
                  <span>Min order: {minRetailQty} pcs</span>
                  <span className="text-[#A07D38] dark:text-[#C9A96A] font-semibold">{freeThreshold}+ pcs: Free Delivery</span>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SCROLLABLE CART ITEMS LIST */}
          {/* ========================================================================= */}
          <div className="flex-1 overflow-y-auto min-h-0 p-3.5 sm:p-4 space-y-3 divide-y divide-light-border dark:divide-[#2A2925] overscroll-contain">
            {items.length === 0 ? (
              <div className="text-center py-14 px-4 space-y-4">
                <div className="w-14 h-14 bg-light-elevated dark:bg-[#1F1E1B] rounded-2xl flex items-center justify-center mx-auto text-charcoal-400 dark:text-[#8E8A80] border border-light-border dark:border-[#34322D]">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-charcoal-900 dark:text-[#F4F1E9] text-base">Your Cart is Empty</h3>
                  <p className="text-xs text-charcoal-500 dark:text-[#8E8A80] max-w-xs mx-auto">
                    Browse our combed cotton hosiery essentials and add your sizes.
                  </p>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                  <Link
                    href="/shop"
                    onClick={closeDrawer}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-champagne-500 hover:bg-champagne-400 text-charcoal-950 font-bold text-xs py-3 px-5 rounded-xl shadow-xs transition-colors"
                  >
                    Shop Retail
                  </Link>
                  <Link
                    href="/wholesale"
                    onClick={closeDrawer}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-light-elevated dark:bg-[#22211E] hover:bg-light-hover dark:hover:bg-[#2A2925] text-charcoal-900 dark:text-[#F4F1E9] border border-light-border dark:border-[#34322D] font-bold text-xs py-3 px-5 rounded-xl transition-colors"
                  >
                    Wholesale Store
                  </Link>
                </div>
              </div>
            ) : (
              items.map((item) => {
                const itemImg = getCartItemImage(item);
                const isWholesale = Boolean(item.isWholesale);
                const regPrice = item.regularPrice || item.unitPrice;
                const unitSaving = isWholesale && regPrice > item.unitPrice ? regPrice - item.unitPrice : 0;

                return (
                  <div key={item.id} className="pt-3.5 first:pt-0 flex gap-3 sm:gap-3.5 items-start">
                    {/* Fixed Responsive Thumbnail */}
                    <div className="w-16 h-16 xs:w-18 xs:h-18 bg-light-elevated dark:bg-[#1A1A18] rounded-xl overflow-hidden relative flex-shrink-0 border border-light-border dark:border-[#34322D] p-1">
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
                          <h4 className="font-bold text-xs sm:text-sm text-charcoal-900 dark:text-[#F4F1E9] leading-snug break-words line-clamp-2">
                            {item.productName}
                          </h4>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="w-7 h-7 flex items-center justify-center text-charcoal-400 dark:text-[#8E8A80] hover:text-rose-600 dark:hover:text-rose-400 transition-colors rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 flex-shrink-0 -mr-1"
                            aria-label={`Remove ${item.productName}`}
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Badges / Variants */}
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {isWholesale && (
                            <span className="text-[9.5px] font-extrabold bg-[#C9A96A]/20 text-[#A07D38] dark:text-[#C9A96A] border border-[#C9A96A]/40 px-1.5 py-0.5 rounded uppercase tracking-wider">
                              Wholesale
                            </span>
                          )}
                          <span className="text-[10px] font-semibold bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] text-charcoal-700 dark:text-[#D7D7D4] px-1.5 py-0.5 rounded">
                            {item.quality}
                          </span>
                          <span className="text-[10px] font-semibold bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] text-charcoal-700 dark:text-[#D7D7D4] px-1.5 py-0.5 rounded">
                            {item.sleeve}
                          </span>
                          <span className="text-[10px] font-bold bg-champagne-500 text-charcoal-950 px-1.5 py-0.5 rounded">
                            Size {item.size}
                          </span>
                        </div>
                      </div>

                      {/* Quantity Selector & Pricing */}
                      <div className="flex items-center justify-between mt-2.5 pt-0.5 gap-2">
                        {/* Quantity Stepper (touch-friendly targets) */}
                        <div className="flex items-center border border-light-border dark:border-[#34322D] rounded-lg bg-light-elevated dark:bg-[#1A1A18] overflow-hidden flex-shrink-0 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center text-charcoal-700 dark:text-[#D7D7D4] hover:bg-light-hover dark:hover:bg-[#262521] active:scale-90 transition-colors font-bold text-xs"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-xs font-extrabold text-charcoal-900 dark:text-[#F4F1E9]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center text-charcoal-700 dark:text-[#D7D7D4] hover:bg-light-hover dark:hover:bg-[#262521] active:scale-90 transition-colors font-bold text-xs"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Price Breakdown */}
                        <div className="text-right min-w-0">
                          <div className="text-xs sm:text-sm font-extrabold text-[#A07D38] dark:text-[#C9A96A] truncate">
                            Rs. {(item.unitPrice * item.quantity).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-charcoal-500 dark:text-[#8E8A80] flex items-center justify-end gap-1 truncate">
                            {isWholesale && regPrice > item.unitPrice && (
                              <span className="line-through text-charcoal-400 dark:text-[#7A776F]">
                                Rs. {regPrice}
                              </span>
                            )}
                            <span>(Rs. {item.unitPrice}/pc)</span>
                          </div>
                          {unitSaving > 0 && (
                            <div className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-bold truncate">
                              Saved Rs. {(unitSaving * item.quantity).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ========================================================================= */}
          {/* STICKY BOTTOM DRAWER SUMMARY & CHECKOUT ACTIONS */}
          {/* ========================================================================= */}
          {items.length > 0 && (
            <div className="flex-shrink-0 px-4 sm:px-5 py-3.5 sm:py-4 bg-light-elevated dark:bg-[#191917] border-t border-light-border dark:border-[#34322D] space-y-2.5 shadow-elevation pb-[max(1rem,env(safe-area-inset-bottom))]">
              
              {/* Wholesale Minimum Warning */}
              {hasWholesaleItems && !isWholesaleMinimumMet && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 rounded-xl text-[11px] leading-snug flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <strong>Wholesale Minimum:</strong> Minimum {wholesaleMinQty} pieces required for wholesale pricing. Please add {wholesalePiecesNeeded} more piece{wholesalePiecesNeeded > 1 ? 's' : ''} to checkout.
                  </div>
                </div>
              )}

              {/* Retail Minimum Warning */}
              {!hasWholesaleItems && !isRetailMinMet && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 rounded-xl text-[11px] leading-snug flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <strong>Minimum Order:</strong> Minimum order is {minRetailQty} pieces. Please add {minRetailQty - totalQuantity} more piece{minRetailQty - totalQuantity > 1 ? 's' : ''} to checkout.
                  </div>
                </div>
              )}

              {/* Wholesale Savings Highlight */}
              {totalSavings > 0 && (
                <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-bold">
                  <span>Wholesale Discount Applied</span>
                  <span>- Rs. {totalSavings.toLocaleString()}</span>
                </div>
              )}

              {/* Cost Calculation Rows */}
              <div className="space-y-1.5 text-xs text-charcoal-600 dark:text-[#B8B3A8]">
                <div className="flex justify-between items-center">
                  <span>Subtotal ({totalQuantity} pcs)</span>
                  <span className="font-semibold text-charcoal-900 dark:text-[#F4F1E9]">Rs. {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Delivery Fee</span>
                  <span className="font-semibold">
                    {deliveryFee === 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">FREE DELIVERY</span>
                    ) : (
                      `Rs. ${deliveryFee}`
                    )}
                  </span>
                </div>
                <div className="border-t border-light-border dark:border-[#34322D] pt-2 flex justify-between items-center text-sm sm:text-base font-extrabold text-[#A07D38] dark:text-[#C9A96A]">
                  <span>Total Amount</span>
                  <span>Rs. {totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Action Buttons: Proceed to Checkout & Order on WhatsApp */}
              <div className="space-y-2 pt-1">
                <Link
                  href="/checkout"
                  onClick={closeDrawer}
                  className={`w-full min-h-[44px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-extrabold text-xs tracking-wide uppercase transition-all duration-200 shadow-sm ${
                    canCheckout
                      ? 'bg-champagne-500 hover:bg-champagne-400 text-charcoal-950 active:scale-[0.99]'
                      : 'bg-light-hover dark:bg-[#22211E] text-charcoal-400 dark:text-[#7A776F] border border-light-border dark:border-[#34322D] cursor-not-allowed pointer-events-none'
                  }`}
                >
                  <span>Proceed to {hasWholesaleItems ? 'Wholesale ' : ''}Checkout</span>
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
