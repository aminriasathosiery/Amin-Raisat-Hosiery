'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useStore } from '@/context/StoreContext';
import { ProductCard } from '@/components/product/ProductCard';
import { Search, ChevronRight, ShoppingBag, Tag } from 'lucide-react';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL parameters drive active search results
  const activeQuery = searchParams.get('q') || '';

  // Input field local state (does not trigger search per keystroke)
  const [inputValue, setInputValue] = useState(activeQuery);
  const pageInputRef = useRef<HTMLInputElement>(null);

  const { products, categories, subcategories } = useStore();

  // Keep local input field in sync with URL search query parameter changes
  useEffect(() => {
    setInputValue(activeQuery);
  }, [activeQuery]);

  // Compute matching products strictly from the submitted active URL query
  const matchingProducts = useMemo(() => {
    const q = activeQuery.toLowerCase().trim();
    if (!q) return [];

    return products.filter((prod) => {
      if (!prod.isPublished) return false;

      const nameMatch = prod.name.toLowerCase().includes(q);
      const subtitleMatch = prod.subtitle?.toLowerCase().includes(q);
      const descMatch = prod.description?.toLowerCase().includes(q);

      const cat = categories.find((c) => c.id === prod.categoryId || c.slug === prod.categoryId);
      const catMatch = cat ? cat.name.toLowerCase().includes(q) : false;

      const subcat = subcategories.find((s) => s.id === prod.subcategoryId || s.slug === prod.subcategoryId);
      const subcatMatch = subcat ? subcat.name.toLowerCase().includes(q) : false;

      const skuMatch = prod.variants.some((v) => v.sku?.toLowerCase().includes(q));

      return nameMatch || subtitleMatch || descMatch || catMatch || subcatMatch || skuMatch;
    });
  }, [products, categories, subcategories, activeQuery]);

  // Shared search submit handler (for both Enter press and Search button tap)
  const executeSearch = (queryToSubmit: string) => {
    const trimmed = queryToSubmit.trim();

    if (!trimmed) {
      pageInputRef.current?.focus();
      return;
    }

    // 1. Dismiss mobile keyboard immediately & safely
    if (pageInputRef.current) {
      pageInputRef.current.blur();
    }
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    // 2. Client-side navigation without page reload
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(inputValue);
  };

  const popularSuggestions = ['Vest', 'Cotton', 'Underwear', 'White Vest', 'Sleeveless', 'High Quality', 'Standard Quality'];

  return (
    <div className="min-h-[85vh] py-8 sm:py-12 bg-[#F7F3EA] text-[#1D2730]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#66717C] mb-6 flex-wrap">
          <Link href="/" className="hover:text-[#C99A3D] transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3 h-3 text-[#66717C]" />
          <span className="font-semibold text-[#1D2730]">
            Search Products
          </span>
        </div>

        {/* Search Input Box Header */}
        <div className="border-b border-[#D8D0C3] pb-6 mb-8 max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1D2730] tracking-tight">
              Search Catalog
            </h1>
          </div>

          <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                ref={pageInputRef}
                type="text"
                enterKeyHint="search"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Search by product name, category, or style..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-[#D8D0C3] rounded-xl text-xs text-[#1D2730] placeholder-[#66717C] focus:outline-none focus:border-[#C99A3D] shadow-xs"
              />
              <Search className="w-4 h-4 text-[#C99A3D] absolute left-3.5 top-3.5" />
            </div>

            <button
              type="submit"
              className="px-6 py-3 bg-[#23384D] hover:bg-[#182B3D] text-[#F7F3EA] rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-colors flex items-center justify-center gap-2 flex-shrink-0"
              aria-label="Submit Search"
            >
              <Search className="w-4 h-4 stroke-[2.5]" />
              <span>Search</span>
            </button>
          </form>

          {/* Quick Suggestions / Popular Searches */}
          <div className="mt-3 flex items-center gap-1.5 flex-wrap text-xs text-[#66717C]">
            <span className="flex items-center gap-1 text-[11px] font-semibold">
              <Tag className="w-3 h-3 text-[#C99A3D]" /> Popular:
            </span>
            {popularSuggestions.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setInputValue(tag);
                  executeSearch(tag);
                }}
                className="px-2.5 py-1 bg-white border border-[#D8D0C3] hover:border-[#C99A3D] text-[#1D2730] rounded-lg text-[11px] font-medium transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Results Area */}
        {!activeQuery.trim() ? (
          <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-[#D8D0C3] max-w-md mx-auto space-y-3 shadow-xs">
            <div className="w-12 h-12 bg-[#EEE8DC]/50 rounded-2xl flex items-center justify-center mx-auto text-[#C99A3D] border border-[#D8D0C3]">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#1D2730]">Enter a search term</h3>
            <p className="text-xs text-[#66717C]">
              Type a product name, style, or category above and press Enter or tap Search.
            </p>
          </div>
        ) : matchingProducts.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-[#D8D0C3] max-w-md mx-auto space-y-3 shadow-xs">
            <div className="w-12 h-12 bg-[#EEE8DC]/50 rounded-2xl flex items-center justify-center mx-auto text-[#66717C] border border-[#D8D0C3]">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#1D2730]">No products found</h3>
            <p className="text-xs text-[#66717C]">
              No items matched &quot;{activeQuery}&quot;. Try checking for spelling mistakes or explore our catalog.
            </p>
            <div className="pt-2">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#23384D] hover:bg-[#182B3D] text-[#F7F3EA] rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <ShoppingBag className="w-4 h-4 stroke-[2.2]" />
                <span>Browse All Products</span>
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs font-medium text-[#66717C] mb-6">
              Found {matchingProducts.length} product{matchingProducts.length > 1 ? 's' : ''}
              {activeQuery && ` matching "${activeQuery}"`}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {matchingProducts.map((prod) => (
                <ProductCard key={prod.id} product={prod} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-[#66717C] bg-[#F7F3EA] min-h-[50vh]">Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
