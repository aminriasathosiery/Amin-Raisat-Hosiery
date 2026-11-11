'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, ArrowLeft } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Storefront error boundary:', error);
  }, [error]);

  return (
    <div className="min-h-[75vh] bg-[#F7F3EA] text-[#1D2730] flex items-center justify-center px-4 py-16">
      <div className="bg-white border border-[#D8D0C3] rounded-2xl p-8 sm:p-10 max-w-md w-full text-center shadow-sm space-y-5">
        <span className="inline-block text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-[#B8423A]/10 text-[#B8423A] border border-[#B8423A]/30">
          Temporary Issue
        </span>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#1D2730]">
          Something Went Wrong
        </h1>
        <p className="text-xs sm:text-sm text-[#66717C] leading-relaxed">
          We encountered a temporary error loading this page. Please try again or return to the homepage.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#23384D] hover:bg-[#182B3D] text-[#F7F3EA] rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-[#EEE8DC] text-[#1D2730] border border-[#D8D0C3] rounded-xl text-xs font-bold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

