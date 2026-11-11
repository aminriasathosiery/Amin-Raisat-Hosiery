import Link from 'next/link';
import { ShoppingBag, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[75vh] bg-[#F7F3EA] text-[#1D2730] flex items-center justify-center px-4 py-16">
      <div className="bg-white border border-[#D8D0C3] rounded-2xl p-8 sm:p-12 max-w-lg w-full text-center shadow-sm space-y-5">
        <span className="inline-block text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-[#EEE8DC] text-[#C99A3D] border border-[#D8D0C3]">
          404 • Page Not Found
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1D2730] tracking-tight">
          We Couldn&apos;t Find That Page
        </h1>
        <p className="text-xs sm:text-sm text-[#66717C] leading-relaxed">
          The page, product, or category you visited may have been moved or updated. Explore our pure cotton catalog below.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-[#EEE8DC] text-[#1D2730] border border-[#D8D0C3] rounded-xl text-xs font-bold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#23384D] hover:bg-[#182B3D] text-[#F7F3EA] rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Shop All Products</span>
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#EEE8DC]/70 hover:bg-[#EEE8DC] text-[#1D2730] border border-[#D8D0C3] rounded-xl text-xs font-bold transition-colors"
          >
            <Search className="w-4 h-4 text-[#C99A3D]" />
            <span>Search</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

