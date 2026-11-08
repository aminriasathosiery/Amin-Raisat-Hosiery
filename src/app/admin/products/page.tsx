'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { useStore } from '@/context/StoreContext';
import { Product, ProductVariant, ProductMedia, ProductColor } from '@/types';
import { calculateSalePrice, validateDiscountPercentage, resolveVariantPricing, formatPKR } from '@/lib/pricing';
import {
  Package,
  Plus,
  Trash2,
  Edit2,
  Save,
  Check,
  Upload,
  Film,
  X,
  ArrowLeft,
  Boxes,
  Zap,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Layers,
  ChevronRight,
  TrendingUp,
  Percent,
  DollarSign,
  TrendingDown,
  Copy,
  Palette,
  ChevronUp,
  ChevronDown,
  ImageIcon,
} from 'lucide-react';
import { ConfirmModal } from '@/components/admin/ConfirmModal';
import { optimizeImageForUpload } from '@/lib/imageOptimizer';
import { parseVideoUrl } from '@/lib/videoParser';

function AdminProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    products,
    categories,
    subcategories,
    saveProduct,
    duplicateProduct,
    deleteProduct,
    uploadMediaFile,
    isLoading,
  } = useStore();

  // Mode: 'list' | 'editor'
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isDuplicatingId, setIsDuplicatingId] = useState<string | null>(null);

  // Notification Toast
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  // Delete Confirmation Modal State
  const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; productId: string; productName: string }>({
    isOpen: false,
    productId: '',
    productName: '',
  });

  // Clear Matrix Modal State
  const [isClearMatrixModalOpen, setIsClearMatrixModalOpen] = useState(false);

  // Reorder Modal State
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [reorderProducts, setReorderProducts] = useState<Product[]>([]);

  // ------------------ 1. BASIC PRODUCT INFO STATE ------------------
  const [prodName, setProdName] = useState('');
  const [prodQualityGrade, setProdQualityGrade] = useState('High Quality');
  const [prodSlug, setProdSlug] = useState('');
  const [prodSubtitle, setProdSubtitle] = useState('');
  const [prodShortDesc, setProdShortDesc] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodVideoUrl, setProdVideoUrl] = useState('');
  const [prodSizeGuideUrl, setProdSizeGuideUrl] = useState('');
  const [isUploadingSizeGuide, setIsUploadingSizeGuide] = useState(false);
  const [prodCategoryId, setProdCategoryId] = useState('');
  const [prodSubcategoryId, setProdSubcategoryId] = useState('');
  const [prodIsPublished, setProdIsPublished] = useState(true);
  const [prodFeaturesText, setProdFeaturesText] = useState('');
  const [prodCareText, setProdCareText] = useState('');
  const [prodShippingText, setProdShippingText] = useState('');

  // ------------------ 2. DYNAMIC VARIANT SYSTEM STATE ------------------
  const [customQualities, setCustomQualities] = useState<string[]>(['High Quality']);
  const [newQualityInput, setNewQualityInput] = useState('');
  const [isAddQualityOpen, setIsAddQualityOpen] = useState(false);

  const [customStyles, setCustomStyles] = useState<string[]>(['Sleeveless', 'Full Sleeve']);
  const [newStyleInput, setNewStyleInput] = useState('');
  const [isAddStyleOpen, setIsAddStyleOpen] = useState(false);

  const [customSizes, setCustomSizes] = useState<string[]>(['S', 'M', 'L', 'XL', 'XXL']);
  const [newSizeInput, setNewSizeInput] = useState('');
  const [isAddSizeOpen, setIsAddSizeOpen] = useState(false);

  // Matrix Generator Settings
  const [genDefaultPrice, setGenDefaultPrice] = useState(480);
  const [genDefaultDiscount, setGenDefaultDiscount] = useState<number>(0);
  const [genDefaultStock, setGenDefaultStock] = useState(50);

  // Color Variants System State (Daraz-style)
  const [prodColors, setProdColors] = useState<ProductColor[]>([]);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#FFFFFF');
  const [isAddColorOpen, setIsAddColorOpen] = useState(false);
  const [mediaPickerColorId, setMediaPickerColorId] = useState<string | null>(null);
  const [isUploadingColorId, setIsUploadingColorId] = useState<string | null>(null);

  // Individual Variant Add State
  const [isAddSingleVarOpen, setIsAddSingleVarOpen] = useState(false);
  const [singleVarQuality, setSingleVarQuality] = useState('');
  const [singleVarStyle, setSingleVarStyle] = useState('');
  const [singleVarSize, setSingleVarSize] = useState('');
  const [singleVarColor, setSingleVarColor] = useState('');
  const [singleVarPrice, setSingleVarPrice] = useState(480);
  const [singleVarDiscount, setSingleVarDiscount] = useState<number>(0);
  const [singleVarStock, setSingleVarStock] = useState(50);
  const [singleVarSku, setSingleVarSku] = useState('');

  // Master Variants List
  const [variantsList, setVariantsList] = useState<ProductVariant[]>([]);

  // ------------------ 3. MEDIA UPLOAD STATE ------------------
  const [mediaList, setMediaList] = useState<ProductMedia[]>([]);
  const [uploadQualityTarget, setUploadQualityTarget] = useState<string>('All');
  const [uploadSleeveTarget, setUploadSleeveTarget] = useState<string>('All');
  const [uploadColorTarget, setUploadColorTarget] = useState<string>('All');
  const [uploadMediaTitle, setUploadMediaTitle] = useState('');
  const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'uploaded' | 'failed'>('idle');

  // Active Editor Tab
  const [editorTab, setEditorTab] = useState<'basic' | 'media' | 'variants' | 'sizeguide'>('basic');

  // Search & Filter
  const [catalogSearch, setCatalogSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Handle URL query parameters (e.g. ?edit=prod-123&tab=variants)
  useEffect(() => {
    const editId = searchParams.get('edit');
    const tabParam = searchParams.get('tab');

    if (editId && products.length > 0) {
      const targetProd = products.find((p) => p.id === editId);
      if (targetProd) {
        handleStartEdit(targetProd);
        if (tabParam === 'variants' || tabParam === 'basic' || tabParam === 'media' || tabParam === 'sizeguide') {
          setEditorTab(tabParam as any);
        }
      }
    }
  }, [searchParams, products]);

  // Available subcategories for chosen category
  const activeSubcatsForCategory = useMemo(() => {
    if (!prodCategoryId) return subcategories;
    return subcategories.filter((s) => s.categoryId === prodCategoryId);
  }, [prodCategoryId, subcategories]);

  // Available styles extracted from current matrix for media target selector
  const availableVariantStylesForMedia = useMemo(() => {
    const fromVars = Array.from(new Set(variantsList.map((v) => v.sleeve).filter(Boolean)));
    return fromVars.length > 0 ? fromVars : customStyles;
  }, [variantsList, customStyles]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        (p.subtitle || '').toLowerCase().includes(catalogSearch.toLowerCase()) ||
        p.slug.toLowerCase().includes(catalogSearch.toLowerCase());
      const matchCategory = categoryFilter === 'all' || p.categoryId === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [products, catalogSearch, categoryFilter]);

  // ------------------ OPEN CREATE FORM ------------------
  const handleStartCreate = () => {
    setEditingProductId(null);
    setProdName('');
    setProdQualityGrade('High Quality');
    setProdSlug('');
    setProdSubtitle('');
    setProdShortDesc('');
    setProdDesc('');
    setProdVideoUrl('');
    setProdSizeGuideUrl('');
    const defaultCat = categories[0]?.id || '';
    setProdCategoryId(defaultCat);
    const defaultSub = subcategories.find((s) => s.categoryId === defaultCat)?.id || '';
    setProdSubcategoryId(defaultSub);
    setProdIsPublished(true);
    setProdFeaturesText('100% Pure Combed Cotton\nAnti-Sag Double Top-Stitched Neck\nBreathable 1x1 Rib Knit Weave\nPre-Shrunk Colorfast Fabric');
    setProdCareText('Machine wash cold\nDo not bleach\nTumble dry low\nWarm iron if needed');
    setProdShippingText('Nationwide Cash on Delivery (COD) across Pakistan. Free delivery on 3+ pieces.');

    const initialQualities = ['High Quality'];
    const initialStyles = ['Sleeveless', 'Full Sleeve'];
    const catObj = categories.find((c) => c.id === defaultCat);
    const initialSizes = catObj?.availableSizes && catObj.availableSizes.length > 0
      ? catObj.availableSizes
      : ['S', 'M', 'L', 'XL', 'XXL'];

    setCustomQualities(initialQualities);
    setCustomStyles(initialStyles);
    setCustomSizes(initialSizes);
    setProdColors([]);

    setVariantsList([
      {
        id: `var-new-1`,
        productId: '',
        quality: 'High Quality',
        sleeve: 'Sleeveless',
        size: initialSizes[0] || 'L',
        price: 480,
        stock: 50,
        sku: 'ARH-HQ-SL-L',
        isAvailable: true,
      },
    ]);
    setMediaList([]);
    setEditorTab('basic');
    setViewMode('editor');
  };

  // ------------------ OPEN EDIT FORM ------------------
  const handleStartEdit = (prod: Product) => {
    setEditingProductId(prod.id);
    setProdName(prod.name);
    setProdQualityGrade(prod.variants?.[0]?.quality || 'High Quality');
    setProdSlug(prod.slug);
    setProdSubtitle(prod.subtitle || '');
    setProdShortDesc(prod.shortDescription || '');
    setProdDesc(prod.description || '');
    setProdVideoUrl(prod.videoUrl || prod.media?.find((m) => m.type === 'video')?.url || '');
    setProdSizeGuideUrl(prod.sizeGuideUrl || prod.media?.find((m) => m.type === 'size_guide' || m.variantSleeve === 'size_guide')?.url || '');
    setProdCategoryId(prod.categoryId);
    setProdSubcategoryId(prod.subcategoryId || '');
    setProdIsPublished(prod.isPublished);
    setProdFeaturesText(prod.features ? prod.features.join('\n') : '');
    setProdCareText(prod.careInstructions ? prod.careInstructions.join('\n') : '');
    setProdShippingText(prod.shippingInfo || '');

    const qualitiesFromVars = Array.from(
      new Set(prod.variants.map((v) => v.quality).filter(Boolean))
    );
    const stylesFromVars = Array.from(
      new Set(prod.variants.map((v) => v.sleeve).filter(Boolean))
    );
    const sizesFromVars = Array.from(
      new Set(prod.variants.map((v) => v.size).filter(Boolean))
    );

    setCustomQualities(qualitiesFromVars.length > 0 ? qualitiesFromVars : ['High Quality']);
    setCustomStyles(stylesFromVars.length > 0 ? stylesFromVars : ['Sleeveless', 'Full Sleeve']);
    setCustomSizes(sizesFromVars.length > 0 ? sizesFromVars : ['S', 'M', 'L', 'XL', 'XXL']);

    const loadedVariants = (prod.variants || []).map((v) => {
      const pricing = resolveVariantPricing(v);
      return {
        ...v,
        price: pricing.originalPrice,
        discountPercentage: pricing.discountPercentage,
        salePrice: pricing.isOnSale ? pricing.salePrice : pricing.originalPrice,
      };
    });
    // Load colors: either from prod.colors or reconstructed from variants & media
    let loadedColors: ProductColor[] = [];
    if (prod.colors && prod.colors.length > 0) {
      loadedColors = prod.colors.map((c, i) => {
        const colorMedia = (prod.media || []).filter((m) => m.color === c.name && m.type === 'photo');
        return {
          ...c,
          id: c.id || `col-${i + 1}`,
          image: c.image || colorMedia[0]?.url,
          additionalImages: c.additionalImages || colorMedia.slice(1).map((m) => m.url),
          displayOrder: c.displayOrder || i + 1,
          isActive: c.isActive !== false,
        };
      });
    } else {
      const variantColors = Array.from(new Set(prod.variants.map((v) => v.color).filter(Boolean) as string[]));
      loadedColors = variantColors.map((c, i) => {
        const colorMedia = (prod.media || []).filter((m) => m.color === c && m.type === 'photo');
        return {
          id: `col-${i + 1}`,
          name: c,
          hex: prod.variants.find((v) => v.color === c)?.colorHex || '#171717',
          image: colorMedia[0]?.url,
          additionalImages: colorMedia.slice(1).map((m) => m.url),
          displayOrder: i + 1,
          isActive: true,
        };
      });
    }
    setProdColors(loadedColors);

    setVariantsList(loadedVariants);
    setMediaList(prod.media || []);
    setEditorTab('basic');
    setViewMode('editor');
  };

  // ------------------ DUPLICATE PRODUCT ------------------
  const handleDuplicateProduct = async (prod: Product) => {
    try {
      setIsDuplicatingId(prod.id);
      const duplicated = await duplicateProduct(prod.id);
      showNotice(`Successfully duplicated "${prod.name}" as "${duplicated.name}"!`);
    } catch (err: any) {
      console.error('Duplication failed:', err);
      showNotice(err?.message || 'Failed to duplicate product.', 'error');
    } finally {
      setIsDuplicatingId(null);
    }
  };

  // ------------------ SAVE PRODUCT ------------------
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) {
      showNotice('Please enter a Product Name.', 'error');
      setEditorTab('basic');
      return;
    }

    // MANDATORY Size Guide validation
    if (!prodSizeGuideUrl.trim()) {
      showNotice('Size Guide image is required.', 'error');
      setEditorTab('sizeguide');
      return;
    }

    if (variantsList.length === 0) {
      showNotice('Please generate or add at least 1 variant for this product.', 'error');
      setEditorTab('variants');
      return;
    }

    const currentId = editingProductId || `prod-${Date.now()}`;
    let baseSlug = prodSlug.trim()
      ? prodSlug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      : prodName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    if (!baseSlug) {
      baseSlug = 'arh-product';
    }

    // Ensure slug uniqueness
    let uniqueSlug = baseSlug;
    let counter = 2;
    while (products.some((p) => p.slug === uniqueSlug && p.id !== currentId)) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }
    const autoSlug = uniqueSlug;

    const featuresArray = prodFeaturesText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const careArray = prodCareText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const cleanVariants: ProductVariant[] = variantsList.map((v, i) => {
      const pricing = resolveVariantPricing(v);

      return {
        ...v,
        id: v.id || `var-${currentId}-${i + 1}`,
        productId: currentId,
        quality: v.quality || prodQualityGrade || 'High Quality',
        color: v.color || undefined,
        colorHex: v.colorHex || undefined,
        price: pricing.originalPrice,
        discountPercentage: pricing.discountPercentage,
        salePrice: pricing.isOnSale ? pricing.salePrice : pricing.originalPrice,
        stock: Number(v.stock) || 0,
      };
    });

    let cleanMedia: ProductMedia[] = mediaList.map((m, i) => ({
      ...m,
      id: m.id || `med-${currentId}-${i + 1}`,
      productId: currentId,
    }));

    // Gallery media contains photos only; video is persisted as videoUrl
    cleanMedia = cleanMedia.filter((m) => m.type !== 'video');

    if (prodSizeGuideUrl.trim()) {
      cleanMedia = cleanMedia.filter((m) => m.type !== 'size_guide' && m.variantSleeve !== 'size_guide');
      cleanMedia.push({
        id: `med-${currentId}-sg`,
        productId: currentId,
        type: 'size_guide',
        url: prodSizeGuideUrl.trim(),
        alt: `${prodName.trim()} Size Guide Chart`,
        title: 'Size Guide',
        variantSleeve: 'size_guide',
        displayOrder: 99,
      });
    } else {
      cleanMedia = cleanMedia.filter((m) => m.type !== 'size_guide' && m.variantSleeve !== 'size_guide');
    }

    // Ensure all color images exist in cleanMedia with proper color tagging
    prodColors.forEach((c) => {
      if (c.image) {
        const alreadyInMedia = cleanMedia.some((m) => m.url === c.image);
        if (!alreadyInMedia) {
          cleanMedia.push({
            id: `med-${currentId}-col-${c.id}`,
            productId: currentId,
            type: 'photo',
            url: c.image,
            alt: `${prodName.trim()} in ${c.name}`,
            title: `${c.name} Primary Photo`,
            color: c.name,
            displayOrder: cleanMedia.length + 1,
          });
        } else {
          cleanMedia = cleanMedia.map((m) => (m.url === c.image ? { ...m, color: c.name } : m));
        }
      }
      if (c.additionalImages && c.additionalImages.length > 0) {
        c.additionalImages.forEach((imgUrl, addIdx) => {
          const already = cleanMedia.some((m) => m.url === imgUrl);
          if (!already) {
            cleanMedia.push({
              id: `med-${currentId}-col-${c.id}-add-${addIdx}`,
              productId: currentId,
              type: 'photo',
              url: imgUrl,
              alt: `${prodName.trim()} in ${c.name} extra view`,
              title: `${c.name} Extra View`,
              color: c.name,
              displayOrder: cleanMedia.length + 1,
            });
          } else {
            cleanMedia = cleanMedia.map((m) => (m.url === imgUrl ? { ...m, color: c.name } : m));
          }
        });
      }
    });

    const productToSave: Product = {
      id: currentId,
      categoryId: prodCategoryId || categories[0]?.id || '',
      subcategoryId: prodSubcategoryId || undefined,
      name: prodName.trim(),
      slug: autoSlug,
      subtitle: prodSubtitle.trim(),
      shortDescription: prodShortDesc.trim() || undefined,
      description: prodDesc.trim(),
      videoUrl: prodVideoUrl.trim() || undefined,
      sizeGuideUrl: prodSizeGuideUrl.trim(),
      features: featuresArray,
      qualityComparison: {
        highQuality: {
          neck: 'Ribbed binding with double top-stitch',
          shoulders: 'Clean finished tape',
          stitching: 'Reinforced anti-sag seams',
          feel: '100% fine combed cotton',
        },
        standardQuality: {
          neck: 'Standard rib finish',
          shoulders: 'Single needle stitch',
          stitching: 'Standard durable overlock',
          feel: '100% pure cotton',
        },
      },
      careInstructions: careArray,
      shippingInfo: prodShippingText.trim(),
      returnPolicy: 'Hassle-free exchange within 7 days of delivery for sizing or manufacturing defect.',
      isPublished: prodIsPublished,
      colors: prodColors,
      createdAt: editingProductId
        ? products.find((p) => p.id === editingProductId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
      variants: cleanVariants,
      media: cleanMedia,
    };

    try {
      await saveProduct(productToSave);
      showNotice(`Successfully saved "${productToSave.name}" with ${cleanVariants.length} variants!`);
      setViewMode('list');
    } catch (err: any) {
      console.error(err);
      showNotice(err?.message || 'Failed to save product.', 'error');
    }
  };

  // ------------------ DELETE PRODUCT ------------------
  const handleConfirmDeleteProduct = async () => {
    if (!deleteModalState.productId) return;
    try {
      await deleteProduct(deleteModalState.productId);
      showNotice(`Deleted "${deleteModalState.productName}"`);
      setDeleteModalState({ isOpen: false, productId: '', productName: '' });
      if (editingProductId === deleteModalState.productId) {
        setViewMode('list');
      }
    } catch (err) {
      showNotice('Failed to delete product.', 'error');
    }
  };

  // ------------------ TAXONOMY ACTIONS ------------------
  const handleAddQuality = () => {
    if (!newQualityInput.trim()) return;
    const clean = newQualityInput.trim();
    if (!customQualities.includes(clean)) {
      setCustomQualities([...customQualities, clean]);
    }
    setNewQualityInput('');
    setIsAddQualityOpen(false);
  };

  const handleRemoveQuality = (qToRemove: string) => {
    if (customQualities.length <= 1) {
      showNotice('Product must have at least 1 quality level.', 'error');
      return;
    }
    setCustomQualities(customQualities.filter((q) => q !== qToRemove));
  };

  const handleAddStyle = () => {
    if (!newStyleInput.trim()) return;
    const clean = newStyleInput.trim();
    if (!customStyles.includes(clean)) {
      setCustomStyles([...customStyles, clean]);
    }
    setNewStyleInput('');
    setIsAddStyleOpen(false);
  };

  const handleRemoveStyle = (stToRemove: string) => {
    if (customStyles.length <= 1) {
      showNotice('Product must have at least 1 style/sleeve option.', 'error');
      return;
    }
    setCustomStyles(customStyles.filter((st) => st !== stToRemove));
  };

  const handleAddSize = () => {
    if (!newSizeInput.trim()) return;
    const clean = newSizeInput.trim();
    if (!customSizes.includes(clean)) {
      setCustomSizes([...customSizes, clean]);
    }
    setNewSizeInput('');
    setIsAddSizeOpen(false);
  };

  const handleRemoveSize = (sizeToRemove: string) => {
    if (customSizes.length <= 1) {
      showNotice('Product must have at least 1 size option.', 'error');
      return;
    }
    setCustomSizes(customSizes.filter((s) => s !== sizeToRemove));
  };

  // ------------------ COLOR ACTIONS (DARAZ-STYLE COLOR VARIANT MANAGEMENT) ------------------
  const handleAddAnotherColor = (presetName?: string, presetHex?: string) => {
    const name = presetName || `Color ${prodColors.length + 1}`;
    const hex = presetHex || '#FFFFFF';
    const newCol: ProductColor = {
      id: `col-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      hex,
      image: undefined,
      additionalImages: [],
      displayOrder: prodColors.length + 1,
      isActive: true,
    };
    setProdColors([...prodColors, newCol]);
  };

  const handleUpdateColorName = (colorId: string, newName: string) => {
    const oldColor = prodColors.find((c) => c.id === colorId);
    const oldName = oldColor?.name;
    setProdColors((prev) =>
      prev.map((c) => (c.id === colorId ? { ...c, name: newName } : c))
    );
    if (oldName && oldName !== newName) {
      setVariantsList((prev) =>
        prev.map((v) => (v.color === oldName ? { ...v, color: newName } : v))
      );
      setMediaList((prev) =>
        prev.map((m) => (m.color === oldName ? { ...m, color: newName } : m))
      );
    }
  };

  const handleUploadColorPrimaryImage = async (colorId: string, file: File) => {
    try {
      setIsUploadingColorId(colorId);
      const url = await uploadMediaFile(file);
      const targetColor = prodColors.find((c) => c.id === colorId);

      setProdColors((prev) =>
        prev.map((c) => {
          if (c.id === colorId) {
            return { ...c, image: url };
          }
          return c;
        })
      );

      if (targetColor) {
        setMediaList((prev) => {
          const exists = prev.find((m) => m.url === url);
          if (exists) {
            return prev.map((m) => (m.url === url ? { ...m, color: targetColor.name } : m));
          }
          return [
            ...prev,
            {
              id: `med-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              type: 'photo',
              url,
              color: targetColor.name,
              displayOrder: prev.length + 1,
            },
          ];
        });
      }
      showNotice('Color image uploaded and assigned successfully!');
    } catch (err: any) {
      console.error('Upload color image error:', err);
      showNotice(err?.message || 'Failed to upload color image.', 'error');
    } finally {
      setIsUploadingColorId(null);
    }
  };

  const handleSelectMediaCenterImage = (colorId: string, imageUrl: string, asAdditional = false) => {
    const targetColor = prodColors.find((c) => c.id === colorId);
    if (!targetColor) return;

    setProdColors((prev) =>
      prev.map((c) => {
        if (c.id === colorId) {
          if (asAdditional) {
            const currentAdd = c.additionalImages || [];
            if (!currentAdd.includes(imageUrl)) {
              return { ...c, additionalImages: [...currentAdd, imageUrl] };
            }
            return c;
          }
          return { ...c, image: imageUrl };
        }
        return c;
      })
    );

    // Tag media in mediaList to this color
    setMediaList((prev) =>
      prev.map((m) => (m.url === imageUrl ? { ...m, color: targetColor.name } : m))
    );
    showNotice(`Image assigned to "${targetColor.name}"`);
  };

  const handleRemoveColorPrimaryImage = (colorId: string) => {
    setProdColors((prev) =>
      prev.map((c) => (c.id === colorId ? { ...c, image: undefined } : c))
    );
  };

  const handleRemoveColorAdditionalImage = (colorId: string, imgUrl: string) => {
    setProdColors((prev) =>
      prev.map((c) => {
        if (c.id === colorId) {
          return {
            ...c,
            additionalImages: (c.additionalImages || []).filter((u) => u !== imgUrl),
          };
        }
        return c;
      })
    );
  };

  const handleMoveColor = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= prodColors.length) return;
    const updated = [...prodColors];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setProdColors(updated.map((c, idx) => ({ ...c, displayOrder: idx + 1 })));
  };

  const handleRemoveColor = (colorIdentifier: string) => {
    const target = prodColors.find((c) => c.id === colorIdentifier || c.name === colorIdentifier);
    if (!target) return;
    const colorName = target.name;
    setProdColors(prodColors.filter((c) => c.id !== target.id));
    setVariantsList((prev) => prev.filter((v) => v.color !== colorName));
    // Clear color tag in mediaList
    setMediaList((prev) =>
      prev.map((m) => (m.color === colorName ? { ...m, color: undefined } : m))
    );
  };

  const handleToggleColorActive = (colorIdentifier: string) => {
    setProdColors(
      prodColors.map((c) =>
        c.id === colorIdentifier || c.name === colorIdentifier ? { ...c, isActive: !c.isActive } : c
      )
    );
  };

  // ------------------ BULK GENERATE ALL COMBINATIONS ------------------
  const handleGenerateCombinations = () => {
    if (customQualities.length === 0 || customStyles.length === 0 || customSizes.length === 0) {
      showNotice('Please define at least 1 quality, 1 style, and 1 size before generating variants.', 'error');
      return;
    }

    const prodPrefix = (prodName.trim() || 'ARH')
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 4);

    const generated: ProductVariant[] = [];
    let count = 1;
    const activeColors = prodColors.filter((c) => c.isActive !== false);

    for (const q of customQualities) {
      for (const st of customStyles) {
        for (const sz of customSizes) {
          if (activeColors.length > 0) {
            for (const col of activeColors) {
              const qShort = q.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 3);
              const stShort = st.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 3);
              const colShort = col.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
              const skuCode = `${prodPrefix}-${colShort}-${qShort}-${stShort}-${sz}`;

              const existing = variantsList.find(
                (v) => v.color === col.name && v.quality === q && v.sleeve === st && v.size === sz
              );

              const retail = existing ? existing.price : genDefaultPrice;
              const discount = existing && existing.discountPercentage !== undefined
                ? existing.discountPercentage
                : genDefaultDiscount;
              const sale = discount > 0 ? calculateSalePrice(retail, discount) : retail;

              generated.push({
                id: existing ? existing.id : `var-gen-${Date.now()}-${count++}`,
                productId: editingProductId || '',
                quality: q,
                sleeve: st,
                size: sz,
                color: col.name,
                colorHex: col.hex,
                price: retail,
                discountPercentage: discount,
                salePrice: sale,
                stock: existing ? existing.stock : genDefaultStock,
                sku: existing?.sku || skuCode,
                isAvailable: existing ? existing.isAvailable : true,
              });
            }
          } else {
            const qShort = q.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 3);
            const stShort = st.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 3);
            const skuCode = `${prodPrefix}-${qShort}-${stShort}-${sz}`;

            const existing = variantsList.find(
              (v) => !v.color && v.quality === q && v.sleeve === st && v.size === sz
            );

            const retail = existing ? existing.price : genDefaultPrice;
            const discount = existing && existing.discountPercentage !== undefined
              ? existing.discountPercentage
              : genDefaultDiscount;
            const sale = discount > 0 ? calculateSalePrice(retail, discount) : retail;

            generated.push({
              id: existing ? existing.id : `var-gen-${Date.now()}-${count++}`,
              productId: editingProductId || '',
              quality: q,
              sleeve: st,
              size: sz,
              price: retail,
              discountPercentage: discount,
              salePrice: sale,
              stock: existing ? existing.stock : genDefaultStock,
              sku: existing?.sku || skuCode,
              isAvailable: existing ? existing.isAvailable : true,
            });
          }
        }
      }
    }

    setVariantsList(generated);
    showNotice(`Generated matrix with ${generated.length} variant combinations!`);
  };

  // ------------------ BULK APPLY DISCOUNT TO MATRIX ------------------
  const handleApplyBulkDiscountToMatrix = (bulkDiscountPercent: number) => {
    const validated = validateDiscountPercentage(bulkDiscountPercent);
    if (!validated.isValid) {
      showNotice(validated.error || 'Please enter a valid discount percentage (0-99%).', 'error');
      return;
    }
    const disc = validated.value;
    setVariantsList((prev) =>
      prev.map((v) => {
        const orig = Math.max(0, Number(v.price) || 0);
        const sale = disc > 0 ? calculateSalePrice(orig, disc) : orig;
        return {
          ...v,
          price: orig,
          discountPercentage: disc,
          salePrice: sale,
        };
      })
    );
    showNotice(`Applied ${disc}% discount across all ${variantsList.length} variants in matrix!`);
  };

  // ------------------ ADD SINGLE CUSTOM VARIANT ------------------
  const handleAddSingleVariant = () => {
    const q = singleVarQuality || customQualities[0] || 'High Quality';
    const st = singleVarStyle || customStyles[0] || 'Sleeveless';
    const sz = singleVarSize || customSizes[0] || 'L';

    const prodPrefix = (prodName.trim() || 'ARH')
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 4);
    const qShort = q.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 3);
    const stShort = st.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 3);
    const autoSku = singleVarSku.trim() || `${prodPrefix}-${qShort}-${stShort}-${sz}`;

    const retail = Number(singleVarPrice) || 480;
    const validated = validateDiscountPercentage(singleVarDiscount);
    const discount = validated.isValid ? validated.value : 0;
    const sale = discount > 0 ? calculateSalePrice(retail, discount) : retail;

    const chosenColor = prodColors.find((c) => c.name === singleVarColor);
    const newVariant: ProductVariant = {
      id: `var-custom-${Date.now()}`,
      productId: editingProductId || '',
      quality: q,
      sleeve: st,
      size: sz,
      color: singleVarColor || undefined,
      colorHex: chosenColor?.hex || undefined,
      price: retail,
      discountPercentage: discount,
      salePrice: sale,
      stock: Number(singleVarStock) || 50,
      sku: autoSku,
      isAvailable: true,
    };

    setVariantsList([...variantsList, newVariant]);
    setIsAddSingleVarOpen(false);
    showNotice(`Added custom variant: ${singleVarColor ? `${singleVarColor} • ` : ''}${q} • ${st} • ${sz}`);
  };

  // ------------------ MATRIX ROW UPDATES ------------------
  const handleUpdateVariantField = (
    id: string,
    field: keyof ProductVariant,
    value: any
  ) => {
    setVariantsList((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v;

        let updated = { ...v, [field]: value };

        if (field === 'price') {
          const orig = Math.max(0, Number(value) || 0);
          const disc = Math.min(99, Math.max(0, Number(updated.discountPercentage) || 0));
          const sale = disc > 0 ? calculateSalePrice(orig, disc) : orig;
          updated.price = orig;
          updated.salePrice = sale;
        } else if (field === 'discountPercentage') {
          const orig = Math.max(0, Number(updated.price) || 0);
          const validated = validateDiscountPercentage(value);
          const disc = validated.isValid ? validated.value : 0;
          const sale = disc > 0 ? calculateSalePrice(orig, disc) : orig;
          updated.discountPercentage = disc;
          updated.salePrice = sale;
        }

        return updated;
      })
    );
  };

  const handleRemoveVariant = (id: string) => {
    setVariantsList((prev) => prev.filter((v) => v.id !== id));
  };

  // ------------------ MEDIA UPLOADS ------------------
  const handleImageFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (uploadProgress === 'uploading') return;

    setUploadProgress('uploading');
    try {
      const newItems: ProductMedia[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Deduplication check: prevent identical file uploads
        const isDup = mediaList.some(
          (m) => m.title === file.name || m.title === (uploadMediaTitle || file.name)
        );
        if (isDup) {
          showNotice(`Skipped duplicate file: ${file.name}`, 'error');
          continue;
        }

        // Optimize image client-side before upload (1600px max width, WebP format, 0.82 quality)
        let fileToUpload = file;
        try {
          fileToUpload = await optimizeImageForUpload(file, { maxWidth: 1600, quality: 0.82 });
        } catch (optErr: any) {
          console.warn('Optimization notice, using original image:', optErr?.message);
        }

        // Upload to Supabase Storage bucket 'product-media'
        const prodMediaFolder = editingProductId
          ? `products/${editingProductId}/images`
          : 'products/images';
        const uploadedUrl = await uploadMediaFile(fileToUpload, 'product-media', prodMediaFolder);

        // Safety check: Never accept Base64 Data URLs
        if (uploadedUrl.startsWith('data:image')) {
          throw new Error('Image upload generated Base64 data. Supabase upload failed.');
        }

        newItems.push({
          id: `media-upl-${Date.now()}-${i}`,
          productId: editingProductId || '',
          type: 'photo',
          url: uploadedUrl,
          alt: `${prodName || 'Product'} photo`,
          title: uploadMediaTitle || file.name,
          displayOrder: mediaList.length + i + 1,
          variantQuality: uploadQualityTarget === 'All' ? undefined : uploadQualityTarget,
          variantSleeve: uploadSleeveTarget === 'All' ? undefined : uploadSleeveTarget,
          color: uploadColorTarget === 'All' ? undefined : uploadColorTarget,
        });
      }

      if (newItems.length > 0) {
        setMediaList((prev) => [...prev, ...newItems]);
        setUploadProgress('uploaded');
        showNotice(`Successfully uploaded ${newItems.length} photo(s) to storage.`);
      } else {
        setUploadProgress('idle');
      }
      setUploadMediaTitle('');
      setTimeout(() => setUploadProgress('idle'), 3000);
    } catch (err: any) {
      setUploadProgress('failed');
      const msg = err?.message || '';
      if (msg.includes('Storage limit reached')) {
        showNotice('Storage limit reached. Please remove unused media from Supabase Storage or upgrade the storage plan.', 'error');
      } else {
        showNotice(msg || 'Image upload failed. Please try again.', 'error');
      }
      setTimeout(() => setUploadProgress('idle'), 5000);
    } finally {
      e.target.value = '';
    }
  };

  const handleRemoveMedia = (id: string) => {
    setMediaList(mediaList.filter((m) => m.id !== id));
  };

  return (
    <div className="space-y-6 select-none">
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-elevation text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-2 ${
            notification.type === 'success'
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              : 'bg-rose-950 text-rose-300 border border-rose-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalState.isOpen}
        title="Delete Garment Catalog Listing"
        message={`Are you sure you want to permanently remove "${deleteModalState.productName}" and all associated variant combinations from the store?`}
        confirmLabel="Delete Garment"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmDeleteProduct}
        onCancel={() => setDeleteModalState({ isOpen: false, productId: '', productName: '' })}
      />

      {/* Clear Matrix Confirmation Modal */}
      <ConfirmModal
        isOpen={isClearMatrixModalOpen}
        title="Clear All Combinations"
        message="Are you sure you want to remove all variants from this matrix? You will need to regenerate or add variants before saving."
        confirmLabel="Clear Matrix"
        cancelLabel="Keep Variants"
        isDestructive={true}
        onConfirm={() => {
          setVariantsList([]);
          setIsClearMatrixModalOpen(false);
        }}
        onCancel={() => setIsClearMatrixModalOpen(false)}
      />

      {/* ========================================================================= */}
      {/* 1. MASTER PRODUCTS LIST VIEW */}
      {/* ========================================================================= */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-light-border shadow-sm">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-charcoal-900 flex items-center gap-2">
                <Package className="w-7 h-7 text-[#B89555]" />
                Products
              </h1>
              <p className="text-xs text-charcoal-500 mt-1">
                Manage garment listings, variants, pricing, and inventory.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setReorderProducts([...products].sort((a, b) => (a.sortOrder || 9999) - (b.sortOrder || 9999)));
                  setIsReorderModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-light-elevated hover:bg-light-hover text-charcoal-900 border border-light-border text-sm font-semibold rounded-xl transition-colors"
              >
                <Layers className="w-4 h-4 text-[#B89555]" />
                <span>Reorder</span>
              </button>
              <button
                type="button"
                onClick={handleStartCreate}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-champagne-500 hover:bg-champagne-400 text-charcoal-950 text-sm font-bold rounded-xl shadow-xs transition-all active:scale-[0.99]"
              >
                <Plus className="w-4 h-4 stroke-[2.2]" />
                <span>Create Product</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search products by name, tagline, slug..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-light-elevated border border-light-border text-charcoal-900 placeholder-charcoal-400 rounded-xl focus:border-[#B89555] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-charcoal-500">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-light-elevated border border-light-border text-charcoal-900 rounded-xl focus:border-[#B89555] focus:outline-none"
              >
                <option value="all">All Categories ({products.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Products List */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-light-border space-y-3">
              <Package className="w-12 h-12 text-charcoal-400 mx-auto" />
              <h3 className="font-bold text-base text-charcoal-900">No Products Found</h3>
              <p className="text-xs text-charcoal-500">
                {catalogSearch || categoryFilter !== 'all'
                  ? 'No garment matched your current search or category filter.'
                  : 'Start by creating your first garment listing with the button above.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredProducts.map((prod) => {
                const totalStock = prod.variants.reduce((acc, v) => acc + (v.stock || 0), 0);
                const prices = prod.variants.map((v) => v.price).filter((p) => p > 0);
                const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
                const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
                const firstImage = prod.media?.find((m) => m.type === 'photo')?.url || '/images/hero/product 1.png';

                const uniqueQualities = Array.from(new Set(prod.variants.map((v) => v.quality).filter(Boolean)));
                const uniqueSleeves = Array.from(new Set(prod.variants.map((v) => v.sleeve).filter(Boolean)));
                const catObj = categories.find((c) => c.id === prod.categoryId);

                return (
                  <div
                    key={prod.id}
                    className="bg-white p-4 sm:p-5 rounded-2xl border border-light-border hover:border-[#B89555]/40 transition-all duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm"
                  >
                    {/* Left: Thumbnail & Info */}
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-20 sm:w-20 sm:h-24 bg-light-elevated rounded-xl overflow-hidden flex-shrink-0 border border-light-border">
                        <Image
                          src={firstImage}
                          alt={prod.name}
                          fill
                          className="object-cover object-top"
                          sizes="80px"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-light-elevated text-charcoal-700 border border-light-border">
                            {catObj?.name || 'Garment'}
                          </span>
                          {prod.isPublished ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Published
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-charcoal-200 text-charcoal-700">
                              Draft
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-base sm:text-lg text-charcoal-900 leading-tight">
                          {prod.name}
                        </h3>
                        <p className="text-xs text-charcoal-500 line-clamp-1">{prod.subtitle}</p>

                        <div className="flex items-center gap-3 text-xs text-charcoal-500 pt-1 flex-wrap font-medium">
                          <span>
                            <strong className="text-charcoal-900">Retail:</strong>{' '}
                            <span className="text-[#B89555] font-bold">
                              {minPrice === maxPrice ? `Rs. ${minPrice}` : `Rs. ${minPrice} – Rs. ${maxPrice}`}
                            </span>
                          </span>
                          <span>•</span>
                          <span>
                            <strong className="text-charcoal-900">Stock:</strong> {totalStock} pcs
                          </span>
                          <span>•</span>
                          <span>
                            <strong className="text-charcoal-900">Variants:</strong> {prod.variants.length}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <a
                        href={`/product/${prod.slug}`}
                        target="_blank"
                        className="p-2 bg-light-elevated hover:bg-light-hover text-charcoal-600 hover:text-[#B89555] rounded-xl border border-light-border transition-colors"
                        title="View live product"
                      >
                        <Eye className="w-4 h-4" />
                      </a>

                      <button
                        type="button"
                        onClick={() => handleStartEdit(prod)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-light-elevated hover:bg-light-hover text-charcoal-900 border border-light-border hover:border-[#B89555] text-xs font-semibold rounded-xl shadow-xs transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-[#B89555]" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        disabled={isDuplicatingId === prod.id}
                        onClick={() => handleDuplicateProduct(prod)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-light-elevated hover:bg-light-hover text-charcoal-700 hover:text-[#B89555] border border-light-border hover:border-[#B89555] text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                        title="Duplicate this product and all its variants & media"
                      >
                        <Copy className="w-3.5 h-3.5 text-[#B89555]" />
                        <span>{isDuplicatingId === prod.id ? 'Duplicating...' : 'Duplicate'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteModalState({ isOpen: true, productId: prod.id, productName: prod.name })}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-300 transition-colors"
                        title="Delete garment listing"
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
      )}

      {/* ========================================================================= */}
      {/* 2. FULL PRODUCT EDIT / CREATE FORM */}
      {/* ========================================================================= */}
      {viewMode === 'editor' && (
        <form onSubmit={handleSaveProduct} className="space-y-6">
          {/* Top Bar Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-light-border shadow-sm">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="p-2 text-charcoal-500 hover:text-charcoal-900 hover:bg-light-hover rounded-xl transition-colors"
                title="Back to all products"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-charcoal-900">
                  {editingProductId ? `Edit Garment: ${prodName || 'Product'}` : 'Create New Garment Listing'}
                </h1>
                <p className="text-xs text-charcoal-500">
                  Set basic details and configure retail pricing for each variant combination.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-4 py-2 text-xs font-semibold text-charcoal-700 bg-light-elevated border border-light-border hover:bg-light-hover hover:text-charcoal-900 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2 bg-champagne-500 hover:bg-champagne-400 text-charcoal-950 text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.99]"
              >
                <Save className="w-4 h-4 stroke-[2.2]" />
                <span>Save Product</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-light-border pb-2 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setEditorTab('basic')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                editorTab === 'basic'
                  ? 'bg-light-elevated text-charcoal-900 border-b-2 border-[#B89555]'
                  : 'bg-white text-charcoal-500 hover:text-charcoal-900 border border-light-border'
              }`}
            >
              1. Basic Info
            </button>

            <button
              type="button"
              onClick={() => setEditorTab('media')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                editorTab === 'media'
                  ? 'bg-light-elevated text-charcoal-900 border-b-2 border-[#B89555]'
                  : 'bg-white text-charcoal-500 hover:text-charcoal-900 border border-light-border'
              }`}
            >
              <span>2. Photos &amp; Video ({mediaList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setEditorTab('variants')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                editorTab === 'variants'
                  ? 'bg-light-elevated text-charcoal-900 border-b-2 border-[#B89555]'
                  : 'bg-white text-charcoal-500 hover:text-charcoal-900 border border-light-border'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-[#B89555]" />
              <span>3. Pricing &amp; Variants ({variantsList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setEditorTab('sizeguide')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                editorTab === 'sizeguide'
                  ? 'bg-light-elevated text-charcoal-900 border-b-2 border-[#B89555]'
                  : 'bg-white text-charcoal-500 hover:text-charcoal-900 border border-light-border'
              }`}
            >
              <span>4. Size Guide</span>
              {prodSizeGuideUrl ? (
                <span className="text-[10px] text-emerald-600 font-extrabold">✓</span>
              ) : (
                <span className="text-[10px] text-rose-500 font-bold">*</span>
              )}
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: BASIC INFORMATION */}
          {/* ========================================================================= */}
          {editorTab === 'basic' && (
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-light-border shadow-sm space-y-5 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-light-border pb-3">
                <h2 className="text-xs font-bold text-[#B89555] uppercase tracking-wider">
                  Product Identification &amp; Craftsmanship
                </h2>
                <span className="text-[11px] text-charcoal-500">
                  Single-source normalized catalog listing
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Garment Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Men's Pure Cotton Vest — High Quality"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    className="w-full p-2.5 bg-light-elevated border border-light-border rounded-xl text-xs font-semibold text-charcoal-900 placeholder-charcoal-400 focus:border-[#B89555] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Quality Level <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. High Quality, Standard Quality"
                    value={prodQualityGrade}
                    onChange={(e) => {
                      setProdQualityGrade(e.target.value);
                      if (!customQualities.includes(e.target.value) && e.target.value.trim()) {
                        setCustomQualities([e.target.value.trim()]);
                      }
                    }}
                    className="w-full p-2.5 bg-light-elevated border border-light-border rounded-xl text-xs font-bold text-[#B89555] focus:border-[#B89555] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-charcoal-700">
                      URL Slug
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const s = prodName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                        setProdSlug(s);
                      }}
                      className="text-[10px] text-[#B89555] hover:underline font-semibold"
                    >
                      Generate from Name
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. mens-cotton-vest-high-quality"
                    value={prodSlug}
                    onChange={(e) => setProdSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    className="w-full p-2.5 bg-light-elevated border border-light-border rounded-xl text-xs font-mono text-charcoal-900 placeholder-charcoal-400 focus:border-[#B89555] focus:outline-none"
                  />
                  <span className="text-[10px] text-charcoal-500 mt-0.5 block truncate">
                    Preview: /product/{prodSlug || 'product-slug'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Category <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={prodCategoryId}
                    onChange={(e) => {
                      const newCatId = e.target.value;
                      setProdCategoryId(newCatId);
                      const matchedCat = categories.find((c) => c.id === newCatId);
                      if (matchedCat && matchedCat.availableSizes && matchedCat.availableSizes.length > 0) {
                        setCustomSizes(matchedCat.availableSizes);
                      }
                    }}
                    className="w-full p-2.5 bg-light-elevated border border-light-border rounded-xl text-xs font-semibold text-charcoal-900 focus:border-[#B89555] focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-white text-charcoal-900">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Subcategory
                  </label>
                  <select
                    value={prodSubcategoryId}
                    onChange={(e) => setProdSubcategoryId(e.target.value)}
                    className="w-full p-2.5 bg-light-elevated border border-light-border rounded-xl text-xs text-charcoal-900 focus:border-[#B89555] focus:outline-none"
                  >
                    <option value="" className="bg-white text-charcoal-900">-- General / None --</option>
                    {activeSubcatsForCategory.map((s) => (
                      <option key={s.id} value={s.id} className="bg-white text-charcoal-900">
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Tagline / Subtitle
                </label>
                <input
                  type="text"
                  placeholder="e.g. 100% Fine Combed Cotton • Anti-Sag Neck Seams • All-Day Comfort"
                  value={prodSubtitle}
                  onChange={(e) => setProdSubtitle(e.target.value)}
                  className="w-full p-2.5 bg-light-elevated border border-light-border rounded-xl text-xs text-charcoal-900 placeholder-charcoal-400 focus:border-[#B89555] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Short Description (Highlights displayed beneath price in storefront)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Premium 100% combed cotton vest with ultra-soft ribbed weave. Engineered for maximum airflow and daily comfort."
                  value={prodShortDesc}
                  onChange={(e) => setProdShortDesc(e.target.value)}
                  className="w-full p-2.5 bg-light-elevated border border-light-border rounded-xl text-xs leading-relaxed text-charcoal-900 placeholder-charcoal-400 focus:border-[#B89555] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Full Craftsmanship Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Detailed description of yarn quality, weave, softness, and durability..."
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  className="w-full p-2.5 bg-light-elevated border border-light-border rounded-xl text-xs leading-relaxed text-charcoal-900 placeholder-charcoal-400 focus:border-[#B89555] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Key Features (One bullet per line)
                  </label>
                  <textarea
                    rows={3}
                    value={prodFeaturesText}
                    onChange={(e) => setProdFeaturesText(e.target.value)}
                    className="w-full p-2.5 bg-light-elevated border border-light-border rounded-xl text-xs text-charcoal-900 focus:border-[#B89555] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Care Instructions (One bullet per line)
                  </label>
                  <textarea
                    rows={3}
                    value={prodCareText}
                    onChange={(e) => setProdCareText(e.target.value)}
                    className="w-full p-2.5 bg-light-elevated border border-light-border rounded-xl text-xs text-charcoal-900 focus:border-[#B89555] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: STYLES, VARIANTS & RETAIL PRICING MATRIX */}
          {/* ========================================================================= */}
          {editorTab === 'variants' && (
            <div className="space-y-6 animate-in fade-in">
              {/* DEDICATED SECTION: PRODUCT COLORS (DARAZ STYLE) */}
              <div className="bg-white p-5 rounded-2xl border border-light-border shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-light-border pb-3">
                  <div>
                    <h3 className="font-bold text-xs text-charcoal-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-[#B89555]" />
                      <span>Product Colors</span>
                      <span className="text-charcoal-500 font-normal">({prodColors.length})</span>
                    </h3>
                    <p className="text-[11px] text-charcoal-500">
                      Manage color options like Daraz with color-specific product photos, independent stock, and SKU combinations.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddAnotherColor()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-champagne-500 hover:bg-champagne-400 text-charcoal-950 rounded-xl text-xs font-bold transition-all shadow-xs self-start sm:self-auto active:scale-[0.99]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Color</span>
                  </button>
                </div>

                {/* Color Rows / Cards List */}
                <div className="space-y-3">
                  {prodColors.length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed border-light-border rounded-xl">
                      <Palette className="w-8 h-8 text-charcoal-300 mx-auto mb-2" />
                      <p className="text-xs text-charcoal-500 font-medium">No color options configured yet.</p>
                      <p className="text-[11px] text-charcoal-400 mb-3">Product will be sold as a single default color.</p>
                      <button
                        type="button"
                        onClick={() => handleAddAnotherColor('White', '#FFFFFF')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-light-elevated hover:bg-light-hover border border-light-border text-xs font-semibold rounded-xl text-charcoal-900"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#B89555]" />
                        <span>Add First Color (White)</span>
                      </button>
                    </div>
                  ) : (
                    prodColors.map((col, index) => {
                      const displayImg = col.image || mediaList.find((m) => m.color === col.name && m.type === 'photo')?.url;
                      const isUploadingThis = isUploadingColorId === col.id;

                      return (
                        <div
                          key={col.id}
                          className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                            col.isActive !== false
                              ? 'bg-light-elevated/70 border-light-border shadow-xs'
                              : 'bg-charcoal-50/70 border-charcoal-200 opacity-60'
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            {/* Left: Reorder + Color Name + Hex Swatch */}
                            <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                              {/* Reorder Buttons */}
                              <div className="flex flex-col gap-0.5 flex-shrink-0">
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => handleMoveColor(index, 'up')}
                                  className="p-1 text-charcoal-400 hover:text-charcoal-900 disabled:opacity-20 rounded hover:bg-white transition-colors"
                                  title="Move Up"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={index === prodColors.length - 1}
                                  onClick={() => handleMoveColor(index, 'down')}
                                  className="p-1 text-charcoal-400 hover:text-charcoal-900 disabled:opacity-20 rounded hover:bg-white transition-colors"
                                  title="Move Down"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Color Swatch Dot & Hex Picker */}
                              <div className="relative group/hex flex-shrink-0">
                                <label
                                  className="w-7 h-7 rounded-lg border border-black/20 shadow-xs cursor-pointer block"
                                  style={{ backgroundColor: col.hex || '#FFFFFF' }}
                                  title="Click to pick swatch color"
                                >
                                  <input
                                    type="color"
                                    value={col.hex || '#FFFFFF'}
                                    onChange={(e) => {
                                      const hex = e.target.value;
                                      setProdColors((prev) =>
                                        prev.map((c) => (c.id === col.id ? { ...c, hex } : c))
                                      );
                                    }}
                                    className="sr-only"
                                  />
                                </label>
                              </div>

                              {/* In-Place Color Name Input */}
                              <div className="flex-1">
                                <input
                                  type="text"
                                  value={col.name}
                                  onChange={(e) => handleUpdateColorName(col.id, e.target.value)}
                                  placeholder="e.g. Black, White, Navy Blue"
                                  className="w-full px-3 py-1.5 bg-white border border-light-border rounded-xl font-bold text-xs text-charcoal-900 focus:border-[#B89555] focus:outline-none uppercase"
                                />
                              </div>
                            </div>

                            {/* Middle: Color-Specific Product Image Thumbnail */}
                            <div className="flex items-center gap-3">
                              <div className="relative w-12 h-12 rounded-xl border border-light-border bg-white overflow-hidden flex items-center justify-center flex-shrink-0 shadow-2xs group/thumb">
                                {displayImg ? (
                                  <>
                                    <img
                                      src={displayImg}
                                      alt={col.name}
                                      className="w-full h-full object-cover"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveColorPrimaryImage(col.id)}
                                      className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white transition-opacity text-[10px] font-bold"
                                      title="Remove photo"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <div className="flex flex-col items-center justify-center text-charcoal-300">
                                    <ImageIcon className="w-4 h-4" />
                                    <span className="text-[8px] text-charcoal-400 font-semibold">No Image</span>
                                  </div>
                                )}
                              </div>

                              {/* Additional images badge/count */}
                              {col.additionalImages && col.additionalImages.length > 0 && (
                                <div className="hidden sm:flex items-center gap-1">
                                  {col.additionalImages.slice(0, 3).map((imgUrl, addIdx) => (
                                    <div
                                      key={addIdx}
                                      className="relative w-8 h-8 rounded-lg border border-light-border bg-white overflow-hidden group/addthumb flex-shrink-0"
                                    >
                                      <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveColorAdditionalImage(col.id, imgUrl)}
                                        className="absolute inset-0 bg-black/60 opacity-0 group-hover/addthumb:opacity-100 flex items-center justify-center text-white transition-opacity"
                                        title="Remove photo"
                                      >
                                        <X className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  ))}
                                  {col.additionalImages.length > 3 && (
                                    <span className="text-[10px] font-bold text-charcoal-500">
                                      +{col.additionalImages.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Right: Upload Button | Media Center Button | Active Toggle | Remove */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Upload Button */}
                              <label
                                className={`cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-light-hover border border-light-border hover:border-[#B89555] text-charcoal-800 text-xs font-semibold rounded-xl transition-colors shadow-2xs ${
                                  isUploadingThis ? 'opacity-50 pointer-events-none' : ''
                                }`}
                                title="Upload product image for this color"
                              >
                                <Upload className="w-3.5 h-3.5 text-[#B89555]" />
                                <span>{isUploadingThis ? 'Uploading...' : 'Upload'}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleUploadColorPrimaryImage(col.id, file);
                                    e.target.value = '';
                                  }}
                                />
                              </label>

                              {/* Media Center Selection Button */}
                              <button
                                type="button"
                                onClick={() => setMediaPickerColorId(col.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-light-hover border border-light-border hover:border-[#B89555] text-charcoal-800 text-xs font-semibold rounded-xl transition-colors shadow-2xs"
                                title="Select from Media Center"
                              >
                                <Palette className="w-3.5 h-3.5 text-[#B89555]" />
                                <span>Media Center</span>
                              </button>

                              {/* Active Status Toggle */}
                              <button
                                type="button"
                                onClick={() => handleToggleColorActive(col.id)}
                                className={`text-[10px] px-2 py-1.5 rounded-xl font-bold transition-colors ${
                                  col.isActive !== false
                                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                    : 'bg-charcoal-200 text-charcoal-600 hover:bg-charcoal-300'
                                }`}
                                title={col.isActive !== false ? 'Active in store' : 'Disabled in store'}
                              >
                                {col.isActive !== false ? 'Active' : 'Disabled'}
                              </button>

                              {/* Remove Color Action */}
                              <button
                                type="button"
                                onClick={() => handleRemoveColor(col.id)}
                                className="p-1.5 text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                title="Delete Color"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Quick Preset Buttons */}
                <div className="pt-2 border-t border-light-border">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold text-charcoal-500">Quick Color Presets:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { name: 'BLACK', hex: '#171717' },
                        { name: 'WHITE', hex: '#FFFFFF' },
                        { name: 'NAVY BLUE', hex: '#23384D' },
                        { name: 'HEATHER GREY', hex: '#9CA3AF' },
                        { name: 'CHARCOAL', hex: '#374151' },
                        { name: 'BEIGE', hex: '#D2B48C' },
                        { name: 'MAROON', hex: '#800000' },
                      ].map((preset) => {
                        const alreadyAdded = prodColors.some(
                          (c) => c.name.toUpperCase() === preset.name
                        );
                        return (
                          <button
                            key={preset.name}
                            type="button"
                            disabled={alreadyAdded}
                            onClick={() => handleAddAnotherColor(preset.name, preset.hex)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                              alreadyAdded
                                ? 'opacity-40 bg-light-elevated border-light-border text-charcoal-400 cursor-not-allowed'
                                : 'bg-white hover:bg-light-hover border-light-border text-charcoal-800 hover:border-[#B89555]'
                            }`}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-black/20"
                              style={{ backgroundColor: preset.hex }}
                            />
                            <span>+ {preset.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 2: Sleeve Styles */}
              <div className="bg-white p-5 rounded-2xl border border-light-border shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-xs text-charcoal-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Step 2: Styles &amp; Sleeve Cuts</span>
                      <span className="text-charcoal-500 font-normal">({customStyles.length})</span>
                    </h3>
                    <p className="text-[11px] text-charcoal-500">
                      Define styles (e.g. Sleeveless, Half Sleeve, Full Sleeve).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAddStyleOpen(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-light-elevated hover:bg-light-hover border border-light-border hover:border-[#B89555] text-charcoal-900 rounded-xl text-xs font-semibold transition-colors self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#B89555]" />
                    <span>Add Style</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {customStyles.map((st) => (
                    <div
                      key={st}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-light-elevated border border-light-border rounded-xl text-xs font-semibold text-charcoal-900"
                    >
                      <span>{st}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveStyle(st)}
                        className="text-charcoal-400 hover:text-rose-600 transition-colors"
                        title="Delete Style Option"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Category Preset Quick Loaders */}
                <div className="pt-2 border-t border-light-border">
                  <span className="block text-[11px] font-semibold text-charcoal-500 mb-1.5">
                    Category Sizing Presets:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomSizes(['33', '34', '35', '36', '37', '38'])}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-light-hover border border-light-border rounded-lg text-xs font-semibold text-charcoal-800 hover:border-[#B89555] transition-colors"
                    >
                      <span className="font-bold text-[#B89555]">Blouse:</span>
                      <span>33, 34, 35, 36, 37, 38</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCustomSizes(['S', 'M', 'L', 'XL', 'XXL'])}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-light-hover border border-light-border rounded-lg text-xs font-semibold text-charcoal-800 hover:border-[#B89555] transition-colors"
                    >
                      <span className="font-bold text-[#B89555]">Vest:</span>
                      <span>S, M, L, XL, XXL</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCustomSizes(['28', '30', '32', '34', '36'])}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-light-hover border border-light-border rounded-lg text-xs font-semibold text-charcoal-800 hover:border-[#B89555] transition-colors"
                    >
                      <span className="font-bold text-[#B89555]">Trousers:</span>
                      <span>28, 30, 32, 34, 36</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCustomSizes(['Free Size'])}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-light-hover border border-light-border rounded-lg text-xs font-semibold text-charcoal-800 hover:border-[#B89555] transition-colors"
                    >
                      <span className="font-bold text-[#B89555]">Free Size</span>
                    </button>
                  </div>
                </div>

                {isAddStyleOpen && (
                  <div className="p-3 bg-light-elevated rounded-xl border border-light-border flex items-center gap-2 max-w-md animate-in fade-in">
                    <input
                      type="text"
                      placeholder="e.g. Half Sleeve, Regular Fit..."
                      value={newStyleInput}
                      onChange={(e) => setNewStyleInput(e.target.value)}
                      className="flex-1 p-2 bg-white border border-light-border rounded-lg text-xs text-charcoal-900 focus:border-[#B89555] focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddStyle}
                      className="px-3 py-2 bg-champagne-500 text-charcoal-950 text-xs font-bold rounded-lg"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddStyleOpen(false)}
                      className="p-1.5 text-charcoal-400 hover:text-charcoal-900"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* STEP 3: Sizes */}
              <div className="bg-white p-5 rounded-2xl border border-light-border shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-xs text-charcoal-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Step 3: Size Options</span>
                      <span className="text-charcoal-500 font-normal">({customSizes.length})</span>
                    </h3>
                    <p className="text-[11px] text-charcoal-500">
                      Select sizes for this garment (e.g. S, M, L, XL, XXL or Numeric 33, 34, 35 or Waist 28, 30, 32).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAddSizeOpen(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-light-elevated hover:bg-light-hover border border-light-border hover:border-[#B89555] text-charcoal-900 rounded-xl text-xs font-semibold transition-colors self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#B89555]" />
                    <span>Add Size</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {customSizes.map((sz) => (
                    <div
                      key={sz}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-light-elevated border border-light-border rounded-xl text-xs font-semibold text-charcoal-900"
                    >
                      <span>{sz}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSize(sz)}
                        className="text-charcoal-400 hover:text-rose-600 transition-colors"
                        title="Delete Size Option"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Category Preset Quick Loaders */}
                <div className="pt-2 border-t border-light-border">
                  <span className="block text-[11px] font-semibold text-charcoal-500 mb-1.5">
                    Category Sizing Presets:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomSizes(['33', '34', '35', '36', '37', '38'])}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-light-hover border border-light-border rounded-lg text-xs font-semibold text-charcoal-800 hover:border-[#B89555] transition-colors"
                    >
                      <span className="font-bold text-[#B89555]">Blouse:</span>
                      <span>33, 34, 35, 36, 37, 38</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCustomSizes(['S', 'M', 'L', 'XL', 'XXL'])}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-light-hover border border-light-border rounded-lg text-xs font-semibold text-charcoal-800 hover:border-[#B89555] transition-colors"
                    >
                      <span className="font-bold text-[#B89555]">Vest:</span>
                      <span>S, M, L, XL, XXL</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCustomSizes(['28', '30', '32', '34', '36'])}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-light-hover border border-light-border rounded-lg text-xs font-semibold text-charcoal-800 hover:border-[#B89555] transition-colors"
                    >
                      <span className="font-bold text-[#B89555]">Trousers:</span>
                      <span>28, 30, 32, 34, 36</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCustomSizes(['Free Size'])}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-light-hover border border-light-border rounded-lg text-xs font-semibold text-charcoal-800 hover:border-[#B89555] transition-colors"
                    >
                      <span className="font-bold text-[#B89555]">Free Size</span>
                    </button>
                  </div>
                </div>

                {isAddSizeOpen && (
                  <div className="p-3 bg-light-elevated rounded-xl border border-light-border flex items-center gap-2 max-w-md animate-in fade-in">
                    <input
                      type="text"
                      placeholder="e.g. 28, 30, Free Size..."
                      value={newSizeInput}
                      onChange={(e) => setNewSizeInput(e.target.value)}
                      className="flex-1 p-2 bg-white border border-light-border rounded-lg text-xs text-charcoal-900 focus:border-[#B89555] focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddSize}
                      className="px-3 py-2 bg-champagne-500 text-charcoal-950 text-xs font-bold rounded-lg"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddSizeOpen(false)}
                      className="p-1.5 text-charcoal-400 hover:text-charcoal-900"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* STEP 4: Matrix Generator Settings & Action */}
              <div className="bg-white p-5 rounded-2xl border border-light-border shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-xs text-charcoal-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-[#B89555]" />
                      <span>Step 4: Generate Matrix Combinations</span>
                    </h3>
                    <p className="text-[11px] text-charcoal-500">
                      Auto-generate combination rows for {prodColors.filter((c) => c.isActive !== false).length > 0 ? `Colors (${prodColors.filter((c) => c.isActive !== false).length}) \u00D7 ` : ''}Styles ({customStyles.length}) &times; Sizes ({customSizes.length}).
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setIsAddSingleVarOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-light-elevated hover:bg-light-hover border border-light-border text-charcoal-900 text-xs font-semibold rounded-xl transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#B89555]" />
                      <span>Custom Combination</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleGenerateCombinations}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-champagne-500 hover:bg-champagne-400 text-charcoal-950 text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.99]"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Generate Matrix ({(prodColors.filter((c) => c.isActive !== false).length || 1) * customStyles.length * customSizes.length} items)</span>
                    </button>
                  </div>
                </div>

                {/* Generator Default Preset Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-charcoal-700 mb-1">
                      Default Original Price (Rs.)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={genDefaultPrice}
                      onChange={(e) => setGenDefaultPrice(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full p-2 bg-light-elevated border border-light-border rounded-xl text-xs font-bold text-charcoal-900 focus:border-[#B89555] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-charcoal-700 mb-1">
                      Default Bulk Discount (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={genDefaultDiscount}
                        onChange={(e) => {
                          const val = Math.min(99, Math.max(0, Number(e.target.value) || 0));
                          setGenDefaultDiscount(val);
                        }}
                        className="w-full p-2 pr-6 bg-light-elevated border border-light-border rounded-xl text-xs font-bold text-[#B89555] focus:border-[#B89555] focus:outline-none"
                      />
                      <span className="absolute right-2.5 top-2.5 text-xs text-charcoal-400 font-bold">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-charcoal-700 mb-1">
                      Calculated Sale Price Preview
                    </label>
                    <div className="p-2 bg-light-elevated border border-light-border rounded-xl text-xs flex items-center justify-between h-[38px]">
                      <span className="font-extrabold text-[#B89555]">
                        Rs. {calculateSalePrice(genDefaultPrice, genDefaultDiscount)}
                      </span>
                      {genDefaultDiscount > 0 ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200">
                          {genDefaultDiscount}% OFF
                        </span>
                      ) : (
                        <span className="text-[10px] text-charcoal-400">Regular</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-charcoal-700 mb-1">
                      Default Stock Units (Pcs)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={genDefaultStock}
                      onChange={(e) => setGenDefaultStock(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full p-2 bg-light-elevated border border-light-border rounded-xl text-xs font-bold text-charcoal-900 focus:border-[#B89555] focus:outline-none"
                    />
                  </div>
                </div>

                {variantsList.length > 0 && (
                  <div className="pt-1 flex items-center justify-between flex-wrap gap-2 text-xs">
                    <span className="text-[11px] text-charcoal-500">
                      Quick tool: Apply {genDefaultDiscount}% discount to all existing rows individually.
                    </span>
                    <button
                      type="button"
                      onClick={() => handleApplyBulkDiscountToMatrix(genDefaultDiscount)}
                      className="px-3 py-1.5 bg-champagne-50 hover:bg-champagne-100 text-[#96763D] border border-[#B89555]/30 rounded-xl font-bold text-xs transition-colors"
                    >
                      Apply {genDefaultDiscount}% to All Existing Variants
                    </button>
                  </div>
                )}

                {/* Add Individual Single Variant Modal */}
                {isAddSingleVarOpen && (
                  <div className="p-4 bg-light-elevated rounded-xl border border-light-border space-y-3 animate-in fade-in">
                    <h4 className="font-bold text-xs text-[#B89555] uppercase">
                      Add Specific Variant Combination
                    </h4>
                    <div className={`grid grid-cols-1 ${prodColors.length > 0 ? 'sm:grid-cols-6' : 'sm:grid-cols-5'} gap-3`}>
                      <div>
                        <label className="block text-[11px] font-semibold text-charcoal-700 mb-1">Quality</label>
                        <input
                          type="text"
                          value={singleVarQuality || prodQualityGrade}
                          onChange={(e) => setSingleVarQuality(e.target.value)}
                          className="w-full p-2 bg-white border border-light-border rounded-xl text-xs font-semibold text-charcoal-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-charcoal-700 mb-1">Style / Sleeve</label>
                        <select
                          value={singleVarStyle || customStyles[0]}
                          onChange={(e) => setSingleVarStyle(e.target.value)}
                          className="w-full p-2 bg-white border border-light-border rounded-xl text-xs font-semibold text-charcoal-900"
                        >
                          {customStyles.map((st) => (
                            <option key={st} value={st} className="bg-white text-charcoal-900">
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      {prodColors.length > 0 && (
                        <div>
                          <label className="block text-[11px] font-semibold text-charcoal-700 mb-1">Color</label>
                          <select
                            value={singleVarColor || prodColors[0]?.name || ''}
                            onChange={(e) => setSingleVarColor(e.target.value)}
                            className="w-full p-2 bg-white border border-light-border rounded-xl text-xs font-semibold text-charcoal-900"
                          >
                            {prodColors.map((c) => (
                              <option key={c.name} value={c.name} className="bg-white text-charcoal-900">
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-semibold text-charcoal-700 mb-1">Size</label>
                        <select
                          value={singleVarSize || customSizes[0]}
                          onChange={(e) => setSingleVarSize(e.target.value)}
                          className="w-full p-2 bg-white border border-light-border rounded-xl text-xs font-semibold text-charcoal-900"
                        >
                          {customSizes.map((sz) => (
                            <option key={sz} value={sz} className="bg-white text-charcoal-900">
                              {sz}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-charcoal-700 mb-1">Original Price (Rs.)</label>
                        <input
                          type="number"
                          min={0}
                          value={singleVarPrice}
                          onChange={(e) => setSingleVarPrice(Number(e.target.value))}
                          className="w-full p-2 bg-white border border-light-border rounded-xl text-xs font-bold text-charcoal-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-charcoal-700 mb-1">Discount (%)</label>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            max={99}
                            value={singleVarDiscount}
                            onChange={(e) => setSingleVarDiscount(Number(e.target.value))}
                            className="w-full p-2 pr-6 bg-white border border-light-border rounded-xl text-xs font-bold text-[#B89555]"
                          />
                          <span className="absolute right-2.5 top-2.5 text-xs text-charcoal-400 font-bold">%</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="text-xs text-charcoal-600">
                        Sale Price: <strong className="text-[#B89555]">Rs. {calculateSalePrice(singleVarPrice, singleVarDiscount)}</strong>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddSingleVarOpen(false)}
                          className="px-3 py-1.5 bg-light-elevated text-charcoal-700 border border-light-border text-xs font-semibold rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleAddSingleVariant}
                          className="px-4 py-1.5 bg-champagne-500 text-charcoal-950 text-xs font-bold rounded-xl"
                        >
                          Add This Variant
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 5: Full Variant Matrix Table */}
              <div className="bg-white rounded-2xl border border-light-border shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-light-border flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-charcoal-900 flex items-center gap-2">
                      <span>Active Variant Matrix ({variantsList.length} combinations)</span>
                    </h3>
                    <p className="text-xs text-charcoal-500">
                      Configure exact retail price and inventory stock per variant size{prodColors.length > 0 ? ' and color' : ''}.
                    </p>
                  </div>

                  {variantsList.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setIsClearMatrixModalOpen(true)}
                        className="text-xs text-rose-600 hover:underline font-semibold px-2 py-1"
                      >
                        Clear Matrix
                      </button>
                    </div>
                  )}
                </div>

                {variantsList.length === 0 ? (
                  <div className="p-10 text-center space-y-2">
                    <Boxes className="w-8 h-8 text-charcoal-400 mx-auto" />
                    <p className="text-xs font-bold text-charcoal-900">No variants in matrix yet</p>
                    <p className="text-xs text-charcoal-500">
                      Click &quot;Generate Matrix&quot; above to create combinations automatically.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left min-w-[620px]">
                      <thead className="bg-light-elevated text-[#B89555] uppercase font-bold text-[11px] border-b border-light-border">
                        <tr>
                          <th className="p-3">Quality</th>
                          <th className="p-3">Style / Sleeve</th>
                          {prodColors.length > 0 && <th className="p-3">Color</th>}
                          <th className="p-3 text-center">Size</th>
                          <th className="p-3">SKU</th>
                          <th className="p-3">Original (PKR)</th>
                          <th className="p-3">Discount %</th>
                          <th className="p-3">Sale (PKR)</th>
                          <th className="p-3">Stock</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-light-border font-medium text-charcoal-900">
                        {variantsList.map((v) => {
                          const retailPrice = Number(v.price) || 0;

                          return (
                            <tr key={v.id} className="hover:bg-light-hover/60 transition-colors">
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-light-elevated text-charcoal-700 border border-light-border">
                                  {v.quality}
                                </span>
                              </td>
                              <td className="p-3 font-semibold text-charcoal-900">{v.sleeve}</td>
                              {prodColors.length > 0 && (
                                <td className="p-3">
                                  {v.color ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold bg-light-elevated text-charcoal-800 border border-light-border">
                                      {(() => {
                                        const cObj = prodColors.find((c) => c.name === v.color);
                                        const cImg = cObj?.image || mediaList.find((m) => m.color === v.color && m.type === 'photo')?.url;
                                        if (cImg) {
                                          return (
                                            <img
                                              src={cImg}
                                              alt={v.color}
                                              className="w-5 h-5 rounded-md object-cover border border-black/10 flex-shrink-0"
                                            />
                                          );
                                        }
                                        return (
                                          <span
                                            className="w-2.5 h-2.5 rounded-full border border-charcoal-300 inline-block flex-shrink-0"
                                            style={{ backgroundColor: v.colorHex || cObj?.hex || '#ccc' }}
                                          />
                                        );
                                      })()}
                                      <span className="font-bold">{v.color}</span>
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-charcoal-400 italic">None</span>
                                  )}
                                </td>
                              )}
                              <td className="p-3 text-center">
                                <span className="font-bold bg-champagne-100 text-[#96763D] border border-[#B89555]/30 px-2 py-0.5 rounded-md text-xs">
                                  {v.size}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-[11px] text-charcoal-500">
                                <input
                                  type="text"
                                  value={v.sku}
                                  onChange={(e) => handleUpdateVariantField(v.id, 'sku', e.target.value)}
                                  className="w-28 px-2 py-1 bg-light-elevated border border-light-border rounded-lg font-mono text-[11px] text-charcoal-900 focus:border-[#B89555] focus:outline-none"
                                />
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-1">
                                  <span className="text-charcoal-400 text-xs">Rs.</span>
                                  <input
                                    type="number"
                                    value={v.price}
                                    onChange={(e) => {
                                      const newRetail = Number(e.target.value);
                                      handleUpdateVariantField(v.id, 'price', newRetail);
                                    }}
                                    className="w-20 px-2 py-1 bg-light-elevated border border-light-border rounded-lg font-bold text-charcoal-900 focus:border-[#B89555] focus:outline-none"
                                  />
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max="99"
                                    value={v.discountPercentage || 0}
                                    onChange={(e) => {
                                      const newDiscount = Math.min(99, Math.max(0, Number(e.target.value) || 0));
                                      handleUpdateVariantField(v.id, 'discountPercentage', newDiscount);
                                    }}
                                    className="w-16 px-2 py-1 bg-light-elevated border border-light-border rounded-lg font-bold text-[#B89555] focus:border-[#B89555] focus:outline-none"
                                  />
                                  <span className="text-charcoal-400 text-xs">%</span>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-1">
                                  <span className="text-charcoal-400 text-xs">Rs.</span>
                                  <span className={`font-bold ${v.discountPercentage && v.discountPercentage > 0 ? 'text-[#B89555]' : 'text-charcoal-900'}`}>
                                    {v.salePrice || v.price}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3">
                                <input
                                  type="number"
                                  value={v.stock}
                                  onChange={(e) =>
                                    handleUpdateVariantField(v.id, 'stock', Number(e.target.value))
                                  }
                                  className="w-18 px-2 py-1 bg-light-elevated border border-light-border rounded-lg font-bold text-charcoal-900 focus:border-[#B89555] focus:outline-none"
                                />
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateVariantField(v.id, 'isAvailable', !v.isAvailable)}
                                  className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors ${
                                    v.isAvailable !== false
                                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                      : 'bg-charcoal-200 text-charcoal-500 hover:bg-charcoal-300'
                                  }`}
                                  title={v.isAvailable !== false ? 'Active (Click to disable)' : 'Inactive (Click to enable)'}
                                >
                                  {v.isAvailable !== false ? 'Active' : 'Inactive'}
                                </button>
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveVariant(v.id)}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Remove this combination"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: PHOTOS & VIDEOS (VARIANT SPECIFIC) */}
          {/* ========================================================================= */}
          {editorTab === 'media' && (
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-light-border shadow-sm space-y-6 animate-in fade-in">
              <div>
                <h3 className="font-bold text-sm text-charcoal-900">
                  Variant-Specific Product Photos &amp; Video Demonstration
                </h3>
                <p className="text-xs text-charcoal-500 mt-0.5">
                  Attach specific photos to exact sleeve options (e.g. Sleeveless vs Full Sleeve). The storefront gallery dynamically adapts as buyers select different styles!
                </p>
              </div>

              {/* Upload Box */}
              <div className="p-5 bg-light-elevated rounded-2xl border border-dashed border-light-border space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                      1. Quality Target:
                    </label>
                    <select
                      value={uploadQualityTarget}
                      onChange={(e) => setUploadQualityTarget(e.target.value)}
                      className="w-full p-2.5 bg-white border border-light-border rounded-xl text-xs font-semibold text-charcoal-900 focus:border-[#B89555] focus:outline-none"
                    >
                      <option value="All" className="bg-white text-charcoal-900">All Qualities</option>
                      {customQualities.map((q) => (
                        <option key={q} value={q} className="bg-white text-charcoal-900">
                          For &quot;{q}&quot;
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                      2. Style / Sleeve Target:
                    </label>
                    <select
                      value={uploadSleeveTarget}
                      onChange={(e) => setUploadSleeveTarget(e.target.value)}
                      className="w-full p-2.5 bg-white border border-light-border rounded-xl text-xs font-semibold text-charcoal-900 focus:border-[#B89555] focus:outline-none"
                    >
                      <option value="All" className="bg-white text-charcoal-900">All Styles</option>
                      {availableVariantStylesForMedia.map((st) => (
                        <option key={st} value={st} className="bg-white text-charcoal-900">
                          For &quot;{st}&quot;
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                      3. Color Target:
                    </label>
                    <select
                      value={uploadColorTarget}
                      onChange={(e) => setUploadColorTarget(e.target.value)}
                      className="w-full p-2.5 bg-white border border-light-border rounded-xl text-xs font-semibold text-charcoal-900 focus:border-[#B89555] focus:outline-none"
                    >
                      <option value="All" className="bg-white text-charcoal-900">All Colors / General</option>
                      {prodColors.map((c) => (
                        <option key={c.name} value={c.name} className="bg-white text-charcoal-900">
                          For &quot;{c.name}&quot;
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                      4. Photo Caption / Title:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Front chest close-up"
                      value={uploadMediaTitle}
                      onChange={(e) => setUploadMediaTitle(e.target.value)}
                      className="w-full p-2.5 bg-white border border-light-border rounded-xl text-xs text-charcoal-900 focus:border-[#B89555] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Upload Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <label className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-champagne-500 hover:bg-champagne-400 text-charcoal-950 text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all active:scale-[0.99]">
                    <Upload className="w-4 h-4" />
                    <span>Upload Image Files</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageFilesChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Product Video URL Section */}
              <div className="p-5 bg-light-elevated rounded-2xl border border-light-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-[#B89555]" />
                    <h3 className="font-bold text-xs text-charcoal-900 uppercase tracking-wider">
                      Product Video
                    </h3>
                  </div>
                  {prodVideoUrl && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      parseVideoUrl(prodVideoUrl).isSupported
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {parseVideoUrl(prodVideoUrl).isSupported
                        ? `✓ ${parseVideoUrl(prodVideoUrl).providerDisplayName} Configured`
                        : '⚠ Unsupported Provider'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-charcoal-500">
                  Supported: YouTube (standard, shorts, youtu.be), Vimeo, Facebook Video, Instagram (Reel/Post), TikTok, and direct MP4/WebM files. The video plays inline in the exact same container over the product photo.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Video URL
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="url"
                      placeholder="Paste YouTube, Vimeo, Facebook, Instagram, TikTok, or .mp4 video URL"
                      value={prodVideoUrl}
                      onChange={(e) => setProdVideoUrl(e.target.value)}
                      className="flex-1 w-full p-2.5 bg-white border border-light-border rounded-xl text-xs text-charcoal-900 placeholder-charcoal-400 focus:border-[#B89555] focus:outline-none"
                    />
                    {prodVideoUrl && (
                      <button
                        type="button"
                        onClick={() => setProdVideoUrl('')}
                        className="px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-semibold transition-colors flex-shrink-0"
                      >
                        Remove Video URL
                      </button>
                    )}
                  </div>
                </div>

                {prodVideoUrl && (() => {
                  const parsed = parseVideoUrl(prodVideoUrl);
                  return (
                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-light-border">
                      {parsed.thumbnailUrl ? (
                        <div className="relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-black">
                          <img
                            src={parsed.thumbnailUrl}
                            alt="Video Thumbnail"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Film className="w-5 h-5 text-white drop-shadow" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-light-elevated flex items-center justify-center flex-shrink-0 border border-light-border">
                          <Film className="w-6 h-6 text-[#B89555]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-charcoal-100 text-charcoal-800">
                            {parsed.providerDisplayName}
                          </span>
                          {!parsed.isSupported && (
                            <span className="text-[10px] font-bold text-rose-600">
                              {parsed.errorMessage || 'Unsupported format'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-charcoal-900 truncate mt-1">
                          {prodVideoUrl}
                        </p>
                        {parsed.warningMessage && (
                          <p className="text-[10px] text-amber-700 mt-0.5">
                            {parsed.warningMessage}
                          </p>
                        )}
                        <a
                          href={prodVideoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-[#B89555] hover:underline font-semibold inline-block mt-0.5"
                        >
                          Test / View Video URL &rarr;
                        </a>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Media List Grid */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-charcoal-900 uppercase tracking-wider">
                  Attached Gallery Media ({mediaList.length})
                </h4>

                {mediaList.length === 0 ? (
                  <p className="text-xs text-charcoal-500 italic">No photos or videos attached yet.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {mediaList.map((m, idx) => (
                      <div
                        key={m.id}
                        className="relative group aspect-square rounded-xl overflow-hidden bg-light-elevated border border-light-border"
                        title={m.title ? `Filename: ${m.title}` : m.alt || 'Product Image'}
                      >
                        {m.type === 'video' ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-charcoal-900 text-charcoal-50 p-2 text-center">
                            <Film className="w-6 h-6 text-[#B89555] mb-1" />
                            <span className="text-[10px] truncate max-w-full font-mono">{m.url}</span>
                          </div>
                        ) : (
                          <Image
                            src={m.url}
                            alt={m.alt || 'Product Image'}
                            fill
                            className="object-cover"
                            sizes="120px"
                          />
                        )}

                        <div className="absolute top-1 left-1 bg-black/75 backdrop-blur-sm text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                          #{idx + 1}
                        </div>

                        {m.color && (
                          <div className="absolute top-1 left-8 bg-[#23384D] text-white text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 shadow-xs">
                            <span
                              className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0"
                              style={{ backgroundColor: prodColors.find((c) => c.name === m.color)?.hex || '#ffffff' }}
                            />
                            <span>{m.color}</span>
                          </div>
                        )}

                        {m.variantSleeve && (
                          <div className={`absolute top-1 ${m.color ? 'left-24' : 'left-8'} bg-champagne-500/90 text-black text-[9px] px-1 rounded font-bold`}>
                            {m.variantSleeve}
                          </div>
                        )}

                        {m.title && (
                          <div
                            className="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur-xs text-white text-[8px] px-1 py-0.5 truncate font-mono"
                            title={m.title}
                          >
                            {m.title}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(m.id)}
                          className="absolute top-1 right-1 p-1 bg-rose-600/90 hover:bg-rose-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove media"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: SIZE GUIDE (MANDATORY ADMIN-UPLOADED CHART) */}
          {/* ========================================================================= */}
          {editorTab === 'sizeguide' && (
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-light-border shadow-sm space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-light-border pb-3">
                <div>
                  <h2 className="text-xs font-bold text-[#B89555] uppercase tracking-wider">
                    Official Product Size Guide Chart <span className="text-rose-600">* (Mandatory)</span>
                  </h2>
                  <p className="text-xs text-charcoal-500 mt-0.5">
                    This chart is the ONLY content shown inside the customer-facing &apos;Size Guide&apos; modal on the product page.
                  </p>
                </div>
                {prodSizeGuideUrl ? (
                  <span className="text-xs font-bold px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 self-start sm:self-auto">
                    ✓ Size Guide Attached
                  </span>
                ) : (
                  <span className="text-xs font-bold px-3 py-1 rounded-xl bg-rose-100 text-rose-800 border border-rose-300 self-start sm:self-auto">
                    * Upload Required to Save
                  </span>
                )}
              </div>

              {prodSizeGuideUrl ? (
                <div className="p-5 bg-light-elevated rounded-2xl border border-light-border space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="relative w-28 h-28 rounded-xl overflow-hidden bg-white border border-light-border flex-shrink-0 shadow-xs">
                        <img
                          src={prodSizeGuideUrl}
                          alt="Size Guide Chart Preview"
                          className="w-full h-full object-contain p-2"
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-charcoal-900">
                          Attached Size Guide Chart
                        </p>
                        <p className="text-xs text-charcoal-500">
                          Ready to be rendered exclusively in the customer Size Guide modal.
                        </p>
                        <a
                          href={prodSizeGuideUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[#B89555] hover:underline font-semibold inline-block pt-1"
                        >
                          View Full Image in New Tab &rarr;
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <label className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-light-hover border border-light-border text-charcoal-900 text-xs font-semibold rounded-xl cursor-pointer transition-colors flex-1 sm:flex-initial">
                        <Upload className="w-3.5 h-3.5 text-[#B89555]" />
                        <span>{isUploadingSizeGuide ? 'Uploading...' : 'Replace Image'}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={isUploadingSizeGuide}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              setIsUploadingSizeGuide(true);
                              const prodFolder = editingProductId
                                ? `products/${editingProductId}/size-guide`
                                : `products/new_${Date.now()}/size-guide`;
                              const url = await uploadMediaFile(file, 'product-media', prodFolder);
                              setProdSizeGuideUrl(url);
                              showNotice('New Size Guide image uploaded and replaced successfully.');
                            } catch (err: any) {
                              console.error('Size guide replacement failed:', err);
                              showNotice(err?.message || 'Failed to replace Size Guide image.', 'error');
                            } finally {
                              setIsUploadingSizeGuide(false);
                              e.target.value = '';
                            }
                          }}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => setProdSizeGuideUrl('')}
                        className="px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-semibold transition-colors flex-1 sm:flex-initial text-center"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 border-2 border-dashed border-rose-300 hover:border-[#B89555] rounded-2xl text-center transition-colors bg-rose-50/30 space-y-3 relative">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={isUploadingSizeGuide}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        setIsUploadingSizeGuide(true);
                        const prodFolder = editingProductId
                          ? `products/${editingProductId}/size-guide`
                          : `products/new_${Date.now()}/size-guide`;
                        const url = await uploadMediaFile(file, 'product-media', prodFolder);
                        setProdSizeGuideUrl(url);
                        showNotice('Size Guide image uploaded successfully.');
                      } catch (err: any) {
                        console.error('Size guide upload failed:', err);
                        showNotice(err?.message || 'Failed to upload Size Guide image.', 'error');
                      } finally {
                        setIsUploadingSizeGuide(false);
                        e.target.value = '';
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
                    <div className="p-3.5 rounded-2xl bg-rose-100 text-rose-600">
                      <Upload className={`w-7 h-7 ${isUploadingSizeGuide ? 'animate-bounce' : ''}`} />
                    </div>
                    <span className="text-sm font-bold text-charcoal-900">
                      {isUploadingSizeGuide ? 'Uploading Size Guide Chart...' : 'Upload Size Guide Chart (Required)'}
                    </span>
                    <span className="text-xs text-charcoal-500 max-w-sm">
                      PNG, JPG, or WebP. This chart will be rendered at full fidelity when customers click &apos;Size Guide&apos; on the product page.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
      )}

      {/* MEDIA CENTER SELECTION MODAL FOR PRODUCT COLORS */}
      {mediaPickerColorId && (() => {
        const activeColor = prodColors.find((c) => c.id === mediaPickerColorId);
        if (!activeColor) return null;

        const photosInMedia = mediaList.filter((m) => m.type === 'photo' || !m.type);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-light-border overflow-hidden">
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-light-border flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-charcoal-900 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-[#B89555]" />
                    <span>Media Center for &quot;{activeColor.name}&quot;</span>
                  </h3>
                  <p className="text-xs text-charcoal-500 mt-0.5">
                    Select a photo from this product&apos;s gallery or upload a new photo specifically for this color.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMediaPickerColorId(null)}
                  className="p-1.5 text-charcoal-400 hover:text-charcoal-900 rounded-lg hover:bg-light-hover"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
                {/* Upload New Directly */}
                <div className="p-3 bg-light-elevated rounded-xl border border-light-border flex items-center justify-between gap-3">
                  <div className="text-xs">
                    <span className="font-bold text-charcoal-900 block">Upload new photo from computer</span>
                    <span className="text-charcoal-500 text-[11px]">Uploads and assigns directly to {activeColor.name}</span>
                  </div>
                  <label
                    className={`cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 bg-champagne-500 hover:bg-champagne-400 text-charcoal-950 text-xs font-bold rounded-xl shadow-xs transition-colors ${
                      isUploadingColorId === activeColor.id ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingColorId === activeColor.id ? 'Uploading...' : 'Upload Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadColorPrimaryImage(activeColor.id, file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>

                {/* Existing Photos Grid */}
                <div>
                  <span className="block text-xs font-bold text-charcoal-800 uppercase tracking-wider mb-2">
                    Gallery Photos ({photosInMedia.length})
                  </span>
                  {photosInMedia.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-light-border rounded-xl">
                      <ImageIcon className="w-8 h-8 text-charcoal-300 mx-auto mb-2" />
                      <p className="text-xs text-charcoal-500 font-medium">No gallery photos uploaded yet.</p>
                      <p className="text-[11px] text-charcoal-400">Use the upload button above to add a photo.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {photosInMedia.map((photo) => {
                        const isPrimary = activeColor.image === photo.url;
                        const isAdditional = (activeColor.additionalImages || []).includes(photo.url);

                        return (
                          <div
                            key={photo.id || photo.url}
                            className={`group relative rounded-xl border-2 overflow-hidden bg-light-elevated transition-all flex flex-col ${
                              isPrimary
                                ? 'border-[#B89555] ring-2 ring-[#B89555]/30'
                                : isAdditional
                                ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                                : 'border-light-border hover:border-charcoal-400'
                            }`}
                          >
                            <div className="aspect-square relative overflow-hidden bg-white">
                              <img
                                src={photo.url}
                                alt={photo.alt || activeColor.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              {isPrimary && (
                                <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-[#B89555] text-charcoal-950 font-bold text-[9px] rounded-md shadow-xs">
                                  Primary
                                </span>
                              )}
                              {isAdditional && !isPrimary && (
                                <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-emerald-600 text-white font-bold text-[9px] rounded-md shadow-xs">
                                  Additional
                                </span>
                              )}
                              {photo.color && (
                                <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-black/70 text-white font-semibold text-[9px] rounded">
                                  {photo.color}
                                </span>
                              )}
                            </div>

                            <div className="p-2 bg-white flex flex-col gap-1 border-t border-light-border">
                              <button
                                type="button"
                                onClick={() => handleSelectMediaCenterImage(activeColor.id, photo.url, false)}
                                className={`w-full py-1 px-1.5 text-[10px] font-bold rounded-lg transition-colors ${
                                  isPrimary
                                    ? 'bg-[#B89555] text-charcoal-950'
                                    : 'bg-light-elevated hover:bg-light-hover text-charcoal-800 border border-light-border'
                                }`}
                              >
                                {isPrimary ? '✓ Primary Photo' : 'Set as Primary'}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (isAdditional) {
                                    handleRemoveColorAdditionalImage(activeColor.id, photo.url);
                                  } else {
                                    handleSelectMediaCenterImage(activeColor.id, photo.url, true);
                                  }
                                }}
                                className={`w-full py-0.5 px-1.5 text-[9px] font-semibold rounded transition-colors ${
                                  isAdditional
                                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                    : 'text-charcoal-600 hover:bg-light-hover'
                                }`}
                              >
                                {isAdditional ? 'Remove Extra' : '+ Add Extra View'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-light-border bg-light-elevated/50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setMediaPickerColorId(null)}
                  className="px-5 py-2 bg-champagne-500 hover:bg-champagne-400 text-charcoal-950 text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reorder Products Modal */}
      {isReorderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-light-border p-5 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-elevation">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-charcoal-900">Reorder Products</h3>
              <button
                type="button"
                onClick={() => setIsReorderModalOpen(false)}
                className="text-charcoal-400 hover:text-charcoal-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {reorderProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-3 bg-light-elevated border border-light-border rounded-xl"
                >
                  <span className="text-xs font-bold text-charcoal-500 w-8">#{index + 1}</span>
                  <span className="flex-1 text-xs font-semibold text-charcoal-900">{product.name}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (index > 0) {
                          const newOrder = [...reorderProducts];
                          [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
                          setReorderProducts(newOrder);
                        }
                      }}
                      disabled={index === 0}
                      className="p-1.5 text-charcoal-600 hover:text-[#B89555] disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-light-hover"
                    >
                      <ChevronRight className="w-4 h-4 -rotate-90" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (index < reorderProducts.length - 1) {
                          const newOrder = [...reorderProducts];
                          [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                          setReorderProducts(newOrder);
                        }
                      }}
                      disabled={index === reorderProducts.length - 1}
                      className="p-1.5 text-charcoal-600 hover:text-[#B89555] disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-light-hover"
                    >
                      <ChevronRight className="w-4 h-4 rotate-90" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-light-border">
              <button
                type="button"
                onClick={() => setIsReorderModalOpen(false)}
                className="px-4 py-2 bg-light-elevated text-charcoal-700 text-xs font-semibold rounded-xl hover:bg-light-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const payload = reorderProducts.map((p, i) => ({ id: p.id, sortOrder: i + 1 }));
                    const res = await fetch('/api/admin/products/reorder', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ products: payload }),
                    });
                    if (res.ok) {
                      showNotice('Product order updated successfully');
                      setIsReorderModalOpen(false);
                      // Refresh products
                      window.location.reload();
                    } else {
                      showNotice('Failed to update product order', 'error');
                    }
                  } catch (err) {
                    showNotice('Failed to update product order', 'error');
                  }
                }}
                className="px-4 py-2 bg-champagne-500 text-charcoal-950 text-xs font-bold rounded-xl hover:bg-champagne-400"
              >
                Save Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B89555]"></div></div>}>
      <AdminProductsContent />
    </Suspense>
  );
}
