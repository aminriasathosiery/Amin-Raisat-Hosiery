'use client';

import React, { useState, useMemo } from 'react';
import { useStore } from '@/context/StoreContext';
import { Category, Subcategory } from '@/types';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Check,
  FolderPlus,
  X,
  ChevronRight,
  ArrowLeft,
  Eye,
  EyeOff,
  AlertTriangle,
  Package,
} from 'lucide-react';
import { ConfirmModal } from '@/components/admin/ConfirmModal';

export default function AdminCategoriesPage() {
  const {
    categories,
    subcategories,
    products,
    saveCategory,
    deleteCategory,
    saveSubcategory,
    deleteSubcategory,
  } = useStore();

  const [selectedCatId, setSelectedCatId] = useState<string>(categories[0]?.id || '');
  const [saveToast, setSaveToast] = useState('');
  
  // Mobile drill-down view state: 'categories' | 'subcategories'
  const [mobileActiveView, setMobileActiveView] = useState<'categories' | 'subcategories'>('categories');

  React.useEffect(() => {
    if ((!selectedCatId || selectedCatId === '') && categories.length > 0) {
      setSelectedCatId(categories[0].id);
    }
  }, [categories, selectedCatId]);

  // Modal States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);

  // Safety Warning Modal State (Blocked Deletion)
  const [safetyWarning, setSafetyWarning] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  // Delete Confirm Modal State
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    type: 'category' | 'subcategory';
    id: string;
    name: string;
  }>({
    isOpen: false,
    type: 'category',
    id: '',
    name: '',
  });

  // Form states
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<Partial<Subcategory> | null>(null);

  // Sorted categories by displayOrder
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [categories]);

  const selectedCategory = categories.find((c) => c.id === selectedCatId) || sortedCategories[0];
  
  // Subcategories for current selected category sorted by displayOrder
  const activeSubcategories = useMemo(() => {
    if (!selectedCategory) return [];
    return subcategories
      .filter((s) => s.categoryId === selectedCategory.id)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [subcategories, selectedCategory]);

  const showToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(''), 3000);
  };

  // Open Add Category Modal
  const handleOpenAddCategory = () => {
    setEditingCategory({
      id: `cat-${Date.now()}`,
      name: '',
      slug: '',
      description: '',
      isActive: true,
      displayOrder: categories.length + 1,
    });
    setIsCategoryModalOpen(true);
  };

  // Open Add Subcategory Modal
  const handleOpenAddSubcategory = () => {
    const parentId = selectedCategory?.id || categories[0]?.id || '';
    setEditingSubcategory({
      id: `sub-${Date.now()}`,
      categoryId: parentId,
      name: '',
      slug: '',
      description: '',
      isActive: true,
      displayOrder: activeSubcategories.length + 1,
    });
    setIsSubcategoryModalOpen(true);
  };

  // Save Category
  const handleSaveCategoryForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory?.name || !editingCategory.slug) return;

    try {
      await saveCategory(editingCategory as Category);
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      showToast('Category saved successfully!');
    } catch (err: any) {
      showToast(err?.message || 'Error saving category.');
    }
  };

  // Save Subcategory
  const handleSaveSubcategoryForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubcategory?.name || !editingSubcategory.slug || !editingSubcategory.categoryId) return;

    try {
      await saveSubcategory(editingSubcategory as Subcategory);
      setIsSubcategoryModalOpen(false);
      setEditingSubcategory(null);
      showToast('Subcategory saved successfully!');
    } catch (err: any) {
      showToast(err?.message || 'Error saving subcategory.');
    }
  };

  // Quick Toggle Active State
  const handleToggleCategoryActive = async (cat: Category) => {
    try {
      await saveCategory({ ...cat, isActive: !cat.isActive });
      showToast(`Category "${cat.name}" status updated.`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to update category status.');
    }
  };

  const handleToggleSubcategoryActive = async (sub: Subcategory) => {
    try {
      await saveSubcategory({ ...sub, isActive: !sub.isActive });
      showToast(`Subcategory "${sub.name}" status updated.`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to update subcategory status.');
    }
  };

  // Safety Delete Checks
  const handleInitiateDeleteCategory = (cat: Category) => {
    const subsCount = subcategories.filter((s) => s.categoryId === cat.id).length;
    const prodsCount = products.filter((p) => p.categoryId === cat.id).length;

    if (subsCount > 0 || prodsCount > 0) {
      setSafetyWarning({
        isOpen: true,
        title: 'Cannot Delete Active Category',
        message: `The category "${cat.name}" currently contains ${subsCount} subcategory(ies) and ${prodsCount} garment product(s). Please remove or reassign all subcategories and products before deleting this category.`,
      });
      return;
    }

    setDeleteModalState({
      isOpen: true,
      type: 'category',
      id: cat.id,
      name: cat.name,
    });
  };

  const handleInitiateDeleteSubcategory = (sub: Subcategory) => {
    const prodsCount = products.filter((p) => p.subcategoryId === sub.id).length;

    if (prodsCount > 0) {
      setSafetyWarning({
        isOpen: true,
        title: 'Cannot Delete Active Subcategory',
        message: `The subcategory "${sub.name}" currently has ${prodsCount} garment product(s) assigned to it. Please reassign those products first before deleting this subcategory.`,
      });
      return;
    }

    setDeleteModalState({
      isOpen: true,
      type: 'subcategory',
      id: sub.id,
      name: sub.name,
    });
  };

  // Handle Confirmed Safe Deletion
  const handleConfirmDelete = async () => {
    if (!deleteModalState.id) return;
    try {
      if (deleteModalState.type === 'category') {
        await deleteCategory(deleteModalState.id);
        showToast(`Category "${deleteModalState.name}" safely deleted.`);
      } else {
        await deleteSubcategory(deleteModalState.id);
        showToast(`Subcategory "${deleteModalState.name}" safely deleted.`);
      }
    } catch (err) {
      showToast('Error deleting item.');
    } finally {
      setDeleteModalState({ isOpen: false, type: 'category', id: '', name: '' });
    }
  };

  return (
    <div className="space-y-6 text-charcoal-900 max-w-7xl">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-white text-charcoal-900 border border-emerald-500/40 rounded-xl shadow-elevation flex items-center gap-2.5 text-xs font-semibold animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Dependency Safety Warning Modal */}
      {safetyWarning.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-amber-500/40 rounded-2xl p-6 max-w-md w-full shadow-elevation space-y-4 text-charcoal-900">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-charcoal-900">{safetyWarning.title}</h3>
            </div>
            <p className="text-xs text-charcoal-600 leading-relaxed">{safetyWarning.message}</p>
            <div className="flex justify-end pt-3 border-t border-light-border">
              <button
                type="button"
                onClick={() => setSafetyWarning({ isOpen: false, title: '', message: '' })}
                className="px-4 py-2 bg-light-elevated hover:bg-light-hover border border-light-border text-charcoal-900 text-xs font-semibold rounded-xl"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalState.isOpen}
        title={`Delete ${deleteModalState.type === 'category' ? 'Category' : 'Subcategory'}`}
        message={`Are you sure you want to delete "${deleteModalState.name}"?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModalState({ isOpen: false, type: 'category', id: '', name: '' })}
      />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-light-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-charcoal-900">
              Categories &amp; Subcategories Management
            </h1>
            <span className="text-xs font-bold bg-light-elevated text-[#B89555] border border-light-border px-2.5 py-0.5 rounded-lg">
              {categories.length} Categories &bull; {subcategories.length} Subcategories
            </span>
          </div>
          <p className="text-xs text-charcoal-500 mt-1">
            Dynamic database taxonomy. Configure main categories (Men, Women, Kids, Sports Wear, etc.) and nested garment subcategories.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleOpenAddCategory}
            className="inline-flex items-center justify-center gap-2 bg-light-elevated border border-light-border hover:bg-light-hover text-charcoal-900 text-xs font-semibold h-10 px-4 rounded-xl shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4 text-[#B89555]" />
            <span>Add Main Category</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddSubcategory}
            className="inline-flex items-center justify-center gap-2 bg-champagne-500 hover:bg-champagne-400 text-charcoal-950 text-xs font-bold h-10 px-4 rounded-xl shadow-xs transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Add Subcategory</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. DESKTOP VIEW: Side-by-Side Master/Detail (md:grid) */}
      {/* ========================================================================= */}
      <div className="hidden md:grid grid-cols-12 gap-6">
        {/* LEFT COLUMN: Main Categories List */}
        <div className="col-span-5 bg-white rounded-2xl p-5 border border-light-border shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-light-border pb-3">
            <h2 className="text-xs font-bold text-[#B89555] uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <span>Main Categories ({categories.length})</span>
            </h2>
            <span className="text-[11px] text-charcoal-500">Select to view subcategories</span>
          </div>

          <div className="space-y-2">
            {sortedCategories.map((cat) => {
              const isSelected = selectedCategory?.id === cat.id;
              const catSubCount = subcategories.filter((s) => s.categoryId === cat.id).length;
              const catProdCount = products.filter((p) => p.categoryId === cat.id).length;

              return (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  className={`cursor-pointer p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-[#B89555] bg-champagne-50/70 shadow-2xs'
                      : 'border-light-border bg-white hover:bg-light-hover'
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-charcoal-900 truncate">{cat.name}</h3>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleCategoryActive(cat);
                        }}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                          cat.isActive !== false
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                            : 'bg-rose-50 text-rose-700 border border-rose-300'
                        }`}
                        title="Click to toggle active status"
                      >
                        {cat.isActive !== false ? 'Active' : 'Hidden'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-charcoal-500">
                      <span>Order: #{cat.displayOrder || 1}</span>
                      <span>&bull;</span>
                      <span className="font-mono text-[11px] text-[#B89555]">/{cat.slug}</span>
                      <span>&bull;</span>
                      <span>{catSubCount} subs ({catProdCount} pcs)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(cat);
                        setIsCategoryModalOpen(true);
                      }}
                      className="p-1.5 text-charcoal-400 hover:text-[#B89555] hover:bg-light-hover rounded-lg transition-colors"
                      title="Edit Category"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInitiateDeleteCategory(cat)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Subcategories of Selected Category */}
        <div className="col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-light-border shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-light-border pb-3 flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-charcoal-900">
                  Subcategories under &quot;{selectedCategory?.name || 'Category'}&quot;
                </h2>
                <span className="text-[11px] font-bold bg-light-elevated text-[#B89555] border border-light-border px-2 py-0.5 rounded-md">
                  {activeSubcategories.length}
                </span>
              </div>
              <p className="text-xs text-charcoal-500 mt-0.5">
                Garments assigned to this category can be sub-divided into these items (e.g. Vests, Boxers, Briefs).
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddSubcategory}
              className="text-xs font-bold bg-champagne-500 hover:bg-champagne-400 text-charcoal-950 h-8 px-3 rounded-xl shadow-xs transition-colors"
            >
              Add Subcategory
            </button>
          </div>

          {activeSubcategories.length === 0 ? (
            <div className="text-center py-12 space-y-2 bg-light-elevated rounded-xl border border-light-border">
              <p className="text-xs font-bold text-charcoal-900">No subcategories in {selectedCategory?.name}.</p>
              <p className="text-[11px] text-charcoal-500">Click &quot;Add Subcategory&quot; above to create one.</p>
            </div>
          ) : (
            <div className="border border-light-border rounded-xl divide-y divide-light-border overflow-hidden">
              {activeSubcategories.map((sub) => {
                const subProdsCount = products.filter((p) => p.subcategoryId === sub.id).length;

                return (
                  <div
                    key={sub.id}
                    className="p-3.5 flex items-center justify-between hover:bg-light-hover transition-colors bg-white"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs sm:text-sm text-charcoal-900">{sub.name}</h4>
                        <span className="text-[10px] text-charcoal-500 font-mono bg-light-elevated px-1.5 py-0.5 rounded border border-light-border">
                          /{sub.slug}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleSubcategoryActive(sub)}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                            sub.isActive !== false
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-rose-50 text-rose-700 border-rose-300'
                          }`}
                        >
                          {sub.isActive !== false ? 'Active' : 'Hidden'}
                        </button>
                      </div>
                      <p className="text-xs text-charcoal-500">
                        Order #{sub.displayOrder || 1} &bull; {subProdsCount} live garment(s)
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSubcategory(sub);
                          setIsSubcategoryModalOpen(true);
                        }}
                        className="p-1.5 text-charcoal-400 hover:text-[#B89555] hover:bg-light-hover rounded-lg transition-colors"
                        title="Edit Subcategory"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInitiateDeleteSubcategory(sub)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Subcategory"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MOBILE DRILL-DOWN VIEW (md:hidden) */}
      {/* ========================================================================= */}
      <div className="md:hidden space-y-4">
        {/* Mobile View 1: List of Main Categories */}
        {mobileActiveView === 'categories' && (
          <div className="bg-white rounded-2xl p-4 border border-light-border space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-light-border pb-2">
              <h2 className="text-xs font-bold text-[#B89555] uppercase tracking-wider">
                Categories ({categories.length})
              </h2>
              <span className="text-[11px] text-charcoal-500">Tap category to manage subcategories</span>
            </div>

            <div className="space-y-2">
              {sortedCategories.map((cat) => {
                const subsCount = subcategories.filter((s) => s.categoryId === cat.id).length;

                return (
                  <div
                    key={cat.id}
                    className="p-3.5 bg-light-elevated rounded-xl border border-light-border flex items-center justify-between"
                  >
                    <div
                      onClick={() => {
                        setSelectedCatId(cat.id);
                        setMobileActiveView('subcategories');
                      }}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-charcoal-900">{cat.name}</h3>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                            cat.isActive !== false
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-rose-50 text-rose-700 border-rose-300'
                          }`}
                        >
                          {cat.isActive !== false ? 'Active' : 'Hidden'}
                        </span>
                      </div>
                      <p className="text-xs text-charcoal-500 mt-0.5">
                        /{cat.slug} &bull; {subsCount} subcategories &rarr;
                      </p>
                    </div>

                    <div className="flex items-center gap-1 pl-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategory(cat);
                          setIsCategoryModalOpen(true);
                        }}
                        className="p-2 text-charcoal-400 hover:text-[#B89555] bg-white rounded-lg border border-light-border"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInitiateDeleteCategory(cat)}
                        className="p-2 text-rose-600 hover:bg-rose-50 bg-white rounded-lg border border-light-border"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Mobile View 2: Subcategories of Selected Category */}
        {mobileActiveView === 'subcategories' && (
          <div className="bg-white rounded-2xl p-4 border border-light-border space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-light-border pb-3">
              <button
                type="button"
                onClick={() => setMobileActiveView('categories')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B89555] bg-light-elevated px-3 py-1.5 rounded-xl border border-light-border"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Categories</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddSubcategory}
                className="text-xs font-bold bg-champagne-500 hover:bg-champagne-400 text-charcoal-950 px-3 py-1.5 rounded-xl shadow-xs"
              >
                Add Sub
              </button>
            </div>

            <div>
              <h3 className="font-bold text-sm text-charcoal-900 uppercase tracking-wider">
                {selectedCategory?.name} &bull; Subcategories ({activeSubcategories.length})
              </h3>
              <p className="text-[11px] text-charcoal-500 mt-0.5">Manage subcategory tiers for this department.</p>
            </div>

            {activeSubcategories.length === 0 ? (
              <div className="p-8 text-center bg-light-elevated rounded-xl border border-light-border">
                <p className="text-xs text-charcoal-500">No subcategories created yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeSubcategories.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-3 bg-light-elevated rounded-xl border border-light-border flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-charcoal-900">{sub.name}</h4>
                        <span className="text-[10px] text-charcoal-500 font-mono">/{sub.slug}</span>
                      </div>
                      <p className="text-[11px] text-charcoal-500">Order #{sub.displayOrder || 1}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSubcategory(sub);
                          setIsSubcategoryModalOpen(true);
                        }}
                        className="p-2 text-charcoal-400 bg-white rounded-lg border border-light-border"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInitiateDeleteSubcategory(sub)}
                        className="p-2 text-rose-600 bg-white rounded-lg border border-light-border"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Add / Edit Main Category */}
      {/* ========================================================================= */}
      {isCategoryModalOpen && editingCategory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-elevation border border-light-border space-y-4 text-charcoal-900">
            <div className="flex items-center justify-between border-b border-light-border pb-3">
              <h3 className="font-bold text-base text-charcoal-900">
                {editingCategory.name ? `Edit Category` : `Add Main Category`}
              </h3>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-charcoal-400 hover:text-charcoal-900 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategoryForm} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-charcoal-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Men, Women, Kids, Sports Wear, Accessories"
                  value={editingCategory.name || ''}
                  onChange={(e) => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    setEditingCategory({ ...editingCategory, name, slug });
                  }}
                  className="w-full px-3 py-2 bg-light-elevated border border-light-border rounded-xl font-semibold text-charcoal-900 focus:border-[#B89555] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-charcoal-700 mb-1">URL Slug *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. men, women, kids, sports-wear"
                  value={editingCategory.slug || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, slug: e.target.value })}
                  className="w-full px-3 py-2 bg-light-elevated border border-light-border rounded-xl font-mono text-[#B89555] focus:border-[#B89555] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-charcoal-700 mb-1">Display Order #</label>
                <input
                  type="number"
                  min={1}
                  value={editingCategory.displayOrder || 1}
                  onChange={(e) => setEditingCategory({ ...editingCategory, displayOrder: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-light-elevated border border-light-border rounded-xl font-bold text-charcoal-900 focus:border-[#B89555] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-charcoal-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Short description of this category..."
                  value={editingCategory.description || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  className="w-full px-3 py-2 bg-light-elevated border border-light-border rounded-xl text-charcoal-900 focus:border-[#B89555] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="cat-active"
                  checked={editingCategory.isActive ?? true}
                  onChange={(e) => setEditingCategory({ ...editingCategory, isActive: e.target.checked })}
                  className="rounded accent-[#B89555] w-4 h-4"
                />
                <label htmlFor="cat-active" className="font-semibold text-charcoal-900 cursor-pointer">
                  Visible &amp; Active in Navigation
                </label>
              </div>

              <div className="pt-3 border-t border-light-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="h-9 px-4 bg-light-elevated hover:bg-light-hover text-charcoal-600 font-semibold rounded-xl border border-light-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-5 bg-champagne-500 hover:bg-champagne-400 text-charcoal-950 font-bold rounded-xl shadow-xs"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Add / Edit Subcategory */}
      {/* ========================================================================= */}
      {isSubcategoryModalOpen && editingSubcategory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-elevation border border-light-border space-y-4 text-charcoal-900">
            <div className="flex items-center justify-between border-b border-light-border pb-3">
              <h3 className="font-bold text-base text-charcoal-900">
                {editingSubcategory.name ? `Edit Subcategory` : `Add Subcategory`}
              </h3>
              <button
                type="button"
                onClick={() => setIsSubcategoryModalOpen(false)}
                className="text-charcoal-400 hover:text-charcoal-900 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubcategoryForm} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-charcoal-700 mb-1">Parent Category *</label>
                <select
                  value={editingSubcategory.categoryId || selectedCategory?.id}
                  onChange={(e) => setEditingSubcategory({ ...editingSubcategory, categoryId: e.target.value })}
                  className="w-full px-3 py-2 bg-light-elevated border border-light-border rounded-xl font-semibold text-charcoal-900 focus:border-[#B89555] focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} className="bg-white text-charcoal-900">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-charcoal-700 mb-1">Subcategory Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vests, Boxers, Briefs, Compression Wear"
                  value={editingSubcategory.name || ''}
                  onChange={(e) => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    setEditingSubcategory({ ...editingSubcategory, name, slug });
                  }}
                  className="w-full px-3 py-2 bg-light-elevated border border-light-border rounded-xl font-semibold text-charcoal-900 focus:border-[#B89555] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-charcoal-700 mb-1">URL Slug *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. vests, boxers, briefs, compression-wear"
                  value={editingSubcategory.slug || ''}
                  onChange={(e) => setEditingSubcategory({ ...editingSubcategory, slug: e.target.value })}
                  className="w-full px-3 py-2 bg-light-elevated border border-light-border rounded-xl font-mono text-[#B89555] focus:border-[#B89555] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-charcoal-700 mb-1">Display Order #</label>
                <input
                  type="number"
                  min={1}
                  value={editingSubcategory.displayOrder || 1}
                  onChange={(e) => setEditingSubcategory({ ...editingSubcategory, displayOrder: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-light-elevated border border-light-border rounded-xl font-bold text-charcoal-900 focus:border-[#B89555] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-charcoal-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Short summary of this subcategory..."
                  value={editingSubcategory.description || ''}
                  onChange={(e) => setEditingSubcategory({ ...editingSubcategory, description: e.target.value })}
                  className="w-full px-3 py-2 bg-light-elevated border border-light-border rounded-xl text-charcoal-900 focus:border-[#B89555] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="sub-active"
                  checked={editingSubcategory.isActive ?? true}
                  onChange={(e) => setEditingSubcategory({ ...editingSubcategory, isActive: e.target.checked })}
                  className="rounded accent-[#B89555] w-4 h-4"
                />
                <label htmlFor="sub-active" className="font-semibold text-charcoal-900 cursor-pointer">
                  Visible &amp; Active in Navigation
                </label>
              </div>

              <div className="pt-3 border-t border-light-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSubcategoryModalOpen(false)}
                  className="h-9 px-4 bg-light-elevated hover:bg-light-hover text-charcoal-600 font-semibold rounded-xl border border-light-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-5 bg-champagne-500 hover:bg-champagne-400 text-charcoal-950 font-bold rounded-xl shadow-xs"
                >
                  Save Subcategory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
