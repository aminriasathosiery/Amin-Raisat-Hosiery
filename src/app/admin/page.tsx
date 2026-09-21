'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
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
  Truck,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { orders, products, reviews, loadOrders, isLoading } = useStore();

  useEffect(() => {
    loadOrders();
  }, []);

  const lowStockThreshold = 10;

  // Real-time calculations from Supabase data
  const totalOrders = orders.length;

  const pendingOrders = orders.filter((o) => o.status === 'Pending').length;
  const processingOrders = orders.filter(
    (o) => o.status === 'Confirmed' || o.status === 'Processing' || o.status === 'Packed' || o.status === 'Shipped'
  ).length;
  const deliveredOrders = orders.filter((o) => o.status === 'Delivered').length;

  const totalSales = orders.reduce(
    (sum, o) => sum + (o.status !== 'Cancelled' && o.status !== 'Returned' ? o.totalAmount : 0),
    0
  );
  const deliveredSales = orders
    .filter((o) => o.status === 'Delivered')
    .reduce((sum, o) => sum + o.totalAmount, 0);

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
        <div className="h-24 bg-white rounded-2xl border border-[#D8D0C3]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-[#D8D0C3]" />
          ))}
        </div>
        <div className="h-64 bg-white rounded-2xl border border-[#D8D0C3]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#1D2730] max-w-7xl">
      {/* Top Welcome Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#D8D0C3] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#1D2730]">Store Overview &amp; Live Telemetry</h1>
            <span className="bg-[#2F7D5A]/10 text-[#2F7D5A] border border-[#2F7D5A]/30 text-[10px] font-bold px-2 py-0.5 rounded-md">
              Live Supabase Data
            </span>
          </div>
          <p className="text-xs text-[#66717C] mt-1">
            Real-time business performance, sales revenue, order fulfillment, and live inventory.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-1.5 bg-[#23384D] hover:bg-[#182B3D] text-[#F7F3EA] text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition-colors active:scale-[0.99]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Product</span>
          </Link>
          <Link
            href="/admin/stock"
            className="inline-flex items-center gap-1.5 bg-[#EEE8DC]/50 hover:bg-[#EEE8DC] border border-[#D8D0C3] text-[#1D2730] text-xs font-semibold py-2.5 px-4 rounded-xl transition-colors"
          >
            <Boxes className="w-4 h-4 text-[#C99A3D]" />
            <span>Manage Stock</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-[#D8D0C3] shadow-sm flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#66717C] uppercase tracking-wider">Gross Revenue</span>
            <div className="text-2xl font-bold text-[#C99A3D] mt-1">
              Rs. {totalSales.toLocaleString()}
            </div>
            <span className="text-[11px] text-[#66717C] mt-1 block">
              Delivered: Rs. {deliveredSales.toLocaleString()}
            </span>
          </div>
          <div className="p-3 bg-[#EEE8DC]/50 border border-[#D8D0C3] text-[#2F7D5A] rounded-xl">
            <Banknote className="w-5 h-5" />
          </div>
        </div>

        {/* 2. Total Orders */}
        <div className="bg-white p-5 rounded-2xl border border-[#D8D0C3] shadow-sm flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#66717C] uppercase tracking-wider">Total Customer Orders</span>
            <div className="text-2xl font-bold text-[#1D2730] mt-1">{totalOrders}</div>
            <div className="flex items-center gap-2 text-[11px] text-[#66717C] mt-1">
              <span className="text-[#C99A3D] font-semibold">{pendingOrders} pending</span>
              <span>•</span>
              <span className="text-[#2F7D5A]">{deliveredOrders} delivered</span>
            </div>
          </div>
          <div className="p-3 bg-[#EEE8DC]/50 border border-[#D8D0C3] text-[#C99A3D] rounded-xl">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>

        {/* 3. Units in Stock */}
        <div className="bg-white p-5 rounded-2xl border border-[#D8D0C3] shadow-sm flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#66717C] uppercase tracking-wider">Total Units in Stock</span>
            <div className="text-2xl font-bold text-[#2F7D5A] mt-1">
              {totalStockUnits.toLocaleString()} pcs
            </div>
            <span className="text-[11px] text-[#66717C] mt-1 block">
              Across {allVariants.length} variant sizes
            </span>
          </div>
          <div className="p-3 bg-[#EEE8DC]/50 border border-[#D8D0C3] text-[#2F7D5A] rounded-xl">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        {/* 4. Low & Out of Stock */}
        <div className="bg-white p-5 rounded-2xl border border-[#D8D0C3] shadow-sm flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#66717C] uppercase tracking-wider">Inventory Alerts</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-bold ${lowStockVariants.length > 0 ? 'text-[#C99A3D]' : 'text-[#2F7D5A]'}`}>
                {lowStockVariants.length}
              </span>
              <span className="text-xs text-[#66717C]">low stock</span>
              {outOfStockVariants.length > 0 && (
                <span className="text-xs text-[#B8423A] font-bold">({outOfStockVariants.length} out)</span>
              )}
            </div>
            <span className="text-[11px] text-[#66717C] mt-1 block">Items &le; {lowStockThreshold} units</span>
          </div>
          <div className="p-3 bg-[#EEE8DC]/50 border border-[#D8D0C3] text-[#C99A3D] rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Secondary Status Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-3.5 rounded-xl border border-[#D8D0C3] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#66717C] font-semibold uppercase">Pending Dispatch</span>
            <div className="text-lg font-bold text-[#C99A3D]">{pendingOrders}</div>
          </div>
          <Clock className="w-4 h-4 text-[#C99A3D]" />
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#D8D0C3] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#66717C] font-semibold uppercase">Processing / In Transit</span>
            <div className="text-lg font-bold text-[#1D2730]">{processingOrders}</div>
          </div>
          <Truck className="w-4 h-4 text-[#C99A3D]" />
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#D8D0C3] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#66717C] font-semibold uppercase">Delivered Orders</span>
            <div className="text-lg font-bold text-[#2F7D5A]">{deliveredOrders}</div>
          </div>
          <CheckCircle2 className="w-4 h-4 text-[#2F7D5A]" />
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#D8D0C3] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#66717C] font-semibold uppercase">Live Catalog Garments</span>
            <div className="text-lg font-bold text-[#1D2730]">{totalProducts}</div>
          </div>
          <Package className="w-4 h-4 text-[#C99A3D]" />
        </div>
      </div>

      {/* Main Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Recent Orders */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-[#D8D0C3] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#D8D0C3] pb-3">
            <div>
              <h2 className="text-base font-bold text-[#1D2730]">Recent Customer Orders</h2>
              <p className="text-xs text-[#66717C]">Latest orders received from website checkout</p>
            </div>
            <Link
              href="/admin/orders"
              className="text-xs font-bold text-[#C99A3D] hover:underline flex items-center gap-1 transition-colors"
            >
              <span>View All ({totalOrders})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-12 space-y-2 bg-[#EEE8DC]/40 rounded-xl border border-[#D8D0C3]">
              <ShoppingCart className="w-8 h-8 text-[#66717C] mx-auto" />
              <p className="text-xs font-bold text-[#1D2730]">No orders placed yet.</p>
              <p className="text-[11px] text-[#66717C]">
                When customers place an order through the website, it will appear here instantly.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#EEE8DC]/50 text-[#C99A3D] uppercase font-bold text-[10px] border-b border-[#D8D0C3]">
                  <tr>
                    <th className="p-3">Order #</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Items</th>
                    <th className="p-3">Total</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8D0C3] font-medium text-[#1D2730]">
                  {recentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-[#EEE8DC]/30 transition-colors">
                      <td className="p-3 font-mono font-bold text-[#C99A3D]">
                        <span>#{ord.orderNumber}</span>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-[#1D2730]">{ord.customerName}</div>
                        <span className="text-[10px] text-[#66717C]">{ord.city}</span>
                      </td>
                      <td className="p-3 text-[#1D2730]">
                        {ord.items.reduce((s, it) => s + it.quantity, 0)} pcs
                      </td>
                      <td className="p-3 font-bold text-[#C99A3D]">Rs. {ord.totalAmount}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            ord.status === 'Delivered'
                              ? 'bg-[#2F7D5A]/10 text-[#2F7D5A] border border-[#2F7D5A]/30'
                              : ord.status === 'Pending'
                              ? 'bg-[#C99A3D]/10 text-[#C99A3D] border border-[#C99A3D]/30'
                              : 'bg-[#23384D]/10 text-[#23384D] border border-[#23384D]/30'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Link
                          href="/admin/orders"
                          className="text-xs font-bold text-[#C99A3D] hover:underline"
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
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#D8D0C3] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#D8D0C3] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1D2730] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#C99A3D]" />
                  <span>Low Stock Warning</span>
                </h3>
                <p className="text-xs text-[#66717C]">Garments requiring replenishment</p>
              </div>
              <Link
                href="/admin/stock"
                className="text-xs font-bold text-[#C99A3D] hover:underline"
              >
                Stock Matrix
              </Link>
            </div>

            {lowStockProductsList.length === 0 ? (
              <div className="p-4 bg-[#EEE8DC]/40 rounded-xl border border-[#D8D0C3] text-center text-xs text-[#2F7D5A] font-semibold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>All garment variants are well stocked!</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {lowStockProductsList.map(({ product, lowVars, totalPStock }) => (
                  <div
                    key={product.id}
                    className="p-3 bg-[#EEE8DC]/40 rounded-xl border border-[#D8D0C3] flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <h4 className="font-bold text-[#1D2730] truncate max-w-[200px]">{product.name}</h4>
                      <p className="text-[11px] text-[#66717C]">
                        {lowVars.length} variant(s) low &bull; Total: {totalPStock} pcs
                      </p>
                    </div>
                    <Link
                      href="/admin/stock"
                      className="px-2.5 py-1 bg-white hover:bg-[#EEE8DC] border border-[#D8D0C3] text-[#C99A3D] rounded-lg font-bold text-[11px]"
                    >
                      Update
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Reviews Moderation Preview */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#D8D0C3] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#D8D0C3] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1D2730] flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#C99A3D]" />
                  <span>Customer Reviews</span>
                </h3>
                <p className="text-xs text-[#66717C]">Latest submitted feedback</p>
              </div>
              <Link
                href="/admin/reviews"
                className="text-xs font-bold text-[#C99A3D] hover:underline"
              >
                Moderate ({reviews.length})
              </Link>
            </div>

            {latestReviews.length === 0 ? (
              <p className="text-xs text-[#66717C] text-center py-4">No reviews submitted yet.</p>
            ) : (
              <div className="space-y-2.5">
                {latestReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3 bg-[#EEE8DC]/40 rounded-xl border border-[#D8D0C3] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1D2730]">{rev.customerName}</span>
                      <div className="flex text-[#C99A3D]">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-2.5 h-2.5 ${s <= rev.rating ? 'fill-current' : 'text-[#D8D0C3]'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-[11px] text-[#66717C] line-clamp-1 italic">&quot;{rev.comment}&quot;</p>
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
