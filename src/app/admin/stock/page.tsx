'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useStore } from '@/context/StoreContext';
import { ProductVariant } from '@/types';
import {
  Save,
  AlertTriangle,
  Check,
  Search,
  Package,
  Plus,
  X,
  XCircle,
  Eye,
  Boxes,
} from 'lucide-react';

export default function AdminStockPage() {
  const { products, categories, subcategories, updateProductVariants, isLoading } = useStore();

  // Working state for all products: { [productId]: ProductVariant[] }
  const [stockMap, setStockMap] = useState<{ [productId: string]: ProductVariant[] }>({});
  const [activeDetailProductId, setActiveDetailProductId] = useState<string | null>(null);

  // Filters
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedSubcatId, setSelectedSubcatId] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Initialize stockMap when products load
  useEffect(() => {
    const map: { [productId: string]: ProductVariant[] } = {};
    for (const p of products) {
      map[p.id] = (p.variants || []).map((v) => ({ ...v }));
    }
    setStockMap(map);
  }, [products]);

  // Subcategories for selected category filter
  const availableSubcategories = useMemo(() => {
    if (selectedCategoryId === 'all') return subcategories;
    return subcategories.filter((s) => s.categoryId === selectedCategoryId);
  }, [selectedCategoryId, subcategories]);

  // Handle direct stock input change
  const handleStockChange = (productId: string, variantId: string, newStock: number) => {
    setStockMap((prev) => {
      const currentVariants = prev[productId] || [];
      const updated = currentVariants.map((v) =>
        v.id === variantId ? { ...v, stock: Math.max(0, newStock) } : v
      );
      return { ...prev, [productId]: updated };
    });
  };

  // Handle quick adjustment (+10, -5, +50)
  const handleQuickAdjust = (productId: string, variantId: string, amount: number) => {
    setStockMap((prev) => {
      const currentVariants = prev[productId] || [];
      const updated = currentVariants.map((v) =>
        v.id === variantId ? { ...v, stock: Math.max(0, v.stock + amount) } : v
      );
      return { ...prev, [productId]: updated };
    });
  };

  // Save single product stock
  const handleSaveProductStock = async (productId: string) => {
    const variants = stockMap[productId];
    if (!variants) return;
    setIsSaving(true);
    try {
      await updateProductVariants(productId, variants);
      const prodName = products.find((p) => p.id === productId)?.name || 'Product';
      setSaveSuccessMsg(`Stock levels for "${prodName}" updated live!`);
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    } catch (err) {
      setSaveSuccessMsg('Unable to save stock numbers. Please try again.');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Live Catalog Global Summary
  const catalogSummary = useMemo(() => {
    let totalProductsCount = products.length;
    let totalVariantsCount = 0;
    let totalStockUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of products) {
      const vars = stockMap[p.id] || p.variants || [];
      totalVariantsCount += vars.length;
      for (const v of vars) {
        totalStockUnits += v.stock || 0;
        if (v.stock <= 0) {
          outOfStockCount++;
        } else if (v.stock <= 10) {
          lowStockCount++;
        }
      }
    }

    return {
      totalProductsCount,
      totalVariantsCount,
      totalStockUnits,
      lowStockCount,
      outOfStockCount,
    };
  }, [products, stockMap]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategoryId !== 'all' && p.categoryId !== selectedCategoryId) return false;
      if (selectedSubcatId !== 'all' && p.subcategoryId !== selectedSubcatId) return false;

      const q = searchQuery.toLowerCase().trim();
      const vars = stockMap[p.id] || p.variants || [];
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.subtitle && p.subtitle.toLowerCase().includes(q)) ||
        vars.some(
          (v) =>
            v.quality.toLowerCase().includes(q) ||
            v.sleeve.toLowerCase().includes(q) ||
            v.size.toLowerCase().includes(q) ||
            (v.sku && v.sku.toLowerCase().includes(q))
        );
      if (!matchesSearch) return false;

      const totalStock = vars.reduce((sum, v) => sum + (v.stock || 0), 0);
      const hasLowStock = vars.some((v) => v.stock > 0 && v.stock <= 10);
      const hasOutOfStock = vars.some((v) => v.stock <= 0);

      if (stockFilter === 'in-stock' && (totalStock <= 0 || hasOutOfStock)) return false;
      if (stockFilter === 'low-stock' && !hasLowStock) return false;
      if (stockFilter === 'out-of-stock' && !hasOutOfStock) return false;

      return true;
    });
  }, [products, stockMap, selectedCategoryId, selectedSubcatId, stockFilter, searchQuery]);

  const activeDetailProduct = products.find((p) => p.id === activeDetailProductId);
  const activeProductVariants = activeDetailProduct
    ? stockMap[activeDetailProduct.id] || activeDetailProduct.variants || []
    : [];

  return (
    <div className="space-y-6 max-w-7xl text-charcoal-900">
      {/* Toast Notification Banner */}
      {saveSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-white text-charcoal-900 border border-emerald-500/40 rounded-xl shadow-elevation flex items-center gap-2.5 text-xs font-semibold animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-light-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-charcoal-900">
              Inventory &amp; Stock Control
            </h1>
            <span className="text-xs font-bold bg-light-elevated text-[#B89555] border border-light-border px-2.5 py-0.5 rounded-lg">
              {catalogSummary.totalStockUnits.toLocaleString()} Pcs Total
            </span>
          </div>
          <p className="text-xs text-charcoal-500 mt-1">
            Real-time live inventory levels. Update quantities per garment variant or perform bulk stock allocations.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-light-border shadow-sm">
          <span className="text-[10px] font-bold text-charcoal-500 uppercase tracking-wider block whitespace-nowrap">
            Total Inventory
          </span>
          <div className="text-lg sm:text-xl font-bold text-[#B89555] mt-1">
            {catalogSummary.totalStockUnits.toLocaleString()}
          </div>
          <span className="text-[10px] text-charcoal-400 mt-0.5 block whitespace-nowrap">
            {catalogSummary.totalVariantsCount} Variant Matrixes
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-light-border shadow-sm">
          <span className="text-[10px] font-bold text-charcoal-500 uppercase tracking-wider block whitespace-nowrap">
            Live Garments
          </span>
          <div className="text-lg sm:text-xl font-bold text-charcoal-900 mt-1">
            {catalogSummary.totalProductsCount}
          </div>
          <span className="text-[10px] text-charcoal-400 mt-0.5 block whitespace-nowrap">Master Product Lines</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-light-border shadow-sm">
          <span className="text-[10px] font-bold text-charcoal-500 uppercase tracking-wider block whitespace-nowrap">
            Low Stock Alerts
          </span>
          <div className={`text-lg sm:text-xl font-bold mt-1 ${catalogSummary.lowStockCount > 0 ? 'text-amber-600' : 'text-charcoal-900'}`}>
            {catalogSummary.lowStockCount}
          </div>
          <span className="text-[10px] text-charcoal-400 mt-0.5 block whitespace-nowrap">&le; 10 Units Remaining</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-light-border shadow-sm">
          <span className="text-[10px] font-bold text-charcoal-500 uppercase tracking-wider block whitespace-nowrap">
            Out of Stock
          </span>
          <div className={`text-lg sm:text-xl font-bold mt-1 ${catalogSummary.outOfStockCount > 0 ? 'text-rose-600' : 'text-charcoal-900'}`}>
            {catalogSummary.outOfStockCount}
          </div>
          <span className="text-[10px] text-charcoal-400 mt-0.5 block whitespace-nowrap">0 Units Remaining</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-light-border shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-charcoal-500 uppercase mb-1">
              Category
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value);
                setSelectedSubcatId('all');
              }}
              className="w-full px-3 py-2 text-xs bg-light-elevated border border-light-border rounded-xl text-charcoal-900 focus:border-[#B89555] focus:outline-none"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-charcoal-500 uppercase mb-1">
              Subcategory
            </label>
            <select
              value={selectedSubcatId}
              onChange={(e) => setSelectedSubcatId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-light-elevated border border-light-border rounded-xl text-charcoal-900 focus:border-[#B89555] focus:outline-none"
            >
              <option value="all">All Subcategories</option>
              {availableSubcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-charcoal-500 uppercase mb-1">
              Stock Status
            </label>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-light-elevated border border-light-border rounded-xl text-charcoal-900 focus:border-[#B89555] focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="in-stock">In Stock (&gt; 10)</option>
              <option value="low-stock">Low Stock (&le; 10)</option>
              <option value="out-of-stock">Out of Stock (0)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-charcoal-500 uppercase mb-1">
              Search Garment
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Product name, SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-light-elevated border border-light-border rounded-xl text-charcoal-900 placeholder-charcoal-400 focus:border-[#B89555] focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-charcoal-400 absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Inventory Overview List */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-light-border space-y-3 shadow-sm">
          <Package className="w-10 h-10 text-charcoal-400 mx-auto" />
          <h3 className="font-bold text-base text-charcoal-900">No products match your filter</h3>
          <p className="text-xs text-charcoal-500 max-w-sm mx-auto">
            Try adjusting your search criteria or add new garments from the Product Manager.
          </p>
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* 1. DESKTOP DATA TABLE (hidden on mobile < md) */}
          {/* ========================================================================= */}
          <div className="hidden md:block bg-white rounded-2xl border border-light-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-light-elevated text-[#B89555] uppercase font-bold text-[11px] border-b border-light-border">
                  <tr>
                    <th className="p-4 min-w-[280px]">Product &amp; Category</th>
                    <th className="p-4 w-32 text-center whitespace-nowrap">Total In Stock</th>
                    <th className="p-4 w-36 text-center whitespace-nowrap">Variants Count</th>
                    <th className="p-4 w-44 whitespace-nowrap">Price Range</th>
                    <th className="p-4 w-36 whitespace-nowrap">Stock Status</th>
                    <th className="p-4 w-36 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-border font-medium text-charcoal-700">
                  {filteredProducts.map((product) => {
                    const category = categories.find((c) => c.id === product.categoryId);
                    const subcategory = subcategories.find((s) => s.id === product.subcategoryId);
                    const primaryImage =
                      product.media?.[0]?.url || '/images/products/sleevless high.jpeg';

                    const variants = stockMap[product.id] || product.variants || [];
                    const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
                    const prices = variants.map((v) => v.price).filter((pr) => !isNaN(pr));
                    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
                    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

                    const lowStockVarsCount = variants.filter((v) => v.stock > 0 && v.stock <= 10).length;
                    const outOfStockVarsCount = variants.filter((v) => v.stock <= 0).length;

                    return (
                      <tr
                        key={product.id}
                        className="hover:bg-light-hover transition-colors"
                      >
                        {/* Product & Category */}
                        <td className="p-4 min-w-[280px]">
                          <div className="flex items-center gap-3.5">
                            <div className="relative w-12 h-14 bg-light-elevated rounded-xl overflow-hidden border border-light-border flex-shrink-0 p-0.5">
                              <Image
                                src={primaryImage}
                                alt={product.name}
                                fill
                                sizes="56px"
                                className="object-contain object-center"
                              />
                            </div>

                            <div className="space-y-0.5">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#B89555] block whitespace-nowrap">
                                {category?.name || 'Category'} {subcategory ? `• ${subcategory.name}` : ''}
                              </span>
                              <h3 className="font-bold text-sm text-charcoal-900 leading-snug">
                                {product.name}
                              </h3>
                              <p className="text-[11px] text-charcoal-500 line-clamp-1">{product.subtitle}</p>
                            </div>
                          </div>
                        </td>

                        {/* Total In Stock */}
                        <td className="p-4 w-32 text-center whitespace-nowrap">
                          <span className="font-bold text-sm text-[#B89555]">
                            {totalStock.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-charcoal-500 block">Pieces</span>
                        </td>

                        {/* Variants Count */}
                        <td className="p-4 w-36 text-center whitespace-nowrap">
                          <span className="inline-flex items-center justify-center font-bold text-xs bg-light-elevated border border-light-border text-charcoal-700 px-3 py-1 rounded-lg whitespace-nowrap">
                            {variants.length} Variants
                          </span>
                        </td>

                        {/* Price Range */}
                        <td className="p-4 w-44 whitespace-nowrap">
                          <span className="font-bold text-xs text-charcoal-900 whitespace-nowrap">
                            {minPrice === maxPrice ? `Rs. ${minPrice}` : `Rs. ${minPrice} – Rs. ${maxPrice}`}
                          </span>
                        </td>

                        {/* Stock Status */}
                        <td className="p-4 w-36 whitespace-nowrap">
                          {totalStock <= 0 ? (
                            <span className="inline-flex items-center gap-1.5 text-rose-600 font-bold text-xs bg-rose-50 border border-rose-300 px-2.5 py-1 rounded-lg whitespace-nowrap">
                              <XCircle className="w-3.5 h-3.5 text-rose-500" /> Out of Stock
                            </span>
                          ) : lowStockVarsCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 text-amber-600 font-bold text-xs bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-lg whitespace-nowrap">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> {lowStockVarsCount} Low
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold text-xs bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-lg whitespace-nowrap">
                              <Check className="w-3.5 h-3.5 text-emerald-500" /> In Stock
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-4 w-36 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setActiveDetailProductId(product.id)}
                            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-light-elevated hover:bg-light-hover text-charcoal-900 hover:text-[#B89555] border border-light-border hover:border-[#B89555] rounded-xl text-xs font-semibold whitespace-nowrap transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#B89555]" />
                            <span>View Matrix</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. MOBILE RESPONSIVE CARDS (md:hidden) */}
          {/* ========================================================================= */}
          <div className="md:hidden space-y-3.5">
            {filteredProducts.map((product) => {
              const category = categories.find((c) => c.id === product.categoryId);
              const subcategory = subcategories.find((s) => s.id === product.subcategoryId);
              const primaryImage =
                product.media?.[0]?.url || '/images/products/sleevless high.jpeg';

              const variants = stockMap[product.id] || product.variants || [];
              const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
              const prices = variants.map((v) => v.price).filter((pr) => !isNaN(pr));
              const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
              const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

              const lowStockVarsCount = variants.filter((v) => v.stock > 0 && v.stock <= 10).length;
              const outOfStockVarsCount = variants.filter((v) => v.stock <= 0).length;

              return (
                <div
                  key={product.id}
                  className="bg-white p-4 rounded-2xl border border-light-border shadow-sm space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative w-14 h-16 bg-light-elevated rounded-xl overflow-hidden border border-light-border flex-shrink-0 p-0.5">
                      <Image
                        src={primaryImage}
                        alt={product.name}
                        fill
                        sizes="60px"
                        className="object-contain object-center"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#B89555] block truncate">
                        {category?.name || 'Category'} {subcategory ? `• ${subcategory.name}` : ''}
                      </span>
                      <h3 className="font-bold text-sm text-charcoal-900 leading-snug">
                        {product.name}
                      </h3>
                      <span className="font-bold text-xs text-[#B89555] block mt-0.5 whitespace-nowrap">
                        {minPrice === maxPrice ? `Rs. ${minPrice}` : `Rs. ${minPrice} – Rs. ${maxPrice}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-light-border flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center font-bold text-xs bg-light-elevated border border-light-border text-charcoal-700 px-2.5 py-1 rounded-lg whitespace-nowrap">
                        {totalStock.toLocaleString()} Pcs ({variants.length} Vars)
                      </span>

                      {totalStock <= 0 ? (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-[11px] bg-rose-50 border border-rose-300 px-2 py-0.5 rounded-lg whitespace-nowrap">
                          <XCircle className="w-3 h-3" /> Out
                        </span>
                      ) : lowStockVarsCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-bold text-[11px] bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-lg whitespace-nowrap">
                          <AlertTriangle className="w-3 h-3" /> {lowStockVarsCount} Low
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px] bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-lg whitespace-nowrap">
                          <Check className="w-3 h-3" /> In Stock
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveDetailProductId(product.id)}
                      className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 bg-light-elevated hover:bg-light-hover text-charcoal-900 hover:text-[#B89555] border border-light-border rounded-xl text-xs font-semibold whitespace-nowrap"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#B89555]" />
                      <span>View Matrix</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 3. VARIANT DETAILS MODAL */}
      {/* ========================================================================= */}
      {activeDetailProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-elevation border border-light-border overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 sm:p-6 border-b border-light-border bg-light-elevated flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-16 sm:w-16 sm:h-20 bg-white rounded-xl overflow-hidden border border-light-border flex-shrink-0 p-1">
                  <Image
                    src={
                      activeDetailProduct.media?.[0]?.url ||
                      '/images/products/sleevless high.jpeg'
                    }
                    alt={activeDetailProduct.name}
                    fill
                    sizes="80px"
                    className="object-contain object-center"
                  />
                </div>

                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-charcoal-900">
                    {activeDetailProduct.name}
                  </h2>
                  <p className="text-xs text-charcoal-500">
                    Total Stock: <strong className="text-[#B89555]">{activeProductVariants.reduce((sum, v) => sum + (v.stock || 0), 0)} pcs</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveDetailProductId(null)}
                className="p-1.5 text-charcoal-400 hover:text-charcoal-900 rounded-lg hover:bg-light-hover transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="border border-light-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-light-elevated text-[#B89555] uppercase font-bold text-[10px] border-b border-light-border">
                      <tr>
                        <th className="p-3">Style</th>
                        <th className="p-3 text-center">Size</th>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Price</th>
                        <th className="p-3">Available Stock</th>
                        <th className="p-3">Quick Adjust</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-light-border font-medium text-charcoal-700">
                      {activeProductVariants.map((variant) => {
                        const isLow = variant.stock > 0 && variant.stock <= 10;
                        const isOut = variant.stock <= 0;

                        return (
                          <tr
                            key={variant.id}
                            className={`hover:bg-light-hover transition-colors ${
                              isOut ? 'bg-rose-50/50' : isLow ? 'bg-amber-50/50' : ''
                            }`}
                          >
                            <td className="p-3 text-charcoal-900 font-semibold">{variant.sleeve}</td>
                            <td className="p-3 text-center">
                              <span className="font-bold bg-light-elevated text-[#B89555] border border-light-border px-2 py-0.5 rounded-md text-xs whitespace-nowrap">
                                {variant.size}
                              </span>
                            </td>
                            <td className="p-3 text-charcoal-500 font-mono text-[11px]">
                              {variant.sku || '—'}
                            </td>
                            <td className="p-3 font-bold text-[#B89555] whitespace-nowrap">Rs. {variant.price}</td>
                            <td className="p-3">
                              <input
                                type="number"
                                min={0}
                                value={variant.stock}
                                onChange={(e) =>
                                  handleStockChange(
                                    activeDetailProduct.id,
                                    variant.id,
                                    Number(e.target.value)
                                  )
                                }
                                className="w-20 sm:w-24 px-2.5 py-1.5 text-xs font-bold rounded-xl border bg-light-elevated border-light-border text-charcoal-900 focus:border-[#B89555] focus:outline-none"
                              />
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuickAdjust(activeDetailProduct.id, variant.id, -5)
                                  }
                                  className="px-2 py-1 bg-light-elevated hover:bg-light-hover text-charcoal-700 rounded-lg text-[11px] border border-light-border"
                                >
                                  -5
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuickAdjust(activeDetailProduct.id, variant.id, 10)
                                  }
                                  className="px-2 py-1 bg-light-elevated hover:bg-light-hover text-charcoal-700 rounded-lg text-[11px] border border-light-border"
                                >
                                  +10
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuickAdjust(activeDetailProduct.id, variant.id, 50)
                                  }
                                  className="px-2 py-1 bg-champagne-500 hover:bg-champagne-400 text-charcoal-950 font-bold rounded-lg text-[11px]"
                                >
                                  +50
                                </button>
                              </div>
                            </td>
                            <td className="p-3">
                              {isOut ? (
                                <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-[10px] bg-rose-50 border border-rose-300 px-2 py-0.5 rounded-md whitespace-nowrap">
                                  <XCircle className="w-3 h-3" /> Out
                                </span>
                              ) : isLow ? (
                                <span className="inline-flex items-center gap-1 text-amber-600 font-bold text-[10px] bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-md whitespace-nowrap">
                                  <AlertTriangle className="w-3 h-3" /> Low ({variant.stock})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[10px] bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-md whitespace-nowrap">
                                  <Check className="w-3 h-3" /> Ready ({variant.stock})
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-light-border bg-light-elevated flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveDetailProductId(null)}
                className="px-4 py-2 text-xs font-semibold text-charcoal-500 hover:text-charcoal-900 rounded-xl"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => handleSaveProductStock(activeDetailProduct.id)}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-champagne-500 hover:bg-champagne-400 text-charcoal-950 text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving Changes...' : 'Save Stock Levels'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
