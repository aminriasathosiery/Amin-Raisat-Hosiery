'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/context/StoreContext';
import { SiteSettings, PaymentMethodConfig, AnnouncementStrip } from '@/types';
import { INITIAL_SITE_SETTINGS } from '@/data/initialData';
import {
  Save,
  Truck,
  Building2,
  Check,
  Megaphone,
  CreditCard,
  Plus,
  Trash2,
  Smartphone,
  Wallet,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { WhatsAppIcon } from '@/components/common/WhatsAppIcon';

export default function AdminSettingsPage() {
  const { settings, updateSettings } = useStore();
  
  const [formState, setFormState] = useState<SiteSettings>(() => ({
    ...INITIAL_SITE_SETTINGS,
    ...settings,
    shipping: { ...INITIAL_SITE_SETTINGS.shipping, ...settings?.shipping },
    bankDetails: { ...INITIAL_SITE_SETTINGS.bankDetails, ...settings?.bankDetails },
    paymentMethods: settings?.paymentMethods || INITIAL_SITE_SETTINGS.paymentMethods,
    announcementStrips: settings?.announcementStrips || INITIAL_SITE_SETTINGS.announcementStrips,
  }));

  const [activePaymentTab, setActivePaymentTab] = useState<'cod' | 'bank_transfer' | 'jazzcash' | 'easypaisa' | 'sadapay'>('cod');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (settings) {
      setFormState({
        ...INITIAL_SITE_SETTINGS,
        ...settings,
        shipping: { ...INITIAL_SITE_SETTINGS.shipping, ...settings.shipping },
        bankDetails: { ...INITIAL_SITE_SETTINGS.bankDetails, ...settings.bankDetails },
        paymentMethods: settings.paymentMethods || INITIAL_SITE_SETTINGS.paymentMethods,
        announcementStrips: settings.announcementStrips || INITIAL_SITE_SETTINGS.announcementStrips,
      });
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Sync bankDetails with bank_transfer settings
      const currentBank = formState.paymentMethods?.bank_transfer;
      const syncedState: SiteSettings = {
        ...formState,
        isCodEnabled: formState.paymentMethods?.cod?.enabled ?? formState.isCodEnabled,
        isBankTransferEnabled: formState.paymentMethods?.bank_transfer?.enabled ?? formState.isBankTransferEnabled,
        bankDetails: {
          bankName: currentBank?.bankName || formState.bankDetails?.bankName || '',
          accountTitle: currentBank?.accountTitle || formState.bankDetails?.accountTitle || '',
          accountNumber: currentBank?.accountNumber || formState.bankDetails?.accountNumber || '',
          iban: currentBank?.iban || formState.bankDetails?.iban || '',
          instructions: currentBank?.instructions || formState.bankDetails?.instructions || '',
        },
      };

      await updateSettings(syncedState);
      setToastMessage('All store, delivery & payment settings saved successfully!');
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setToastMessage('');
      }, 3500);
    } catch (err: any) {
      console.error('Settings update error:', err);
      setToastMessage(`Settings save failed: ${err instanceof Error ? err.message : 'Unknown error. Please try again.'}`);
      setTimeout(() => setToastMessage(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Helper for updating payment method
  const updatePaymentMethod = (key: 'cod' | 'bank_transfer' | 'jazzcash' | 'easypaisa' | 'sadapay', updates: Partial<PaymentMethodConfig>) => {
    const currentMethods = formState.paymentMethods || INITIAL_SITE_SETTINGS.paymentMethods!;
    const updated = {
      ...currentMethods,
      [key]: {
        ...currentMethods[key],
        ...updates,
      },
    };
    setFormState({
      ...formState,
      paymentMethods: updated,
      isCodEnabled: key === 'cod' && updates.enabled !== undefined ? updates.enabled : formState.isCodEnabled,
      isBankTransferEnabled: key === 'bank_transfer' && updates.enabled !== undefined ? updates.enabled : formState.isBankTransferEnabled,
    });
  };

  // Strip helpers
  const handleAddStrip = () => {
    const current = formState.announcementStrips || [];
    const newStrip: AnnouncementStrip = {
      id: `strip-${Date.now()}`,
      text: 'New Announcement Promo Text',
      isActive: true,
      displayOrder: current.length + 1,
    };
    setFormState({
      ...formState,
      announcementStrips: [...current, newStrip],
    });
  };

  const handleUpdateStrip = (index: number, updates: Partial<AnnouncementStrip>) => {
    const current = [...(formState.announcementStrips || [])];
    if (current[index]) {
      current[index] = { ...current[index], ...updates };
      setFormState({ ...formState, announcementStrips: current });
    }
  };

  const handleDeleteStrip = (index: number) => {
    const current = [...(formState.announcementStrips || [])];
    current.splice(index, 1);
    setFormState({ ...formState, announcementStrips: current });
  };

  const methods = formState.paymentMethods || INITIAL_SITE_SETTINGS.paymentMethods!;

  return (
    <div className="space-y-6 max-w-5xl text-charcoal-900 dark:text-[#F4F1E9]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-white dark:bg-[#191917] text-charcoal-900 dark:text-[#F4F1E9] border border-emerald-500/40 rounded-xl shadow-elevation flex items-center gap-2.5 text-xs font-semibold animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#191917] p-6 rounded-2xl border border-light-border dark:border-[#34322D] shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-charcoal-900 dark:text-[#F4F1E9]">Store &amp; Delivery Engine Settings</h1>
          <p className="text-xs text-charcoal-500 dark:text-[#8E8A80] mt-1">
            Configure delivery rules (MOQ, 100+ Max Qty, Free Delivery), Pakistan payment gateways (COD, Bank Transfer, JazzCash, EasyPaisa, SadaPay), and announcement bar strips.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 bg-champagne-500 hover:bg-champagne-400 disabled:opacity-50 text-charcoal-950 text-xs font-bold h-10 px-5 rounded-xl shadow-xs transition-all"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving...' : 'Save All Changes'}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Delivery & Order Rules */}
        <div className="bg-white dark:bg-[#191917] rounded-2xl p-5 sm:p-6 border border-light-border dark:border-[#34322D] shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-light-border dark:border-[#34322D] pb-3">
            <div className="p-2 bg-light-elevated dark:bg-[#22211E] text-[#B89555] dark:text-[#C9A96A] rounded-xl border border-light-border dark:border-[#34322D]">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-charcoal-900 dark:text-[#F4F1E9]">1. Delivery Rules &amp; Shipping Charges</h2>
              <p className="text-xs text-charcoal-500 dark:text-[#8E8A80]">
                These parameters automatically sync across homepage benefit strips, cart calculations, checkout, and WhatsApp order messages.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">
                Free Delivery After (Pieces) *
              </label>
              <input
                type="number"
                min={1}
                max={500}
                required
                value={formState.shipping?.freeDeliveryThreshold ?? 3}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    shipping: {
                      ...formState.shipping,
                      freeDeliveryThreshold: Number(e.target.value),
                    },
                  })
                }
                className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl font-bold text-[#B89555] dark:text-[#C9A96A] focus:border-[#B89555] dark:focus:border-[#C9A96A] focus:outline-none"
              />
              <span className="text-[10px] text-charcoal-500 dark:text-[#8E8A80] mt-1 block">
                Store policy: 3+ pieces = FREE DELIVERY
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">
                Standard Delivery Charge (Rs.) *
              </label>
              <input
                type="number"
                min={0}
                required
                value={formState.shipping?.baseDeliveryCharge ?? 200}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    shipping: {
                      ...formState.shipping,
                      baseDeliveryCharge: Number(e.target.value),
                    },
                  })
                }
                className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl font-bold text-[#B89555] dark:text-[#C9A96A] focus:border-[#B89555] dark:focus:border-[#C9A96A] focus:outline-none"
              />
              <span className="text-[10px] text-charcoal-500 dark:text-[#8E8A80] mt-1 block">
                Applied when order &lt; free delivery threshold
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">
                Minimum Order Quantity (Pieces) *
              </label>
              <input
                type="number"
                min={1}
                max={500}
                required
                value={formState.shipping?.minOrderQty ?? 1}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    shipping: {
                      ...formState.shipping,
                      minOrderQty: Math.max(1, Number(e.target.value)),
                    },
                  })
                }
                className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl font-bold text-charcoal-900 dark:text-[#F4F1E9] focus:border-[#B89555] dark:focus:border-[#C9A96A] focus:outline-none"
              />
              <span className="text-[10px] text-charcoal-500 dark:text-[#8E8A80] mt-1 block">
                Store policy: 1 piece is a valid order (MOQ = 1)
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">
                Maximum Order Quantity (Pieces) *
              </label>
              <input
                type="number"
                min={1}
                max={10000}
                required
                value={formState.shipping?.maxOrderQty ?? 100}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    shipping: {
                      ...formState.shipping,
                      maxOrderQty: Number(e.target.value),
                    },
                  })
                }
                className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl font-bold text-charcoal-900 dark:text-[#F4F1E9] focus:border-[#B89555] dark:focus:border-[#C9A96A] focus:outline-none"
              />
              <span className="text-[10px] text-charcoal-500 dark:text-[#8E8A80] mt-1 block">
                Max retail order limit (e.g. 12, 100, or 500)
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-light-border dark:border-[#34322D] grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">
                Exchange / Return Period (Days)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={formState.exchangeReturnDays ?? 7}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    exchangeReturnDays: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl font-bold text-charcoal-900 dark:text-[#F4F1E9] focus:border-[#B89555] dark:focus:border-[#C9A96A] focus:outline-none"
              />
              <span className="text-[10px] text-charcoal-500 dark:text-[#8E8A80] mt-1 block">
                Shown on exchange &amp; returns page (Default: 7 days)
              </span>
            </div>
          </div>
        </div>

        {/* 2. Announcement Bar & Strips Settings */}
        <div className="bg-white dark:bg-[#191917] rounded-2xl p-5 sm:p-6 border border-light-border dark:border-[#34322D] shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-light-border dark:border-[#34322D] pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-light-elevated dark:bg-[#22211E] text-[#B89555] dark:text-[#C9A96A] rounded-xl border border-light-border dark:border-[#34322D]">
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-charcoal-900 dark:text-[#F4F1E9]">2. Website Announcement Bar &amp; Dynamic Strips</h2>
                <p className="text-xs text-charcoal-500 dark:text-[#8E8A80]">
                  Dynamic marquee ticker rotating at the top of every page.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddStrip}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#B89555]/10 hover:bg-[#B89555]/20 text-[#B89555] dark:text-[#C9A96A] rounded-lg text-xs font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Strip</span>
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="announcement-toggle"
                checked={formState.isAnnouncementEnabled ?? true}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    isAnnouncementEnabled: e.target.checked,
                  })
                }
                className="rounded accent-[#B89555] w-4 h-4"
              />
              <label htmlFor="announcement-toggle" className="text-xs font-semibold text-charcoal-900 dark:text-[#F4F1E9] cursor-pointer">
                Enable Top Announcement Bar on Website
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">
                Default Static Announcement Text (Fallback)
              </label>
              <input
                type="text"
                placeholder="100% Pure Combed Cotton Innerwear — Free Delivery on Orders of 3+ Pieces Across Pakistan!"
                value={formState.announcementText || ''}
                onChange={(e) => setFormState({ ...formState, announcementText: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl text-charcoal-900 dark:text-[#F4F1E9] focus:border-[#B89555] dark:focus:border-[#C9A96A] focus:outline-none"
              />
            </div>

            {/* Dynamic Strips List */}
            <div className="space-y-2 pt-2">
              <span className="block text-xs font-bold text-charcoal-800 dark:text-[#D1CCC0]">
                Active Marquee Strips ({formState.announcementStrips?.length || 0})
              </span>
              
              <div className="space-y-2.5">
                {(formState.announcementStrips || []).map((strip, idx) => (
                  <div
                    key={strip.id || idx}
                    className="p-3 bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#B89555]/20 text-[#B89555] dark:text-[#C9A96A] text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <label className="flex items-center gap-1.5 text-xs text-charcoal-600 dark:text-[#B8B3A8] cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={strip.isActive}
                          onChange={(e) => handleUpdateStrip(idx, { isActive: e.target.checked })}
                          className="rounded accent-[#B89555] w-3.5 h-3.5"
                        />
                        <span>Active</span>
                      </label>
                    </div>

                    <div className="flex-1">
                      <input
                        type="text"
                        value={strip.text}
                        onChange={(e) => handleUpdateStrip(idx, { text: e.target.value })}
                        placeholder="Strip promotional text..."
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#191917] border border-light-border dark:border-[#34322D] rounded-lg text-charcoal-900 dark:text-[#F4F1E9] focus:border-[#B89555] dark:focus:border-[#C9A96A] focus:outline-none"
                      />
                    </div>

                    <div className="w-full sm:w-48">
                      <input
                        type="text"
                        value={strip.link || ''}
                        onChange={(e) => handleUpdateStrip(idx, { link: e.target.value })}
                        placeholder="Link (optional, e.g. /delivery)"
                        className="w-full px-2.5 py-1.5 text-[11px] bg-white dark:bg-[#191917] border border-light-border dark:border-[#34322D] rounded-lg text-charcoal-900 dark:text-[#F4F1E9] focus:border-[#B89555] dark:focus:border-[#C9A96A] focus:outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteStrip(idx)}
                      className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0 self-end sm:self-auto"
                      title="Delete Strip"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {(!formState.announcementStrips || formState.announcementStrips.length === 0) && (
                  <p className="text-xs text-charcoal-400 italic py-2">
                    No custom strips added. The fallback announcement message will be displayed.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Pakistan Payment Gateways & Accounts */}
        <div className="bg-white dark:bg-[#191917] rounded-2xl p-5 sm:p-6 border border-light-border dark:border-[#34322D] shadow-sm space-y-5">
          <div className="flex items-center gap-3 border-b border-light-border dark:border-[#34322D] pb-3">
            <div className="p-2 bg-light-elevated dark:bg-[#22211E] text-[#B89555] dark:text-[#C9A96A] rounded-xl border border-light-border dark:border-[#34322D]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-charcoal-900 dark:text-[#F4F1E9]">3. Pakistan Payment Gateways &amp; Accounts</h2>
              <p className="text-xs text-charcoal-500 dark:text-[#8E8A80]">
                Configure enabled methods, account titles, account numbers, and customer instructions shown at checkout and /payment-info.
              </p>
            </div>
          </div>

          {/* Payment Method Selector Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-light-border dark:border-[#34322D] pb-3">
            {(
              [
                { id: 'cod', label: 'Cash on Delivery', icon: Truck },
                { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
                { id: 'jazzcash', label: 'JazzCash', icon: Smartphone },
                { id: 'easypaisa', label: 'Easypaisa', icon: Smartphone },
                { id: 'sadapay', label: 'SadaPay', icon: Wallet },
              ] as const
            ).map((tab) => {
              const TabIcon = tab.icon;
              const isEnabled = methods[tab.id]?.enabled ?? true;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActivePaymentTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activePaymentTab === tab.id
                      ? 'bg-champagne-500 text-charcoal-950 shadow-xs'
                      : 'bg-light-elevated dark:bg-[#22211E] text-charcoal-600 dark:text-[#B8B3A8] hover:text-charcoal-900 dark:hover:text-[#F4F1E9]'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isEnabled ? 'bg-emerald-500' : 'bg-charcoal-400 opacity-40'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Tab 1: Cash on Delivery (COD) */}
          {activePaymentTab === 'cod' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between p-3.5 bg-light-elevated dark:bg-[#22211E] rounded-xl border border-light-border dark:border-[#34322D]">
                <div>
                  <span className="font-bold text-xs text-charcoal-900 dark:text-[#F4F1E9] block">Enable Cash on Delivery (COD)</span>
                  <span className="text-[11px] text-charcoal-500 dark:text-[#8E8A80]">Allow customers across Pakistan to pay cash to rider upon delivery</span>
                </div>
                <input
                  type="checkbox"
                  checked={methods.cod?.enabled ?? true}
                  onChange={(e) => updatePaymentMethod('cod', { enabled: e.target.checked })}
                  className="rounded accent-[#B89555] w-5 h-5 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">Display Name</label>
                <input
                  type="text"
                  value={methods.cod?.displayName || 'Cash on Delivery (COD)'}
                  onChange={(e) => updatePaymentMethod('cod', { displayName: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl font-bold text-charcoal-900 dark:text-[#F4F1E9] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">Customer Instructions</label>
                <textarea
                  rows={2}
                  value={methods.cod?.instructions || 'Pay in cash directly to the courier rider upon parcel delivery.'}
                  onChange={(e) => updatePaymentMethod('cod', { instructions: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl text-charcoal-900 dark:text-[#F4F1E9] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Tab 2: Direct Bank Transfer */}
          {activePaymentTab === 'bank_transfer' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between p-3.5 bg-light-elevated dark:bg-[#22211E] rounded-xl border border-light-border dark:border-[#34322D]">
                <div>
                  <span className="font-bold text-xs text-charcoal-900 dark:text-[#F4F1E9] block">Enable Direct Bank Transfer</span>
                  <span className="text-[11px] text-charcoal-500 dark:text-[#8E8A80]">Requires customer to upload receipt screenshot before order placement</span>
                </div>
                <input
                  type="checkbox"
                  checked={methods.bank_transfer?.enabled ?? true}
                  onChange={(e) => updatePaymentMethod('bank_transfer', { enabled: e.target.checked })}
                  className="rounded accent-[#B89555] w-5 h-5 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">Bank Name *</label>
                  <input
                    type="text"
                    value={methods.bank_transfer?.bankName || ''}
                    onChange={(e) => updatePaymentMethod('bank_transfer', { bankName: e.target.value })}
                    placeholder="e.g. Meezan Bank Ltd."
                    className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl font-bold text-charcoal-900 dark:text-[#F4F1E9] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">Account Title *</label>
                  <input
                    type="text"
                    value={methods.bank_transfer?.accountTitle || ''}
                    onChange={(e) => updatePaymentMethod('bank_transfer', { accountTitle: e.target.value })}
                    placeholder="e.g. Muhammad Amin"
                    className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl font-bold text-charcoal-900 dark:text-[#F4F1E9] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">Account Number *</label>
                  <input
                    type="text"
                    value={methods.bank_transfer?.accountNumber || ''}
                    onChange={(e) => updatePaymentMethod('bank_transfer', { accountNumber: e.target.value })}
                    placeholder="e.g. 01010101010101"
                    className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl font-mono font-bold text-[#B89555] dark:text-[#C9A96A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">IBAN / Raast ID</label>
                  <input
                    type="text"
                    value={methods.bank_transfer?.iban || ''}
                    onChange={(e) => updatePaymentMethod('bank_transfer', { iban: e.target.value })}
                    placeholder="e.g. PK00MEZN0000000000000000"
                    className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl font-mono font-bold text-[#B89555] dark:text-[#C9A96A] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">Branch Name / City</label>
                  <input
                    type="text"
                    value={methods.bank_transfer?.branch || ''}
                    onChange={(e) => updatePaymentMethod('bank_transfer', { branch: e.target.value })}
                    placeholder="e.g. Clock Tower Branch, Faisalabad"
                    className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl text-charcoal-900 dark:text-[#F4F1E9] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">Instructions</label>
                  <textarea
                    rows={2}
                    value={methods.bank_transfer?.instructions || ''}
                    onChange={(e) => updatePaymentMethod('bank_transfer', { instructions: e.target.value })}
                    placeholder="Instructions displayed to customer before transferring..."
                    className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl text-charcoal-900 dark:text-[#F4F1E9] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: JazzCash */}
          {activePaymentTab === 'jazzcash' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between p-3.5 bg-light-elevated dark:bg-[#22211E] rounded-xl border border-light-border dark:border-[#34322D]">
                <div>
                  <span className="font-bold text-xs text-charcoal-900 dark:text-[#F4F1E9] block">Enable JazzCash Wallet</span>
                  <span className="text-[11px] text-charcoal-500 dark:text-[#8E8A80]">Accept payments via JazzCash mobile account with mandatory screenshot</span>
                </div>
                <input
                  type="checkbox"
                  checked={methods.jazzcash?.enabled ?? true}
                  onChange={(e) => updatePaymentMethod('jazzcash', { enabled: e.target.checked })}
                  className="rounded accent-[#B89555] w-5 h-5 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">JazzCash Account Title *</label>
                  <input
                    type="text"
                    value={methods.jazzcash?.accountTitle || ''}
                    onChange={(e) => updatePaymentMethod('jazzcash', { accountTitle: e.target.value })}
                    placeholder="e.g. Muhammad Amin"
                    className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl font-bold text-charcoal-900 dark:text-[#F4F1E9] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">JazzCash Mobile Number *</label>
                  <input
                    type="text"
                    value={methods.jazzcash?.accountNumber || ''}
                    onChange={(e) => updatePaymentMethod('jazzcash', { accountNumber: e.target.value })}
                    placeholder="e.g. 03088666075"
                    className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl font-mono font-bold text-[#B89555] dark:text-[#C9A96A] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">Instructions</label>
                  <textarea
                    rows={2}
                    value={methods.jazzcash?.instructions || ''}
                    onChange={(e) => updatePaymentMethod('jazzcash', { instructions: e.target.value })}
                    placeholder="Instructions displayed to customer..."
                    className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl text-charcoal-900 dark:text-[#F4F1E9] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Easypaisa */}
          {activePaymentTab === 'easypaisa' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between p-3.5 bg-light-elevated dark:bg-[#22211E] rounded-xl border border-light-border dark:border-[#34322D]">
                <div>
                  <span className="font-bold text-xs text-charcoal-900 dark:text-[#F4F1E9] block">Enable Easypaisa Wallet</span>
                  <span className="text-[11px] text-charcoal-500 dark:text-[#8E8A80]">Accept payments via Easypaisa mobile account with mandatory screenshot</span>
                </div>
                <input
                  type="checkbox"
                  checked={methods.easypaisa?.enabled ?? true}
                  onChange={(e) => updatePaymentMethod('easypaisa', { enabled: e.target.checked })}
                  className="rounded accent-[#B89555] w-5 h-5 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">Easypaisa Account Title *</label>
                  <input
                    type="text"
                    value={methods.easypaisa?.accountTitle || ''}
                    onChange={(e) => updatePaymentMethod('easypaisa', { accountTitle: e.target.value })}
                    placeholder="e.g. Muhammad Amin"
                    className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl font-bold text-charcoal-900 dark:text-[#F4F1E9] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">Easypaisa Mobile Number *</label>
                  <input
                    type="text"
                    value={methods.easypaisa?.accountNumber || ''}
                    onChange={(e) => updatePaymentMethod('easypaisa', { accountNumber: e.target.value })}
                    placeholder="e.g. 03088666075"
                    className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl font-mono font-bold text-[#B89555] dark:text-[#C9A96A] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">Instructions</label>
                  <textarea
                    rows={2}
                    value={methods.easypaisa?.instructions || ''}
                    onChange={(e) => updatePaymentMethod('easypaisa', { instructions: e.target.value })}
                    placeholder="Instructions displayed to customer..."
                    className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl text-charcoal-900 dark:text-[#F4F1E9] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: SadaPay */}
          {activePaymentTab === 'sadapay' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between p-3.5 bg-light-elevated dark:bg-[#22211E] rounded-xl border border-light-border dark:border-[#34322D]">
                <div>
                  <span className="font-bold text-xs text-charcoal-900 dark:text-[#F4F1E9] block">Enable SadaPay</span>
                  <span className="text-[11px] text-charcoal-500 dark:text-[#8E8A80]">Accept payments via SadaPay number or IBAN with mandatory screenshot</span>
                </div>
                <input
                  type="checkbox"
                  checked={methods.sadapay?.enabled ?? true}
                  onChange={(e) => updatePaymentMethod('sadapay', { enabled: e.target.checked })}
                  className="rounded accent-[#B89555] w-5 h-5 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">SadaPay Account Title *</label>
                  <input
                    type="text"
                    value={methods.sadapay?.accountTitle || ''}
                    onChange={(e) => updatePaymentMethod('sadapay', { accountTitle: e.target.value })}
                    placeholder="e.g. Muhammad Amin"
                    className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl font-bold text-charcoal-900 dark:text-[#F4F1E9] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">SadaPay Mobile Number *</label>
                  <input
                    type="text"
                    value={methods.sadapay?.accountNumber || ''}
                    onChange={(e) => updatePaymentMethod('sadapay', { accountNumber: e.target.value })}
                    placeholder="e.g. 03088666075"
                    className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl font-mono font-bold text-[#B89555] dark:text-[#C9A96A] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">SadaPay IBAN</label>
                  <input
                    type="text"
                    value={methods.sadapay?.iban || ''}
                    onChange={(e) => updatePaymentMethod('sadapay', { iban: e.target.value })}
                    placeholder="e.g. PK45SADA0000000308866607"
                    className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl font-mono font-bold text-[#B89555] dark:text-[#C9A96A] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">Instructions</label>
                  <textarea
                    rows={2}
                    value={methods.sadapay?.instructions || ''}
                    onChange={(e) => updatePaymentMethod('sadapay', { instructions: e.target.value })}
                    placeholder="Instructions displayed to customer..."
                    className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl text-charcoal-900 dark:text-[#F4F1E9] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. Business & Contact Info */}
        <div className="bg-white dark:bg-[#191917] rounded-2xl p-5 sm:p-6 border border-light-border dark:border-[#34322D] shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-light-border dark:border-[#34322D] pb-3">
            <div className="p-2 bg-light-elevated dark:bg-[#22211E] text-[#25D366] rounded-xl border border-light-border dark:border-[#34322D]">
              <WhatsAppIcon size={20} className="fill-current" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-charcoal-900 dark:text-[#F4F1E9]">4. Store Info, Contact &amp; WhatsApp</h2>
              <p className="text-xs text-charcoal-500 dark:text-[#8E8A80]">Official contact info displayed across the storefront.</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="whatsapp-floating-toggle"
                checked={formState.isWhatsAppFloatingEnabled ?? true}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    isWhatsAppFloatingEnabled: e.target.checked,
                  })
                }
                className="rounded accent-[#B89555] w-4 h-4"
              />
              <label htmlFor="whatsapp-floating-toggle" className="text-xs font-semibold text-charcoal-900 dark:text-[#F4F1E9] cursor-pointer">
                Enable Floating WhatsApp Button on Website
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">Brand Name</label>
                <input
                  type="text"
                  value={formState.brandName}
                  onChange={(e) => setFormState({ ...formState, brandName: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl font-bold text-charcoal-900 dark:text-[#F4F1E9] focus:border-[#B89555] dark:focus:border-[#C9A96A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">Owner Name</label>
                <input
                  type="text"
                  value={formState.ownerName}
                  onChange={(e) => setFormState({ ...formState, ownerName: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl font-bold text-charcoal-900 dark:text-[#F4F1E9] focus:border-[#B89555] dark:focus:border-[#C9A96A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">
                  WhatsApp Order Number *
                </label>
                <input
                  type="text"
                  required
                  value={formState.whatsapp}
                  onChange={(e) => setFormState({ ...formState, whatsapp: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl font-bold text-[#B89555] dark:text-[#C9A96A] focus:border-[#B89555] dark:focus:border-[#C9A96A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8] mb-1">
                  Official Support Email
                </label>
                <input
                  type="email"
                  value={formState.email}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl font-bold text-charcoal-900 dark:text-[#F4F1E9] focus:border-[#B89555] dark:focus:border-[#C9A96A] focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="h-11 px-7 bg-champagne-500 hover:bg-champagne-400 disabled:opacity-50 text-charcoal-950 font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all active:scale-[0.99]"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save All Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
