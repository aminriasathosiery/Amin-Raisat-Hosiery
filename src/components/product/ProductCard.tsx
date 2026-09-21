'use client';

import React, { useState, useMemo } from 'react';
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

const AVAILABLE_SIZES: ProductSize[] = ['S', 'M', 'L', 'XL', 'XXL'];

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const router = useRouter();
  const { addItem, openDrawer, setBuyNowItem } = useCart();
  const { categories } = useStore();

  const [selectedSleeve, setSelectedSleeve] = useState<SleeveType>(() => {
    return product.variants?.[0]?.sleeve || 'Sleeveless';
  });
  const [selectedSize, setSelectedSize] = useState<ProductSize>('L');
  const [justAdded, setJustAdded] = useState(false);

  // Dynamic category name
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
    : 'Cotton Essentials';

  // Compute available sleeves for this specific product listing
  const availableSleeves = useMemo(() => {
    const sleeves = Array.from(new Set(product.variants.map((v) => v.sleeve).filter(Boolean)));
    return sleeves.length > 0 ? sleeves : ['Sleeveless'];
  }, [product.variants]);

  // Compute matched variant
  const currentVariant = useMemo(() => {
    return (
      product.variants.find(
        (v) => v.sleeve === selectedSleeve && v.size === selectedSize
      ) ||
      product.variants.find((v) => v.sleeve === selectedSleeve) ||
      product.variants[0]
    );
  }, [product.variants, selectedSleeve, selectedSize]);

  const price = currentVariant?.salePrice || currentVariant?.price || 480;
  const comparePrice = currentVariant?.price && currentVariant.price > price ? currentVariant.price : undefined;
  const discountPercentage = currentVariant?.discountPercentage || 0;
  const isAvailable = currentVariant ? currentVariant.isAvailable && currentVariant.stock > 0 : false;

  const photoMedia = useMemo(() => {
    return (product.media || []).filter((m) => m.type !== 'video' && m.type !== 'size_guide');
  }, [product.media]);

  // Resolve matching photo for chosen sleeve
  const currentPhoto = useMemo(() => {
    const match = photoMedia.find(
      (m) => !m.variantSleeve || m.variantSleeve === 'All' || m.variantSleeve === selectedSleeve
    );
    return match?.url || photoMedia[0]?.url || '/images/products/sleevless high.jpeg';
  }, [photoMedia, selectedSleeve]);

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
        {/* 1. Product Image Area */}
        <div className="relative w-full aspect-square bg-[#EEE8DC] overflow-hidden border-b border-[#D8D0C3]">
          {/* Badge */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
            <span className="bg-white/90 backdrop-blur-xs text-[#C99A3D] border border-[#D8D0C3] text-[10px] font-semibold px-2.5 py-0.5 rounded-md shadow-2xs uppercase tracking-wider whitespace-nowrap">
              100% Combed Cotton
            </span>
          </div>

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

          {/* Subtle Video Indicator Badge */}
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

          {/* Size Pills */}
          <div className="space-y-1.5 mt-auto pt-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-[#66717C]">Size:</span>
              <span className="text-[#1D2730] font-medium whitespace-nowrap">Fit {selectedSize}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {AVAILABLE_SIZES.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setSelectedSize(sz)}
                  className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
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
            Free Delivery 3+ pcs
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
