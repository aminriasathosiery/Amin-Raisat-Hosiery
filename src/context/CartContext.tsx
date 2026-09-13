'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { CartItem, DealCartItem, ProductCartItem } from '@/types';
import { useStore } from './StoreContext';

// Type guards
function isDealCartItem(item: CartItem): item is DealCartItem {
  return item.type === 'deal';
}

function isProductCartItem(item: CartItem): item is ProductCartItem {
  return item.type === 'product';
}

interface CartContextType {
  items: CartItem[];
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  addItem: (item: CartItem) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateItemSize: (id: string, newSize: string) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  totalQuantity: number;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  isFreeDeliveryUnlocked: boolean;
  piecesNeededForFreeDelivery: number;
  buyNowItem: CartItem | null;
  setBuyNowItem: (item: CartItem | null) => void;
  updateBuyNowItem: (updates: { size?: string; quantity?: number }) => void;
  clearBuyNow: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'arh_cart_items_v3';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, products } = useStore();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Isolated Buy Now State (Never pollutes or overwrites general cart items)
  const [buyNowItem, setBuyNowItemState] = useState<CartItem | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('arh_buynow_item_v1');
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return null;
  });

  const setBuyNowItem = (item: CartItem | null) => {
    if (!item) {
      setBuyNowItemState(null);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem('arh_buynow_item_v1');
        } catch {}
      }
      return;
    }

    let id: string;
    if (isDealCartItem(item)) {
      id = `buynow_deal_${item.dealId}`;
    } else if (isProductCartItem(item)) {
      id = `buynow_${item.productId}_${item.quality}_${item.sleeve}_${item.size}`;
    } else {
      id = `buynow_${Date.now()}`;
    }

    const fullItem: CartItem = { ...item, id };
    setBuyNowItemState(fullItem);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('arh_buynow_item_v1', JSON.stringify(fullItem));
      } catch {}
    }
  };

  const updateBuyNowItem = (updates: { size?: string; quantity?: number }) => {
    if (!buyNowItem || !isProductCartItem(buyNowItem)) return;

    let updated = { ...buyNowItem };

    if (updates.quantity !== undefined) {
      const maxQty = settings.shipping?.maxOrderQty || 100;
      updated.quantity = Math.max(1, Math.min(maxQty, updates.quantity));
    }

    if (updates.size && updates.size !== buyNowItem.size) {
      const prod = products.find((p) => p.id === buyNowItem.productId);
      const variant = prod?.variants?.find(
        (v) =>
          v.size === updates.size &&
          v.quality === buyNowItem.quality &&
          v.sleeve === buyNowItem.sleeve
      );

      const newUnitPrice = variant
        ? (variant.salePrice || variant.price)
        : buyNowItem.unitPrice;

      updated = {
        ...updated,
        size: updates.size,
        variantId: variant?.id || updated.variantId,
        unitPrice: newUnitPrice,
        id: `buynow_${buyNowItem.productId}_${buyNowItem.quality}_${buyNowItem.sleeve}_${updates.size}`,
      };
    }

    setBuyNowItemState(updated);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('arh_buynow_item_v1', JSON.stringify(updated));
      } catch {}
    }
  };

  const clearBuyNow = () => {
    setBuyNowItem(null);
  };

  // Load from local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY) || localStorage.getItem('arh_cart_items_v2') || localStorage.getItem('arh_cart_items_v1');
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load cart from localStorage:', e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, isInitialized]);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);
  const toggleDrawer = useCallback(() => setIsDrawerOpen((prev) => !prev), []);

  const addItem = (newItem: CartItem) => {
    const maxQty = settings.shipping?.maxOrderQty || 100;

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => item.id === newItem.id);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        const newQty = Math.min(maxQty, updated[existingIndex].quantity + (newItem.quantity || 1));
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          unitPrice: newItem.unitPrice,
        };
        // Only update variantId for product items
        if (isProductCartItem(newItem) && isProductCartItem(updated[existingIndex])) {
          updated[existingIndex].variantId = newItem.variantId || updated[existingIndex].variantId;
        }
        return updated;
      } else {
        return [...prevItems, { ...newItem, quantity: Math.min(maxQty, Math.max(1, newItem.quantity || 1)) }];
      }
    });
    setIsDrawerOpen(true);
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    const maxQty = settings.shipping?.maxOrderQty || 100;
    const safeQty = Math.min(maxQty, quantity);

    setItems((prevItems) =>
      prevItems.map((it) => (it.id === id ? { ...it, quantity: safeQty } : it))
    );
  };

  const updateItemSize = (id: string, newSize: string) => {
    setItems((prevItems) => {
      const targetIndex = prevItems.findIndex((it) => it.id === id);
      if (targetIndex === -1) return prevItems;

      const target = prevItems[targetIndex];
      if (!isProductCartItem(target)) return prevItems; // Only update size for product items
      if (target.size === newSize) return prevItems;

      const prod = products.find((p) => p.id === target.productId);
      const variant = prod?.variants?.find(
        (v) =>
          v.size === newSize &&
          v.quality === target.quality &&
          v.sleeve === target.sleeve
      );

      const newUnitPrice = variant
        ? (variant.salePrice || variant.price)
        : target.unitPrice;

      const newId = `${target.productId}_${target.quality}_${target.sleeve}_${newSize}`;

      // Check if another item with newId already exists in cart -> merge quantities
      const existingIndex = prevItems.findIndex((it) => it.id === newId);
      if (existingIndex > -1 && existingIndex !== targetIndex) {
        const maxQty = settings.shipping?.maxOrderQty || 100;
        const mergedQty = Math.min(maxQty, prevItems[existingIndex].quantity + target.quantity);
        return prevItems
          .filter((_, idx) => idx !== targetIndex)
          .map((it, idx) => {
            if (idx === (existingIndex > targetIndex ? existingIndex - 1 : existingIndex) && isProductCartItem(it)) {
              return { ...it, quantity: mergedQty, unitPrice: newUnitPrice, variantId: variant?.id || it.variantId };
            }
            return it;
          });
      }

      // Otherwise, update target in place
      return prevItems.map((it, idx) => {
        if (idx === targetIndex && isProductCartItem(it)) {
          return {
            ...it,
            id: newId,
            size: newSize,
            variantId: variant?.id || it.variantId,
            unitPrice: newUnitPrice,
          };
        }
        return it;
      });
    });
  };

  const removeItem = (id: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  // Delivery fee rules:
  // If any deal has isFreeDelivery = true -> Free Delivery (Rs. 0)
  // Else if retail totalQuantity >= freeDeliveryThreshold (default 3) -> Free Delivery (Rs. 0)
  // Else if retail totalQuantity > 0 & < freeDeliveryThreshold -> Base Delivery Charge (Rs. 200)
  const hasFreeDeliveryDeal = items.some(item => isDealCartItem(item) && item.isFreeDelivery);
  const freeThreshold = settings.shipping?.freeDeliveryThreshold || 3;
  const isFreeDeliveryUnlocked = hasFreeDeliveryDeal || totalQuantity >= freeThreshold;
  const deliveryFee =
    totalQuantity === 0 ? 0 : isFreeDeliveryUnlocked ? 0 : (settings.shipping?.baseDeliveryCharge ?? 200);
  const totalAmount = subtotal + deliveryFee;
  const piecesNeededForFreeDelivery = hasFreeDeliveryDeal ? 0 : Math.max(0, freeThreshold - totalQuantity);

  return (
    <CartContext.Provider
      value={{
        items,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        toggleDrawer,
        addItem,
        updateQuantity,
        updateItemSize,
        removeItem,
        clearCart,
        totalQuantity,
        subtotal,
        deliveryFee,
        totalAmount,
        isFreeDeliveryUnlocked,
        piecesNeededForFreeDelivery,
        buyNowItem,
        setBuyNowItem,
        updateBuyNowItem,
        clearBuyNow,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
