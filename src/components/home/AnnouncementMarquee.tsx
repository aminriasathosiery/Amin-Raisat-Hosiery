'use client';

import React from 'react';
import { Truck, ShieldCheck, PhoneCall, CheckCircle, Sparkles } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { normalizeShippingSettings } from '@/lib/delivery';

const ICON_MAP: Record<string, any> = {
  truck: Truck,
  shield: ShieldCheck,
  phone: PhoneCall,
  check: CheckCircle,
  sparkles: Sparkles,
};

function resolveAnnouncementText(rawText: string, freeThreshold: number, baseDelivery: number): string {
  const trimmed = rawText.trim();
  const isLegacyFreeDeliveryBanner =
    /free delivery on(?: orders of)?\s*3\+\s*pieces/i.test(trimmed) ||
    trimmed.includes('{free_threshold}') ||
    trimmed.includes('{delivery_fee}');

  if (!isLegacyFreeDeliveryBanner) {
    return trimmed;
  }

  if (trimmed.includes('{free_threshold}') || trimmed.includes('{delivery_fee}')) {
    return trimmed
      .replace(/\{free_threshold\}/g, String(freeThreshold))
      .replace(/\{delivery_fee\}/g, String(baseDelivery));
  }

  if (freeThreshold > 0) {
    return `FREE DELIVERY ON ${freeThreshold}+ ${freeThreshold === 1 ? 'PIECE' : 'PIECES'} ACROSS PAKISTAN`;
  }
  return baseDelivery === 0
    ? 'FREE NATIONWIDE DELIVERY ACROSS PAKISTAN'
    : `NATIONWIDE DELIVERY FOR RS. ${baseDelivery} ACROSS PAKISTAN`;
}

export const AnnouncementMarquee: React.FC = () => {
  const { settings } = useStore();

  if (settings.isAnnouncementEnabled === false) {
    return null;
  }

  const shipping = normalizeShippingSettings(settings?.shipping);
  const freeThreshold = shipping.freeDeliveryThreshold;
  const baseDelivery = shipping.baseDeliveryCharge;

  // Use configured announcement strips if present and active — sorted by displayOrder
  let stripsToDisplay: { icon: any; text: string }[] = [];

  if (settings.announcementStrips && Array.isArray(settings.announcementStrips)) {
    const activeCustom = settings.announcementStrips
      .filter((s) => s.isActive)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    if (activeCustom.length > 0) {
      stripsToDisplay = activeCustom.map((s) => ({
        icon: (s.icon && ICON_MAP[s.icon.toLowerCase()]) || CheckCircle,
        text: resolveAnnouncementText(s.text, freeThreshold, baseDelivery),
      }));
    }
  }

  // Fallback: use the single "Default Static Announcement Text" from Admin settings
  if (stripsToDisplay.length === 0) {
    const fallbackText = settings.announcementText;
    if (fallbackText && fallbackText.trim().length > 0) {
      stripsToDisplay = [
        {
          icon: CheckCircle,
          text: resolveAnnouncementText(fallbackText, freeThreshold, baseDelivery),
        },
      ];
    } else {
      // No strips and no fallback text — hide the bar entirely
      return null;
    }
  }

  return (
    <div className="bg-[#23384D] text-[#F7F3EA] text-[11px] font-medium py-2.5 overflow-hidden border-b border-[#182B3D] relative z-30 select-none">
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused] gap-12 items-center cursor-default">
        {[...stripsToDisplay, ...stripsToDisplay, ...stripsToDisplay].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="flex items-center gap-2.5 flex-shrink-0 text-[#F7F3EA]">
              <Icon className="w-3.5 h-3.5 text-[#C99A3D] flex-shrink-0" />
              <span className="tracking-wide uppercase font-semibold text-[10.5px]">{item.text}</span>
              <span className="text-[#C99A3D]/50 ml-4 font-bold">•</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
