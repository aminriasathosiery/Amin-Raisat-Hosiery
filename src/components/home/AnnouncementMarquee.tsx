'use client';

import React from 'react';
import { Truck, ShieldCheck, PhoneCall, CheckCircle, Sparkles } from 'lucide-react';
import { useStore } from '@/context/StoreContext';

const ICON_MAP: Record<string, any> = {
  truck: Truck,
  shield: ShieldCheck,
  phone: PhoneCall,
  check: CheckCircle,
  sparkles: Sparkles,
};

export const AnnouncementMarquee: React.FC = () => {
  const { settings } = useStore();

  if (settings.isAnnouncementEnabled === false) {
    return null;
  }

  // Use configured announcement strips if present and active — sorted by displayOrder
  let stripsToDisplay: { icon: any; text: string }[] = [];

  if (settings.announcementStrips && Array.isArray(settings.announcementStrips)) {
    const activeCustom = settings.announcementStrips
      .filter((s) => s.isActive)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    if (activeCustom.length > 0) {
      stripsToDisplay = activeCustom.map((s) => ({
        icon: (s.icon && ICON_MAP[s.icon.toLowerCase()]) || CheckCircle,
        text: s.text,
      }));
    }
  }

  // Fallback: use the single "Default Static Announcement Text" from Admin settings
  if (stripsToDisplay.length === 0) {
    const fallbackText = settings.announcementText;
    if (fallbackText && fallbackText.trim().length > 0) {
      stripsToDisplay = [{ icon: CheckCircle, text: fallbackText }];
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
