'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { CartItem } from '@/types';
import { useStore } from './StoreContext';

export type CartMode = 'retail' | 'wholesale' | 'empty';

interface ModeConflictInfo {
  incomingItem: Omit<CartItem, 'id'>;
  currentMode: 'retail' | 'wholesale';
  targetMode: 'retail' | 'wholesale';
}

interface CartContextType {
  items: CartItem[];
  cartMode: CartMode;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  addItem: (item: Omit<CartItem, 'id'>) => boolean; // returns false if mode conflict
  switchCartModeAndAdd: (item: Omit<CartItem, 'id'>) => void;
  modeConflict: ModeConflictInfo | null;
  clearModeConflict: () => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  totalQuantity: number;
  subtotal: number;
  regularSubtotal: number;
  wholesaleSubtotal: number;
  totalSavings: number;
  deliveryFee: number;
  totalAmount: number;
  isFreeDeliveryUnlocked: boolean;
  piecesNeededForFreeDelivery: number;
  hasWholesaleItems: boolean;
  wholesaleQuantity: number;
  isWholesaleMinimumMet: boolean;
  wholesalePiecesNeeded: number;
  wholesaleMinQty: number;
  buyNowItem: CartItem | null;
  setBuyNowItem: (item: Omit<CartItem, 'id'> | null) => void;
  clearBuyNow: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'arh_cart_items_v3';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useStore();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [modeConflict, setModeConflict] = useState<ModeConflictInfo | null>(null);

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

  const setBuyNowItem = (item: Omit<CartItem, 'id'> | null) => {
    if (!item) {
      setBuyNowItemState(null);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem('arh_buynow_item_v1');
        } catch {}
      }
      return;
    }
    const isWholesale = Boolean(item.isWholesale);
    const id = `buynow_${item.productId}_${item.quality}_${item.sleeve}_${item.size}${isWholesale ? '_wholesale' : ''}`;
    const fullItem: CartItem = { ...item, id, isWholesale };
    setBuyNowItemState(fullItem);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('arh_buynow_item_v1', JSON.stringify(fullItem));
      } catch {}
    }
  };

  const clearBuyNow = () => {
    setBuyNowItem(null);
  };

  const wholesaleMinQty = settings.wholesale?.defaultMinQty || 12;

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
    setModeConflict(null);
  }, []);
  const toggleDrawer = useCallback(() => setIsDrawerOpen((prev) => !prev), []);
  const clearModeConflict = useCallback(() => setModeConflict(null), []);

  // Compute active cart mode
  const hasWholesaleItems = items.some((item) => item.isWholesale);
  const cartMode: CartMode = items.length === 0 ? 'empty' : hasWholesaleItems ? 'wholesale' : 'retail';

  const addItemInternal = (newItem: Omit<CartItem, 'id'>) => {
    const isWholesale = Boolean(newItem.isWholesale);
    const id = `${newItem.productId}_${newItem.quality}_${newItem.sleeve}_${newItem.size}${isWholesale ? '_wholesale' : ''}`;
    
    // For wholesale items, permit higher order volume (up to 5,000)
    const maxQty = isWholesale ? 5000 : (settings.shipping.maxOrderQty || 12);

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => item.id === id);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        const newQty = Math.min(maxQty, updated[existingIndex].quantity + newItem.quantity);
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          unitPrice: newItem.unitPrice,
          regularPrice: newItem.regularPrice || updated[existingIndex].regularPrice,
          wholesalePrice: newItem.wholesalePrice || updated[existingIndex].wholesalePrice,
          isWholesale,
        };
        return updated;
      } else {
        return [...prevItems, { ...newItem, id, isWholesale }];
      }
    });
    setIsDrawerOpen(true);
    setModeConflict(null);
  };

  const addItem = (newItem: Omit<CartItem, 'id'>): boolean => {
    const isWholesale = Boolean(newItem.isWholesale);

    // Strict Cart Isolation Check
    if (items.length > 0) {
      if (!isWholesale && hasWholesaleItems) {
        // Conflict: adding retail item to wholesale cart
        setModeConflict({
          incomingItem: newItem,
          currentMode: 'wholesale',
          targetMode: 'retail',
        });
        setIsDrawerOpen(true);
        return false;
      } else if (isWholesale && !hasWholesaleItems) {
        // Conflict: adding wholesale item to retail cart
        setModeConflict({
          incomingItem: newItem,
          currentMode: 'retail',
          targetMode: 'wholesale',
        });
        setIsDrawerOpen(true);
        return false;
      }
    }

    addItemInternal(newItem);
    return true;
  };

  const switchCartModeAndAdd = (newItem: Omit<CartItem, 'id'>) => {
    const isWholesale = Boolean(newItem.isWholesale);
    const id = `${newItem.productId}_${newItem.quality}_${newItem.sleeve}_${newItem.size}${isWholesale ? '_wholesale' : ''}`;
    // Replace all existing items with the new mode item
    setItems([{ ...newItem, id, isWholesale }]);
    setModeConflict(null);
    setIsDrawerOpen(true);
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    const item = items.find((it) => it.id === id);
    const maxQty = item?.isWholesale ? 5000 : (settings.shipping.maxOrderQty || 12);
    const safeQty = Math.min(maxQty, quantity);

    setItems((prevItems) =>
      prevItems.map((it) => (it.id === id ? { ...it, quantity: safeQty } : it))
    );
  };

  const removeItem = (id: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setItems([]);
    setModeConflict(null);
  };

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  const wholesaleItems = items.filter((item) => item.isWholesale);
  const wholesaleQuantity = wholesaleItems.reduce((sum, item) => sum + item.quantity, 0);
  const isWholesaleMinimumMet = !hasWholesaleItems || wholesaleQuantity >= wholesaleMinQty;
  const wholesalePiecesNeeded = Math.max(0, wholesaleMinQty - wholesaleQuantity);

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const regularSubtotal = items.reduce((sum, item) => {
    const regPrice = item.regularPrice || item.unitPrice;
    return sum + regPrice * item.quantity;
  }, 0);

  const wholesaleSubtotal = wholesaleItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const totalSavings = Math.max(0, regularSubtotal - subtotal);

  // Delivery fee rules:
  // Wholesale orders get 100% Free Delivery
  // Retail totalQuantity >= 3 -> Free Delivery (Rs. 0)
  // Retail totalQuantity > 0 & < 3 -> Base Delivery Charge (Rs. 200)
  const freeThreshold = settings.shipping?.freeDeliveryThreshold || 3;
  const isFreeDeliveryUnlocked = totalQuantity >= freeThreshold || hasWholesaleItems;
  const deliveryFee =
    totalQuantity === 0 ? 0 : isFreeDeliveryUnlocked ? 0 : (settings.shipping?.baseDeliveryCharge ?? 200);
  const totalAmount = subtotal + deliveryFee;
  const piecesNeededForFreeDelivery = Math.max(0, freeThreshold - totalQuantity);

  return (
    <CartContext.Provider
      value={{
        items,
        cartMode,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        toggleDrawer,
        addItem,
        switchCartModeAndAdd,
        modeConflict,
        clearModeConflict,
        updateQuantity,
        removeItem,
        clearCart,
        totalQuantity,
        subtotal,
        regularSubtotal,
        wholesaleSubtotal,
        totalSavings,
        deliveryFee,
        totalAmount,
        isFreeDeliveryUnlocked,
        piecesNeededForFreeDelivery,
        hasWholesaleItems,
        wholesaleQuantity,
        isWholesaleMinimumMet,
        wholesalePiecesNeeded,
        wholesaleMinQty,
        buyNowItem,
        setBuyNowItem,
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
