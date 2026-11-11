'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';

export const QualityComparison: React.FC = () => {
  return (
    <div className="space-y-4 text-[#1D2730]">
      <div>
        <h3 className="text-base font-bold text-[#1D2730]">
          Construction Quality Comparison
        </h3>
        <p className="text-xs text-[#66717C] mt-0.5">
          Both options use 100% fine combed cotton. Compare our High Quality and Standard Quality construction below.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* High Quality Card */}
        <div className="rounded-2xl p-5 border border-[#D8D0C3] bg-white flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-[#C99A3D] text-sm">High Quality (Taped Seams)</h4>
              <span className="text-[10px] font-bold bg-[#C99A3D] text-white px-2.5 py-0.5 rounded shadow-xs">
                Anti-Sag
              </span>
            </div>

            <div className="relative h-32 w-full bg-[#EEE8DC]/60 rounded-xl overflow-hidden mb-3.5 border border-[#D8D0C3]">
              <Image
                src="/images/products/sleevless high.jpeg"
                alt="High Quality Neck Taping & Finish"
                fill
                sizes="(max-width: 640px) 90vw, 280px"
                loading="lazy"
                className="object-contain"
              />
            </div>

            <ul className="space-y-2 text-xs text-[#334155]">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-[#2F7D5A] flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Neckline:</strong> Reinforced woven tape prevents collar sagging.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-[#2F7D5A] flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Shoulders:</strong> Taped seams for lasting shape retention.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-[#2F7D5A] flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Stitching:</strong> 4-thread precision industrial interlock.
                </span>
              </li>
            </ul>
          </div>

          <Link
            href="/product/mens-vest-high-quality"
            className="mt-4 w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-[#EEE8DC] hover:bg-[#23384D] hover:text-white text-[#1D2730] border border-[#D8D0C3] transition-all flex items-center justify-center gap-1.5"
          >
            <span>View High Quality Listing</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Standard Quality Card */}
        <div className="rounded-2xl p-5 border border-[#D8D0C3] bg-white flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-[#1D2730] text-sm">Standard Quality (Folded Seams)</h4>
              <span className="text-[10px] font-bold bg-[#EEE8DC] text-[#66717C] border border-[#D8D0C3] px-2.5 py-0.5 rounded">
                Daily Wear
              </span>
            </div>

            <div className="relative h-32 w-full bg-[#EEE8DC]/60 rounded-xl overflow-hidden mb-3.5 border border-[#D8D0C3]">
              <Image
                src="/images/products/sleevless low.jpeg"
                alt="Standard Quality Pure Cotton Finish"
                fill
                sizes="(max-width: 640px) 90vw, 280px"
                loading="lazy"
                className="object-contain"
              />
            </div>

            <ul className="space-y-2 text-xs text-[#334155]">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-[#66717C] flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Neckline:</strong> Folded &amp; machine-stitched seam (no tape).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-[#66717C] flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Shoulders:</strong> Clean double-needle stitched finish.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-[#66717C] flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Stitching:</strong> Durable lockstitch everyday seam.
                </span>
              </li>
            </ul>
          </div>

          <Link
            href="/product/mens-vest-standard-quality"
            className="mt-4 w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-[#EEE8DC] hover:bg-[#23384D] hover:text-white text-[#1D2730] border border-[#D8D0C3] transition-all flex items-center justify-center gap-1.5"
          >
            <span>View Standard Quality Listing</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
