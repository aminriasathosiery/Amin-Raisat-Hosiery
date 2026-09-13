'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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
}

const SIZES: ProductSize[] = ['S', 'M', 'L', 'XL', 'XXL'];

export const VariantSelector: React.FC<VariantSelectorProps> = ({
  product,
  selectedSleeve,
  setSelectedSleeve,
  selectedSize,
  setSelectedSize,
}) => {
  const router = useRouter();
  const { addItem, openDrawer, setBuyNowItem } = useCart();
  const { settings } = useStore();

  const [quantity, setQuantity] = useState(1);
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

  const unitPrice = currentVariant ? (currentVariant.salePrice || currentVariant.price) : 480;
  const regularPrice = currentVariant?.price && currentVariant.salePrice ? currentVariant.price : unitPrice;
  const discountPercentage = currentVariant?.discountPercentage || 0;
  const stock = currentVariant ? currentVariant.stock : 50;
  const isAvailable = currentVariant ? currentVariant.isAvailable && stock > 0 : true;

  const minOrder = 1;
  const maxOrder = Math.min(settings.shipping?.maxOrderQty || 100, stock > 0 ? stock : 100);
  const freeDeliveryThreshold = settings.shipping?.freeDeliveryThreshold || 3;
  const baseDeliveryCharge = settings.shipping?.baseDeliveryCharge ?? 200;

  const totalPrice = unitPrice * quantity;
  const isFreeDeliveryForThis = quantity >= freeDeliveryThreshold;
  const piecesNeededForFree = Math.max(0, freeDeliveryThreshold - quantity);

  const getVariantMediaUrl = () => {
    const match = product.media?.find(
      (m) => !m.variantSleeve || m.variantSleeve === 'All' || m.variantSleeve === selectedSleeve
    );
    return match?.url || product.media?.[0]?.url || '/images/products/sleevless high.jpeg';
  };

  const handleBuyNow = () => {
    if (!isAvailable) return;

    setBuyNowItem({
      id: `${product.id}_${currentVariant?.quality || 'High Quality'}_${selectedSleeve}_${selectedSize}`,
      type: 'product',
      productId: product.id,
      variantId: currentVariant?.id,
      productName: product.name,
      productSlug: product.slug,
      quality: currentVariant?.quality || 'High Quality',
      sleeve: selectedSleeve,
      size: selectedSize,
      unitPrice,
      originalPrice: regularPrice || unitPrice,
      discountPercentage: discountPercentage,
      quantity,
      image: getVariantMediaUrl(),
    });

    router.push('/checkout?buyNow=1');
  };

  const handleAddToCart = () => {
    if (!isAvailable) return;

    addItem({
      id: `${product.id}_${currentVariant?.quality || 'High Quality'}_${selectedSleeve}_${selectedSize}`,
      type: 'product',
      productId: product.id,
      variantId: currentVariant?.id,
      productName: product.name,
      productSlug: product.slug,
      quality: currentVariant?.quality || 'High Quality',
      sleeve: selectedSleeve,
      size: selectedSize,
      unitPrice,
      originalPrice: regularPrice || unitPrice,
      discountPercentage: discountPercentage,
      quantity,
      image: getVariantMediaUrl(),
    });

    setIsAddedToast(true);
    setTimeout(() => {
      setIsAddedToast(false);
      openDrawer();
    }, 400);
  };

  const whatsappUrl = createProductWhatsAppMessage(
    product.name,
    currentVariant?.quality || 'High Quality',
    selectedSleeve,
    selectedSize,
    quantity,
    unitPrice,
    totalPrice,
    settings?.whatsapp || DISPLAY_WHATSAPP_NUMBER
  );

  return (
    <div className="space-y-6 select-none text-charcoal-900 dark:text-[#F4F1E9]">
      {/* 1. DYNAMIC MAIN PRICE SECTION */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#191917] border border-light-border dark:border-[#34322D] shadow-sm space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            {/* Primary Price */}
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#B89555] dark:text-[#C9A96A] tracking-tight">
                Rs. {unitPrice}
              </span>
              {regularPrice > unitPrice && (
                <span className="text-sm text-charcoal-400 dark:text-[#8E8A80] line-through font-normal">
                  Rs. {regularPrice}
                </span>
              )}
              {discountPercentage > 0 && (
                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-md">
                  {discountPercentage}% OFF
                </span>
              )}
              <span className="text-xs text-charcoal-500 dark:text-[#B8B3A8] font-normal">/ piece</span>
            </div>

            {/* Total Calculation Row */}
            <p className="text-xs text-charcoal-600 dark:text-[#B8B3A8] pt-1.5 font-medium">
              Total for {quantity} piece{quantity > 1 ? 's' : ''}:{' '}
              <strong className="text-charcoal-900 dark:text-[#F4F1E9] font-bold">Rs. {totalPrice.toLocaleString()}</strong>
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

      {/* 2. Sleeve Style Selector (if multiple sleeve types exist) */}
      {availableSleeves.length > 1 && (
        <div className="space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-charcoal-700 dark:text-[#B8B3A8] flex items-center justify-between">
            <span>Select Sleeve Style</span>
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
                  className={`h-11 sm:h-12 px-3 rounded-xl border text-center font-bold text-xs sm:text-sm transition-all flex items-center justify-center whitespace-nowrap ${
                    isSelected
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

      {/* 3. Size Selector Pills */}
      {availableSizes.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-charcoal-700 dark:text-[#B8B3A8]">
              Select Size
            </label>
            <button
              type="button"
              onClick={() => setIsSizeGuideOpen(true)}
              className="text-xs font-medium text-[#B89555] dark:text-[#C9A96A] hover:underline flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" /> Size Guide
            </button>
          </div>

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
                  disabled={isOutOfStock}
                  onClick={() => setSelectedSize(s)}
                  className={`h-11 sm:h-12 min-w-[48px] sm:min-w-[56px] px-3.5 sm:px-4 rounded-xl border text-xs sm:text-sm font-bold transition-all flex items-center justify-center ${
                    isSelected
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

      {/* 4. QUANTITY STEPPER (Min 1 piece) */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#191917] border border-light-border dark:border-[#34322D] shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-charcoal-900 dark:text-[#F4F1E9] block">
              Quantity (Pieces)
            </label>
            <span className="text-[11px] text-charcoal-500 dark:text-[#B8B3A8] font-normal">
              1 piece is a valid order • Free delivery on 3+ pieces
            </span>
          </div>

          <div className="flex items-center border border-light-border dark:border-[#34322D] rounded-xl bg-light-elevated dark:bg-[#22211E] overflow-hidden shadow-xs">
            <button
              type="button"
              disabled={quantity <= minOrder}
              onClick={() => setQuantity((prev) => Math.max(minOrder, prev - 1))}
              className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center text-charcoal-900 dark:text-[#F4F1E9] hover:bg-light-hover dark:hover:bg-[#2A2925] disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold text-base"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-12 sm:w-14 text-center text-xs sm:text-sm font-extrabold text-[#B89555] dark:text-[#C9A96A]">
              {quantity}
            </span>
            <button
              type="button"
              disabled={quantity >= maxOrder}
              onClick={() => setQuantity((prev) => Math.min(maxOrder, prev + 1))}
              className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center text-charcoal-900 dark:text-[#F4F1E9] hover:bg-light-hover dark:hover:bg-[#2A2925] disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold text-base"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>

        {/* Free Delivery Incentive Bar */}
        <div className="pt-2 border-t border-light-border dark:border-[#34322D] flex items-center justify-between text-xs flex-wrap gap-2">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
            <Truck className="w-4 h-4 flex-shrink-0" />
            <span>
              {isFreeDeliveryForThis
                ? '🚚 Free Delivery Unlocked across Pakistan!'
                : `🚚 Add ${piecesNeededForFree} more piece${piecesNeededForFree > 1 ? 's' : ''} for FREE delivery (otherwise Rs. ${baseDeliveryCharge})`}
            </span>
          </div>
        </div>
      </div>

      {/* 5. ACTION BUTTONS */}
      <div className="space-y-3 pt-1">
        {/* PRIMARY CTA: BUY NOW */}
        <button
          type="button"
          disabled={!isAvailable}
          onClick={handleBuyNow}
          className={`w-full min-h-[46px] sm:min-h-[50px] py-3 px-6 rounded-xl font-extrabold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm ${
            isAvailable
              ? 'bg-champagne-500 hover:bg-champagne-400 text-charcoal-950 active:scale-[0.99]'
              : 'bg-light-elevated dark:bg-[#22211E] text-charcoal-400 dark:text-[#8E8A80] border border-light-border dark:border-[#34322D] cursor-not-allowed'
          }`}
        >
          <Zap className="w-4 h-4 fill-current stroke-[2.5]" />
          <span>
            {isAvailable
              ? `BUY NOW (${quantity} PC${quantity > 1 ? 'S' : ''}) • Rs. ${totalPrice.toLocaleString()}${
                  isFreeDeliveryForThis ? ' (FREE DELIVERY)' : ''
                }`
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
            <span>Add to Cart</span>
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
