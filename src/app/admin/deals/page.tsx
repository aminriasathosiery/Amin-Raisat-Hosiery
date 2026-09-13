'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Deal } from '@/types';
import { calculateSalePrice, validateDiscountPercentage, formatPKR } from '@/lib/pricing';
import {
  Package,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  ArrowLeft,
  Zap,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  TrendingUp,
  Percent,
  DollarSign,
  Upload,
} from 'lucide-react';

function AdminDealsContent() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; dealId: string; dealName: string }>({
    isOpen: false,
    dealId: '',
    dealName: '',
  });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    subtitle: '',
    description: '',
    imageUrl: '',
    piecesCount: 3,
    originalPrice: 3000,
    discountPercentage: 10,
    isFreeDelivery: true,
    isActive: true,
    isFeatured: false,
    sortOrder: 1,
    badgeText: '',
  });

  const [isUploading, setIsUploading] = useState(false);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchDeals = async () => {
    try {
      const res = await fetch('/api/admin/deals');
      if (res.ok) {
        const data = await res.json();
        setDeals(data.deals || []);
      }
    } catch (err) {
      console.error('Failed to fetch deals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  const handleCreateNew = () => {
    setEditingDeal(null);
    setFormData({
      name: '',
      slug: '',
      subtitle: '',
      description: '',
      imageUrl: '',
      piecesCount: 3,
      originalPrice: 3000,
      discountPercentage: 10,
      isFreeDelivery: true,
      isActive: true,
      isFeatured: false,
      sortOrder: deals.length > 0 ? Math.max(...deals.map(d => d.sortOrder)) + 1 : 1,
      badgeText: '',
    });
    setViewMode('editor');
  };

  const handleEdit = (deal: Deal) => {
    setEditingDeal(deal);
    setFormData({
      name: deal.name,
      slug: deal.slug,
      subtitle: deal.subtitle || '',
      description: deal.description || '',
      imageUrl: deal.imageUrl || '',
      piecesCount: deal.piecesCount,
      originalPrice: deal.originalPrice,
      discountPercentage: deal.discountPercentage,
      isFreeDelivery: deal.isFreeDelivery,
      isActive: deal.isActive,
      isFeatured: deal.isFeatured,
      sortOrder: deal.sortOrder,
      badgeText: deal.badgeText || '',
    });
    setViewMode('editor');
  };

  const handleDeleteClick = (deal: Deal) => {
    setDeleteModal({ isOpen: true, dealId: deal.id, dealName: deal.name });
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await fetch(`/api/admin/deals?id=${deleteModal.dealId}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification('Deal deleted successfully');
        setDeleteModal({ isOpen: false, dealId: '', dealName: '' });
        fetchDeals();
      } else {
        showNotification('Failed to delete deal', 'error');
      }
    } catch (err) {
      showNotification('Failed to delete deal', 'error');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('folder', 'deals');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (res.ok) {
        const data = await res.json();
        setFormData({ ...formData, imageUrl: data.url });
        showNotification('Image uploaded successfully');
      } else {
        showNotification('Failed to upload image', 'error');
      }
    } catch (err) {
      showNotification('Failed to upload image', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        id: editingDeal?.id,
      };

      const res = await fetch('/api/admin/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showNotification(editingDeal ? 'Deal updated successfully' : 'Deal created successfully');
        setViewMode('list');
        fetchDeals();
      } else {
        const data = await res.json();
        showNotification(data.error || 'Failed to save deal', 'error');
      }
    } catch (err) {
      showNotification('Failed to save deal', 'error');
    }
  };

  const calculatedSalePrice = calculateSalePrice(formData.originalPrice, formData.discountPercentage);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B89555]"></div>
      </div>
    );
  }

  if (viewMode === 'editor') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1A1A1A] p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setViewMode('list')}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-[#B89555] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Deals
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {editingDeal ? 'Edit Deal' : 'Create New Deal'}
            </h1>
          </div>

          <div className="bg-white dark:bg-[#22211E] rounded-xl shadow-sm p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Deal Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-white"
                  placeholder="e.g., 3 Vests Deal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-white"
                  placeholder="e.g., 3-vests-deal"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subtitle
              </label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-white"
                placeholder="e.g., Premium Cotton Bundle"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-white"
                placeholder="Deal description..."
              />
            </div>

            {/* Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Deal Image
              </label>
              <div className="flex items-start gap-4">
                {formData.imageUrl && (
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                    <Image src={formData.imageUrl} alt="Deal" fill className="object-cover" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                    className="hidden"
                    id="deal-image-upload"
                  />
                  <label
                    htmlFor="deal-image-upload"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#B89555] text-white rounded-lg hover:bg-[#A68444] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    {isUploading ? 'Uploading...' : 'Upload Image'}
                  </label>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pricing</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Original Price (Rs.)
                  </label>
                  <input
                    type="number"
                    value={formData.originalPrice}
                    onChange={(e) => setFormData({ ...formData, originalPrice: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-white"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Discount %
                  </label>
                  <input
                    type="number"
                    value={formData.discountPercentage}
                    onChange={(e) => setFormData({ ...formData, discountPercentage: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-white"
                    min="0"
                    max="99"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sale Price (Auto)
                  </label>
                  <div className="px-4 py-2 bg-gray-100 dark:bg-[#1A1A1A] border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-semibold">
                    {formatPKR(calculatedSalePrice)}
                  </div>
                </div>
              </div>
            </div>

            {/* Pieces & Delivery */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Number of Pieces
                </label>
                <input
                  type="number"
                  value={formData.piecesCount}
                  onChange={(e) => setFormData({ ...formData, piecesCount: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-white"
                  min="1"
                />
              </div>

              <div className="flex items-center gap-3 pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFreeDelivery}
                    onChange={(e) => setFormData({ ...formData, isFreeDelivery: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-[#B89555] focus:ring-[#B89555]"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Free Delivery</span>
                </label>
              </div>
            </div>

            {/* Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-[#B89555] focus:ring-[#B89555]"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
                </label>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-[#B89555] focus:ring-[#B89555]"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Featured</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-white"
                  min="1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Badge Text
              </label>
              <input
                type="text"
                value={formData.badgeText}
                onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-white"
                placeholder="e.g., Best Value, Hot Deal"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setViewMode('list')}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-[#B89555] text-white rounded-lg hover:bg-[#A68444] transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Deal
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1A1A1A] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-[#B89555]" />
            Deals
          </h1>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-[#B89555] text-white rounded-lg hover:bg-[#A68444] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Deal
          </button>
        </div>

        <div className="bg-white dark:bg-[#22211E] rounded-xl shadow-sm overflow-hidden">
          {deals.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No deals yet</p>
              <p className="text-sm mt-1">Create your first deal to get started</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#1A1A1A] border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Deal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Pricing
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Pieces
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Sort
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {deals.map((deal) => (
                  <tr key={deal.id} className="hover:bg-gray-50 dark:hover:bg-[#1A1A1A]">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {deal.imageUrl && (
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                            <Image src={deal.imageUrl} alt={deal.name} fill className="object-cover" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{deal.name}</div>
                          {deal.badgeText && (
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-[#B89555] text-white rounded">
                              {deal.badgeText}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {deal.discountPercentage > 0 ? (
                          <>
                            <span className="line-through text-gray-400 mr-2">{formatPKR(deal.originalPrice)}</span>
                            <span className="font-semibold text-[#B89555]">{formatPKR(deal.salePrice)}</span>
                            <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                              {deal.discountPercentage}% OFF
                            </span>
                          </>
                        ) : (
                          <span className="font-semibold">{formatPKR(deal.originalPrice)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {deal.piecesCount} pcs
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {deal.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                            <Eye className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                            <EyeOff className="w-3 h-3" />
                            Inactive
                          </span>
                        )}
                        {deal.isFeatured && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                            <TrendingUp className="w-3 h-3" />
                            Featured
                          </span>
                        )}
                        {deal.isFreeDelivery && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            FREE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      #{deal.sortOrder}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(deal)}
                          className="p-2 text-gray-600 dark:text-gray-300 hover:text-[#B89555] transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(deal)}
                          className="p-2 text-gray-600 dark:text-gray-300 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#22211E] rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Deal</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete &ldquo;{deleteModal.dealName}&rdquo;? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal({ isOpen: false, dealId: '', dealName: '' })}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white ${
            notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {notification.message}
        </div>
      )}
    </div>
  );
}

export default function AdminDealsPage() {
  return <AdminDealsContent />;
}
