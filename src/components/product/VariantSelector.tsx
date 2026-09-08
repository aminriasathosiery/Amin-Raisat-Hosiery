'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { SleeveType, ProductSize, Product, ProductVariant } from '@/types';
import { useCart } from '@/context/CartContext';
import { useStore } from '@/context/StoreContext';
import { ShoppingBag, Truck, HelpCircle, X, ShieldAlert, Zap, Check } from 'lucide-react';
import { WhatsAppIcon } from '@/components/common/WhatsAppIcon';
import { createProductWhatsAppMessage, DISPLAY_WHATSAPP_NUMBER } from '@/lib/whatsapp';

interface VariantSelectorProps {
  product: Product;
  selectedSleeve: SleeveType;
  setSelectedSleeve: (s: SleeveType) => void;
  selectedSize: ProductSize;
  setSelectedSize: (size: ProductSize) => void;
  defaultWholesale?: boolean;
  lockWholesaleMode?: boolean;
  lockRetailMode?: boolean;
}

const SIZES: ProductSize[] = ['S', 'M', 'L', 'XL', 'XXL'];

const WHOLESALE_PACK_OPTIONS = [
  { count: 12, label: '1 Dozen (12 pcs)' },
  { count: 24, label: '2 Dozen (24 pcs)' },
  { count: 36, label: '3 Dozen (36 pcs)' },
  { count: 48, label: '4 Dozen (48 pcs)' },
  { count: 60, label: '5 Dozen (60 pcs)' },
  { count: 120, label: '10 Dozen (120 pcs)' },
];

