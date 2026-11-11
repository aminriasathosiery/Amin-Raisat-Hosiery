'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { SleeveType, ProductSize, Product, ProductVariant } from '@/types';
import { useCart } from '@/context/CartContext';
import { useStore } from '@/context/StoreContext';
import { ShoppingBag, Truck, HelpCircle, X, ShieldAlert, Zap, Check } from 'lucide-react';
import { WhatsAppIcon } from '@/components/common/WhatsAppIcon';
import { createProductWhatsAppMessage, DISPLAY_WHATSAPP_NUMBER } from '@/lib/whatsapp';
import { resolvePrimaryCoverImage } from '@/lib/productMedia';
import { normalizeShippingSettings } from '@/lib/delivery';

interface VariantSelectorProps {
  product: Product;
  selectedSleeve: SleeveType;
  setSelectedSleeve: (s: SleeveType) => void;
  selectedSize: ProductSize;
  setSelectedSize: (size: ProductSize) => void;
  selectedColor?: string;
  setSelectedColor?: (color: string | undefined) => void;
}

const SIZES: ProductSize[] = ['S', 'M', 'L', 'XL', 'XXL'];

export const VariantSelector: React.FC<VariantSelectorProps> = ({
  product,
  selectedSleeve,
  setSelectedSleeve,
  selectedSize,
  setSelectedSize,
  selectedColor,
  setSelectedColor,
}) => {
  const router = useRouter();
  const { addItem, openDrawer, setBuyNowItem } = useCart();
  const { settings } = useStore();

  const [quantity, setQuantity] = useState(1);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [isAddedToast, setIsAddedToast] = useState(false);
  const [colorSelectPrompt, setColorSelectPrompt] = useState('');

  // Close size guide modal on Escape
  React.useEffect(() => {
    if (!isSizeGuideOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSizeGuideOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isSizeGuideOpen]);

  // Available colors for this product
  const availableColors = React.useMemo(() => {
    if (product.colors && product.colors.length > 0) {
      return product.colors.filter((c) => c.isActive !== false);
    }
    const variantColors = Array.from(
      new Set(product.variants.map((v) => v.color).filter(Boolean))
    ) as string[];
    return variantColors.map((name) => {
      const matchedVar = product.variants.find((v) => v.color === name);
      return {
        name,
        hex: matchedVar?.colorHex || '#171717',
        isActive: true,
      };
    });
  }, [product.colors, product.variants]);

  // Keep selectedColor optional so default view preserves the Primary Cover Image;
  // only clear if the selected color no longer exists on the product.
  React.useEffect(() => {
    if (selectedColor && availableColors.length > 0 && setSelectedColor) {
      if (!availableColors.some((c) => c.name === selectedColor)) {
        setSelectedColor(undefined);
      }
    }
  }, [availableColors, selectedColor, setSelectedColor]);

  // Available sleeves specifically for this product
  const availableSleeves = React.useMemo(() => {
    const sleeves = Array.from(new Set(product.variants.map((v) => v.sleeve).filter(Boolean)));
    return sleeves.length > 0 ? sleeves : ['Sleeveless'];
  }, [product.variants]);

  const availableSizes = React.useMemo(() => {
    let matchingVariants = product.variants.filter((v) => v.sleeve === selectedSleeve);
    if (selectedColor) {
      const colorMatches = matchingVariants.filter((v) => v.color === selectedColor);
      if (colorMatches.length > 0) {
        matchingVariants = colorMatches;
      }
    }
    const sizes = Array.from(new Set(matchingVariants.map((v) => v.size).filter(Boolean)));
    if (sizes.length > 0) return sizes;
    const allVariantSizes = Array.from(new Set(product.variants.map((v) => v.size).filter(Boolean)));
    return allVariantSizes.length > 0 ? allVariantSizes : SIZES;
  }, [product.variants, selectedSleeve, selectedColor]);

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
      (v) =>
        v.sleeve === selectedSleeve &&
        v.size === selectedSize &&
        (!selectedColor || !v.color || v.color === selectedColor)
    ) ||
    product.variants.find(
      (v) =>
        v.sleeve === selectedSleeve &&
        (!selectedColor || !v.color || v.color === selectedColor)
    ) ||
    product.variants.find((v) => v.sleeve === selectedSleeve) ||
    product.variants[0];

  const unitPrice = currentVariant ? (currentVariant.salePrice || currentVariant.price) : 480;
  const regularPrice = currentVariant?.price && currentVariant.salePrice ? currentVariant.price : unitPrice;
  const discountPercentage = currentVariant?.discountPercentage || 0;
  const stock = currentVariant ? currentVariant.stock : 50;
  const isAvailable = currentVariant ? currentVariant.isAvailable && stock > 0 : true;

  const shipping = normalizeShippingSettings(settings?.shipping);
  const minOrder = shipping.minOrderQty;
  const maxOrder = Math.min(shipping.maxOrderQty || 100, stock > 0 ? stock : 100);
  const freeDeliveryThreshold = shipping.freeDeliveryThreshold;
  const baseDeliveryCharge = shipping.baseDeliveryCharge;

  const totalPrice = unitPrice * quantity;
  const isFreeDeliveryForThis = freeDeliveryThreshold > 0 && quantity >= freeDeliveryThreshold;
  const piecesNeededForFree = freeDeliveryThreshold > 0 ? Math.max(0, freeDeliveryThreshold - quantity) : 0;

  // Authoritative color used for Cart & Buy Now: explicit selectedColor or single configured color
  const effectiveColor = selectedColor || (availableColors.length === 1 ? availableColors[0].name : undefined);
  const matchedColor = availableColors.find((c) => c.name === effectiveColor);

  const getVariantMediaUrl = () => {
    return resolvePrimaryCoverImage(product, effectiveColor, selectedSleeve);
  };

  const colorSuffix = effectiveColor ? `_${effectiveColor}` : '';
  const cartItemId = `${product.id}_${currentVariant?.quality || 'High Quality'}_${selectedSleeve}_${selectedSize}${colorSuffix}`;

  const ensureColorSelectedForAction = (): boolean => {
    if (availableColors.length > 1 && !selectedColor) {
      setColorSelectPrompt('Please select a color option above before continuing.');
      return false;
    }
    setColorSelectPrompt('');
    return true;
  };

  const handleBuyNow = () => {
    if (!isAvailable) return;
    if (!ensureColorSelectedForAction()) return;

    setBuyNowItem({
      id: cartItemId,
      type: 'product',
      productId: product.id,
      variantId: currentVariant?.id,
      productName: product.name,
      productSlug: product.slug,
      quality: currentVariant?.quality || 'High Quality',
      sleeve: selectedSleeve,
      size: selectedSize,
      color: effectiveColor,
      colorHex: matchedColor?.hex || currentVariant?.colorHex,
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
    if (!ensureColorSelectedForAction()) return;

    addItem({
      id: cartItemId,
      type: 'product',
      productId: product.id,
      variantId: currentVariant?.id,
      productName: product.name,
      productSlug: product.slug,
      quality: currentVariant?.quality || 'High Quality',
      sleeve: selectedSleeve,
      size: selectedSize,
      color: effectiveColor,
      colorHex: matchedColor?.hex || currentVariant?.colorHex,
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
    settings?.whatsapp || DISPLAY_WHATSAPP_NUMBER,
    selectedColor
  );

  return (
    <div className="space-y-6 select-none text-[#1D2730]">
      {/* 1. DYNAMIC MAIN PRICE SECTION */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#D8D0C3] shadow-sm space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            {/* Primary Price */}
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#C99A3D] tracking-tight">
                Rs. {unitPrice}
              </span>
              {regularPrice > unitPrice && (
                <span className="text-sm text-[#66717C] line-through font-normal">
                  Rs. {regularPrice}
                </span>
              )}
              {discountPercentage > 0 && (
                <span className="text-[11px] font-bold text-[#B8423A] bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                  {discountPercentage}% OFF
                </span>
              )}
              <span className="text-xs text-[#66717C] font-normal">/ piece</span>
            </div>

            {/* Total Calculation Row */}
            <p className="text-xs text-[#66717C] pt-1.5 font-medium">
              Total for {quantity} piece{quantity > 1 ? 's' : ''}:{' '}
              <strong className="text-[#1D2730] font-bold">Rs. {totalPrice.toLocaleString()}</strong>
            </p>
          </div>

          {/* Stock / SKU Status */}
          <div className="text-right flex-shrink-0">
            {stock <= 0 ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-rose-100 text-rose-700 px-3 py-1 rounded-xl border border-rose-300 whitespace-nowrap">
                <ShieldAlert className="w-3.5 h-3.5" /> Out of Stock
              </span>
            ) : (
              <div className="space-y-0.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2F7D5A]">
                  <Check className="w-3.5 h-3.5" /> In Stock
                </span>
                <p className="text-[10px] font-mono text-[#66717C]">
                  SKU: {currentVariant?.sku || 'ARH-SKU'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Color Selector (Daraz-style Image Thumbnails) */}
      {availableColors.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#1D2730] flex items-center gap-1.5">
              <span>Color:</span>
              {selectedColor ? (
                <span className="text-[#C99A3D] font-extrabold capitalize text-xs tracking-normal">
                  {selectedColor}
                </span>
              ) : (
                <span className="text-[#66717C] font-medium capitalize text-xs tracking-normal">
                  Select a color (showing Cover View)
                </span>
              )}
            </label>
            <div className="flex items-center gap-2">
              {selectedColor && (
                <button
                  type="button"
                  onClick={() => {
                    setColorSelectPrompt('');
                    setSelectedColor && setSelectedColor(undefined);
                  }}
                  className="text-[11px] font-semibold text-[#C99A3D] hover:underline"
                >
                  Show Cover
                </button>
              )}
              <span className="text-[11px] text-[#66717C]">
                {availableColors.length} color{availableColors.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {availableColors.map((col) => {
              const isSelected = selectedColor === col.name;
              const colorMatchingPhoto = product.media?.find(
                (m) => m.color === col.name && (m.type === 'photo' || (m as any).media_type === 'photo')
              )?.url;
              const displayImg = (col as any).image || colorMatchingPhoto || product.coverImage || product.media?.find((m) => m.type === 'photo')?.url;

              // Check if color has any available stock in any size
              const colorVariants = product.variants.filter((v) => v.color === col.name);
              const totalColorStock = colorVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
              const isColorOutOfStock = colorVariants.length > 0 && totalColorStock <= 0;

              return (
                <button
                  key={col.name}
                  type="button"
                  disabled={isColorOutOfStock}
                  onClick={() => {
                    setColorSelectPrompt('');
                    setSelectedColor && setSelectedColor(isSelected ? undefined : col.name);
                  }}
                  className={`group relative flex items-center gap-2.5 p-1.5 pr-3 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-[#23384D] bg-[#23384D]/5 shadow-sm scale-102 ring-1 ring-[#23384D]'
                      : 'border-[#D8D0C3] bg-white hover:border-[#C99A3D]'
                  } ${isColorOutOfStock ? 'opacity-40 cursor-not-allowed' : ''}`}
                  title={`${col.name}${isColorOutOfStock ? ' (Out of stock)' : isSelected ? ' (Click to return to cover view)' : ''}`}
                >
                  {/* Miniature Product Image Thumbnail */}
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg overflow-hidden bg-[#F7F3EA] border border-black/10 flex-shrink-0 relative">
                    {displayImg ? (
                      <Image
                        src={displayImg}
                        alt={col.name}
                        fill
                        sizes="48px"
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div
                        className="w-full h-full"
                        style={{ backgroundColor: col.hex || '#E5E7EB' }}
                      />
                    )}
                    {/* Selected Checkmark Badge */}
                    {isSelected && (
                      <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-[#23384D] text-white rounded-full flex items-center justify-center shadow-xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  {/* Color Label */}
                  <div className="text-left">
                    <span
                      className={`block text-xs font-bold leading-tight ${
                        isSelected ? 'text-[#23384D]' : 'text-[#1D2730]'
                      }`}
                    >
                      {col.name}
                    </span>
                    {isColorOutOfStock && (
                      <span className="text-[10px] text-rose-600 font-semibold">Out of Stock</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Sleeve Style Selector (if multiple sleeve types exist) */}
      {availableSleeves.length > 1 && (
        <div className="space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-[#1D2730] flex items-center justify-between">
            <span>Select Sleeve Style</span>
            <span className="text-[#C99A3D] font-semibold text-[11px]">
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
                      ? 'border-[#C99A3D] bg-[#EEE8DC] text-[#C99A3D] shadow-xs'
                      : 'border-[#D8D0C3] bg-white text-[#1D2730] hover:border-[#C99A3D]'
                  }`}
                >
                  {sl}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Size Selector Pills */}
      {availableSizes.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[#1D2730]">
              Select Size
            </label>
            <button
              type="button"
              onClick={() => setIsSizeGuideOpen(true)}
              className="text-xs font-medium text-[#C99A3D] hover:underline flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" /> Size Guide
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {availableSizes.map((s) => {
              const isSelected = selectedSize === s;
              const sizeVar = product.variants.find(
                (v) =>
                  v.sleeve === selectedSleeve &&
                  v.size === s &&
                  (!selectedColor || !v.color || v.color === selectedColor)
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
                      ? 'border-[#23384D] bg-[#23384D] text-white font-extrabold shadow-xs scale-105'
                      : isOutOfStock
                      ? 'border-[#D8D0C3] bg-[#EEE8DC] text-[#66717C] line-through opacity-50 cursor-not-allowed'
                      : 'border-[#D8D0C3] bg-white text-[#1D2730] hover:border-[#C99A3D] active:scale-95'
                  }`}
                >
                  <span>{s}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. QUANTITY STEPPER (Min 1 piece) */}
      <div className="p-4 rounded-2xl bg-white border border-[#D8D0C3] shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#1D2730] block">
              Quantity (Pieces)
            </label>
            <span className="text-[11px] text-[#66717C] font-normal">
              {minOrder > 1 ? `Minimum ${minOrder} pieces` : '1 piece is a valid order'} •{' '}
              {freeDeliveryThreshold > 0
                ? `Free delivery on ${freeDeliveryThreshold}+ pieces`
                : 'Standard nationwide delivery rates apply'}
            </span>
          </div>

          <div className="flex items-center border border-[#D8D0C3] rounded-xl bg-[#EEE8DC] overflow-hidden shadow-xs">
            <button
              type="button"
              disabled={quantity <= minOrder}
              onClick={() => setQuantity((prev) => Math.max(minOrder, prev - 1))}
              className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center text-[#1D2730] hover:bg-[#E8E1D3] disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold text-base"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-12 sm:w-14 text-center text-xs sm:text-sm font-extrabold text-[#C99A3D]">
              {quantity}
            </span>
            <button
              type="button"
              disabled={quantity >= maxOrder}
              onClick={() => setQuantity((prev) => Math.min(maxOrder, prev + 1))}
              className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center text-[#1D2730] hover:bg-[#E8E1D3] disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold text-base"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>

        {/* Free Delivery Incentive Bar */}
        <div className="pt-2 border-t border-[#D8D0C3] flex items-center justify-between text-xs flex-wrap gap-2">
          <div className="flex items-center gap-2 text-[#2F7D5A] font-semibold">
            <Truck className="w-4 h-4 flex-shrink-0" />
            <span>
              {freeDeliveryThreshold <= 0
                ? `Flat Nationwide Delivery: Rs. ${baseDeliveryCharge}`
                : isFreeDeliveryForThis
                ? 'Free Delivery Unlocked across Pakistan!'
                : `Add ${piecesNeededForFree} more piece${piecesNeededForFree > 1 ? 's' : ''} for FREE delivery (otherwise Rs. ${baseDeliveryCharge})`}
            </span>
          </div>
        </div>
      </div>

      {/* Color Selection Prompt */}
      {colorSelectPrompt && (
        <div className="p-3 rounded-xl bg-amber-50 border border-[#C99A3D]/50 text-[#1D2730] text-xs font-semibold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#C99A3D] flex-shrink-0" />
          <span>{colorSelectPrompt}</span>
        </div>
      )}

      {/* 5. ACTION BUTTONS */}
      <div className="space-y-3 pt-1">
        {/* PRIMARY CTA: BUY NOW */}
        <button
          type="button"
          disabled={!isAvailable}
          onClick={handleBuyNow}
          className={`w-full min-h-[46px] sm:min-h-[50px] py-3 px-6 rounded-xl font-extrabold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm ${
            isAvailable
              ? 'bg-[#23384D] hover:bg-[#182B3D] text-white active:scale-[0.99]'
              : 'bg-[#EEE8DC] text-[#66717C] border border-[#D8D0C3] cursor-not-allowed'
          }`}
        >
          <Zap className="w-4 h-4 fill-current stroke-[2.5] text-[#C99A3D]" />
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
            className="w-full min-h-[44px] sm:min-h-[46px] py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-white hover:bg-[#EEE8DC] text-[#1D2730] border border-[#D8D0C3] transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            <ShoppingBag className="w-4 h-4 text-[#C99A3D]" />
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
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsSizeGuideOpen(false)}
        >
          <div
            className="bg-white border border-[#D8D0C3] rounded-2xl max-w-xl w-full p-4 sm:p-6 shadow-elevation max-h-[90vh] flex flex-col space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#D8D0C3] pb-3 flex-shrink-0">
              <h3 className="font-bold text-base text-[#1D2730]">
                Size Guide
              </h3>
              <button
                type="button"
                onClick={() => setIsSizeGuideOpen(false)}
                className="p-1 rounded-lg text-[#66717C] hover:text-[#1D2730] transition-colors"
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
                        className="max-w-full h-auto object-contain rounded-xl border border-[#D8D0C3]"
                      />
                    </div>
                  );
                }

                return (
                  <div className="py-12 text-center text-xs text-[#66717C]">
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
