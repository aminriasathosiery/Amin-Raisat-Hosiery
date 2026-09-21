'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useStore } from '@/context/StoreContext';
import { ProductCard } from '@/components/product/ProductCard';
import { ArrowLeft, ShoppingBag, ChevronRight, Package } from 'lucide-react';

export default function CategoryPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { categories, subcategories: allSubcategories, products } = useStore();

  const [activeSubcatSlug, setActiveSubcatSlug] = useState<string>('all');

  const currentCategory = categories.find(
    (c) => c.slug?.toLowerCase() === slug?.toLowerCase() || c.id === slug
  );
  
  // Find subcategories belonging to this category
  const subcategories = (currentCategory?.subcategories && currentCategory.subcategories.length > 0)
    ? currentCategory.subcategories.filter((s) => s.isActive !== false)
    : allSubcategories.filter(
        (s) => s.categoryId === currentCategory?.id && s.isActive !== false
      );

  // Filter products by category and active subcategory tab
  const categoryProducts = products.filter((p) => {
    if (!currentCategory) return false;
    if (!p.isPublished) return false;

    const matchesCat =
      p.categoryId === currentCategory.id ||
      p.categoryId === currentCategory.slug ||
      (slug === 'men' && (!p.categoryId || p.categoryId === 'cat-men')) ||
      (slug === 'women' && p.categoryId === 'cat-women') ||
      (slug === 'kids' && p.categoryId === 'cat-kids');
    if (!matchesCat) return false;

    if (activeSubcatSlug === 'all') return true;
    const activeSub = subcategories.find((s) => s.slug === activeSubcatSlug);
    return p.subcategoryId === activeSub?.id || p.subcategoryId === activeSub?.slug;
  });

  if (!currentCategory && slug !== 'men' && slug !== 'women' && slug !== 'kids') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center bg-[#F7F3EA] text-[#1D2730] min-h-[70vh] flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-[#1D2730]">Category Not Found</h1>
        <p className="text-xs text-[#66717C] mt-2">The category you requested does not exist.</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 bg-[#23384D] hover:bg-[#182B3D] text-[#F7F3EA] text-xs font-bold py-3 px-6 rounded-xl shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>
    );
  }

  const categoryName = currentCategory?.name || (slug === 'men' ? 'Men' : slug === 'women' ? 'Women' : 'Kids');

  return (
    <div className="min-h-[85vh] py-10 bg-[#F7F3EA] text-[#1D2730]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-[#66717C] mb-6">
          <Link href="/" className="hover:text-[#C99A3D] transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3 h-3 text-[#66717C]" />
          <Link href="/shop" className="hover:text-[#C99A3D] transition-colors">
            Shop
          </Link>
          <ChevronRight className="w-3 h-3 text-[#66717C]" />
          <span className="font-bold text-[#1D2730]">{categoryName}&apos;s Collection</span>
        </div>

        {/* Category Header Banner */}
        <div className="bg-white rounded-2xl p-6 sm:p-10 border border-[#D8D0C3] shadow-sm mb-8">
          <div className="max-w-2xl">
            <span className="text-[10px] font-bold text-[#C99A3D] uppercase tracking-widest block mb-1">
              Category Collection
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1D2730] tracking-tight">
              {categoryName}&apos;s Collection
            </h1>
            <p className="text-xs sm:text-sm text-[#66717C] mt-2 leading-relaxed font-normal">
              {currentCategory?.description ||
                `Browse our collection of breathable cotton essentials for ${categoryName.toLowerCase()}.`}
            </p>
          </div>
        </div>

        {/* Subcategories Filter Pills */}
        {subcategories.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveSubcatSlug('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                  activeSubcatSlug === 'all'
                    ? 'bg-[#23384D] text-[#F7F3EA] shadow-xs'
                    : 'bg-white text-[#1D2730] hover:bg-[#EEE8DC]/50 border border-[#D8D0C3]'
                }`}
              >
                All {categoryName} Items
              </button>

              {subcategories.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setActiveSubcatSlug(sub.slug)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 flex items-center gap-1.5 ${
                    activeSubcatSlug === sub.slug
                      ? 'bg-[#23384D] text-[#F7F3EA] shadow-xs'
                      : 'bg-white text-[#1D2730] hover:bg-[#EEE8DC]/50 border border-[#D8D0C3]'
                  }`}
                >
                  <span>{sub.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Product Grid / Empty State */}
        {categoryProducts.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 sm:p-12 text-center border border-[#D8D0C3] max-w-lg mx-auto shadow-sm space-y-4">
            <div className="w-14 h-14 bg-[#EEE8DC]/50 rounded-2xl flex items-center justify-center mx-auto text-[#C99A3D] border border-[#D8D0C3]">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-[#1D2730]">
              {activeSubcatSlug !== 'all'
                ? `No Products Found in ${subcategories.find((s) => s.slug === activeSubcatSlug)?.name || 'Collection'}`
                : `No Products in ${categoryName}'s Collection`}
            </h3>
            <p className="text-xs text-[#66717C] leading-relaxed">
              Explore our current in-stock pure cotton vests and innerwear in the main shop.
            </p>
            <div className="pt-2">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 bg-[#23384D] hover:bg-[#182B3D] text-[#F7F3EA] font-bold text-xs py-3 px-6 rounded-xl shadow-xs transition-colors"
              >
                <ShoppingBag className="w-4 h-4 stroke-[2.2]" />
                <span>Explore Full Shop</span>
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs font-semibold text-[#66717C]">
                Showing {categoryProducts.length} Product{categoryProducts.length > 1 ? 's' : ''}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {categoryProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
