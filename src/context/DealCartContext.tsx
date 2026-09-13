'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DealCartItem } from '@/types';

interface DealCartContextType {
  dealItems: DealCartItem[];
  addDealItem: (item: Omit<DealCartItem, 'id'>) => void;
  removeDealItem: (id: string) => void;
  updateDealQty: (id: string, quantity: number) => void;
  clearDealCart: () => void;
  dealSubtotal: number;
  dealTotalQty: number;
  hasFreeDeliveryDeal: boolean;
  // Buy Now support for deals
  buyNowDealItem: DealCartItem | null;
  setBuyNowDealItem: (item: Omit<DealCartItem, 'id'> | null) => void;
  clearBuyNowDeal: () => void;
}

const DealCartContext = createContext<DealCartContextType | undefined>(undefined);

const DEAL_CART_KEY = 'arh_deal_cart_v1';
const DEAL_BUYNOW_KEY = 'arh_deal_buynow_v1';

export const DealCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dealItems, setDealItems] = useState<DealCartItem[]>([]);
  const [buyNowDealItem, setBuyNowDealItemState] = useState<DealCartItem | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(DEAL_CART_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setDealItems(parsed);
      }
      const storedBn = sessionStorage.getItem(DEAL_BUYNOW_KEY);
      if (storedBn) {
        setBuyNowDealItemState(JSON.parse(storedBn));
      }
    } catch {}
    setIsInitialized(true);
  }, []);

  // Persist deal cart
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(DEAL_CART_KEY, JSON.stringify(dealItems));
    } catch {}
  }, [dealItems, isInitialized]);

  const addDealItem = useCallback((item: Omit<DealCartItem, 'id'>) => {
    const id = `deal_${item.dealId}_${Date.now()}`;
    setDealItems((prev) => {
      // Check if same deal already in cart — increment qty instead
      const existing = prev.find((d) => d.dealId === item.dealId);
      if (existing) {
        return prev.map((d) =>
          d.dealId === item.dealId ? { ...d, quantity: d.quantity + (item.quantity || 1) } : d
        );
      }
      return [...prev, { ...item, id }];
    });
  }, []);

  const removeDealItem = useCallback((id: string) => {
    setDealItems((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const updateDealQty = useCallback((id: string, quantity: number) => {
    const qty = Math.max(1, Math.min(99, quantity));
    setDealItems((prev) => prev.map((d) => (d.id === id ? { ...d, quantity: qty } : d)));
  }, []);

  const clearDealCart = useCallback(() => {
    setDealItems([]);
  }, []);

  const setBuyNowDealItem = useCallback((item: Omit<DealCartItem, 'id'> | null) => {
    if (!item) {
      setBuyNowDealItemState(null);
      try { sessionStorage.removeItem(DEAL_BUYNOW_KEY); } catch {}
      return;
    }
    const id = `buynow_deal_${item.dealId}_${Date.now()}`;
    const full: DealCartItem = { ...item, id };
    setBuyNowDealItemState(full);
    try { sessionStorage.setItem(DEAL_BUYNOW_KEY, JSON.stringify(full)); } catch {}
  }, []);

  const clearBuyNowDeal = useCallback(() => {
    setBuyNowDealItemState(null);
    try { sessionStorage.removeItem(DEAL_BUYNOW_KEY); } catch {}
  }, []);

  const dealSubtotal = dealItems.reduce((sum, d) => sum + d.unitPrice * d.quantity, 0);
  const dealTotalQty = dealItems.reduce((sum, d) => sum + d.quantity, 0);
  const hasFreeDeliveryDeal = dealItems.some((d) => d.isFreeDelivery);

  return (
    <DealCartContext.Provider
      value={{
        dealItems,
        addDealItem,
        removeDealItem,
        updateDealQty,
        clearDealCart,
        dealSubtotal,
        dealTotalQty,
        hasFreeDeliveryDeal,
        buyNowDealItem,
        setBuyNowDealItem,
        clearBuyNowDeal,
      }}
    >
      {children}
    </DealCartContext.Provider>
  );
};

export function useDealCart(): DealCartContextType {
  const ctx = useContext(DealCartContext);
  if (!ctx) throw new Error('useDealCart must be used within DealCartProvider');
  return ctx;
}
