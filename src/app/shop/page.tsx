'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useStore } from '@/context/StoreContext';
import { ProductCard } from '@/components/product/ProductCard';
import { ChevronRight, Filter, X, Package } from 'lucide-react';

export default function ShopPage() {
  const { products, categories, subcategories } = useStore();

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [selectedSleeve, setSelectedSleeve] = useState<string>('all');
  const [selectedSize, setSelectedSize] = useState<string>('all');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('featured');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Close mobile filter drawer on Escape
  React.useEffect(() => {
    if (!mobileFilterOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileFilterOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [mobileFilterOpen]);

  // Available subcategories for selected category
  const activeSubcats = useMemo(() => {
    if (selectedCategory === 'all') return subcategories;
    const cat = categories.find((c) => c.slug === selectedCategory || c.id === selectedCategory);
    return subcategories.filter((s) => s.categoryId === cat?.id);
  }, [selectedCategory, categories, subcategories]);

  // Filtered and Sorted Products
  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => p.isPublished);

    // Category Filter
    if (selectedCategory !== 'all') {
      const cat = categories.find((c) => c.slug === selectedCategory || c.id === selectedCategory);
      if (cat) {
        list = list.filter((p) => p.categoryId === cat.id);
      }
    }

    // Subcategory Filter
    if (selectedSubcategory !== 'all') {
      const sub = subcategories.find((s) => s.slug === selectedSubcategory || s.id === selectedSubcategory);
      if (sub) {
        list = list.filter((p) => p.subcategoryId === sub.id);
      }
    }

    // Sleeve Filter
    if (selectedSleeve !== 'all') {
      list = list.filter((p) => p.variants.some((v) => v.sleeve === selectedSleeve));
    }

    // Size Filter
    if (selectedSize !== 'all') {
      list = list.filter((p) => p.variants.some((v) => v.size === selectedSize));
    }

    // Stock Filter
    if (inStockOnly) {
      list = list.filter((p) => p.variants.some((v) => v.isAvailable && v.stock > 0));
    }

    // Sorting
    switch (sortBy) {
      case 'price-asc':
        list = [...list].sort((a, b) => {
          const minA = Math.min(...a.variants.map((v) => v.price));
          const minB = Math.min(...b.variants.map((v) => v.price));
          return minA - minB;
        });
        break;
      case 'price-desc':
        list = [...list].sort((a, b) => {
          const minA = Math.min(...a.variants.map((v) => v.price));
          const minB = Math.min(...b.variants.map((v) => v.price));
          return minB - minA;
        });
        break;
      case 'name-asc':
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        list = [...list].sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'newest':
        list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      default:
        break;
    }

    return list;
  }, [
    products,
    categories,
    subcategories,
    selectedCategory,
    selectedSubcategory,
    selectedSleeve,
    selectedSize,
    inStockOnly,
    sortBy,
  ]);

  const clearAllFilters = () => {
    setSelectedCategory('all');
    setSelectedSubcategory('all');
    setSelectedSleeve('all');
    setSelectedSize('all');
    setInStockOnly(false);
  };

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedSubcategory !== 'all' ||
    selectedSleeve !== 'all' ||
    selectedSize !== 'all' ||
    inStockOnly;

  return (
    <div className="min-h-[85vh] py-10 bg-light-bg dark:bg-dark-bg text-charcoal-900 dark:text-gray-100 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-charcoal-500 dark:text-gray-400 mb-6">
          <Link href="/" className="hover:text-[#C9A96A] transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3 h-3 text-charcoal-400 dark:text-gray-600" />
          <span className="font-semibold text-charcoal-900 dark:text-gray-200">Catalog &amp; Shop</span>
        </div>

        {/* Page Header */}
        <div className="border-b border-light-border dark:border-dark-border pb-6 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 dark:text-gray-100 tracking-tight">
              All Products &amp; Garments
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-600 dark:text-gray-400 mt-1">
              Browse authentic 100% fine combed cotton vests and innerwear. Free Delivery on 3+ pieces.
            </p>
          </div>

          {/* Filter & Sort selector */}
          <div className="flex items-center gap-3 flex-wrap">

            <button
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-light-border dark:border-dark-border text-xs font-semibold text-charcoal-800 dark:text-gray-200 bg-white dark:bg-dark-surface"
            >
              <Filter className="w-4 h-4 text-[#A07D38] dark:text-gold-400" />
              <span>Filters {hasActiveFilters && '•'}</span>
            </button>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-charcoal-500 dark:text-gray-400 hidden sm:inline">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-xl px-3 py-2 text-xs font-semibold text-charcoal-900 dark:text-gray-200 focus:outline-none focus:border-[#C9A96A]"
              >
                <option value="featured">Featured</option>
                <option value="newest">Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Name: A–Z</option>
                <option value="name-desc">Name: Z–A</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Grid: Sidebar Filters + Products */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block lg:col-span-3 space-y-6 bg-white dark:bg-dark-surface p-6 rounded-2xl border border-light-border dark:border-dark-border shadow-sm dark:shadow-card">
            <div className="flex items-center justify-between border-b border-light-border dark:border-dark-border pb-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#A07D38] dark:text-gold-400 flex items-center gap-2">
                <Filter className="w-3.5 h-3.5" /> Filter Catalog
              </h3>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-[11px] font-semibold text-charcoal-500 dark:text-gray-400 hover:text-[#C9A96A] transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-charcoal-700 dark:text-gray-300 block">Category</label>
              <div className="space-y-1 text-xs">
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedSubcategory('all');
                  }}
                  className={`block w-full text-left px-3 py-2 rounded-xl transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-champagne-500 text-black font-bold shadow-xs'
                      : 'text-charcoal-700 dark:text-gray-300 hover:bg-light-hover dark:hover:bg-dark-card'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCategory(c.slug);
                      setSelectedSubcategory('all');
                    }}
                    className={`block w-full text-left px-3 py-2 rounded-xl transition-colors ${
                      selectedCategory === c.slug
                        ? 'bg-champagne-500 text-black font-bold shadow-xs'
                        : 'text-charcoal-700 dark:text-gray-300 hover:bg-light-hover dark:hover:bg-dark-card'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Subcategory Filter */}
            {activeSubcats.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-light-border dark:border-dark-border">
                <label className="text-xs font-bold text-charcoal-700 dark:text-gray-300 block">Subcategory</label>
                <div className="space-y-1 text-xs">
                  <button
                    onClick={() => setSelectedSubcategory('all')}
                    className={`block w-full text-left px-3 py-2 rounded-xl transition-colors ${
                      selectedSubcategory === 'all'
                        ? 'bg-champagne-500 text-black font-bold shadow-xs'
                        : 'text-charcoal-700 dark:text-gray-300 hover:bg-light-hover dark:hover:bg-dark-card'
                    }`}
                  >
                    All Subcategories
                  </button>
                  {activeSubcats.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSubcategory(s.slug)}
                      className={`block w-full text-left px-3 py-2 rounded-xl transition-colors ${
                        selectedSubcategory === s.slug
                          ? 'bg-champagne-500 text-black font-bold shadow-xs'
                          : 'text-charcoal-700 dark:text-gray-300 hover:bg-light-hover dark:hover:bg-dark-card'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Filter */}
            <div className="space-y-2 pt-2 border-t border-light-border dark:border-dark-border">
              <label className="text-xs font-bold text-charcoal-700 dark:text-gray-300 block">Size Fit</label>
              <div className="flex flex-wrap gap-1.5">
                {['all', 'S', 'M', 'L', 'XL', 'XXL'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      selectedSize === s
                        ? 'border-champagne-500 bg-champagne-500 text-black'
                        : 'border-light-border dark:border-dark-border bg-light-elevated dark:bg-dark-card text-charcoal-700 dark:text-gray-300 hover:border-[#C9A96A]/40'
                    }`}
                  >
                    {s === 'all' ? 'All' : s}
                  </button>
                ))}
              </div>
            </div>

            {/* Available Products Only */}
            <div className="pt-2 border-t border-light-border dark:border-dark-border">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-charcoal-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded accent-[#C9A96A] w-4 h-4"
                />
                <span>In Stock Products Only</span>
              </label>
            </div>
          </aside>

          {/* Products Grid Area */}
          <div className="lg:col-span-9">
            {filteredProducts.length === 0 ? (
              <div className="bg-white dark:bg-dark-surface rounded-2xl p-12 text-center border border-light-border dark:border-dark-border space-y-3 shadow-sm dark:shadow-card">
                <p className="text-sm font-bold text-charcoal-900 dark:text-gray-200">No products found matching your filters.</p>
                <p className="text-xs text-charcoal-500 dark:text-gray-400">Try adjusting or clearing your filters to see more results.</p>
                <button
                  onClick={clearAllFilters}
                  className="mt-2 inline-block px-4 py-2 bg-champagne-500 text-black rounded-xl text-xs font-bold hover:bg-champagne-400 transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium text-charcoal-500 dark:text-gray-400 mb-4">
                  Showing {filteredProducts.length} Product{filteredProducts.length > 1 ? 's' : ''}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredProducts.map((prod) => (
                    <ProductCard key={prod.id} product={prod} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      {mobileFilterOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end animate-in fade-in"
          onClick={() => setMobileFilterOpen(false)}
        >
          <div
            className="bg-white dark:bg-dark-surface w-full max-w-xs h-full p-6 overflow-y-auto space-y-6 shadow-elevation border-l border-light-border dark:border-dark-border text-charcoal-900 dark:text-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-light-border dark:border-dark-border pb-3">
              <h3 className="font-bold text-sm text-charcoal-900 dark:text-gray-100">Filter Products</h3>
              <button onClick={() => setMobileFilterOpen(false)} className="p-1 text-charcoal-400 hover:text-charcoal-900 dark:hover:text-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-charcoal-700 dark:text-gray-300 block">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedSubcategory('all');
                }}
                className="w-full bg-light-elevated dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-2.5 text-xs text-charcoal-900 dark:text-gray-100"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-charcoal-700 dark:text-gray-300 block">Size Fit</label>
              <div className="flex flex-wrap gap-1.5">
                {['all', 'S', 'M', 'L', 'XL', 'XXL'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                      selectedSize === s
                        ? 'border-champagne-500 bg-champagne-500 text-black'
                        : 'border-light-border dark:border-dark-border bg-light-elevated dark:bg-dark-card text-charcoal-700 dark:text-gray-300'
                    }`}
                  >
                    {s === 'all' ? 'All' : s}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-light-border dark:border-dark-border flex gap-2">
              <button
                onClick={clearAllFilters}
                className="flex-1 py-2.5 bg-light-elevated dark:bg-dark-card text-charcoal-700 dark:text-gray-300 font-semibold text-xs rounded-xl border border-light-border dark:border-dark-border"
              >
                Reset
              </button>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="flex-1 py-2.5 bg-champagne-500 text-black font-bold text-xs rounded-xl shadow-xs"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
