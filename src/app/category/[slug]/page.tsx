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
      <div className="max-w-7xl mx-auto px-4 py-20 text-center bg-light-bg dark:bg-[#101114] text-charcoal-900 dark:text-[#F1F0EC] min-h-[70vh] flex flex-col items-center justify-center transition-colors duration-200">
        <h1 className="text-2xl font-bold text-charcoal-900 dark:text-[#F1F0EC]">Category Not Found</h1>
        <p className="text-xs text-charcoal-500 dark:text-[#85888E] mt-2">The category you requested does not exist.</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 bg-champagne-500 hover:bg-champagne-400 text-black text-xs font-bold py-3 px-6 rounded-xl shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>
    );
  }

  const categoryName = currentCategory?.name || (slug === 'men' ? 'Men' : slug === 'women' ? 'Women' : 'Kids');

  return (
    <div className="min-h-[85vh] py-10 bg-light-bg dark:bg-[#101114] text-charcoal-900 dark:text-[#F1F0EC] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-charcoal-500 dark:text-[#85888E] mb-6">
          <Link href="/" className="hover:text-[#C9A96A] transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3 h-3 text-charcoal-400 dark:text-[#30343A]" />
          <Link href="/shop" className="hover:text-[#C9A96A] transition-colors">
            Shop
          </Link>
          <ChevronRight className="w-3 h-3 text-charcoal-400 dark:text-[#30343A]" />
          <span className="font-bold text-charcoal-900 dark:text-[#F1F0EC]">{categoryName}&apos;s Collection</span>
        </div>

        {/* Category Header Banner */}
        <div className="bg-white dark:bg-[#17191D] rounded-2xl p-6 sm:p-10 border border-light-border dark:border-[#30343A] shadow-sm dark:shadow-card mb-8">
          <div className="max-w-2xl">
            <span className="text-[10px] font-bold text-[#B89555] dark:text-[#C9A96A] uppercase tracking-widest block mb-1">
              Category Collection
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-charcoal-900 dark:text-[#F4F1E9] tracking-tight">
              {categoryName}&apos;s Collection
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-600 dark:text-[#B8B3A8] mt-2 leading-relaxed font-normal">
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
                    ? 'bg-champagne-500 text-black shadow-xs'
                    : 'bg-white dark:bg-[#1D2025] text-charcoal-700 dark:text-[#B4B5BA] hover:text-charcoal-900 dark:hover:text-[#F1F0EC] hover:bg-light-hover dark:hover:bg-[#202329] border border-light-border dark:border-[#30343A]'
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
                      ? 'bg-champagne-500 text-black shadow-xs'
                      : 'bg-white dark:bg-[#1D2025] text-charcoal-700 dark:text-[#B4B5BA] hover:text-charcoal-900 dark:hover:text-[#F1F0EC] hover:bg-light-hover dark:hover:bg-[#202329] border border-light-border dark:border-[#30343A]'
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
          <div className="bg-white dark:bg-[#17191D] rounded-2xl p-10 sm:p-12 text-center border border-light-border dark:border-[#30343A] max-w-lg mx-auto shadow-sm dark:shadow-card space-y-4">
            <div className="w-14 h-14 bg-light-elevated dark:bg-[#1D2025] rounded-2xl flex items-center justify-center mx-auto text-[#A07D38] dark:text-[#C9A96A] border border-light-border dark:border-[#30343A]">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-charcoal-900 dark:text-[#F1F0EC]">
              {activeSubcatSlug !== 'all'
                ? `No Products Found in ${subcategories.find((s) => s.slug === activeSubcatSlug)?.name || 'Collection'}`
                : `No Products in ${categoryName}'s Collection`}
            </h3>
            <p className="text-xs text-charcoal-500 dark:text-[#85888E] leading-relaxed">
              Explore our current in-stock pure cotton vests and innerwear in the main shop.
            </p>
            <div className="pt-2">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 bg-champagne-500 hover:bg-champagne-400 text-black font-bold text-xs py-3 px-6 rounded-xl shadow-xs transition-colors"
              >
                <ShoppingBag className="w-4 h-4 stroke-[2.2]" />
                <span>Explore Full Shop</span>
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs font-semibold text-charcoal-500 dark:text-[#85888E]">
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