export const VariantSelector: React.FC<VariantSelectorProps> = ({
  product,
  selectedSleeve,
  setSelectedSleeve,
  selectedSize,
  setSelectedSize,
  defaultWholesale = false,
  lockWholesaleMode = false,
  lockRetailMode = false,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isWholesaleFromQuery = searchParams.get('wholesale') === 'true' || searchParams.get('mode') === 'wholesale';

  const { addItem, openDrawer } = useCart();
  const { settings } = useStore();

  const [isWholesaleMode, setIsWholesaleMode] = useState(
    lockWholesaleMode ? true : lockRetailMode ? false : defaultWholesale || isWholesaleFromQuery
  );
  const wholesaleMin = product.wholesaleMinQty || 12;
  const [quantity, setQuantity] = useState(isWholesaleMode ? wholesaleMin : 1);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [isAddedToast, setIsAddedToast] = useState(false);

  // Close size guide modal on Escape
  React.useEffect(() => {
    if (!isSizeGuideOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSizeGuideOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isSizeGuideOpen]);

  // Sync mode if props or query change
  React.useEffect(() => {
    if (lockWholesaleMode) {
      setIsWholesaleMode(true);
      setQuantity((q) => Math.max(wholesaleMin, q));
    } else if (lockRetailMode) {
      setIsWholesaleMode(false);
    } else if (isWholesaleFromQuery && !isWholesaleMode) {
      setIsWholesaleMode(true);
      setQuantity((q) => Math.max(wholesaleMin, q));
    }
  }, [lockWholesaleMode, lockRetailMode, isWholesaleFromQuery, wholesaleMin, isWholesaleMode]);

  // Available sleeves specifically for this product
  const availableSleeves = React.useMemo(() => {
    const sleeves = Array.from(new Set(product.variants.map((v) => v.sleeve).filter(Boolean)));
    return sleeves.length > 0 ? sleeves : ['Sleeveless'];
  }, [product.variants]);

  const availableSizes = React.useMemo(() => {
    const matchingVariants = product.variants.filter((v) => v.sleeve === selectedSleeve);
    const sizes = Array.from(new Set(matchingVariants.map((v) => v.size).filter(Boolean)));
    return sizes.length > 0 ? sizes : SIZES;
  }, [product.variants, selectedSleeve]);

  // Auto-switch sleeve if needed
  React.useEffect(() => {
    if (availableSleeves.length > 0 && !availableSleeves.includes(selectedSleeve)) {
      setSelectedSleeve(availableSleeves[0]);
    }
  }, [availableSleeves, selectedSleeve, setSelectedSleeve]);

  // Auto-switch size if needed
  React.useEffect(() => {
    if (availableSizes.length > 0 && !availableSizes.includes(selectedSize)) {
      setSelectedSize(availableSizes[0]);
    }
  }, [availableSizes, selectedSize, setSelectedSize]);

  // Find exact matching variant dynamically from database data
  const currentVariant: ProductVariant | undefined =
    product.variants.find(
      (v) => v.sleeve === selectedSleeve && v.size === selectedSize
    ) ||
    product.variants.find((v) => v.sleeve === selectedSleeve) ||
    product.variants[0];

  const retailPrice = currentVariant ? (currentVariant.salePrice || currentVariant.price) : 480;
  const baseWholesalePrice = currentVariant?.wholesalePrice || Math.round(retailPrice * 0.82);

  // Compute effective price based on quantity tiers if in wholesale mode
  let effectiveUnitPrice = retailPrice;

  if (isWholesaleMode) {
    effectiveUnitPrice = baseWholesalePrice;
    if (currentVariant?.wholesaleTiers && currentVariant.wholesaleTiers.length > 0) {
      for (const tier of currentVariant.wholesaleTiers) {
        if (quantity >= tier.minQty && (!tier.maxQty || quantity <= tier.maxQty)) {
          if (tier.price) {
            effectiveUnitPrice = Number(tier.price);
          } else if (tier.discountPercent) {
            effectiveUnitPrice = Math.round(retailPrice * (1 - tier.discountPercent / 100));
          }
        }
      }
    }
  }

  const stock = currentVariant ? currentVariant.stock : 50;
  const isAvailable = currentVariant ? currentVariant.isAvailable && stock > 0 : true;

  const minOrder = isWholesaleMode ? wholesaleMin : 1;
  const maxOrder = isWholesaleMode ? 5000 : Math.min(settings.shipping.maxOrderQty || 100, stock || 100);
  const freeDeliveryThreshold = settings.shipping.freeDeliveryThreshold || 3;

  const totalPrice = effectiveUnitPrice * quantity;
  const regularTotal = retailPrice * quantity;
  const unitSavings = Math.max(0, retailPrice - effectiveUnitPrice);
  const totalSavings = Math.max(0, regularTotal - totalPrice);
  const isFreeDeliveryForThis = isWholesaleMode || quantity >= freeDeliveryThreshold;

  const toggleOrderMode = (wholesale: boolean) => {
    setIsWholesaleMode(wholesale);
    if (wholesale) {
      setQuantity((prev) => Math.max(wholesaleMin, prev));
    } else {
      setQuantity((prev) => Math.min(12, Math.max(1, prev)));
    }
  };

  const getVariantMediaUrl = () => {
    const match = product.media?.find(
      (m) => !m.variantSleeve || m.variantSleeve === 'All' || m.variantSleeve === selectedSleeve
    );
    return match?.url || product.media?.[0]?.url || '/images/products/sleevless high.jpeg';
  };

  const handleBuyNow = () => {
    if (!isAvailable) return;

    addItem({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      quality: currentVariant?.quality || 'High Quality',
      sleeve: selectedSleeve,
      size: selectedSize,
      unitPrice: effectiveUnitPrice,
      regularPrice: retailPrice,
      wholesalePrice: baseWholesalePrice,
      isWholesale: isWholesaleMode,
      quantity,
      image: getVariantMediaUrl(),
    });

    router.push('/checkout');
  };

  const handleAddToCart = () => {
    if (!isAvailable) return;

    addItem({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      quality: currentVariant?.quality || 'High Quality',
      sleeve: selectedSleeve,
      size: selectedSize,
      unitPrice: effectiveUnitPrice,
      regularPrice: retailPrice,
      wholesalePrice: baseWholesalePrice,
      isWholesale: isWholesaleMode,
      quantity,
      image: getVariantMediaUrl(),
    });

    setIsAddedToast(true);
    setTimeout(() => {
      setIsAddedToast(false);
      openDrawer();
    }, 600);
  };

  const whatsappUrl = createProductWhatsAppMessage(
    product.name,
    currentVariant?.quality || 'High Quality',
    selectedSleeve,
    selectedSize,
    quantity,
    effectiveUnitPrice,
    totalPrice,
    settings?.whatsapp || DISPLAY_WHATSAPP_NUMBER
  );

  return (
    <div className="space-y-6 select-none text-charcoal-900 dark:text-[#F4F1E9]">
      {/* 1. ORDER MODE HEADER / SELECTOR */}
      {lockWholesaleMode ? (
        <div className="px-4 py-3 bg-champagne-500/10 border border-[#B89555]/30 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-champagne-500 animate-pulse" />
            <span className="text-xs font-bold text-charcoal-900 dark:text-[#F4F1E9] uppercase tracking-wider">
              Wholesale Storefront Mode Active
            </span>
          </div>
          <span className="text-[11px] font-bold text-[#96763D] dark:text-[#C9A96A] bg-champagne-100 dark:bg-[#22211E] px-2 py-0.5 rounded-lg border border-[#B89555]/20">
            Min {wholesaleMin} pieces
          </span>
        </div>
      ) : lockRetailMode ? (
        <div className="px-4 py-3 bg-light-elevated dark:bg-[#191917] border border-light-border dark:border-[#34322D] rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-charcoal-900 dark:text-[#F4F1E9]">
              Retail Order
            </span>
            <span className="text-[11px] text-charcoal-500 dark:text-[#8E8A80]">
              (Min 3 pieces)
            </span>
          </div>
          {product.isWholesaleEnabled !== false && (
            <a
              href={`/wholesale/product/${product.slug}`}
              className="text-[11px] font-bold text-[#96763D] dark:text-[#C9A96A] hover:underline flex items-center gap-1"
            >
              <span>Wholesale Storefront &rarr;</span>
            </a>
          )}
        </div>
      ) : (
        <div className="p-1 bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-2xl flex items-center shadow-xs">
          <button
            type="button"
            onClick={() => toggleOrderMode(false)}
            className={`flex-1 min-h-[42px] sm:min-h-[46px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${!isWholesaleMode
                ? 'bg-white dark:bg-[#191917] text-charcoal-900 dark:text-[#F4F1E9] shadow-sm border border-light-border dark:border-[#34322D]'
                : 'text-charcoal-600 dark:text-[#B8B3A8] hover:text-charcoal-900 dark:hover:text-[#F4F1E9]'
              }`}
          >
            <span>Retail Order</span>
            <span className="text-[10px] sm:text-xs text-charcoal-500 dark:text-[#8E8A80] font-normal">(1+ pcs)</span>
          </button>

          <button
            type="button"
            onClick={() => toggleOrderMode(true)}
            className={`flex-1 min-h-[42px] sm:min-h-[46px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${isWholesaleMode
                ? 'bg-champagne-500 text-charcoal-950 shadow-xs font-extrabold'
                : 'text-charcoal-600 dark:text-[#B8B3A8] hover:text-charcoal-900 dark:hover:text-[#F4F1E9]'
              }`}
          >
            <span>Wholesale</span>
            <span className="text-[10px] bg-charcoal-950/15 text-charcoal-950 px-1.5 py-0.2 rounded font-bold">Min 12 pcs</span>
          </button>
        </div>
      )}

      {/* 2. DYNAMIC MAIN PRICE SECTION */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#191917] border border-light-border dark:border-[#34322D] shadow-sm space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            {/* Primary Price */}
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#B89555] dark:text-[#C9A96A] tracking-tight">
                Rs. {effectiveUnitPrice}
              </span>
              {isWholesaleMode && (
                <span className="text-sm text-charcoal-400 dark:text-[#8E8A80] line-through font-normal">
                  Rs. {retailPrice}
                </span>
              )}
              <span className="text-xs text-charcoal-500 dark:text-[#B8B3A8] font-normal">/ piece</span>
            </div>

            {/* Natural Wholesale Pricing Hint when in Retail Mode */}
            {!isWholesaleMode && (
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-xs text-charcoal-600 dark:text-[#B8B3A8]">
                  Wholesale: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">Rs. {baseWholesalePrice} / piece</strong> (Min 12 pcs)
                </span>
                <button
                  type="button"
                  onClick={() => toggleOrderMode(true)}
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-champagne-100 dark:bg-[#22211E] text-[#96763D] dark:text-[#C9A96A] hover:bg-champagne-200 border border-[#B89555]/30 transition-colors"
                >
                  <span>Wholesale</span>
                </button>
              </div>
            )}

            {/* Wholesale Savings Tag when in Wholesale Mode */}
            {isWholesaleMode && (
              <div className="pt-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-lg">
                  <span>Factory Bulk Rate</span>
                  <span>•</span>
                  <span>Save Rs. {unitSavings} / piece ({Math.round((unitSavings / retailPrice) * 100)}% OFF)</span>
                </span>
              </div>
            )}

            {/* Total Calculation Row */}
            <p className="text-xs text-charcoal-600 dark:text-[#B8B3A8] pt-1 font-medium">
              Total for {quantity} pcs: <strong className="text-charcoal-900 dark:text-[#F4F1E9] font-bold">Rs. {totalPrice}</strong>
            </p>
          </div>

          {/* Stock / SKU Status */}
          <div className="text-right flex-shrink-0">
            {stock <= 0 ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 px-3 py-1 rounded-xl border border-rose-300 dark:border-rose-800 whitespace-nowrap">
                <ShieldAlert className="w-3.5 h-3.5" /> Out of Stock
              </span>
            ) : (
              <div className="space-y-0.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                  <Check className="w-3.5 h-3.5" /> In Stock
                </span>
                <p className="text-[10px] font-mono text-charcoal-400 dark:text-[#8E8A80]">
                  SKU: {currentVariant?.sku || 'ARH-SKU'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. STEP 1: Sleeve Style Selector */}
      {availableSleeves.length > 1 && (
        <div className="space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-charcoal-700 dark:text-[#B8B3A8] flex items-center justify-between">
            <span>1. Select Sleeve Style</span>
            <span className="text-[#B89555] dark:text-[#C9A96A] font-semibold text-[11px]">
              {selectedSleeve}
            </span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
            {availableSleeves.map((sl) => {
              const isSelected = selectedSleeve === sl;
              return (
                <button
                  key={sl}
                  type="button"
                  onClick={() => setSelectedSleeve(sl)}
                  className={`h-11 sm:h-12 px-3 rounded-xl border text-center font-bold text-xs sm:text-sm transition-all flex items-center justify-center whitespace-nowrap ${isSelected
                      ? 'border-[#B89555] dark:border-[#C9A96A] bg-champagne-50 dark:bg-[#22211E] text-[#96763D] dark:text-[#C9A96A] shadow-xs'
                      : 'border-light-border dark:border-[#34322D] bg-white dark:bg-[#191917] text-charcoal-700 dark:text-[#B8B3A8] hover:border-[#B89555]/40'
                    }`}
                >
                  {sl}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. STEP 2: Size Selector (Mobile-first responsive flex with comfortable touch targets) */}
      {availableSizes.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-charcoal-700 dark:text-[#B8B3A8]">
              {availableSleeves.length > 1 ? '2.' : '1.'} Select Size
            </label>
            <button
              type="button"
              onClick={() => setIsSizeGuideOpen(true)}
              className="text-xs font-medium text-[#B89555] dark:text-[#C9A96A] hover:underline flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" /> Size Guide
            </button>
          </div>

          {/* Comfortable touch targets: height 44-48px, min-width 48-56px, gap 8-10px */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {availableSizes.map((s) => {
              const isSelected = selectedSize === s;
              const sizeVar = product.variants.find(
                (v) => v.sleeve === selectedSleeve && v.size === s
              );
              const sizeStock = sizeVar ? sizeVar.stock : 1;
              const isOutOfStock = sizeStock <= 0;

              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedSize(s)}
                  className={`h-11 sm:h-12 min-w-[48px] sm:min-w-[56px] px-3.5 sm:px-4 rounded-xl border text-xs sm:text-sm font-bold transition-all flex items-center justify-center ${isSelected
                      ? 'border-[#B89555] dark:border-[#C9A96A] bg-champagne-500 text-charcoal-950 font-extrabold shadow-xs scale-105'
                      : isOutOfStock
                        ? 'border-light-border dark:border-[#34322D] bg-light-elevated dark:bg-[#22211E] text-charcoal-400 dark:text-[#8E8A80] line-through opacity-50 cursor-not-allowed'
                        : 'border-light-border dark:border-[#34322D] bg-white dark:bg-[#191917] text-charcoal-900 dark:text-[#F4F1E9] hover:border-[#B89555]/50 active:scale-95'
                    }`}
                >
                  <span>{s}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. WHOLESALE QUICK PACK SELECTOR (Shown in Wholesale Mode) */}
      {isWholesaleMode && (
        <div className="space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-charcoal-700 dark:text-[#B8B3A8] flex items-center justify-between">
            <span>Wholesale Dozen Packs</span>
            <span className="text-[11px] text-[#B89555] dark:text-[#C9A96A] font-semibold">
              {quantity} pieces selected
            </span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
            {WHOLESALE_PACK_OPTIONS.map((pack) => {
              const isSelected = quantity === pack.count;
              return (
                <button
                  key={pack.count}
                  type="button"
                  onClick={() => setQuantity(pack.count)}
                  className={`h-10 sm:h-11 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center text-center ${isSelected
                      ? 'border-[#B89555] dark:border-[#C9A96A] bg-champagne-500 text-charcoal-950 shadow-xs font-extrabold'
                      : 'border-light-border dark:border-[#34322D] bg-white dark:bg-[#191917] text-charcoal-700 dark:text-[#B8B3A8] hover:border-[#B89555]/40'
                    }`}
                >
                  {pack.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. QUANTITY STEPPER */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#191917] border border-light-border dark:border-[#34322D] shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-charcoal-900 dark:text-[#F4F1E9] block">
              Quantity (Pieces)
            </label>
            <span className="text-[11px] text-charcoal-500 dark:text-[#B8B3A8] font-normal">
              {isWholesaleMode ? `Minimum wholesale: ${minOrder} pieces` : 'Flexible quantity (1+ pieces)'}
            </span>
          </div>

          <div className="flex items-center border border-light-border dark:border-[#34322D] rounded-xl bg-light-elevated dark:bg-[#22211E] overflow-hidden shadow-xs">
            <button
              type="button"
              disabled={quantity <= minOrder}
              onClick={() => setQuantity((prev) => Math.max(minOrder, prev - (isWholesaleMode ? 6 : 1)))}
              className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center text-charcoal-900 dark:text-[#F4F1E9] hover:bg-light-hover dark:hover:bg-[#2A2925] disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold text-base"
              aria-label="Decrease quantity"
            >
              -
            </button>
            <span className="w-12 sm:w-14 text-center text-xs sm:text-sm font-extrabold text-[#B89555] dark:text-[#C9A96A]">
              {quantity}
            </span>
            <button
              type="button"
              disabled={quantity >= maxOrder}
              onClick={() => setQuantity((prev) => Math.min(maxOrder, prev + (isWholesaleMode ? 6 : 1)))}
              className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center text-charcoal-900 dark:text-[#F4F1E9] hover:bg-light-hover dark:hover:bg-[#2A2925] disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold text-base"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>

        {/* Clean Unified Delivery Row */}
        <div className="pt-2 border-t border-light-border dark:border-[#34322D] flex items-center justify-between text-xs flex-wrap gap-2">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
            <Truck className="w-4 h-4 flex-shrink-0" />
            <span>
              {isWholesaleMode
                ? '🚚 Free Delivery on Wholesale Orders across Pakistan'
                : '🚚 Free Delivery on 3+ Pieces across Pakistan'}
            </span>
          </div>
          {totalSavings > 0 && (
            <span className="font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
              Save Rs. {totalSavings}
            </span>
          )}
        </div>
      </div>

      {/* 7. CTA PURCHASE BUTTONS */}
      <div className="space-y-3 pt-1">
        {/* PRIMARY CTA: BUY NOW */}
        <button
          type="button"
          disabled={!isAvailable}
          onClick={handleBuyNow}
          className={`w-full min-h-[46px] sm:min-h-[50px] py-3 px-6 rounded-xl font-extrabold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm ${isAvailable
              ? 'bg-champagne-500 hover:bg-champagne-400 text-charcoal-950 active:scale-[0.99]'
              : 'bg-light-elevated dark:bg-[#22211E] text-charcoal-400 dark:text-[#8E8A80] border border-light-border dark:border-[#34322D] cursor-not-allowed'
            }`}
        >
          <Zap className="w-4 h-4 fill-current stroke-[2.5]" />
          <span>
            {isAvailable
              ? isWholesaleMode
                ? `ORDER WHOLESALE PACK (${quantity} PCS) • Rs. ${totalPrice.toLocaleString()}`
                : `BUY NOW (${quantity} PC${quantity > 1 ? 'S' : ''}) • Rs. ${totalPrice.toLocaleString()}${isFreeDeliveryForThis ? ' (FREE DELIVERY)' : ''}`
              : 'Out of Stock'}
          </span>
        </button>

        {/* Secondary Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Add to Cart */}
          <button
            type="button"
            disabled={!isAvailable}
            onClick={handleAddToCart}
            className="w-full min-h-[44px] sm:min-h-[46px] py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-white dark:bg-[#191917] hover:bg-light-hover dark:hover:bg-[#22211E] text-charcoal-900 dark:text-[#F4F1E9] border border-light-border dark:border-[#34322D] transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            <ShoppingBag className="w-4 h-4 text-[#B89555] dark:text-[#C9A96A]" />
            <span>Add {isWholesaleMode ? 'Wholesale Pack ' : ''}to Cart</span>
          </button>

          {/* WhatsApp Order */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            id="product-whatsapp-order-btn"
            className="w-full min-h-[44px] sm:min-h-[46px] py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow-xs transition-all flex items-center justify-center gap-2"
          >
            <WhatsAppIcon size={16} className="text-white fill-current" />
            <span>Order on WhatsApp</span>
          </a>
        </div>
      </div>

      {/* SIZE GUIDE MODAL */}
      {isSizeGuideOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 dark:bg-black/85 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsSizeGuideOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#191917] border border-light-border dark:border-[#34322D] rounded-2xl max-w-xl w-full p-4 sm:p-6 shadow-elevation max-h-[90vh] flex flex-col space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-light-border dark:border-[#34322D] pb-3 flex-shrink-0">
              <h3 className="font-bold text-base text-charcoal-900 dark:text-[#F4F1E9]">
                Size Guide
              </h3>
              <button
                type="button"
                onClick={() => setIsSizeGuideOpen(false)}
                className="p-1 rounded-lg text-charcoal-400 hover:text-charcoal-900 dark:hover:text-white transition-colors"
                aria-label="Close Size Guide"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content: ONLY the Admin-Uploaded Product-Specific Size Guide Image */}
            <div className="overflow-y-auto flex-1 max-h-[75vh] py-1">
              {(() => {
                const sizeGuideSrc =
                  product.sizeGuideUrl ||
                  product.media?.find((m) => m.type === 'size_guide' || m.variantSleeve === 'size_guide')?.url;

                if (sizeGuideSrc) {
                  return (
                    <div className="flex items-center justify-center w-full">
                      <img
                        src={sizeGuideSrc}
                        alt={`${product.name} Size Guide`}
                        className="max-w-full h-auto object-contain rounded-xl border border-light-border dark:border-[#34322D]"
                      />
                    </div>
                  );
                }

                return (
                  <div className="py-12 text-center text-xs text-charcoal-500 dark:text-[#8E8A80]">
                    Size guide not available.
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
