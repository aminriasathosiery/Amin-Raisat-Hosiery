'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/context/StoreContext';
import { Star, Trash2, CheckCircle, XCircle, MessageSquare, Check } from 'lucide-react';
import { ConfirmModal } from '@/components/admin/ConfirmModal';

export default function AdminReviewsPage() {
  const { reviews, products, approveReview, deleteReview, loadReviews } = useStore();
  const [toast, setToast] = useState('');

  useEffect(() => {
    loadReviews();
  }, []);

  // Delete Confirm Modal
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; reviewId: string; author: string }>({
    isOpen: false,
    reviewId: '',
    author: '',
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const getProductName = (prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    return prod ? prod.name : 'General Catalog Item';
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.reviewId) return;
    try {
      await deleteReview(deleteModal.reviewId);
      showToast(`Review by "${deleteModal.author}" deleted.`);
    } catch (err) {
      showToast('Error deleting review.');
    } finally {
      setDeleteModal({ isOpen: false, reviewId: '', author: '' });
    }
  };

  return (
    <div className="space-y-6 text-charcoal-900 dark:text-[#F4F1E9] max-w-7xl">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-white dark:bg-[#191917] text-charcoal-900 dark:text-[#F4F1E9] border border-emerald-500/40 rounded-xl shadow-elevation flex items-center gap-2.5 text-xs font-semibold animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Customer Review"
        message={`Are you sure you want to permanently delete the review submitted by "${deleteModal.author}"?`}
        confirmLabel="Delete Review"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, reviewId: '', author: '' })}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#191917] p-6 rounded-2xl border border-light-border dark:border-[#34322D] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-charcoal-900 dark:text-[#F4F1E9]">Customer Reviews &amp; Social Proof</h1>
            <span className="text-xs font-bold bg-light-elevated dark:bg-[#22211E] text-[#B89555] dark:text-[#C9A96A] border border-light-border dark:border-[#34322D] px-2.5 py-0.5 rounded-lg">
              {reviews.length} Reviews
            </span>
          </div>
          <p className="text-xs text-charcoal-500 dark:text-[#8E8A80] mt-1">
            Moderate authentic customer reviews and ratings submitted on product pages. Only approved reviews display publicly.
          </p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-white dark:bg-[#191917] rounded-2xl p-12 text-center border border-light-border dark:border-[#34322D] space-y-3 shadow-sm">
          <MessageSquare className="w-10 h-10 text-charcoal-400 dark:text-[#8E8A80] mx-auto" />
          <h3 className="text-base font-bold text-charcoal-900 dark:text-[#F4F1E9]">No Customer Reviews Yet</h3>
          <p className="text-xs text-charcoal-500 dark:text-[#8E8A80] max-w-sm mx-auto">
            Reviews submitted by customers on product pages will appear here for moderation.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#191917] rounded-2xl border border-light-border dark:border-[#34322D] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-light-elevated dark:bg-[#22211E] text-[#B89555] dark:text-[#C9A96A] font-bold uppercase text-[10px] border-b border-light-border dark:border-[#34322D]">
                <tr>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Product</th>
                  <th className="p-3.5">Rating</th>
                  <th className="p-3.5">Comment</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-border dark:divide-[#282723] text-charcoal-700 dark:text-[#B8B3A8] font-medium">
                {reviews.map((rev) => (
                  <tr key={rev.id} className="hover:bg-light-hover dark:hover:bg-[#22211E]/60 transition-colors">
                    <td className="p-3.5 font-bold text-charcoal-900 dark:text-[#F4F1E9]">
                      {rev.customerName}
                      {rev.customerCity && (
                        <span className="block text-[10px] text-charcoal-500 dark:text-[#8E8A80] font-normal">
                          {rev.customerCity}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-charcoal-900 dark:text-[#F4F1E9]">{getProductName(rev.productId)}</td>
                    <td className="p-3.5">
                      <div className="flex text-[#B89555] dark:text-[#C9A96A]">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${s <= rev.rating ? 'fill-current' : 'text-charcoal-300 dark:text-[#34322D]'}`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="p-3.5 text-charcoal-900 dark:text-[#F4F1E9] max-w-xs">{rev.comment}</td>
                    <td className="p-3.5 text-charcoal-500 dark:text-[#8E8A80] text-[11px]">
                      {new Date(rev.createdAt).toLocaleDateString('en-PK')}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          rev.isApproved
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                        }`}
                      >
                        {rev.isApproved ? 'Live on Store' : 'Pending Moderation'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={async () => {
                            await approveReview(rev.id, !rev.isApproved);
                            showToast(rev.isApproved ? 'Review hidden from storefront' : 'Review approved and published live');
                          }}
                          className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors ${
                            rev.isApproved
                              ? 'text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800/40 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                              : 'text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          }`}
                          title={rev.isApproved ? 'Unpublish from store' : 'Approve for public store'}
                        >
                          {rev.isApproved ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          <span className="hidden sm:inline">{rev.isApproved ? 'Unpublish' : 'Approve'}</span>
                        </button>
                        <button
                          onClick={() => {
                            setDeleteModal({
                              isOpen: true,
                              reviewId: rev.id,
                              author: rev.customerName,
                            });
                          }}
                          className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl"
                          title="Delete review"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
