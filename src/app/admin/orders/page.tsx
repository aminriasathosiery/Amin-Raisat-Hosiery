'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useStore } from '@/context/StoreContext';
import { Order, OrderStatus } from '@/types';
import {
  Search,
  ShoppingCart,
  Phone,
  MapPin,
  Calendar,
  X,
  CreditCard,
  Truck,
  ExternalLink,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Eye,
  AlertTriangle,
  ZoomIn,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { WhatsAppIcon } from '@/components/common/WhatsAppIcon';
import { ConfirmModal } from '@/components/admin/ConfirmModal';
import { formatWhatsAppNumber } from '@/lib/whatsapp';

const ALL_STATUSES: OrderStatus[] = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];
const PAGE_SIZE = 20;

interface OutboxNotification {
  id: string;
  recipient_type: string;
  recipient_phone: string;
  event_type: string;
  status: string;
  attempts: number;
  max_attempts: number;
  last_error?: string | null;
  sent_at?: string | null;
  created_at: string;
}

export default function AdminOrdersPage() {
  const { products, updateOrderStatus, deleteOrder, bulkDeleteOrders } = useStore();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const [pagedOrders, setPagedOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, totalCount: 0, totalPages: 1 });
  const [serverStats, setServerStats] = useState({
    total: 0,
    pendingVerification: 0,
    pending: 0,
    confirmed: 0,
    shipped: 0,
    delivered: 0,
  });
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailNotifications, setDetailNotifications] = useState<OutboxNotification[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchOrdersPage = useCallback(async (includeStats = true) => {
    setIsOrdersLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        status: statusFilter,
        paymentStatus: paymentFilter,
      });
      if (debouncedQuery) qs.set('q', debouncedQuery);
      if (dateFrom) qs.set('dateFrom', dateFrom);
      if (dateTo) qs.set('dateTo', dateTo);
      if (includeStats) qs.set('includeStats', '1');

      const res = await fetch(`/api/admin/orders?${qs.toString()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.orders)) setPagedOrders(data.orders);
      if (data.pagination) setPagination(data.pagination);
      if (data.stats) setServerStats(data.stats);
    } catch (err) {
      console.warn('Admin orders paginated fetch notice:', err);
    } finally {
      setIsOrdersLoading(false);
    }
  }, [page, statusFilter, paymentFilter, debouncedQuery, dateFrom, dateTo]);

  useEffect(() => {
    fetchOrdersPage(true);
  }, [fetchOrdersPage]);

  const openOrderDetail = async (ord: Order) => {
    setSelectedOrder(ord);
    setDetailNotifications([]);
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/orders?orderId=${encodeURIComponent(ord.id)}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.order) setSelectedOrder(data.order);
        if (Array.isArray(data.notifications)) setDetailNotifications(data.notifications);
      }
    } catch {}
    finally {
      setIsLoadingDetail(false);
    }
  };

  const handleRetryNotification = async (jobId?: string) => {
    if (!selectedOrder) return;
    setRetryingJobId(jobId || 'all');
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobId ? { jobId } : { limit: 10 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Retry failed');
      const detailRes = await fetch(`/api/admin/orders?orderId=${encodeURIComponent(selectedOrder.id)}`, { cache: 'no-store' });
      if (detailRes.ok) {
        const detailJson = await detailRes.json();
        if (Array.isArray(detailJson.notifications)) setDetailNotifications(detailJson.notifications);
      }
      showToast(
        data.cloudApiConfigured
          ? `Processed: ${data.sent || 0} sent, ${data.failed || 0} retry scheduled.`
          : 'WhatsApp Cloud API credentials not configured on server; use manual wa.me button.'
      );
    } catch (err: any) {
      showToast(err?.message || 'Failed to retry notification');
    } finally {
      setRetryingJobId(null);
    }
  };

  // Selection & Bulk Actions State
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    orderId?: string;
    orderNumber?: string;
    count?: number;
    isBulk: boolean;
  } | null>(null);

  // Receipt Modal State
  const [receiptModalOrder, setReceiptModalOrder] = useState<Order | null>(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Status Change Confirmation Modal State
  const [statusConfirmModal, setStatusConfirmModal] = useState<{
    isOpen: boolean;
    orderId: string;
    orderNumber: string;
    newStatus: OrderStatus;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const filteredOrders = pagedOrders;
  const stats = serverStats;

  const isAllSelected = useMemo(() => {
    return filteredOrders.length > 0 && filteredOrders.every((o) => selectedOrderIds.includes(o.id));
  }, [filteredOrders, selectedOrderIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    }
  };

  const toggleSelectOrder = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedOrderIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleInitiateSingleDelete = (order: Order, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDeleteError('');
    setDeleteModal({
      isOpen: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      isBulk: false,
    });
  };

  const handleInitiateBulkDelete = () => {
    if (selectedOrderIds.length === 0) return;
    setDeleteError('');
    setDeleteModal({
      isOpen: true,
      count: selectedOrderIds.length,
      isBulk: true,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      if (deleteModal.isBulk) {
        await bulkDeleteOrders(selectedOrderIds);
        showToast(`Successfully deleted ${selectedOrderIds.length} order(s) permanently.`);
        setSelectedOrderIds([]);
      } else if (deleteModal.orderId) {
        await deleteOrder(deleteModal.orderId);
        showToast(`Order #${deleteModal.orderNumber} deleted permanently.`);
        if (selectedOrder && (selectedOrder.id === deleteModal.orderId || selectedOrder.orderNumber === deleteModal.orderNumber)) {
          setSelectedOrder(null);
        }
      }
      setDeleteModal(null);
      await fetchOrdersPage(true);
    } catch (err: any) {
      console.error('Delete order error:', err);
      setDeleteError(err?.message || 'Failed to delete order from database.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInitiateStatusChange = (orderId: string, orderNumber: string, newStatus: OrderStatus) => {
    setStatusConfirmModal({
      isOpen: true,
      orderId,
      orderNumber,
      newStatus,
    });
  };

  const handleConfirmStatusChange = async () => {
    if (!statusConfirmModal) return;
    const { orderId, newStatus } = statusConfirmModal;
    await updateOrderStatus(orderId, newStatus);
    setPagedOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    setStatusConfirmModal(null);
    showToast(`Order #${statusConfirmModal.orderNumber} status updated to ${newStatus}`);
    fetchOrdersPage(true);
  };

  // Payment Verification API call
  const handleVerifyPayment = async (orderId: string) => {
    setIsVerifyingPayment(true);
    try {
      const res = await fetch('/api/admin/orders/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          action: 'verify',
          verifiedBy: 'Admin',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to verify payment');

      showToast('Payment verified successfully! Order marked as Confirmed.');
      setReceiptModalOrder(null);
      await fetchOrdersPage(true);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, paymentStatus: 'VERIFIED', status: 'Confirmed', paymentVerifiedAt: new Date().toISOString() } : null
        );
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error verifying payment');
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  // Payment Rejection API call
  const handleRejectPayment = async (orderId: string) => {
    setIsVerifyingPayment(true);
    try {
      const res = await fetch('/api/admin/orders/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          action: 'reject',
          rejectionReason: rejectionReasonInput || 'Payment screenshot invalid or amount mismatch.',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject payment');

      showToast('Payment rejected. Customer will need to re-submit proof.');
      setReceiptModalOrder(null);
      setShowRejectForm(false);
      setRejectionReasonInput('');
      await fetchOrdersPage(true);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, paymentStatus: 'REJECTED', paymentRejectionReason: rejectionReasonInput } : null
        );
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error rejecting payment');
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  // Helper for Payment Status Badge
  const renderPaymentStatusBadge = (ord: Order) => {
    const status = ord.paymentStatus || (ord.paymentMethod === 'cod' ? 'COD_PENDING' : 'PENDING_VERIFICATION');

    if (status === 'VERIFIED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
          <CheckCircle className="w-2.5 h-2.5" />
          <span>Verified</span>
        </span>
      );
    }
    if (status === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/15 text-rose-700 border border-rose-500/30">
          <XCircle className="w-2.5 h-2.5" />
          <span>Rejected</span>
        </span>
      );
    }
    if (status === 'PENDING_VERIFICATION') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/15 text-amber-700 border border-amber-500/30 animate-pulse">
          <Clock className="w-2.5 h-2.5" />
          <span>Verify Receipt</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-charcoal-100 text-charcoal-600">
        <span>COD Pending</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl text-charcoal-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-white text-charcoal-900 border border-emerald-500/40 rounded-xl shadow-elevation flex items-center gap-2.5 text-xs font-semibold animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-light-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-charcoal-900">Orders &amp; Dispatch</h1>
            <span className="text-xs font-bold bg-light-elevated text-[#B89555] border border-light-border px-2.5 py-0.5 rounded-lg whitespace-nowrap">
              {pagination.totalCount} Total
            </span>
          </div>
          <p className="text-xs text-charcoal-500 mt-1">
            Real-time customer dispatch desk. Confirm orders, inspect &amp; verify payment screenshots (JazzCash, EasyPaisa, SadaPay, Bank Transfer), and launch direct WhatsApp messages.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-light-border shadow-sm">
          <span className="text-[10px] font-bold text-charcoal-500 uppercase tracking-wider block whitespace-nowrap">
            Pending Receipt
          </span>
          <div className="text-xl font-bold text-amber-500 mt-1">{stats.pendingVerification}</div>
          <span className="text-[10px] text-charcoal-400 mt-0.5 block whitespace-nowrap">Awaiting Verification</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-light-border shadow-sm">
          <span className="text-[10px] font-bold text-charcoal-500 uppercase tracking-wider block whitespace-nowrap">
            Pending Review
          </span>
          <div className="text-xl font-bold text-amber-600 mt-1">{stats.pending}</div>
          <span className="text-[10px] text-charcoal-400 mt-0.5 block whitespace-nowrap">Awaiting Call</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-light-border shadow-sm">
          <span className="text-[10px] font-bold text-charcoal-500 uppercase tracking-wider block whitespace-nowrap">
            In Processing
          </span>
          <div className="text-xl font-bold text-charcoal-900 mt-1">{stats.confirmed}</div>
          <span className="text-[10px] text-charcoal-400 mt-0.5 block whitespace-nowrap">Packing &amp; Ready</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-light-border shadow-sm">
          <span className="text-[10px] font-bold text-charcoal-500 uppercase tracking-wider block whitespace-nowrap">
            Shipped
          </span>
          <div className="text-xl font-bold text-blue-600 mt-1">{stats.shipped}</div>
          <span className="text-[10px] text-charcoal-400 mt-0.5 block whitespace-nowrap">With Courier</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-light-border shadow-sm">
          <span className="text-[10px] font-bold text-charcoal-500 uppercase tracking-wider block whitespace-nowrap">
            Delivered
          </span>
          <div className="text-xl font-bold text-emerald-600 mt-1">{stats.delivered}</div>
          <span className="text-[10px] text-charcoal-400 mt-0.5 block whitespace-nowrap">Successfully Paid</span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-light-border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80 relative">
          <input
            type="text"
            placeholder="Search order #, customer, phone, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs bg-light-elevated border border-light-border text-charcoal-900 placeholder-charcoal-400 rounded-xl focus:border-[#B89555] focus:outline-none"
          />
          <Search className="w-3.5 h-3.5 text-charcoal-400 absolute left-2.5 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* Date Range Filter */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            aria-label="Filter orders from date"
            className="px-2.5 py-2 text-xs bg-light-elevated border border-light-border text-charcoal-900 rounded-xl focus:border-[#B89555] focus:outline-none"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            aria-label="Filter orders to date"
            className="px-2.5 py-2 text-xs bg-light-elevated border border-light-border text-charcoal-900 rounded-xl focus:border-[#B89555] focus:outline-none"
          />

          {/* Payment Verification Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs bg-light-elevated border border-light-border text-charcoal-900 rounded-xl focus:border-[#B89555] focus:outline-none"
          >
            <option value="all">All Payments</option>
            <option value="PENDING_VERIFICATION">Needs Verification</option>
            <option value="VERIFIED">Payment Verified</option>
            <option value="REJECTED">Payment Rejected</option>
            <option value="COD_PENDING">COD Orders</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs bg-light-elevated border border-light-border text-charcoal-900 rounded-xl focus:border-[#B89555] focus:outline-none"
          >
            <option value="all">All Statuses ({stats.total})</option>
            {ALL_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {/* Bulk Delete Button */}
          {selectedOrderIds.length > 0 && (
            <button
              type="button"
              onClick={handleInitiateBulkDelete}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 animate-in fade-in"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedOrderIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Orders Container */}
      <div className="bg-white rounded-2xl border border-light-border shadow-sm overflow-hidden">
        {isOrdersLoading && filteredOrders.length === 0 ? (
          <div className="p-6 space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-light-elevated rounded-xl" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <ShoppingCart className="w-10 h-10 text-charcoal-400 mx-auto" />
            <h3 className="text-sm font-bold text-charcoal-900">No orders match your search or filter.</h3>
            <p className="text-xs text-charcoal-500">Customer orders placed on the storefront will appear here instantly.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-light-elevated text-[#B89555] uppercase font-bold text-[11px] border-b border-light-border">
                  <tr>
                    <th className="p-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-light-border accent-[#B89555] cursor-pointer"
                        aria-label="Select all orders"
                      />
                    </th>
                    <th className="p-4 w-28 whitespace-nowrap font-mono">Order #</th>
                    <th className="p-4 min-w-[200px]">Customer &amp; Phone</th>
                    <th className="p-4 w-36 whitespace-nowrap">City / Province</th>
                    <th className="p-4 min-w-[200px]">Items &amp; Total</th>
                    <th className="p-4 w-44 whitespace-nowrap">Payment &amp; Proof</th>
                    <th className="p-4 w-36 whitespace-nowrap">Order Status</th>
                    <th className="p-4 w-40 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-border font-medium text-charcoal-700">
                  {filteredOrders.map((ord) => {
                    const targetPhone = formatWhatsAppNumber(ord.customerPhone);
                    const whatsappOrderLink = `https://wa.me/${targetPhone}?text=${encodeURIComponent(
                      `Assalam-o-Alaikum ${ord.customerName}, this is Amin Raisat Hosiery regarding your Order #${ord.orderNumber}.`
                    )}`;

                    // WhatsApp Review Request Link for Delivered Orders
                    const matchingProd = ord.items?.[0]?.productId
                      ? products.find((p) => p.id === ord.items[0].productId)
                      : null;
                    const firstItemSlug = matchingProd?.slug || (ord.items?.[0]?.productName
                      ? ord.items[0].productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                      : '');
                    const productReviewUrl = firstItemSlug
                      ? `https://aminhosiery.com/product/${firstItemSlug}#reviews-section`
                      : `https://aminhosiery.com/#reviews`;
                    const reviewMsg = `Hi ${ord.customerName},\n\nThank you for shopping with Amin Raisat Hosiery.\n\nYour order #${ord.orderNumber} has been delivered.\n\nWe would love to hear your feedback.\n\nPlease share your review:\n${productReviewUrl}\n\nThank you!`;
                    const whatsappReviewLink = `https://wa.me/${targetPhone}?text=${encodeURIComponent(reviewMsg)}`;

                    const isSelected = selectedOrderIds.includes(ord.id);

                    return (
                      <tr key={ord.id} className={`hover:bg-light-hover transition-colors ${isSelected ? 'bg-[#B89555]/5' : ''}`}>
                        <td className="p-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => toggleSelectOrder(ord.id, e as any)}
                            className="rounded border-light-border accent-[#B89555] cursor-pointer"
                            aria-label={`Select order ${ord.orderNumber}`}
                          />
                        </td>
                        <td className="p-4 font-mono font-bold text-[#B89555] whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <div>
                              <span>#{ord.orderNumber}</span>
                            </div>
                            <div>
                              {ord.customerType === 'GUEST' ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-charcoal-100 text-charcoal-600">
                                  GUEST
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                  REGISTERED
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 min-w-[200px]">
                          <div className="font-bold text-charcoal-900">{ord.customerName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-charcoal-500 font-mono text-[11px] whitespace-nowrap">{ord.customerPhone}</span>
                            <a
                              href={whatsappOrderLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#25D366] hover:text-[#1EBE5D] p-0.5 inline-flex items-center"
                              title="Chat on WhatsApp"
                            >
                              <WhatsAppIcon size={14} className="fill-current" />
                            </a>
                          </div>
                        </td>
                        <td className="p-4 w-36 whitespace-nowrap text-charcoal-900">
                          <div>{ord.city}</div>
                          <span className="text-[10px] text-charcoal-500">{ord.province}</span>
                        </td>
                        <td className="p-4 min-w-[200px] text-charcoal-900">
                          <div className="font-bold text-[#B89555] text-sm whitespace-nowrap">
                            Rs. {ord.totalAmount}
                          </div>
                          <div className="text-[10px] text-charcoal-500">
                            {ord.items.reduce((s, it) => s + it.quantity, 0)} pieces
                          </div>
                        </td>
                        <td className="p-4 w-44 whitespace-nowrap space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="uppercase font-bold text-[10px] text-charcoal-700">
                              {ord.paymentMethod.replace('_', ' ')}
                            </span>
                            {renderPaymentStatusBadge(ord)}
                          </div>
                          
                          {/* Receipt View Button if screenshot uploaded */}
                          {ord.paymentScreenshotUrl ? (
                            <button
                              type="button"
                              onClick={() => setReceiptModalOrder(ord)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B89555] hover:underline"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View Receipt</span>
                            </button>
                          ) : ord.paymentMethod !== 'cod' ? (
                            <span className="text-[10px] text-charcoal-400 italic block">No receipt uploaded</span>
                          ) : null}
                        </td>
                        <td className="p-4 w-36 whitespace-nowrap">
                          <select
                            value={ord.status}
                            onChange={(e) =>
                              handleInitiateStatusChange(ord.id, ord.orderNumber, e.target.value as OrderStatus)
                            }
                            className={`px-2.5 py-1 text-xs font-bold rounded-xl border focus:outline-none ${
                              ord.status === 'Delivered'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : ord.status === 'Cancelled'
                                ? 'bg-rose-50 text-rose-700 border-rose-300'
                                : ord.status === 'Pending'
                                ? 'bg-amber-50 text-amber-700 border-amber-300'
                                : 'bg-blue-50 text-blue-700 border-blue-300'
                            }`}
                          >
                            {ALL_STATUSES.map((st) => (
                              <option key={st} value={st} className="bg-white text-charcoal-900">
                                {st}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-4 w-40 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* WhatsApp Review Request Button for Delivered Orders */}
                            {ord.status === 'Delivered' && (
                              <a
                                href={whatsappReviewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#1EBE5D] border border-[#25D366]/30 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors"
                                title="Send WhatsApp Review Request"
                              >
                                <WhatsAppIcon size={13} className="fill-current" />
                                <span>Review</span>
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => openOrderDetail(ord)}
                              className="px-2.5 py-1 bg-light-elevated hover:bg-light-hover border border-light-border text-[#B89555] hover:text-champagne-500 rounded-xl text-xs font-bold transition-colors whitespace-nowrap"
                            >
                              Details
                            </button>

                            {/* Delete Order Button */}
                            <button
                              type="button"
                              onClick={(e) => handleInitiateSingleDelete(ord, e)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/30 rounded-xl text-xs font-bold transition-colors active:scale-95"
                              title="Delete Order Permanently"
                              aria-label={`Delete order ${ord.orderNumber}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards View (md:hidden) */}
            <div className="md:hidden divide-y divide-light-border p-3 space-y-3">
              {filteredOrders.map((ord) => {
                const targetPhone = formatWhatsAppNumber(ord.customerPhone);
                const whatsappOrderLink = `https://wa.me/${targetPhone}?text=${encodeURIComponent(
                  `Assalam-o-Alaikum ${ord.customerName}, this is Amin Raisat Hosiery regarding your Order #${ord.orderNumber}.`
                )}`;

                const matchingDrawerProd = ord.items?.[0]?.productId
                  ? products.find((p) => p.id === ord.items[0].productId)
                  : null;
                const firstItemSlug = matchingDrawerProd?.slug || (ord.items?.[0]?.productName
                  ? ord.items[0].productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                  : '');
                const productReviewUrl = firstItemSlug
                  ? `https://aminhosiery.com/product/${firstItemSlug}#reviews-section`
                  : `https://aminhosiery.com/#reviews`;
                const reviewMsg = `Hi ${ord.customerName},\n\nThank you for shopping with Amin Raisat Hosiery.\n\nYour order #${ord.orderNumber} has been delivered.\n\nWe would love to hear your feedback.\n\nPlease share your review:\n${productReviewUrl}\n\nThank you!`;
                const whatsappReviewLink = `https://wa.me/${targetPhone}?text=${encodeURIComponent(reviewMsg)}`;

                return (
                  <div
                    key={ord.id}
                    className="p-4 bg-light-elevated rounded-xl border border-light-border space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-sm text-[#B89555]">
                          #{ord.orderNumber}
                        </span>
                        {ord.customerType === 'GUEST' ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-charcoal-100 text-charcoal-600">
                            GUEST
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600">
                            REG
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-sm text-charcoal-900">
                        Rs. {ord.totalAmount}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-charcoal-900">{ord.customerName}</div>
                        <div className="text-[11px] text-charcoal-500">{ord.city}, {ord.province}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={whatsappOrderLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg border border-emerald-500/30"
                          title="WhatsApp Chat"
                        >
                          <WhatsAppIcon size={14} className="fill-current" />
                        </a>
                      </div>
                    </div>

                    {/* Payment Info & Proof */}
                    <div className="flex items-center justify-between pt-1 border-t border-light-border text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold uppercase text-[10px]">{ord.paymentMethod.replace('_', ' ')}</span>
                        {renderPaymentStatusBadge(ord)}
                      </div>

                      {ord.paymentScreenshotUrl && (
                        <button
                          type="button"
                          onClick={() => setReceiptModalOrder(ord)}
                          className="text-[#B89555] font-bold flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Receipt</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-light-border">
                      <select
                        value={ord.status}
                        onChange={(e) =>
                          handleInitiateStatusChange(ord.id, ord.orderNumber, e.target.value as OrderStatus)
                        }
                        className={`flex-1 px-2.5 py-1.5 text-xs font-bold rounded-xl border focus:outline-none ${
                          ord.status === 'Delivered'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : ord.status === 'Cancelled'
                            ? 'bg-rose-50 text-rose-700 border-rose-300'
                            : ord.status === 'Pending'
                            ? 'bg-amber-50 text-amber-700 border-amber-300'
                            : 'bg-blue-50 text-blue-700 border-blue-300'
                        }`}
                      >
                        {ALL_STATUSES.map((st) => (
                          <option key={st} value={st} className="bg-white text-charcoal-900">
                            {st}
                          </option>
                        ))}
                      </select>

                      {ord.status === 'Delivered' && (
                        <a
                          href={whatsappReviewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 bg-[#25D366]/20 text-[#1EBE5D] rounded-xl text-xs font-bold flex items-center gap-1"
                          title="WhatsApp Review Request"
                        >
                          <WhatsAppIcon size={12} className="fill-current" />
                          <span>Review</span>
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => openOrderDetail(ord)}
                        className="px-3 py-1.5 bg-champagne-500 text-charcoal-950 rounded-xl text-xs font-bold shadow-xs"
                      >
                        View
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleInitiateSingleDelete(ord, e)}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/30 rounded-xl text-xs font-bold transition-colors active:scale-95"
                        title="Delete Order Permanently"
                        aria-label={`Delete order ${ord.orderNumber}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Server-Side Pagination Controls */}
        {pagination.totalCount > 0 && (
          <div className="px-4 py-3 border-t border-light-border bg-light-elevated/40 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-charcoal-600 font-medium">
              Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.totalCount} matching order{pagination.totalCount === 1 ? '' : 's'})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1 || isOrdersLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-light-hover border border-light-border text-charcoal-800 rounded-lg font-bold disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages || isOrdersLoading}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-light-hover border border-light-border text-charcoal-800 rounded-lg font-bold disabled:opacity-40 transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Receipt / Screenshot Verification Modal */}
      {receiptModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-light-border rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-elevation max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-light-border pb-3">
              <div>
                <h3 className="font-bold text-sm text-charcoal-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#B89555]" />
                  <span>Payment Receipt — Order #{receiptModalOrder.orderNumber}</span>
                </h3>
                <p className="text-[11px] text-charcoal-500">
                  Customer: {receiptModalOrder.customerName} ({receiptModalOrder.customerPhone})
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReceiptModalOrder(null);
                  setShowRejectForm(false);
                }}
                className="p-1 rounded-lg text-charcoal-400 hover:text-charcoal-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Summary Pill */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-light-elevated rounded-xl border border-light-border text-xs">
              <div>
                <span className="text-charcoal-400 block text-[10px]">Method</span>
                <span className="font-bold uppercase text-charcoal-900">
                  {receiptModalOrder.paymentMethod.replace('_', ' ')}
                </span>
              </div>
              <div>
                <span className="text-charcoal-400 block text-[10px]">Total Order</span>
                <span className="font-bold text-[#B89555]">
                  Rs. {receiptModalOrder.totalAmount}
                </span>
              </div>
              <div>
                <span className="text-charcoal-400 block text-[10px]">Status</span>
                <span className="font-bold">{renderPaymentStatusBadge(receiptModalOrder)}</span>
              </div>
            </div>

            {/* Receipt Image Display */}
            {receiptModalOrder.paymentScreenshotUrl ? (
              <div className="space-y-2">
                <div className="relative rounded-xl border border-light-border overflow-hidden bg-black/5 flex items-center justify-center max-h-[50vh]">
                  <img
                    src={receiptModalOrder.paymentScreenshotUrl}
                    alt={`Payment receipt for order #${receiptModalOrder.orderNumber}`}
                    className="max-h-[48vh] w-auto object-contain rounded-lg transition-transform hover:scale-[1.02]"
                  />
                </div>
                <div className="flex justify-end">
                  <a
                    href={receiptModalOrder.paymentScreenshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#B89555] font-bold hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open High-Res Original</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-light-elevated rounded-xl border border-light-border text-xs text-charcoal-500">
                No screenshot uploaded by customer.
              </div>
            )}

            {/* Rejection Form Input */}
            {showRejectForm && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2 animate-in fade-in">
                <label className="block text-xs font-bold text-rose-700">
                  Reason for Rejecting Payment
                </label>
                <input
                  type="text"
                  placeholder="e.g. Screenshot unreadable, amount mismatch, or fake reference..."
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-rose-300 rounded-lg text-charcoal-900 focus:outline-none"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(false)}
                    className="px-3 py-1 text-xs font-semibold text-charcoal-500 hover:text-charcoal-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isVerifyingPayment}
                    onClick={() => handleRejectPayment(receiptModalOrder.id)}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {isVerifyingPayment ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {!showRejectForm && (
              <div className="flex items-center justify-between pt-2 border-t border-light-border">
                <button
                  type="button"
                  onClick={() => setShowRejectForm(true)}
                  disabled={isVerifyingPayment}
                  className="px-4 py-2 border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  Reject Proof
                </button>

                <button
                  type="button"
                  disabled={isVerifyingPayment}
                  onClick={() => handleVerifyPayment(receiptModalOrder.id)}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{isVerifyingPayment ? 'Verifying...' : 'Verify & Confirm Order'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-light-border rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-elevation max-h-[90vh] overflow-y-auto text-charcoal-900">
            <div className="flex items-center justify-between border-b border-light-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-charcoal-900">Order #{selectedOrder.orderNumber}</h3>
                  {selectedOrder.customerType === 'GUEST' ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-charcoal-100 text-charcoal-600">
                      Guest Checkout
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">
                      Registered Customer
                    </span>
                  )}
                </div>
                <p className="text-xs text-charcoal-500">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-lg text-charcoal-400 hover:text-charcoal-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer info */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-light-elevated p-4 rounded-xl border border-light-border">
              <div>
                <span className="text-charcoal-500 block">Customer Name</span>
                <strong className="text-charcoal-900">{selectedOrder.customerName}</strong>
              </div>
              <div>
                <span className="text-charcoal-500 block">Phone Number</span>
                <strong className="text-charcoal-900">{selectedOrder.customerPhone}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-charcoal-500 block">Delivery Address</span>
                <p className="text-charcoal-900">{selectedOrder.address}, {selectedOrder.city}, {selectedOrder.province}</p>
              </div>
              {selectedOrder.orderNotes && (
                <div className="col-span-2">
                  <span className="text-charcoal-500 block">Customer Order Notes</span>
                  <p className="text-[#B89555] italic">{selectedOrder.orderNotes}</p>
                </div>
              )}
            </div>

            {/* Payment & Proof Box */}
            <div className="p-4 bg-light-elevated rounded-xl border border-light-border flex items-center justify-between text-xs">
              <div>
                <span className="text-charcoal-500 block text-[10px]">Payment Method</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <strong className="uppercase font-bold">{selectedOrder.paymentMethod.replace('_', ' ')}</strong>
                  {renderPaymentStatusBadge(selectedOrder)}
                </div>
                {selectedOrder.paymentRejectionReason && (
                  <p className="text-rose-500 text-[11px] mt-1">Rejection reason: {selectedOrder.paymentRejectionReason}</p>
                )}
              </div>

              {selectedOrder.paymentScreenshotUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setReceiptModalOrder(selectedOrder);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#B89555]/10 hover:bg-[#B89555]/20 text-[#B89555] rounded-lg font-bold transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Receipt</span>
                </button>
              )}
            </div>

            {/* Items */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-charcoal-700 uppercase">Ordered Items</h4>
              <div className="divide-y divide-light-border border border-light-border rounded-xl overflow-hidden">
                {selectedOrder.items.map((it) => (
                  <div key={it.id} className="p-3 flex items-center justify-between text-xs bg-white">
                    <div>
                      <div className="font-bold text-charcoal-900">{it.productName}</div>
                      <div className="text-[11px] text-charcoal-500">
                        {it.color ? `${it.color} • ` : ''}{it.quality} • {it.sleeve} • Size {it.size}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#B89555]">
                        {it.quantity} x Rs. {it.unitPrice} = Rs. {it.totalPrice}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-light-elevated p-4 rounded-xl space-y-1.5 text-xs text-charcoal-700">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-charcoal-900 font-semibold">Rs. {selectedOrder.subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>{selectedOrder.deliveryFee === 0 ? 'FREE DELIVERY' : `Rs. ${selectedOrder.deliveryFee}`}</span>
              </div>
              <div className="border-t border-light-border pt-2 flex justify-between text-sm font-extrabold text-[#B89555]">
                <span>Total Amount</span>
                <span>Rs. {selectedOrder.totalAmount}</span>
              </div>
            </div>

            {/* WhatsApp Background Outbox Status & Retry */}
            <div className="p-4 bg-light-elevated rounded-xl border border-light-border space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-charcoal-900 flex items-center gap-1.5">
                  <WhatsAppIcon size={14} className="text-[#25D366] fill-current" />
                  <span>WhatsApp Outbox Queue</span>
                </span>
                <button
                  type="button"
                  disabled={retryingJobId !== null}
                  onClick={() => handleRetryNotification()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-light-hover border border-light-border text-charcoal-800 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${retryingJobId === 'all' ? 'animate-spin' : ''}`} />
                  <span>Process Pending</span>
                </button>
              </div>
              {isLoadingDetail ? (
                <p className="text-[11px] text-charcoal-500">Loading order details &amp; notification status...</p>
              ) : detailNotifications.length === 0 ? (
                <p className="text-[11px] text-charcoal-500">No queued Cloud API jobs recorded for this order.</p>
              ) : (
                <div className="space-y-1.5">
                  {detailNotifications.map((job) => (
                    <div key={job.id} className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-light-border text-[11px]">
                      <div>
                        <span className="font-bold uppercase text-charcoal-900">{job.recipient_type}</span>{' '}
                        <span className="text-charcoal-500">({job.event_type})</span>
                        {job.last_error && (
                          <p className="text-[10px] text-rose-600 line-clamp-1">{job.last_error}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                          job.status === 'sent'
                            ? 'bg-emerald-100 text-emerald-700'
                            : job.status === 'failed'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {job.status} ({job.attempts}/{job.max_attempts})
                        </span>
                        {job.status !== 'sent' && (
                          <button
                            type="button"
                            disabled={retryingJobId !== null}
                            onClick={() => handleRetryNotification(job.id)}
                            className="px-2 py-0.5 bg-[#23384D] text-white rounded text-[10px] font-bold hover:bg-[#182B3D] disabled:opacity-50"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-light-border">
              <button
                type="button"
                onClick={(e) => handleInitiateSingleDelete(selectedOrder, e)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 border border-rose-500/30 rounded-xl text-xs font-bold transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Order Permanently</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 bg-light-elevated hover:bg-light-hover border border-light-border text-charcoal-800 rounded-xl text-xs font-bold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Danger Deletion Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-rose-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-elevation text-charcoal-900">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/30">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-charcoal-900">
                  {deleteModal.isBulk
                    ? `Delete ${deleteModal.count} Selected Orders Permanently?`
                    : `Delete Order #${deleteModal.orderNumber} Permanently?`}
                </h3>
                <span className="text-[11px] text-rose-600 font-semibold block mt-0.5">
                  Destructive Action • Cannot be Undone
                </span>
              </div>
            </div>

            <p className="text-xs text-charcoal-600 leading-relaxed">
              This action will permanently remove the order record, line items, and associated payment proof receipt from Supabase. Customer accounts and unrelated store data will not be affected.
            </p>

            {deleteError && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-700 text-xs font-semibold">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-light-border">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 bg-light-elevated hover:bg-light-hover border border-light-border text-charcoal-700 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {statusConfirmModal && (
        <ConfirmModal
          isOpen={statusConfirmModal.isOpen}
          title={`Update Order #${statusConfirmModal.orderNumber}`}
          message={`Are you sure you want to change the status of this order to "${statusConfirmModal.newStatus}"?`}
          confirmLabel="Confirm Status"
          onConfirm={handleConfirmStatusChange}
          onCancel={() => setStatusConfirmModal(null)}
        />
      )}
    </div>
  );
}
