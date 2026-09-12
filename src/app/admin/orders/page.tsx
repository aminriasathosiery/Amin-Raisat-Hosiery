'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Eye,
  AlertTriangle,
  ZoomIn,
  Trash2,
} from 'lucide-react';
import { WhatsAppIcon } from '@/components/common/WhatsAppIcon';
import { ConfirmModal } from '@/components/admin/ConfirmModal';
import { formatWhatsAppNumber } from '@/lib/whatsapp';

const ALL_STATUSES: OrderStatus[] = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];

export default function AdminOrdersPage() {
  const { orders, products, updateOrderStatus, deleteOrder, bulkDeleteOrders, refreshData, loadOrders, isLoading } = useStore();

  useEffect(() => {
    loadOrders();
  }, []);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

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

  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      if (statusFilter !== 'all' && ord.status !== statusFilter) return false;
      if (paymentFilter !== 'all') {
        const pStatus = ord.paymentStatus || (ord.paymentMethod === 'cod' ? 'COD_PENDING' : 'PENDING_VERIFICATION');
        if (pStatus !== paymentFilter) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNumber = ord.orderNumber.toLowerCase().includes(q);
        const matchesName = ord.customerName.toLowerCase().includes(q);
        const matchesPhone = ord.customerPhone.toLowerCase().includes(q);
        const matchesCity = ord.city.toLowerCase().includes(q);
        return matchesNumber || matchesName || matchesPhone || matchesCity;
      }
      return true;
    });
  }, [orders, statusFilter, paymentFilter, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: orders.length,
      pendingVerification: orders.filter(
        (o) => o.paymentStatus === 'PENDING_VERIFICATION' || (o.paymentMethod !== 'cod' && o.status === 'Pending' && !o.paymentVerifiedAt)
      ).length,
      pending: orders.filter((o) => o.status === 'Pending').length,
      confirmed: orders.filter((o) => o.status === 'Confirmed' || o.status === 'Processing').length,
      shipped: orders.filter((o) => o.status === 'Shipped').length,
      delivered: orders.filter((o) => o.status === 'Delivered').length,
    };
  }, [orders]);

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
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    setStatusConfirmModal(null);
    showToast(`Order #${statusConfirmModal.orderNumber} status updated to ${newStatus}`);
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
      await refreshData();
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
      await refreshData();
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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
          <CheckCircle className="w-2.5 h-2.5" />
          <span>Verified</span>
        </span>
      );
    }
    if (status === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
          <XCircle className="w-2.5 h-2.5" />
          <span>Rejected</span>
        </span>
      );
    }
    if (status === 'PENDING_VERIFICATION') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 animate-pulse">
          <Clock className="w-2.5 h-2.5" />
          <span>Verify Receipt</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-charcoal-100 dark:bg-[#22211E] text-charcoal-600 dark:text-[#8E8A80]">
        <span>COD Pending</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl text-charcoal-900 dark:text-[#F4F1E9]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-white dark:bg-[#191917] text-charcoal-900 dark:text-[#F4F1E9] border border-emerald-500/40 rounded-xl shadow-elevation flex items-center gap-2.5 text-xs font-semibold animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#191917] p-6 rounded-2xl border border-light-border dark:border-[#34322D] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-charcoal-900 dark:text-[#F4F1E9]">Orders &amp; Dispatch</h1>
            <span className="text-xs font-bold bg-light-elevated dark:bg-[#22211E] text-[#B89555] dark:text-[#C9A96A] border border-light-border dark:border-[#34322D] px-2.5 py-0.5 rounded-lg whitespace-nowrap">
              {orders.length} Total
            </span>
          </div>
          <p className="text-xs text-charcoal-500 dark:text-[#8E8A80] mt-1">
            Real-time customer dispatch desk. Confirm orders, inspect &amp; verify payment screenshots (JazzCash, EasyPaisa, SadaPay, Bank Transfer), and launch direct WhatsApp messages.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-[#191917] p-4 rounded-2xl border border-light-border dark:border-[#34322D] shadow-sm">
          <span className="text-[10px] font-bold text-charcoal-500 dark:text-[#8E8A80] uppercase tracking-wider block whitespace-nowrap">
            Pending Receipt
          </span>
          <div className="text-xl font-bold text-amber-500 mt-1">{stats.pendingVerification}</div>
          <span className="text-[10px] text-charcoal-400 dark:text-[#8E8A80] mt-0.5 block whitespace-nowrap">Awaiting Verification</span>
        </div>

        <div className="bg-white dark:bg-[#191917] p-4 rounded-2xl border border-light-border dark:border-[#34322D] shadow-sm">
          <span className="text-[10px] font-bold text-charcoal-500 dark:text-[#8E8A80] uppercase tracking-wider block whitespace-nowrap">
            Pending Review
          </span>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.pending}</div>
          <span className="text-[10px] text-charcoal-400 dark:text-[#8E8A80] mt-0.5 block whitespace-nowrap">Awaiting Call</span>
        </div>

        <div className="bg-white dark:bg-[#191917] p-4 rounded-2xl border border-light-border dark:border-[#34322D] shadow-sm">
          <span className="text-[10px] font-bold text-charcoal-500 dark:text-[#8E8A80] uppercase tracking-wider block whitespace-nowrap">
            In Processing
          </span>
          <div className="text-xl font-bold text-charcoal-900 dark:text-[#F4F1E9] mt-1">{stats.confirmed}</div>
          <span className="text-[10px] text-charcoal-400 dark:text-[#8E8A80] mt-0.5 block whitespace-nowrap">Packing &amp; Ready</span>
        </div>

        <div className="bg-white dark:bg-[#191917] p-4 rounded-2xl border border-light-border dark:border-[#34322D] shadow-sm">
          <span className="text-[10px] font-bold text-charcoal-500 dark:text-[#8E8A80] uppercase tracking-wider block whitespace-nowrap">
            Shipped
          </span>
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.shipped}</div>
          <span className="text-[10px] text-charcoal-400 dark:text-[#8E8A80] mt-0.5 block whitespace-nowrap">With Courier</span>
        </div>

        <div className="bg-white dark:bg-[#191917] p-4 rounded-2xl border border-light-border dark:border-[#34322D] shadow-sm">
          <span className="text-[10px] font-bold text-charcoal-500 dark:text-[#8E8A80] uppercase tracking-wider block whitespace-nowrap">
            Delivered
          </span>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.delivered}</div>
          <span className="text-[10px] text-charcoal-400 dark:text-[#8E8A80] mt-0.5 block whitespace-nowrap">Successfully Paid</span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white dark:bg-[#191917] p-4 rounded-2xl border border-light-border dark:border-[#34322D] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80 relative">
          <input
            type="text"
            placeholder="Search order #, customer, phone, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] text-charcoal-900 dark:text-[#F4F1E9] placeholder-charcoal-400 dark:placeholder-[#8E8A80] rounded-xl focus:border-[#B89555] dark:focus:border-[#C9A96A] focus:outline-none"
          />
          <Search className="w-3.5 h-3.5 text-charcoal-400 dark:text-[#8E8A80] absolute left-2.5 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* Payment Verification Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] text-charcoal-900 dark:text-[#F4F1E9] rounded-xl focus:border-[#B89555] dark:focus:border-[#C9A96A] focus:outline-none"
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
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] text-charcoal-900 dark:text-[#F4F1E9] rounded-xl focus:border-[#B89555] dark:focus:border-[#C9A96A] focus:outline-none"
          >
            <option value="all">All Statuses ({orders.length})</option>
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
      <div className="bg-white dark:bg-[#191917] rounded-2xl border border-light-border dark:border-[#34322D] shadow-sm overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <ShoppingCart className="w-10 h-10 text-charcoal-400 dark:text-[#8E8A80] mx-auto" />
            <h3 className="text-sm font-bold text-charcoal-900 dark:text-[#F4F1E9]">No orders match your search or filter.</h3>
            <p className="text-xs text-charcoal-500 dark:text-[#8E8A80]">Customer orders placed on the storefront will appear here instantly.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-light-elevated dark:bg-[#22211E] text-[#B89555] dark:text-[#C9A96A] uppercase font-bold text-[11px] border-b border-light-border dark:border-[#34322D]">
                  <tr>
                    <th className="p-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-light-border dark:border-[#34322D] accent-[#B89555] cursor-pointer"
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
                <tbody className="divide-y divide-light-border dark:divide-[#282723] font-medium text-charcoal-700 dark:text-[#B8B3A8]">
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
                      <tr key={ord.id} className={`hover:bg-light-hover dark:hover:bg-[#22211E]/60 transition-colors ${isSelected ? 'bg-[#B89555]/5 dark:bg-[#C9A96A]/5' : ''}`}>
                        <td className="p-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => toggleSelectOrder(ord.id, e as any)}
                            className="rounded border-light-border dark:border-[#34322D] accent-[#B89555] cursor-pointer"
                            aria-label={`Select order ${ord.orderNumber}`}
                          />
                        </td>
                        <td className="p-4 font-mono font-bold text-[#B89555] dark:text-[#C9A96A] whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <div>
                              <span>#{ord.orderNumber}</span>
                            </div>
                            <div>
                              {ord.customerType === 'GUEST' ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-[#8E8A80]">
                                  GUEST
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                  REGISTERED
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 min-w-[200px]">
                          <div className="font-bold text-charcoal-900 dark:text-[#F4F1E9]">{ord.customerName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-charcoal-500 dark:text-[#8E8A80] font-mono text-[11px] whitespace-nowrap">{ord.customerPhone}</span>
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
                        <td className="p-4 w-36 whitespace-nowrap text-charcoal-900 dark:text-[#F4F1E9]">
                          <div>{ord.city}</div>
                          <span className="text-[10px] text-charcoal-500 dark:text-[#8E8A80]">{ord.province}</span>
                        </td>
                        <td className="p-4 min-w-[200px] text-charcoal-900 dark:text-[#F4F1E9]">
                          <div className="font-bold text-[#B89555] dark:text-[#C9A96A] text-sm whitespace-nowrap">
                            Rs. {ord.totalAmount}
                          </div>
                          <div className="text-[10px] text-charcoal-500 dark:text-[#8E8A80]">
                            {ord.items.reduce((s, it) => s + it.quantity, 0)} pieces
                          </div>
                        </td>
                        <td className="p-4 w-44 whitespace-nowrap space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="uppercase font-bold text-[10px] text-charcoal-700 dark:text-[#B8B3A8]">
                              {ord.paymentMethod.replace('_', ' ')}
                            </span>
                            {renderPaymentStatusBadge(ord)}
                          </div>
                          
                          {/* Receipt View Button if screenshot uploaded */}
                          {ord.paymentScreenshotUrl ? (
                            <button
                              type="button"
                              onClick={() => setReceiptModalOrder(ord)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B89555] dark:text-[#C9A96A] hover:underline"
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
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                                : ord.status === 'Cancelled'
                                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                                : ord.status === 'Pending'
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                                : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                            }`}
                          >
                            {ALL_STATUSES.map((st) => (
                              <option key={st} value={st} className="bg-white dark:bg-[#191917] text-charcoal-900 dark:text-[#F4F1E9]">
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
                              onClick={() => setSelectedOrder(ord)}
                              className="px-2.5 py-1 bg-light-elevated dark:bg-[#22211E] hover:bg-light-hover dark:hover:bg-[#2A2925] border border-light-border dark:border-[#34322D] text-[#B89555] dark:text-[#C9A96A] hover:text-champagne-500 rounded-xl text-xs font-bold transition-colors whitespace-nowrap"
                            >
                              Details
                            </button>

                            {/* Delete Order Button */}
                            <button
                              type="button"
                              onClick={(e) => handleInitiateSingleDelete(ord, e)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-colors active:scale-95"
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
            <div className="md:hidden divide-y divide-light-border dark:divide-[#282723] p-3 space-y-3">
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
                    className="p-4 bg-light-elevated dark:bg-[#22211E] rounded-xl border border-light-border dark:border-[#34322D] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-sm text-[#B89555] dark:text-[#C9A96A]">
                          #{ord.orderNumber}
                        </span>
                        {ord.customerType === 'GUEST' ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-[#8E8A80]">
                            GUEST
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            REG
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-sm text-charcoal-900 dark:text-[#F4F1E9]">
                        Rs. {ord.totalAmount}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-charcoal-900 dark:text-[#F4F1E9]">{ord.customerName}</div>
                        <div className="text-[11px] text-charcoal-500 dark:text-[#8E8A80]">{ord.city}, {ord.province}</div>
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
                    <div className="flex items-center justify-between pt-1 border-t border-light-border dark:border-[#34322D] text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold uppercase text-[10px]">{ord.paymentMethod.replace('_', ' ')}</span>
                        {renderPaymentStatusBadge(ord)}
                      </div>

                      {ord.paymentScreenshotUrl && (
                        <button
                          type="button"
                          onClick={() => setReceiptModalOrder(ord)}
                          className="text-[#B89555] dark:text-[#C9A96A] font-bold flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Receipt</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-light-border dark:border-[#34322D]">
                      <select
                        value={ord.status}
                        onChange={(e) =>
                          handleInitiateStatusChange(ord.id, ord.orderNumber, e.target.value as OrderStatus)
                        }
                        className={`flex-1 px-2.5 py-1.5 text-xs font-bold rounded-xl border focus:outline-none ${
                          ord.status === 'Delivered'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                            : ord.status === 'Cancelled'
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                            : ord.status === 'Pending'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                            : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                        }`}
                      >
                        {ALL_STATUSES.map((st) => (
                          <option key={st} value={st} className="bg-white dark:bg-[#191917] text-charcoal-900 dark:text-[#F4F1E9]">
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
                        onClick={() => setSelectedOrder(ord)}
                        className="px-3 py-1.5 bg-champagne-500 text-charcoal-950 rounded-xl text-xs font-bold shadow-xs"
                      >
                        View
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleInitiateSingleDelete(ord, e)}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-colors active:scale-95"
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
      </div>

      {/* Payment Receipt / Screenshot Verification Modal */}
      {receiptModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#191917] border border-light-border dark:border-[#34322D] rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-elevation max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-light-border dark:border-[#34322D] pb-3">
              <div>
                <h3 className="font-bold text-sm text-charcoal-900 dark:text-[#F4F1E9] flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#B89555] dark:text-[#C9A96A]" />
                  <span>Payment Receipt — Order #{receiptModalOrder.orderNumber}</span>
                </h3>
                <p className="text-[11px] text-charcoal-500 dark:text-[#8E8A80]">
                  Customer: {receiptModalOrder.customerName} ({receiptModalOrder.customerPhone})
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReceiptModalOrder(null);
                  setShowRejectForm(false);
                }}
                className="p-1 rounded-lg text-charcoal-400 hover:text-charcoal-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Summary Pill */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-light-elevated dark:bg-[#22211E] rounded-xl border border-light-border dark:border-[#34322D] text-xs">
              <div>
                <span className="text-charcoal-400 block text-[10px]">Method</span>
                <span className="font-bold uppercase text-charcoal-900 dark:text-[#F4F1E9]">
                  {receiptModalOrder.paymentMethod.replace('_', ' ')}
                </span>
              </div>
              <div>
                <span className="text-charcoal-400 block text-[10px]">Total Order</span>
                <span className="font-bold text-[#B89555] dark:text-[#C9A96A]">
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
                <div className="relative rounded-xl border border-light-border dark:border-[#34322D] overflow-hidden bg-black/5 dark:bg-black/30 flex items-center justify-center max-h-[50vh]">
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
                    className="inline-flex items-center gap-1.5 text-xs text-[#B89555] dark:text-[#C9A96A] font-bold hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open High-Res Original</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-light-elevated dark:bg-[#22211E] rounded-xl border border-light-border dark:border-[#34322D] text-xs text-charcoal-500">
                No screenshot uploaded by customer.
              </div>
            )}

            {/* Rejection Form Input */}
            {showRejectForm && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2 animate-in fade-in">
                <label className="block text-xs font-bold text-rose-700 dark:text-rose-400">
                  Reason for Rejecting Payment
                </label>
                <input
                  type="text"
                  placeholder="e.g. Screenshot unreadable, amount mismatch, or fake reference..."
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#191917] border border-rose-300 dark:border-rose-800 rounded-lg text-charcoal-900 dark:text-[#F4F1E9] focus:outline-none"
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
              <div className="flex items-center justify-between pt-2 border-t border-light-border dark:border-[#34322D]">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#191917] border border-light-border dark:border-[#34322D] rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-elevation max-h-[90vh] overflow-y-auto text-charcoal-900 dark:text-[#F4F1E9]">
            <div className="flex items-center justify-between border-b border-light-border dark:border-[#34322D] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-charcoal-900 dark:text-[#F4F1E9]">Order #{selectedOrder.orderNumber}</h3>
                  {selectedOrder.customerType === 'GUEST' ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-[#8E8A80]">
                      Guest Checkout
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      Registered Customer
                    </span>
                  )}
                </div>
                <p className="text-xs text-charcoal-500 dark:text-[#8E8A80]">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-lg text-charcoal-400 hover:text-charcoal-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer info */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-light-elevated dark:bg-[#22211E] p-4 rounded-xl border border-light-border dark:border-[#34322D]">
              <div>
                <span className="text-charcoal-500 dark:text-[#8E8A80] block">Customer Name</span>
                <strong className="text-charcoal-900 dark:text-[#F4F1E9]">{selectedOrder.customerName}</strong>
              </div>
              <div>
                <span className="text-charcoal-500 dark:text-[#8E8A80] block">Phone Number</span>
                <strong className="text-charcoal-900 dark:text-[#F4F1E9]">{selectedOrder.customerPhone}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-charcoal-500 dark:text-[#8E8A80] block">Delivery Address</span>
                <p className="text-charcoal-900 dark:text-[#F4F1E9]">{selectedOrder.address}, {selectedOrder.city}, {selectedOrder.province}</p>
              </div>
              {selectedOrder.orderNotes && (
                <div className="col-span-2">
                  <span className="text-charcoal-500 dark:text-[#8E8A80] block">Customer Order Notes</span>
                  <p className="text-[#B89555] dark:text-[#C9A96A] italic">{selectedOrder.orderNotes}</p>
                </div>
              )}
            </div>

            {/* Payment & Proof Box */}
            <div className="p-4 bg-light-elevated dark:bg-[#22211E] rounded-xl border border-light-border dark:border-[#34322D] flex items-center justify-between text-xs">
              <div>
                <span className="text-charcoal-500 dark:text-[#8E8A80] block text-[10px]">Payment Method</span>
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#B89555]/10 hover:bg-[#B89555]/20 text-[#B89555] dark:text-[#C9A96A] rounded-lg font-bold transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Receipt</span>
                </button>
              )}
            </div>

            {/* Items */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-charcoal-700 dark:text-[#B8B3A8] uppercase">Ordered Items</h4>
              <div className="divide-y divide-light-border dark:divide-[#34322D] border border-light-border dark:border-[#34322D] rounded-xl overflow-hidden">
                {selectedOrder.items.map((it) => (
                  <div key={it.id} className="p-3 flex items-center justify-between text-xs bg-white dark:bg-[#191917]">
                    <div>
                      <div className="font-bold text-charcoal-900 dark:text-[#F4F1E9]">{it.productName}</div>
                      <div className="text-[11px] text-charcoal-500 dark:text-[#8E8A80]">
                        {it.quality} • {it.sleeve} • Size {it.size}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#B89555] dark:text-[#C9A96A]">
                        {it.quantity} x Rs. {it.unitPrice} = Rs. {it.totalPrice}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-light-elevated dark:bg-[#22211E] p-4 rounded-xl space-y-1.5 text-xs text-charcoal-700 dark:text-[#B8B3A8]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-charcoal-900 dark:text-[#F4F1E9] font-semibold">Rs. {selectedOrder.subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>{selectedOrder.deliveryFee === 0 ? 'FREE DELIVERY' : `Rs. ${selectedOrder.deliveryFee}`}</span>
              </div>
              <div className="border-t border-light-border dark:border-[#34322D] pt-2 flex justify-between text-sm font-extrabold text-[#B89555] dark:text-[#C9A96A]">
                <span>Total Amount</span>
                <span>Rs. {selectedOrder.totalAmount}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-light-border dark:border-[#34322D]">
              <button
                type="button"
                onClick={(e) => handleInitiateSingleDelete(selectedOrder, e)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Order Permanently</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 bg-light-elevated dark:bg-[#22211E] hover:bg-light-hover dark:hover:bg-[#2A2925] border border-light-border dark:border-[#34322D] text-charcoal-800 dark:text-[#F4F1E9] rounded-xl text-xs font-bold transition-all"
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
          <div className="bg-white dark:bg-[#191917] border border-rose-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-elevation text-charcoal-900 dark:text-[#F4F1E9]">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/30">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-charcoal-900 dark:text-[#F4F1E9]">
                  {deleteModal.isBulk
                    ? `Delete ${deleteModal.count} Selected Orders Permanently?`
                    : `Delete Order #${deleteModal.orderNumber} Permanently?`}
                </h3>
                <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold block mt-0.5">
                  Destructive Action • Cannot be Undone
                </span>
              </div>
            </div>

            <p className="text-xs text-charcoal-600 dark:text-[#B8B3A8] leading-relaxed">
              This action will permanently remove the order record, line items, and associated payment proof receipt from Supabase. Customer accounts and unrelated store data will not be affected.
            </p>

            {deleteError && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-700 dark:text-rose-400 text-xs font-semibold">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-light-border dark:border-[#34322D]">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 bg-light-elevated dark:bg-[#22211E] hover:bg-light-hover dark:hover:bg-[#2A2925] border border-light-border dark:border-[#34322D] text-charcoal-700 dark:text-[#B8B3A8] text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
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
