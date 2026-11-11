'use client';

import React, { useState, useEffect } from 'react';
import { ProductReview } from '@/types';
import { useStore } from '@/context/StoreContext';
import {
  Star,
  MessageSquare,
  Check,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface ProductReviewsProps {
  productId: string;
  productName: string;
  reviews?: ProductReview[];
}

export const ProductReviews: React.FC<ProductReviewsProps> = ({
  productId,
  productName,
  reviews: initialReviews,
}) => {
  const { submitReview } = useStore();

  const [reviews, setReviews] = useState<ProductReview[]>(() => initialReviews || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Load reviews on demand for this product if not preloaded
  useEffect(() => {
    if (initialReviews && initialReviews.length > 0) {
      setReviews(initialReviews);
      return;
    }
    let cancelled = false;
    fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && Array.isArray(data.reviews)) {
          setReviews(data.reviews);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [productId, initialReviews]);

  // Close review modal on Escape
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isModalOpen]);

  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
      : null;

  // Star breakdown calculation
  const starCounts = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r) => r.rating === stars).length;
    const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
    return { stars, count, percentage };
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!customerName.trim()) {
      setSubmitError('Please provide your name.');
      return;
    }
    if (!comment.trim() || comment.trim().length < 2) {
      setSubmitError('Please write a review comment (at least 2 characters).');
      return;
    }

    try {
      setIsSubmitting(true);
      await submitReview({
        productId,
        customerName: customerName.trim(),
        customerCity: customerCity.trim() || undefined,
        rating,
        comment: comment.trim(),
      });

      setIsSubmitted(true);

      setTimeout(() => {
        setIsSubmitted(false);
        setIsModalOpen(false);
        setComment('');
        setCustomerName('');
        setCustomerCity('');
        setRating(5);
      }, 2500);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pt-10 mt-10 border-t border-[#D8D0C3] select-none text-[#1D2730]">
      {/* Header Summary & Rating Breakdown */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
        <div>
          <h3 className="text-lg font-bold text-[#1D2730]">Customer Reviews</h3>
          {totalReviews > 0 ? (
            <div className="space-y-3 mt-2">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-extrabold text-[#C99A3D]">{averageRating}</span>
                <div>
                  <div className="flex text-[#C99A3D]">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= Math.round(Number(averageRating)) ? 'fill-current' : 'text-[#D8D0C3]'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-[#66717C] font-normal">Based on {totalReviews} reviews</span>
                </div>
              </div>

              {/* Star Rating Breakdown Bars */}
              <div className="space-y-1.5 w-64 text-xs text-[#66717C]">
                {starCounts.map((s) => (
                  <div key={s.stars} className="flex items-center gap-2">
                    <span className="w-12 text-[11px] font-medium text-[#1D2730]">{s.stars} stars</span>
                    <div className="flex-1 h-2 bg-[#EEE8DC] rounded-full overflow-hidden border border-[#D8D0C3]">
                      <div
                        className="h-full bg-[#C99A3D] rounded-full"
                        style={{ width: `${s.percentage}%` }}
                      />
                    </div>
                    <span className="w-6 text-[10px] text-[#66717C] text-right">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#66717C] mt-1 font-normal">
              No reviews yet. Be the first to share your experience!
            </p>
          )}
        </div>

        {/* Write a Review button */}
        <div className="self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-[#EEE8DC] text-[#23384D] border border-[#D8D0C3] hover:border-[#C99A3D] rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            <MessageSquare className="w-4 h-4 text-[#C99A3D]" />
            <span>Write a Review</span>
          </button>
        </div>
      </div>

      {/* Reviews List */}
      {totalReviews === 0 ? (
        <div className="p-8 bg-white rounded-2xl border border-[#D8D0C3] text-center space-y-2 shadow-sm">
          <p className="text-xs font-bold text-[#1D2730]">Be the First to Review</p>
          <p className="text-xs text-[#66717C] max-w-md mx-auto">
            Share your experience with the fabric quality, stitching, and fit to help other customers.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="p-5 bg-white rounded-2xl border border-[#D8D0C3] space-y-2 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[#1D2730]">{rev.customerName}</span>
                  {rev.customerCity && (
                    <span className="text-xs text-[#66717C]">({rev.customerCity})</span>
                  )}
                </div>
                <div className="flex text-[#C99A3D]">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3.5 h-3.5 ${
                        star <= rev.rating ? 'fill-current' : 'text-[#D8D0C3]'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-[#334155] leading-relaxed font-normal">{rev.comment}</p>
              <div className="text-[10px] text-[#66717C]">
                {new Date(rev.createdAt).toLocaleDateString('en-PK', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Submission Modal (Light Theme) */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#1D2730]/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-elevation border border-[#D8D0C3] space-y-4 text-[#1D2730]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#D8D0C3] pb-3">
              <div>
                <h4 className="font-bold text-[#1D2730] text-sm">Write a Review for {productName}</h4>
                <p className="text-[11px] text-[#66717C] mt-0.5">Share your honest experience with other customers.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[#66717C] hover:text-[#1D2730] hover:bg-[#EEE8DC] transition-colors"
                aria-label="Close review modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isSubmitted ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 text-[#2F7D5A] rounded-xl text-center space-y-2">
                <Check className="w-6 h-6 mx-auto text-[#2F7D5A]" />
                <p className="text-xs font-bold">Thank you for your feedback!</p>
                <p className="text-[11px]">Your review has been submitted and is pending moderation.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                {submitError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-[#B8423A] rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-[#1D2730] mb-1">Your Rating *</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 text-[#C99A3D] hover:scale-110 transition-transform"
                        aria-label={`Rate ${star} stars`}
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= rating ? 'fill-current' : 'text-[#D8D0C3]'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#1D2730] mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ali Raza"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F7F3EA] border border-[#D8D0C3] text-[#1D2730] placeholder-[#8E8A80] rounded-xl focus:outline-none focus:border-[#C99A3D]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1D2730] mb-1">City (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Lahore, Karachi, Faisalabad"
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F7F3EA] border border-[#D8D0C3] text-[#1D2730] placeholder-[#8E8A80] rounded-xl focus:outline-none focus:border-[#C99A3D]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1D2730] mb-1">Your Review *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Share your experience with the combed cotton fabric, stitching, and fit..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F7F3EA] border border-[#D8D0C3] text-[#1D2730] placeholder-[#8E8A80] rounded-xl focus:outline-none focus:border-[#C99A3D]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                    className="py-2.5 px-4 bg-[#EEE8DC] text-[#1D2730] rounded-xl font-semibold hover:bg-[#E8E1D3] border border-[#D8D0C3]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="py-2.5 px-5 bg-[#23384D] hover:bg-[#182B3D] text-white rounded-xl font-bold shadow-xs flex items-center gap-2 transition-colors"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isSubmitting ? 'Submitting...' : 'Submit Review'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
