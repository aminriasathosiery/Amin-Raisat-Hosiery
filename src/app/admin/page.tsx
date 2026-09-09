'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useStore } from '@/context/StoreContext';
import {
  ShoppingCart,
  Clock,
  CheckCircle2,
  Banknote,
  Package,
  AlertTriangle,
  ArrowRight,
  Plus,
  Boxes,
  MessageSquare,
  Star,
  ExternalLink,
  Truck,
} from 'lucide-react';
import { WhatsAppIcon } from '@/components/common/WhatsAppIcon';

export default function AdminDashboardPage() {
  const { orders, products, reviews, settings, loadOrders, isLoading } = useStore();

  useEffect(() => {
    loadOrders();
  }, []);

  const lowStockThreshold = 10;

  // Real-time calculations from Supabase data
  const totalOrders = orders.length;
  const wholesaleOrders = orders.filter((o) => o.isWholesale);
  const retailOrders = orders.filter((o) => !o.isWholesale);

  const pendingOrders = orders.filter((o) => o.status === 'Pending').length;
  const processingOrders = orders.filter(
    (o) => o.status === 'Confirmed' || o.status === 'Processing' || o.status === 'Packed' || o.status === 'Shipped'
  ).length;
  const deliveredOrders = orders.filter((o) => o.status === 'Delivered').length;

  const totalSales = orders.reduce(
    (sum, o) => sum + (o.status !== 'Cancelled' && o.status !== 'Returned' ? o.totalAmount : 0),
    0
  );
  const wholesaleSales = wholesaleOrders.reduce(
    (sum, o) => sum + (o.status !== 'Cancelled' && o.status !== 'Returned' ? o.totalAmount : 0),
    0
  );

  const allVariants = products.flatMap((p) => p.variants || []);
  const totalStockUnits = allVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
  const lowStockVariants = allVariants.filter((v) => v.stock > 0 && v.stock <= lowStockThreshold);
  const outOfStockVariants = allVariants.filter((v) => v.stock === 0);
  const totalProducts = products.length;

  const recentOrders = orders.slice(0, 5);
  const latestReviews = reviews.slice(0, 4);

  // Identify low stock products for the warning section
  const lowStockProductsList = products
    .map((p) => {
      const lowVars = (p.variants || []).filter((v) => v.stock <= lowStockThreshold);
      const totalPStock = (p.variants || []).reduce((s, v) => s + (v.stock || 0), 0);
      return { product: p, lowVars, totalPStock };
    })
    .filter((item) => item.lowVars.length > 0)
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse max-w-7xl">
        <div className="h-24 bg-white dark:bg-[#17191D] rounded-2xl border border-light-border dark:border-[#30343A]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white dark:bg-[#17191D] rounded-2xl border border-light-border dark:border-[#30343A]" />
          ))}
        </div>
        <div className="h-64 bg-white dark:bg-[#17191D] rounded-2xl border border-light-border dark:border-[#30343A]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-charcoal-900 dark:text-[#F1F0EC] max-w-7xl">
      {/* Top Welcome Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#17191D] p-6 rounded-2xl border border-light-border dark:border-[#30343A] shadow-sm dark:shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-charcoal-900 dark:text-[#F1F0EC]">Store Overview &amp; Live Telemetry</h1>
            <span className="bg-emerald-100 dark:bg-[#3FB982]/15 text-emerald-700 dark:text-[#3FB982] border border-emerald-300 dark:border-[#3FB982]/30 text-[10px] font-bold px-2 py-0.5 rounded-md">
              Live Supabase Data
            </span>
          </div>
          <p className="text-xs text-charcoal-500 dark:text-[#85888E] mt-1">
            Real-time business performance, wholesale vs retail revenue, order fulfillment, and live inventory.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/admin/wholesale"
            className="inline-flex items-center gap-1.5 bg-white dark:bg-[#191917] hover:bg-light-hover dark:hover:bg-[#22211E] border border-light-border dark:border-[#34322D] text-charcoal-900 dark:text-[#F4F1E9] text-xs font-bold py-2.5 px-4 rounded-xl transition-colors shadow-2xs"
          >
            <Package className="w-4 h-4 text-[#B89555] dark:text-[#C9A96A]" />
            <span>Wholesale Pricing</span>
          </Link>
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-1.5 bg-champagne-500 hover:bg-champagne-400 text-black text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all active:scale-[0.99]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Product</span>
          </Link>
          <Link
            href="/admin/stock"
            className="inline-flex items-center gap-1.5 bg-light-elevated dark:bg-[#202329] hover:bg-light-hover dark:hover:bg-[#272A2F] border border-light-border dark:border-[#30343A] text-charcoal-900 dark:text-[#F1F0EC] text-xs font-semibold py-2.5 px-4 rounded-xl transition-colors"
          >
            <Boxes className="w-4 h-4 text-[#A07D38] dark:text-[#C9A96A]" />
            <span>Manage Stock</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Revenue */}
        <div className="bg-white dark:bg-[#17191D] p-5 rounded-2xl border border-light-border dark:border-[#30343A] shadow-sm dark:shadow-card flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-charcoal-500 dark:text-[#85888E] uppercase tracking-wider">Gross Revenue</span>
            <div className="text-2xl font-bold text-[#A07D38] dark:text-[#C9A96A] mt-1">
              Rs. {totalSales.toLocaleString()}
            </div>
            <span className="text-[11px] text-charcoal-400 dark:text-[#85888E] mt-1 block">
              Wholesale: Rs. {wholesaleSales.toLocaleString()}
            </span>
          </div>
          <div className="p-3 bg-light-elevated dark:bg-[#1D2025] border border-light-border dark:border-[#30343A] text-emerald-600 dark:text-[#3FB982] rounded-xl">
            <Banknote className="w-5 h-5" />
          </div>
        </div>

        {/* 2. Total Orders */}
        <div className="bg-white dark:bg-[#17191D] p-5 rounded-2xl border border-light-border dark:border-[#30343A] shadow-sm dark:shadow-card flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-charcoal-500 dark:text-[#85888E] uppercase tracking-wider">Total Customer Orders</span>
            <div className="text-2xl font-bold text-charcoal-900 dark:text-[#F1F0EC] mt-1">{totalOrders}</div>
            <div className="flex items-center gap-2 text-[11px] text-charcoal-500 dark:text-[#85888E] mt-1">
              <span className="text-[#A07D38] dark:text-[#C9A96A] font-semibold">{wholesaleOrders.length} wholesale</span>
              <span>•</span>
              <span className="text-emerald-700 dark:text-[#3FB982]">{deliveredOrders} delivered</span>
            </div>
          </div>
          <div className="p-3 bg-light-elevated dark:bg-[#1D2025] border border-light-border dark:border-[#30343A] text-[#A07D38] dark:text-[#C9A96A] rounded-xl">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>

        {/* 3. Units in Stock */}
        <div className="bg-white dark:bg-[#17191D] p-5 rounded-2xl border border-light-border dark:border-[#30343A] shadow-sm dark:shadow-card flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-charcoal-500 dark:text-[#85888E] uppercase tracking-wider">Total Units in Stock</span>
            <div className="text-2xl font-bold text-emerald-700 dark:text-[#3FB982] mt-1">
              {totalStockUnits.toLocaleString()} pcs
            </div>
            <span className="text-[11px] text-charcoal-400 dark:text-[#85888E] mt-1 block">
              Across {allVariants.length} variant sizes
            </span>
          </div>
          <div className="p-3 bg-light-elevated dark:bg-[#1D2025] border border-light-border dark:border-[#30343A] text-emerald-600 dark:text-[#3FB982] rounded-xl">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        {/* 4. Low & Out of Stock */}
        <div className="bg-white dark:bg-[#17191D] p-5 rounded-2xl border border-light-border dark:border-[#30343A] shadow-sm dark:shadow-card flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-charcoal-500 dark:text-[#85888E] uppercase tracking-wider">Inventory Alerts</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-bold ${lowStockVariants.length > 0 ? 'text-amber-600 dark:text-[#D6A84F]' : 'text-emerald-700 dark:text-[#3FB982]'}`}>
                {lowStockVariants.length}
              </span>
              <span className="text-xs text-charcoal-500 dark:text-[#85888E]">low stock</span>
              {outOfStockVariants.length > 0 && (
                <span className="text-xs text-rose-600 dark:text-[#D96B6B] font-bold">({outOfStockVariants.length} out)</span>
              )}
            </div>
            <span className="text-[11px] text-charcoal-400 dark:text-[#85888E] mt-1 block">Items &le; {lowStockThreshold} units</span>
          </div>
          <div className="p-3 bg-light-elevated dark:bg-[#1D2025] border border-light-border dark:border-[#30343A] text-amber-600 dark:text-[#D6A84F] rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Secondary Status Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-[#17191D] p-3.5 rounded-xl border border-light-border dark:border-[#30343A] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-charcoal-500 dark:text-[#85888E] font-semibold uppercase">Pending Dispatch</span>
            <div className="text-lg font-bold text-amber-600 dark:text-[#D6A84F]">{pendingOrders}</div>
          </div>
          <Clock className="w-4 h-4 text-amber-600 dark:text-[#D6A84F]" />
        </div>

        <div className="bg-white dark:bg-[#17191D] p-3.5 rounded-xl border border-light-border dark:border-[#30343A] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-charcoal-500 dark:text-[#85888E] font-semibold uppercase">Processing / In Transit</span>
            <div className="text-lg font-bold text-charcoal-900 dark:text-[#F1F0EC]">{processingOrders}</div>
          </div>
          <Truck className="w-4 h-4 text-[#A07D38] dark:text-[#C9A96A]" />
        </div>

        <div className="bg-white dark:bg-[#17191D] p-3.5 rounded-xl border border-light-border dark:border-[#30343A] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-charcoal-500 dark:text-[#85888E] font-semibold uppercase">Delivered Orders</span>
            <div className="text-lg font-bold text-emerald-700 dark:text-[#3FB982]">{deliveredOrders}</div>
          </div>
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#3FB982]" />
        </div>

        <div className="bg-white dark:bg-[#17191D] p-3.5 rounded-xl border border-light-border dark:border-[#30343A] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-charcoal-500 dark:text-[#85888E] font-semibold uppercase">Live Catalog Garments</span>
            <div className="text-lg font-bold text-charcoal-900 dark:text-[#F1F0EC]">{totalProducts}</div>
          </div>
          <Package className="w-4 h-4 text-[#A07D38] dark:text-[#C9A96A]" />
        </div>
      </div>

      {/* Main Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Recent Orders */}
        <div className="lg:col-span-7 bg-white dark:bg-[#17191D] rounded-2xl p-5 sm:p-6 border border-light-border dark:border-[#30343A] shadow-sm dark:shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-light-border dark:border-[#30343A] pb-3">
            <div>
              <h2 className="text-base font-bold text-charcoal-900 dark:text-[#F1F0EC]">Recent Customer Orders</h2>
              <p className="text-xs text-charcoal-500 dark:text-[#85888E]">Latest orders received from website checkout</p>
            </div>
            <Link
              href="/admin/orders"
              className="text-xs font-bold text-[#A07D38] dark:text-[#C9A96A] hover:text-[#D8BD88] flex items-center gap-1 transition-colors"
            >
              <span>View All ({totalOrders})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-12 space-y-2 bg-light-elevated dark:bg-[#1D2025] rounded-xl border border-light-border dark:border-[#30343A]">
              <ShoppingCart className="w-8 h-8 text-charcoal-400 dark:text-[#85888E] mx-auto" />
              <p className="text-xs font-bold text-charcoal-900 dark:text-[#F1F0EC]">No orders placed yet.</p>
              <p className="text-[11px] text-charcoal-500 dark:text-[#85888E]">
                When customers place an order through the website, it will appear here instantly.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-light-elevated dark:bg-[#1D2025] text-[#A07D38] dark:text-[#C9A96A] uppercase font-bold text-[10px] border-b border-light-border dark:border-[#30343A]">
                  <tr>
                    <th className="p-3">Order #</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Items</th>
                    <th className="p-3">Total</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-border dark:divide-[#272A2F] font-medium text-charcoal-700 dark:text-[#B4B5BA]">
                  {recentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-light-hover dark:hover:bg-[#1D2025]/60 transition-colors">
                      <td className="p-3 font-mono font-bold text-[#A07D38] dark:text-[#C9A96A]">
                        <div className="flex items-center gap-1">
                          <span>#{ord.orderNumber}</span>
                          {ord.isWholesale && (
                            <span className="text-[8px] font-extrabold bg-[#C9A96A] text-black px-1 py-0.2 rounded uppercase">
                              Bulk
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-charcoal-900 dark:text-[#F1F0EC]">{ord.customerName}</div>
                        <span className="text-[10px] text-charcoal-500 dark:text-[#85888E]">{ord.city}</span>
                      </td>
                      <td className="p-3 text-charcoal-900 dark:text-[#F1F0EC]">
                        {ord.items.reduce((s, it) => s + it.quantity, 0)} pcs
                      </td>
                      <td className="p-3 font-bold text-[#A07D38] dark:text-[#C9A96A]">Rs. {ord.totalAmount}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            ord.status === 'Delivered'
                              ? 'bg-emerald-100 dark:bg-[#3FB982]/15 text-emerald-700 dark:text-[#3FB982] border border-emerald-300 dark:border-[#3FB982]/30'
                              : ord.status === 'Pending'
                              ? 'bg-amber-100 dark:bg-[#D6A84F]/15 text-amber-700 dark:text-[#D6A84F] border border-amber-300 dark:border-[#D6A84F]/30'
                              : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800/60'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Link
                          href="/admin/orders"
                          className="text-xs font-bold text-[#A07D38] dark:text-[#C9A96A] hover:underline"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Low Stock Alerts & Recent Reviews */}
        <div className="lg:col-span-5 space-y-6">
          {/* Low Stock Warning Box */}
          <div className="bg-white dark:bg-[#17191D] rounded-2xl p-5 sm:p-6 border border-light-border dark:border-[#30343A] shadow-sm dark:shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-light-border dark:border-[#30343A] pb-3">
              <div>
                <h3 className="text-sm font-bold text-charcoal-900 dark:text-[#F1F0EC] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-[#D6A84F]" />
                  <span>Low Stock Warning</span>
                </h3>
                <p className="text-xs text-charcoal-500 dark:text-[#85888E]">Garments requiring replenishment</p>
              </div>
              <Link
                href="/admin/stock"
                className="text-xs font-bold text-[#A07D38] dark:text-[#C9A96A] hover:underline"
              >
                Stock Matrix
              </Link>
            </div>

            {lowStockProductsList.length === 0 ? (
              <div className="p-4 bg-light-elevated dark:bg-[#1D2025] rounded-xl border border-light-border dark:border-[#30343A] text-center text-xs text-emerald-700 dark:text-[#3FB982] font-semibold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>All garment variants are well stocked!</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {lowStockProductsList.map(({ product, lowVars, totalPStock }) => (
                  <div
                    key={product.id}
                    className="p-3 bg-light-elevated dark:bg-[#1D2025] rounded-xl border border-light-border dark:border-[#30343A] flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <h4 className="font-bold text-charcoal-900 dark:text-[#F1F0EC] truncate max-w-[200px]">{product.name}</h4>
                      <p className="text-[11px] text-charcoal-500 dark:text-[#85888E]">
                        {lowVars.length} variant(s) low &bull; Total: {totalPStock} pcs
                      </p>
                    </div>
                    <Link
                      href="/admin/stock"
                      className="px-2.5 py-1 bg-white dark:bg-[#202329] hover:bg-light-hover dark:hover:bg-[#272A2F] border border-light-border dark:border-[#30343A] text-[#A07D38] dark:text-[#C9A96A] rounded-lg font-bold text-[11px]"
                    >
                      Update
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Reviews Moderation Preview */}
          <div className="bg-white dark:bg-[#17191D] rounded-2xl p-5 sm:p-6 border border-light-border dark:border-[#30343A] shadow-sm dark:shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-light-border dark:border-[#30343A] pb-3">
              <div>
                <h3 className="text-sm font-bold text-charcoal-900 dark:text-[#F1F0EC] flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#A07D38] dark:text-[#C9A96A]" />
                  <span>Customer Reviews</span>
                </h3>
                <p className="text-xs text-charcoal-500 dark:text-[#85888E]">Latest submitted feedback</p>
              </div>
              <Link
                href="/admin/reviews"
                className="text-xs font-bold text-[#A07D38] dark:text-[#C9A96A] hover:underline"
              >
                Moderate ({reviews.length})
              </Link>
            </div>

            {latestReviews.length === 0 ? (
              <p className="text-xs text-charcoal-500 dark:text-[#85888E] text-center py-4">No reviews submitted yet.</p>
            ) : (
              <div className="space-y-2.5">
                {latestReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3 bg-light-elevated dark:bg-[#1D2025] rounded-xl border border-light-border dark:border-[#30343A] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-charcoal-900 dark:text-[#F1F0EC]">{rev.customerName}</span>
                      <div className="flex text-[#A07D38] dark:text-[#C9A96A]">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-2.5 h-2.5 ${s <= rev.rating ? 'fill-current' : 'text-charcoal-300 dark:text-[#30343A]'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-[11px] text-charcoal-600 dark:text-[#B4B5BA] line-clamp-1 italic">&quot;{rev.comment}&quot;</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
