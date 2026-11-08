'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Product, ProductSize, SleeveType } from '@/types';
import { useCart } from '@/context/CartContext';
import { useStore } from '@/context/StoreContext';
import { ShoppingBag, Zap, Check, Play, Star } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const router = useRouter();
  const { addItem, openDrawer, setBuyNowItem } = useCart();
  const { categories, settings } = useStore();

  // 1. Available Colors
  const productColors = useMemo(() => {
    if (product.colors && product.colors.length > 0) return product.colors;
    const variantColors = Array.from(
      new Set(product.variants.map((v) => v.color).filter(Boolean) as string[])
    );
    return variantColors.map((c) => ({
      id: c,
      name: c,
      hex: product.variants.find((v) => v.color === c)?.colorHex || '#171717',
    }));
  }, [product.colors, product.variants]);

  const [selectedColor, setSelectedColor] = useState<string>(() => {
    return productColors[0]?.name || '';
  });

  // 2. Sleeve Style
  const [selectedSleeve, setSelectedSleeve] = useState<SleeveType>(() => {
    return product.variants?.[0]?.sleeve || 'Sleeveless';
  });

  // 3. Category Name
  const productCategory = useMemo(() => {
    return categories.find(
      (c) =>
        c.id === product.categoryId ||
        c.slug === product.categoryId ||
        (c.slug === 'men' && (!product.categoryId || product.categoryId === 'cat-men'))
    );
  }, [categories, product.categoryId]);

  const categoryLabel = productCategory?.name
    ? `${productCategory.name}'s Collection`
    : 'Essentials';

  // 4. Compute available sleeves for this product
  const availableSleeves = useMemo(() => {
    const sleeves = Array.from(new Set(product.variants.map((v) => v.sleeve).filter(Boolean)));
    return sleeves.length > 0 ? sleeves : ['Sleeveless'];
  }, [product.variants]);

  // 5. Compute available sizes dynamically from product variants
  const availableSizes = useMemo(() => {
    const matchingVariants = product.variants.filter((v) => {
      const matchCol = !selectedColor || !v.color || v.color === selectedColor;
      const matchSlv = !selectedSleeve || !v.sleeve || v.sleeve === selectedSleeve;
      return matchCol && matchSlv;
    });
    const sizes = Array.from(new Set(matchingVariants.map((v) => v.size).filter(Boolean)));
    if (sizes.length > 0) return sizes;
    const allSizes = Array.from(new Set(product.variants.map((v) => v.size).filter(Boolean)));
    return allSizes.length > 0 ? allSizes : ['L'];
  }, [product.variants, selectedColor, selectedSleeve]);

  const [selectedSize, setSelectedSize] = useState<ProductSize>(() => {
    return availableSizes[0] || 'L';
  });

  // Auto-switch size if selected size is no longer available in the active color/style
  useEffect(() => {
    if (availableSizes.length > 0 && !availableSizes.includes(selectedSize)) {
      setSelectedSize(availableSizes[0]);
    }
  }, [availableSizes, selectedSize]);

  const [justAdded, setJustAdded] = useState(false);

  // 6. Compute matched variant
  const currentVariant = useMemo(() => {
    return (
      product.variants.find(
        (v) =>
          (!selectedColor || !v.color || v.color === selectedColor) &&
          v.sleeve === selectedSleeve &&
          v.size === selectedSize
      ) ||
      product.variants.find(
        (v) =>
          (!selectedColor || !v.color || v.color === selectedColor) &&
          v.sleeve === selectedSleeve
      ) ||
      product.variants.find((v) => (!selectedColor || !v.color || v.color === selectedColor)) ||
      product.variants[0]
    );
  }, [product.variants, selectedColor, selectedSleeve, selectedSize]);

  const price = currentVariant?.salePrice || currentVariant?.price || 480;
  const comparePrice = currentVariant?.price && currentVariant.price > price ? currentVariant.price : undefined;
  const discountPercentage = currentVariant?.discountPercentage || 0;
  const isAvailable = currentVariant ? currentVariant.isAvailable && currentVariant.stock > 0 : false;

  const photoMedia = useMemo(() => {
    return (product.media || []).filter((m) => m.type !== 'video' && m.type !== 'size_guide');
  }, [product.media]);

  // Resolve matching photo for chosen color and sleeve
  const currentPhoto = useMemo(() => {
    if (selectedColor) {
      const colorMatch = photoMedia.find((m) => m.color === selectedColor);
      if (colorMatch?.url) return colorMatch.url;
    }
    const match = photoMedia.find(
      (m) => !m.variantSleeve || m.variantSleeve === 'All' || m.variantSleeve === selectedSleeve
    );
    return match?.url || photoMedia[0]?.url || '/images/products/sleevless high.jpeg';
  }, [photoMedia, selectedColor, selectedSleeve]);

  const freeDeliveryThreshold = settings.shipping?.freeDeliveryThreshold || 3;

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAvailable) return;

    const variantColor = currentVariant?.color || selectedColor || undefined;
    const variantColorHex = currentVariant?.colorHex || productColors.find((c) => c.name === variantColor)?.hex;

    setBuyNowItem({
      id: `${product.id}_${currentVariant?.quality || 'High Quality'}_${selectedSleeve}_${variantColor || ''}_${selectedSize}`,
      type: 'product',
      productId: product.id,
      variantId: currentVariant?.id,
      productName: product.name,
      productSlug: product.slug,
      quality: currentVariant?.quality || 'High Quality',
      sleeve: selectedSleeve,
      size: selectedSize,
      color: variantColor,
      colorHex: variantColorHex,
      unitPrice: price,
      originalPrice: comparePrice || price,
      discountPercentage: discountPercentage,
      quantity: 1,
      image: currentPhoto,
    });
    router.push('/checkout?buyNow=1');
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAvailable) return;

    const variantColor = currentVariant?.color || selectedColor || undefined;
    const variantColorHex = currentVariant?.colorHex || productColors.find((c) => c.name === variantColor)?.hex;

    addItem({
      id: `${product.id}_${currentVariant?.quality || 'High Quality'}_${selectedSleeve}_${variantColor || ''}_${selectedSize}`,
      type: 'product',
      productId: product.id,
      variantId: currentVariant?.id,
      productName: product.name,
      productSlug: product.slug,
      quality: currentVariant?.quality || 'High Quality',
      sleeve: selectedSleeve,
      size: selectedSize,
      color: variantColor,
      colorHex: variantColorHex,
      unitPrice: price,
      originalPrice: comparePrice || price,
      discountPercentage: discountPercentage,
      quantity: 1,
      image: currentPhoto,
    });
    setJustAdded(true);
    setTimeout(() => {
      setJustAdded(false);
      openDrawer();
    }, 400);
  };

  const detailUrl = `/product/${product.slug}`;

  return (
    <div className="group bg-white rounded-2xl border border-[#D8D0C3] overflow-hidden flex flex-col justify-between shadow-sm hover:border-[#C99A3D] hover:shadow-md transition-all duration-300 relative w-full h-full text-[#1D2730]">
      <div className="flex-1 flex flex-col">
        {/* 1. Product Image Area - Clean & Uncluttered (No Cotton Badge Overlay) */}
        <div className="relative w-full aspect-square bg-[#EEE8DC] overflow-hidden border-b border-[#D8D0C3]">
          <Link
            href={detailUrl}
            className="relative block w-full h-full cursor-pointer group"
          >
            <Image
              src={currentPhoto}
              alt={product.name}
              fill
              loading="lazy"
              sizes="(max-width: 640px) 95vw, (max-width: 1024px) 48vw, 320px"
              quality={85}
              className="object-cover object-center w-full h-full transition-transform duration-500 ease-out group-hover:scale-105"
              priority={false}
            />
          </Link>

          {/* Subtle Video Indicator Badge (Preserved) */}
          {(product.videoUrl || product.media?.some((m) => m.type === 'video')) && (
            <div
              className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#182B3D]/90 text-white text-[11px] font-bold shadow-md backdrop-blur-xs border border-white/20 pointer-events-none"
              aria-label={`Video available for ${product.name}`}
            >
              <Play className="w-3 h-3 fill-[#C99A3D] text-[#C99A3D]" />
              <span>Video</span>
            </div>
          )}
        </div>

        {/* 2. Product Details Area */}
        <div className="p-4 sm:p-5 space-y-3 flex-1 flex flex-col">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#C99A3D] block whitespace-nowrap">
              {categoryLabel}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-[#1D2730] mt-1 group-hover:text-[#C99A3D] transition-colors leading-snug line-clamp-2">
              <Link href={detailUrl}>{product.name}</Link>
            </h3>

            {/* Rating Stars & Reviews Count */}
            <div className="flex items-center gap-1.5 mt-1">
              <div className="flex text-[#C99A3D]">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-3 h-3 ${
                      s <= Math.round(Number(product.rating || 5)) ? 'fill-current' : 'text-[#D8D0C3]'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[11px] font-bold text-[#1D2730]">
                {(product.rating || 5.0).toFixed(1)}
              </span>
              <span className="text-[10px] text-[#66717C]">
                ({product.reviewsCount ?? (product.reviews?.length || 0)})
              </span>
            </div>

            {product.subtitle && (
              <p className="text-xs text-[#66717C] line-clamp-2 mt-1 font-normal leading-relaxed">
                {product.subtitle}
              </p>
            )}
          </div>

          {/* Color Swatches (if multiple colors configured) */}
          {productColors.length > 1 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[#66717C]">Color:</span>
                <span className="text-[#1D2730] font-medium whitespace-nowrap">{selectedColor}</span>
              </div>
              <div className="flex gap-1.5 flex-wrap items-center">
                {productColors.map((col) => {
                  const isSelected = selectedColor === col.name;
                  return (
                    <button
                      key={col.name}
                      type="button"
                      onClick={() => setSelectedColor(col.name)}
                      className={`group/swatch relative p-0.5 rounded-full transition-transform ${
                        isSelected ? 'scale-110 ring-2 ring-[#C99A3D]' : 'hover:scale-105 ring-1 ring-[#D8D0C3]'
                      }`}
                      title={col.name}
                      aria-label={`Select color ${col.name}`}
                    >
                      <span
                        className="block w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full border border-black/15 shadow-2xs"
                        style={{ backgroundColor: col.hex || '#FFFFFF' }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sleeve Style Selector */}
          {availableSleeves.length > 1 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[#66717C]">Style:</span>
                <span className="text-[#1D2730] font-medium whitespace-nowrap">{selectedSleeve}</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {availableSleeves.map((sl) => (
                  <button
                    key={sl}
                    type="button"
                    onClick={() => setSelectedSleeve(sl as SleeveType)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap ${
                      selectedSleeve === sl
                        ? 'border-[#C99A3D] bg-[#EEE8DC] text-[#C99A3D] shadow-2xs font-bold'
                        : 'border-[#D8D0C3] text-[#66717C] hover:border-[#C99A3D] bg-white'
                    }`}
                  >
                    {sl}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dynamic Size Pills (Category-aware sizes) */}
          <div className="space-y-1.5 mt-auto pt-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-[#66717C]">Size:</span>
              <span className="text-[#1D2730] font-medium whitespace-nowrap">Fit {selectedSize}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {availableSizes.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setSelectedSize(sz)}
                  className={`min-w-8 h-8 px-2 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                    selectedSize === sz
                      ? 'bg-[#23384D] text-white font-extrabold shadow-xs scale-105'
                      : 'bg-[#EEE8DC] text-[#1D2730] hover:bg-[#E8E1D3] border border-[#D8D0C3]'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Card Footer: Price & Responsive Action Buttons */}
      <div className="p-4 sm:p-5 pt-3 border-t border-[#D8D0C3] space-y-3">
        {/* Price Row & Badges */}
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-lg sm:text-xl font-extrabold text-[#C99A3D]">
              Rs. {price}
            </span>
            <span className="text-[10px] text-[#66717C]">/ piece</span>
            {comparePrice && (
              <span className="text-xs text-[#66717C] line-through font-normal">
                Rs. {comparePrice}
              </span>
            )}
            {discountPercentage > 0 && (
              <span className="text-[10px] font-bold text-[#B8423A] bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md">
                {discountPercentage}% OFF
              </span>
            )}
          </div>
          <span className="text-[10.5px] font-semibold text-[#2F7D5A] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md whitespace-nowrap">
            Free Delivery {freeDeliveryThreshold}+ pcs
          </span>
        </div>

        {/* Action Row */}
        <div className="w-full flex items-center gap-2">
          {/* Quick Add Button */}
          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={!isAvailable}
            className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl bg-white hover:bg-[#EEE8DC] text-[#1D2730] border border-[#D8D0C3] transition-colors shadow-2xs active:scale-95 disabled:opacity-50"
            title="Add 1 piece to Cart"
            aria-label="Add to cart"
          >
            {justAdded ? (
              <Check className="w-[18px] h-[18px] text-[#2F7D5A] stroke-[2.5]" />
            ) : (
              <ShoppingBag className="w-[18px] h-[18px]" />
            )}
          </button>

          {/* Primary BUY NOW Button */}
          <button
            type="button"
            onClick={handleBuyNow}
            disabled={!isAvailable}
            className={`flex-1 min-w-0 h-11 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.98] ${
              !isAvailable
                ? 'bg-[#EEE8DC] text-[#66717C] border border-[#D8D0C3] cursor-not-allowed'
                : 'bg-[#23384D] hover:bg-[#182B3D] text-white'
            }`}
          >
            <Zap className="w-4 h-4 fill-current flex-shrink-0 text-[#C99A3D]" />
            <span className="truncate">
              {isAvailable ? 'BUY NOW' : 'Sold Out'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
