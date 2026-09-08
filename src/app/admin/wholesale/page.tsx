'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/context/StoreContext';
import { Product, ProductVariant } from '@/types';
import { DISPLAY_WHATSAPP_NUMBER } from '@/lib/whatsapp';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Package,
  DollarSign,
  TrendingUp,
  Sliders,
  RefreshCw,
  Eye,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Check,
  X,
  ChevronRight,
  Filter,
} from 'lucide-react';

export default function AdminWholesalePage() {
  const router = useRouter();
  const { settings, updateSettings, products, saveProduct, categories, orders } = useStore();

  const [wholesaleSettings, setWholesaleSettings] = useState({
    isEnabled: settings.wholesale?.isEnabled ?? true,
    defaultMinQty: settings.wholesale?.defaultMinQty ?? settings.wholesale?.minQuantity ?? 12,
    minQuantity: settings.wholesale?.minQuantity ?? settings.wholesale?.defaultMinQty ?? 12,
    defaultDiscountPercent: settings.wholesale?.defaultDiscountPercent ?? 18,
    freeDeliveryForWholesale: settings.wholesale?.freeDeliveryForWholesale ?? true,
    inquiryWhatsApp: settings.wholesale?.inquiryWhatsApp || settings.whatsapp || DISPLAY_WHATSAPP_NUMBER,
    termsAndNotes:
      settings.wholesale?.termsAndNotes ||
      'Wholesale orders require a minimum of 12 pieces (1 dozen). 100% Free Nationwide Delivery across Pakistan. Cash on delivery and direct bank transfer available.',
  });

  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveErrorMsg, setSaveErrorMsg] = useState('');

  // Search and Filters for Clean Wholesale Product List
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  // Selected Product for Wholesale Pricing Modal
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [modalVariants, setModalVariants] = useState<ProductVariant[]>([]);
  const [modalIsWholesaleEnabled, setModalIsWholesaleEnabled] = useState(true);
  const [modalMinQty, setModalMinQty] = useState(12);
  const [savingModal, setSavingModal] = useState(false);

  // Sync products list
  const [localProducts, setLocalProducts] = useState<Product[]>(products);
  React.useEffect(() => {
    setLocalProducts(products);
  }, [products]);

  // Analytics Metrics
  const wholesaleOrders = orders.filter((o) => o.isWholesale);
  const totalWholesaleRevenue = wholesaleOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const avgWholesaleOrderValue =
    wholesaleOrders.length > 0 ? Math.round(totalWholesaleRevenue / wholesaleOrders.length) : 0;

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return localProducts.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.subtitle || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = categoryFilter === 'all' || p.categoryId === categoryFilter;
      const isEnabled = p.isWholesaleEnabled !== false;
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'enabled' && isEnabled) ||
        (statusFilter === 'disabled' && !isEnabled);

      return matchSearch && matchCat && matchStatus;
    });
  }, [localProducts, searchTerm, categoryFilter, statusFilter]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSaveSuccessMsg('');
    setSaveErrorMsg('');

    try {
      await updateSettings({
        ...settings,
        wholesale: wholesaleSettings,
      });
      setSaveSuccessMsg('Global wholesale settings successfully updated!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      setSaveErrorMsg(err?.message || 'Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleProductWholesale = async (prod: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextState = prod.isWholesaleEnabled === false ? true : false;
    const updatedProd: Product = {
      ...prod,
      isWholesaleEnabled: nextState,
    };

    try {
      await saveProduct(updatedProd);
      setLocalProducts((prev) => prev.map((p) => (p.id === prod.id ? updatedProd : p)));
      setSaveSuccessMsg(`Wholesale availability for "${prod.name}" set to ${nextState ? 'ENABLED' : 'DISABLED'}.`);
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to toggle product wholesale:', err);
    }
  };

  // Open Manage Wholesale Pricing Modal
  const handleOpenProductPricingModal = (prod: Product) => {
    setSelectedProductForModal(prod);
    const preparedVariants = (prod.variants || []).map((v) => ({
      ...v,
      wholesalePrice: v.wholesalePrice !== undefined && v.wholesalePrice !== null && !isNaN(Number(v.wholesalePrice))
        ? Number(v.wholesalePrice)
        : Math.round((Number(v.price) || 480) * 0.82),
    }));
    setModalVariants(preparedVariants);
    setModalIsWholesaleEnabled(prod.isWholesaleEnabled !== false);
    setModalMinQty(prod.wholesaleMinQty ? Number(prod.wholesaleMinQty) : 12);
  };

  const handleModalVariantWholesaleChange = (variantId: string, newWholesale: number) => {
    setModalVariants((prev) =>
      prev.map((v) => (v.id === variantId ? { ...v, wholesalePrice: Number(newWholesale) || 0 } : v))
    );
  };

  const handleModalApplyGlobalDiscount = () => {
    const discount = wholesaleSettings.defaultDiscountPercent || 18;
    setModalVariants((prev) =>
      prev.map((v) => {
        const retail = Number(v.price) || 0;
        return {
          ...v,
          wholesalePrice: Math.round(retail * (1 - discount / 100)),
        };
      })
    );
    setSaveSuccessMsg(`Applied ${discount}% discount to all variants in editor.`);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleSaveModalPricing = async () => {
    if (!selectedProductForModal) return;
    setSavingModal(true);

    const updatedProd: Product = {
      ...selectedProductForModal,
      isWholesaleEnabled: modalIsWholesaleEnabled,
      wholesaleMinQty: Number(modalMinQty) || 12,
      variants: modalVariants.map((v) => ({
        ...v,
        wholesalePrice: Number(v.wholesalePrice) || 0,
      })),
    };

    try {
      await saveProduct(updatedProd);
      setLocalProducts((prev) =>
        prev.map((p) => (p.id === selectedProductForModal.id ? updatedProd : p))
      );
      setSaveSuccessMsg(`Wholesale pricing for "${updatedProd.name}" saved successfully!`);
      setSelectedProductForModal(null);
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      setSaveErrorMsg(err?.message || 'Failed to save wholesale pricing.');
    } finally {
      setSavingModal(false);
    }
  };

  // Group modal variants by quality and style for clear, organized matrix
  const groupedModalVariants = useMemo(() => {
    const groups: { [key: string]: ProductVariant[] } = {};
    modalVariants.forEach((v) => {
      const key = `${v.quality || 'High Quality'} — ${v.sleeve || 'Sleeveless'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(v);
    });
    return groups;
  }, [modalVariants]);

  return (
    <div className="space-y-8 select-none">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-light-border dark:border-[#34322D] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal-900 dark:text-[#F4F1E9]">
            Wholesale Management
          </h1>
          <p className="text-xs text-charcoal-500 dark:text-[#B8B3A8] mt-1">
            Product-centric wholesale pricing overview, factory rules, bulk discount policies, and catalog management.
          </p>
        </div>

        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 px-4 py-2 bg-light-elevated dark:bg-[#22211E] hover:bg-light-hover dark:hover:bg-[#2A2925] border border-light-border dark:border-[#34322D] text-xs font-bold text-charcoal-900 dark:text-[#F4F1E9] rounded-xl transition-colors self-start sm:self-auto shadow-xs"
        >
          <Package className="w-4 h-4 text-[#B89555] dark:text-[#C9A96A]" />
          <span>Catalog &amp; Product Editor</span>
        </Link>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {saveErrorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-2xl text-xs flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{saveErrorMsg}</span>
        </div>
      )}

      {/* 2. Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#191917] border border-light-border dark:border-[#34322D] shadow-sm dark:shadow-card space-y-1">
          <div className="flex items-center justify-between text-charcoal-500 dark:text-[#B8B3A8] text-xs font-semibold">
            <span>Wholesale Orders</span>
            <Package className="w-4 h-4 text-[#B89555] dark:text-[#C9A96A]" />
          </div>
          <div className="text-2xl font-extrabold text-charcoal-900 dark:text-[#F4F1E9]">{wholesaleOrders.length}</div>
          <p className="text-[11px] text-charcoal-400 dark:text-[#8E8A80]">Total B2B bulk orders placed</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#191917] border border-light-border dark:border-[#34322D] shadow-sm dark:shadow-card space-y-1">
          <div className="flex items-center justify-between text-charcoal-500 dark:text-[#B8B3A8] text-xs font-semibold">
            <span>Wholesale Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-charcoal-900 dark:text-[#F4F1E9]">Rs. {totalWholesaleRevenue.toLocaleString()}</div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400">Bulk gross merchandise value</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#191917] border border-light-border dark:border-[#34322D] shadow-sm dark:shadow-card space-y-1">
          <div className="flex items-center justify-between text-charcoal-500 dark:text-[#B8B3A8] text-xs font-semibold">
            <span>Avg Wholesale Ticket</span>
            <TrendingUp className="w-4 h-4 text-[#B89555] dark:text-[#C9A96A]" />
          </div>
          <div className="text-2xl font-extrabold text-charcoal-900 dark:text-[#F4F1E9]">Rs. {avgWholesaleOrderValue.toLocaleString()}</div>
          <p className="text-[11px] text-charcoal-400 dark:text-[#8E8A80]">Per wholesale transaction</p>
        </div>
      </div>

      {/* 3. Global Wholesale Settings Configuration */}
      <form
        onSubmit={handleSaveSettings}
        className="p-6 rounded-2xl bg-white dark:bg-[#191917] border border-light-border dark:border-[#34322D] shadow-sm dark:shadow-card space-y-5"
      >
        <div className="flex items-center justify-between border-b border-light-border dark:border-[#34322D] pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#B89555] dark:text-[#C9A96A]" />
            <h2 className="font-bold text-sm text-charcoal-900 dark:text-[#F4F1E9]">Global Wholesale Defaults &amp; Policy</h2>
          </div>
          <button
            type="submit"
            disabled={savingSettings}
            className="px-4 py-2 bg-champagne-500 hover:bg-champagne-400 disabled:opacity-50 text-charcoal-950 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingSettings ? 'Saving...' : 'Save Global Rules'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">
              Wholesale Module Status
            </label>
            <select
              value={wholesaleSettings.isEnabled ? 'active' : 'inactive'}
              onChange={(e) =>
                setWholesaleSettings({
                  ...wholesaleSettings,
                  isEnabled: e.target.value === 'active',
                })
              }
              className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl text-charcoal-900 dark:text-[#F4F1E9] focus:border-[#B89555] dark:focus:border-[#C9A96A] focus:outline-none"
            >
              <option value="active">Enabled (Active Storefront)</option>
              <option value="inactive">Disabled (Hidden)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">
              Default Minimum Qty (Pieces)
            </label>
            <input
              type="number"
              min={1}
              value={wholesaleSettings.minQuantity}
              onChange={(e) =>
                setWholesaleSettings({
                  ...wholesaleSettings,
                  minQuantity: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl text-charcoal-900 dark:text-[#F4F1E9] focus:border-[#B89555] dark:focus:border-[#C9A96A] focus:outline-none"
            />
            <span className="text-[10px] text-charcoal-400 dark:text-[#8E8A80]">Standard: 12 pcs (1 Dozen)</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">
              Default Wholesale Discount %
            </label>
            <input
              type="number"
              min={1}
              max={80}
              value={wholesaleSettings.defaultDiscountPercent}
              onChange={(e) =>
                setWholesaleSettings({
                  ...wholesaleSettings,
                  defaultDiscountPercent: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl text-charcoal-900 dark:text-[#F4F1E9] focus:border-[#B89555] dark:focus:border-[#C9A96A] focus:outline-none"
            />
            <span className="text-[10px] text-charcoal-400 dark:text-[#8E8A80]">Factory discount rate override</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">
              Wholesale Delivery Policy
            </label>
            <select
              value={wholesaleSettings.freeDeliveryForWholesale ? 'free' : 'standard'}
              onChange={(e) =>
                setWholesaleSettings({
                  ...wholesaleSettings,
                  freeDeliveryForWholesale: e.target.value === 'free',
                })
              }
              className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl text-charcoal-900 dark:text-[#F4F1E9] focus:border-[#B89555] dark:focus:border-[#C9A96A] focus:outline-none"
            >
              <option value="free">100% Free Nationwide Delivery</option>
              <option value="standard">Standard Shipping Fee Applied</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">
            Wholesale Commercial Notice &amp; Terms Message
          </label>
          <input
            type="text"
            value={wholesaleSettings.termsAndNotes}
            onChange={(e) =>
              setWholesaleSettings({
                ...wholesaleSettings,
                termsAndNotes: e.target.value,
              })
            }
            className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl text-charcoal-900 dark:text-[#F4F1E9] focus:border-[#B89555] dark:focus:border-[#C9A96A] focus:outline-none"
          />
        </div>
      </form>

      {/* 4. CLEAN WHOLESALE PRODUCT MANAGEMENT LIST */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#191917] border border-light-border dark:border-[#34322D] shadow-sm dark:shadow-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-light-border dark:border-[#34322D] pb-4">
          <div>
            <h2 className="font-bold text-sm text-charcoal-900 dark:text-[#F4F1E9] flex items-center gap-2">
              <Package className="w-4 h-4 text-[#B89555] dark:text-[#C9A96A]" />
              <span>Wholesale Products Directory ({filteredProducts.length} Products)</span>
            </h2>
            <p className="text-xs text-charcoal-500 dark:text-[#B8B3A8]">
              Clean product-level summary. Click &quot;Manage Wholesale Pricing&quot; on any product to configure its exact variant pricing matrix.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              placeholder="Filter products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl text-charcoal-900 dark:text-[#F4F1E9] focus:outline-none"
            />
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl text-charcoal-900 dark:text-[#F4F1E9] focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="enabled">Wholesale Enabled Only</option>
              <option value="disabled">Disabled Only</option>
            </select>
          </div>
        </div>

        {/* Clean Product Cards Grid / List */}
        <div className="grid grid-cols-1 gap-4">
          {filteredProducts.map((prod) => {
            const isEnabled = prod.isWholesaleEnabled !== false;
            const prices = prod.variants.map((v) => v.price).filter((p) => p > 0);
            const wholesalePrices = prod.variants.map((v) => v.wholesalePrice || Math.round(v.price * 0.82));
            const minRetail = prices.length > 0 ? Math.min(...prices) : 0;
            const minWholesale = wholesalePrices.length > 0 ? Math.min(...wholesalePrices) : Math.round(minRetail * 0.82);
            const maxSaving = Math.max(...prod.variants.map((v) => (v.price || 0) - (v.wholesalePrice || Math.round((v.price || 0) * 0.82))), 0);
            const maxDiscount = minRetail > 0 ? Math.round((maxSaving / minRetail) * 100) : 18;
            const totalStock = prod.variants.reduce((acc, v) => acc + (v.stock || 0), 0);
            const firstImage = prod.media?.find((m) => m.type === 'photo')?.url || '/images/hero/product 1.png';
            const catObj = categories.find((c) => c.id === prod.categoryId);

            return (
              <div
                key={prod.id}
                className="p-5 rounded-2xl bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] hover:border-[#B89555]/40 dark:hover:border-[#C9A96A]/40 transition-all duration-200 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5"
              >
                {/* Product Info Left */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative w-16 h-20 bg-white dark:bg-[#191917] rounded-xl overflow-hidden flex-shrink-0 border border-light-border dark:border-[#34322D]">
                    <Image
                      src={firstImage}
                      alt={prod.name}
                      fill
                      className="object-cover object-top"
                      sizes="80px"
                    />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white dark:bg-[#191917] text-charcoal-700 dark:text-[#B8B3A8] border border-light-border dark:border-[#34322D]">
                        {catObj?.name || 'Garment'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleToggleProductWholesale(prod, e)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                          isEnabled
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 hover:bg-rose-100'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 hover:bg-emerald-100'
                        }`}
                        title="Click to toggle wholesale availability"
                      >
                        {isEnabled ? '✓ Wholesale Enabled' : '✕ Disabled'}
                      </button>
                      <span className="text-[10px] font-semibold text-charcoal-500 dark:text-[#B8B3A8]">
                        Min: {prod.wholesaleMinQty || 12} pcs
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-charcoal-900 dark:text-[#F4F1E9] truncate">
                      {prod.name}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-charcoal-500 dark:text-[#B8B3A8] flex-wrap font-medium">
                      <span>
                        <strong className="text-charcoal-900 dark:text-[#F4F1E9]">Retail from:</strong>{' '}
                        <span className="text-[#B89555] dark:text-[#C9A96A] font-bold">Rs. {minRetail}</span>
                      </span>
                      <span>•</span>
                      <span>
                        <strong className="text-charcoal-900 dark:text-[#F4F1E9]">Wholesale from:</strong>{' '}
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">Rs. {minWholesale}</span>
                      </span>
                      <span>•</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                        Save up to Rs. {maxSaving}/pc ({maxDiscount}%)
                      </span>
                      <span>•</span>
                      <span>{prod.variants.length} Variants</span>
                      <span>•</span>
                      <span>{totalStock} in stock</span>
                    </div>
                  </div>
                </div>

                {/* Actions Right */}
                <div className="flex items-center gap-2 self-end lg:self-center flex-shrink-0">
                  <Link
                    href={`/wholesale/product/${prod.slug}`}
                    target="_blank"
                    className="p-2.5 bg-white dark:bg-[#191917] hover:bg-light-hover dark:hover:bg-[#2A2925] text-charcoal-600 dark:text-[#B8B3A8] hover:text-[#B89555] dark:hover:text-[#C9A96A] rounded-xl border border-light-border dark:border-[#34322D] transition-colors"
                    title="View live wholesale product page"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleOpenProductPricingModal(prod)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-champagne-500 hover:bg-champagne-400 text-charcoal-950 text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.99]"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Manage Wholesale Pricing</span>
                  </button>

                  <Link
                    href={`/admin/products?edit=${prod.id}&tab=variants`}
                    className="p-2.5 bg-white dark:bg-[#191917] hover:bg-light-hover dark:hover:bg-[#2A2925] text-charcoal-600 dark:text-[#B8B3A8] hover:text-charcoal-900 dark:hover:text-[#F4F1E9] rounded-xl border border-light-border dark:border-[#34322D] transition-colors"
                    title="Open Full Product Matrix Editor"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. DEDICATED PRODUCT WHOLESALE PRICING MANAGEMENT MODAL */}
      {/* ========================================================================= */}
      {selectedProductForModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in">
          <div className="bg-white dark:bg-[#191917] rounded-2xl border border-light-border dark:border-[#34322D] p-5 sm:p-6 max-w-4xl w-full space-y-5 shadow-elevation my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-light-border dark:border-[#34322D] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#B89555] dark:text-[#C9A96A] uppercase tracking-wider">
                    Wholesale Pricing Editor
                  </span>
                  <span className="text-xs text-charcoal-500 dark:text-[#B8B3A8]">
                    • {modalVariants.length} Variants
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-charcoal-900 dark:text-[#F4F1E9] mt-1">
                  {selectedProductForModal.name}
                </h3>
                <p className="text-xs text-charcoal-500 dark:text-[#B8B3A8]">
                  {selectedProductForModal.subtitle || 'Configure retail vs wholesale price breakdown.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedProductForModal(null)}
                className="p-1.5 text-charcoal-400 dark:text-[#8E8A80] hover:text-charcoal-900 dark:hover:text-[#F4F1E9] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Wholesale Options Strip */}
            <div className="p-4 bg-light-elevated dark:bg-[#22211E] rounded-xl border border-light-border dark:border-[#34322D] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalIsWholesaleEnabled}
                    onChange={(e) => setModalIsWholesaleEnabled(e.target.checked)}
                    className="w-4 h-4 accent-[#B89555] rounded"
                  />
                  <span className="text-xs font-semibold text-charcoal-900 dark:text-[#F4F1E9]">
                    Wholesale Enabled
                  </span>
                </label>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-charcoal-600 dark:text-[#B8B3A8]">Min Qty:</span>
                  <input
                    type="number"
                    min={1}
                    value={modalMinQty}
                    onChange={(e) => setModalMinQty(Number(e.target.value))}
                    className="w-16 px-2 py-1 bg-white dark:bg-[#191917] border border-light-border dark:border-[#34322D] rounded-lg text-xs font-bold text-charcoal-900 dark:text-[#F4F1E9]"
                  />
                  <span className="text-xs text-charcoal-500 dark:text-[#B8B3A8]">pcs</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleModalApplyGlobalDiscount}
                className="px-3 py-1.5 bg-white dark:bg-[#191917] hover:bg-light-hover dark:hover:bg-[#2A2925] border border-light-border dark:border-[#34322D] text-xs font-bold text-[#B89555] dark:text-[#C9A96A] rounded-lg transition-colors shadow-xs"
              >
                Apply {wholesaleSettings.defaultDiscountPercent}% Global Rate to All
              </button>
            </div>

            {/* Grouped Variant Pricing Matrix */}
            <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
              {Object.entries(groupedModalVariants).map(([groupTitle, vars]) => (
                <div
                  key={groupTitle}
                  className="rounded-xl border border-light-border dark:border-[#34322D] overflow-hidden bg-white dark:bg-[#191917]"
                >
                  <div className="px-4 py-2.5 bg-light-elevated dark:bg-[#22211E] border-b border-light-border dark:border-[#34322D] flex items-center justify-between">
                    <span className="text-xs font-bold text-[#B89555] dark:text-[#C9A96A] uppercase tracking-wider">
                      {groupTitle}
                    </span>
                    <span className="text-[11px] text-charcoal-500 dark:text-[#B8B3A8]">
                      {vars.length} Sizes
                    </span>
                  </div>

                  <table className="w-full text-xs text-left">
                    <thead className="bg-light-bg dark:bg-[#191917] text-charcoal-500 dark:text-[#B8B3A8] border-b border-light-border dark:border-[#34322D]">
                      <tr>
                        <th className="p-2.5">Size</th>
                        <th className="p-2.5">Retail Price (PKR)</th>
                        <th className="p-2.5">Wholesale Unit Price (PKR)</th>
                        <th className="p-2.5">Savings per piece</th>
                        <th className="p-2.5">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-light-border dark:divide-[#282723] text-charcoal-900 dark:text-[#F4F1E9]">
                      {vars.map((v) => {
                        const retail = Number(v.price) || 0;
                        const wholesale = v.wholesalePrice ? Number(v.wholesalePrice) : Math.round(retail * 0.82);
                        const saving = retail - wholesale;
                        const discount = retail > 0 && saving > 0 ? Math.round((saving / retail) * 1000) / 10 : 0;

                        return (
                          <tr key={v.id} className="hover:bg-light-hover/40 dark:hover:bg-[#22211E]/40">
                            <td className="p-2.5 font-bold">
                              <span className="bg-light-elevated dark:bg-[#22211E] text-charcoal-900 dark:text-[#F4F1E9] px-2 py-0.5 rounded border border-light-border dark:border-[#34322D]">
                                {v.size}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono text-[#B89555] dark:text-[#C9A96A] font-bold">
                              Rs. {retail}
                            </td>
                            <td className="p-2.5">
                              <div className="flex items-center gap-1">
                                <span className="text-charcoal-400 text-xs">Rs.</span>
                                <input
                                  type="number"
                                  value={wholesale}
                                  onChange={(e) =>
                                    handleModalVariantWholesaleChange(v.id, Number(e.target.value))
                                  }
                                  className="w-24 px-2 py-1 bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded text-xs font-bold text-emerald-700 dark:text-emerald-400 focus:outline-none focus:border-[#B89555]"
                                />
                              </div>
                            </td>
                            <td className="p-2.5">
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded text-[11px]">
                                Save Rs. {saving} ({discount}%)
                              </span>
                            </td>
                            <td className="p-2.5 text-charcoal-600 dark:text-[#B8B3A8]">
                              {v.stock} pcs
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            {/* Modal Actions Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-light-border dark:border-[#34322D] pt-4">
              <Link
                href={`/admin/products?edit=${selectedProductForModal.id}&tab=variants`}
                className="text-xs font-semibold text-[#B89555] dark:text-[#C9A96A] hover:underline inline-flex items-center gap-1"
              >
                <span>Open in Full Product Catalog Editor</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setSelectedProductForModal(null)}
                  className="px-4 py-2 bg-light-elevated dark:bg-[#22211E] text-charcoal-700 dark:text-[#B8B3A8] text-xs font-semibold rounded-xl border border-light-border dark:border-[#34322D]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveModalPricing}
                  disabled={savingModal}
                  className="px-5 py-2 bg-champagne-500 hover:bg-champagne-400 disabled:opacity-50 text-charcoal-950 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingModal ? 'Saving...' : 'Save Wholesale Pricing'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
