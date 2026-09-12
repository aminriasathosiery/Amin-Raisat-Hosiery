'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingBag, Menu, X, Search, ChevronDown, Layers, Sun, Moon, Mail } from 'lucide-react';
import { WhatsAppIcon } from '@/components/common/WhatsAppIcon';
import { WHATSAPP_URL, DISPLAY_WHATSAPP_NUMBER, BUSINESS_EMAIL, EMAIL_URL } from '@/lib/whatsapp';
import { useCart } from '@/context/CartContext';
import { useStore } from '@/context/StoreContext';
import { useTheme } from '@/context/ThemeContext';
import { AnnouncementMarquee } from '@/components/home/AnnouncementMarquee';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { totalQuantity, openDrawer } = useCart();
  const { categories, subcategories } = useStore();
  const { theme, isDark, toggleTheme } = useTheme();

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Desktop Categories Dropdown / Mega Menu
  const [isCategoriesDropdownOpen, setIsCategoriesDropdownOpen] = useState(false);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mobile Accordion States
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(true);
  const [expandedMobileCategory, setExpandedMobileCategory] = useState<string | null>(null);

  // Filter and sort active categories dynamically from Supabase
  const activeCategories = categories
    .filter((c) => c.isActive !== false)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  // Get active subcategories for a given category sorted by displayOrder
  const getActiveSubcategoriesForCat = (catId: string, directSubs?: any[]) => {
    const rawList = (directSubs && directSubs.length > 0)
      ? directSubs
      : subcategories.filter((s) => s.categoryId === catId);

    return rawList
      .filter((s) => s.isActive !== false)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  };

  // Scroll detection for subtle background transition
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setIsCategoriesDropdownOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  const handleMouseEnterCategories = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    setIsCategoriesDropdownOpen(true);
  };

  const handleMouseLeaveCategories = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setIsCategoriesDropdownOpen(false);
    }, 180);
  };

  const searchInputRef = useRef<HTMLInputElement>(null);

  const executeSearch = (rawQuery: string) => {
    const trimmedQuery = rawQuery.trim();

    if (!trimmedQuery) {
      searchInputRef.current?.focus();
      return;
    }

    // 1. Safely dismiss mobile keyboard immediately
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    // 2. Close search overlay/drawer and mobile navigation menu
    setSearchOpen(false);
    setMobileMenuOpen(false);

    // 3. Client-side navigation via Next.js router
    router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(searchQuery);
  };

  const isCategoryActive = pathname.startsWith('/category');

  // Dynamic header logo based on theme
  const logoSrc = isDark ? '/images/header logo.png' : '/images/light logo.png';

  return (
    <header className="sticky top-0 z-40 w-full select-none">
      {/* 1. Continuous Motion Announcement Bar */}
      <AnnouncementMarquee />

      {/* 2. Main Brand Navbar */}
      <nav
        className={`w-full backdrop-blur-md transition-all duration-200 border-b ${
          isDark
            ? isScrolled
              ? 'bg-[#11110F]/95 border-[#34322D] shadow-elevation py-0.5'
              : 'bg-[#11110F]/95 border-[#34322D]/80 py-1'
            : isScrolled
            ? 'bg-white/98 border-[#E5E5E0] shadow-xs py-0.5'
            : 'bg-white/98 border-[#E5E5E0] py-1'
        }`}
      >
        <div className="mx-auto w-full max-w-[1280px] px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18 lg:h-20">
            
            {/* ================================================================= */}
            {/* MOBILE / TABLET NAVBAR ROW (lg:hidden)                           */}
            {/* Clean, standard flex layout: Logo on left, actions on right        */}
            {/* ================================================================= */}
            <div className="flex items-center justify-between w-full lg:hidden min-h-[56px]">

              {/* Left: Brand Logo */}
              <Link
                href="/"
                className="flex items-center py-1 group flex-shrink-0"
                aria-label="Amin Raisat Hosiery Home"
              >
                <div className="relative w-[112px] xs:w-[126px] sm:w-[144px] h-8 sm:h-9 overflow-hidden flex-shrink-0 transition-transform duration-200 group-hover:scale-[1.02]">
                  <Image
                    src={logoSrc}
                    alt="Amin Raisat Hosiery"
                    fill
                    sizes="(max-width: 640px) 130px, 160px"
                    className="object-contain object-left"
                    priority
                  />
                </div>
              </Link>

              {/* Right: Clean compact action area (Theme, Search, Cart, Menu) */}
              <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                {/* Mobile Theme Toggle */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-charcoal-700 dark:text-[#F4F1E9] hover:text-[#B89555] dark:hover:text-[#C9A96A] hover:bg-light-hover dark:hover:bg-[#22211E] transition-colors"
                  aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                  title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                >
                  {isDark ? (
                    <Sun className="w-4 h-4 text-[#C9A96A] hover:rotate-45 transition-transform duration-300" />
                  ) : (
                    <Moon className="w-4 h-4 text-charcoal-700 hover:-rotate-12 transition-transform duration-300" />
                  )}
                </button>

                {/* Search Trigger */}
                <button
                  type="button"
                  onClick={() => setSearchOpen(!searchOpen)}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
                    searchOpen
                      ? 'bg-light-hover dark:bg-[#22211E] text-[#B89555] dark:text-[#C9A96A] border border-light-border dark:border-[#34322D]'
                      : 'text-charcoal-700 dark:text-[#F4F1E9] hover:text-[#B89555] dark:hover:text-[#C9A96A] hover:bg-light-hover dark:hover:bg-[#22211E]'
                  }`}
                  aria-label="Search products"
                >
                  <Search className="w-[18px] h-[18px]" />
                </button>

                {/* Shopping Cart Button */}
                <button
                  type="button"
                  onClick={openDrawer}
                  className="relative w-9 h-9 bg-champagne-500 hover:bg-champagne-400 text-charcoal-950 rounded-xl transition-all duration-200 flex items-center justify-center shadow-xs active:scale-[0.96]"
                  aria-label="Shopping Cart"
                >
                  <ShoppingBag className="w-[18px] h-[18px] text-charcoal-950 stroke-[2.2]" />
                  {totalQuantity > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#D05A5A] text-white text-[10px] font-extrabold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border border-white dark:border-[#11110F] shadow-xs">
                      {totalQuantity}
                    </span>
                  )}
                </button>

                {/* Hamburger Menu Trigger */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="w-9 h-9 flex items-center justify-center text-charcoal-800 dark:text-[#F4F1E9] hover:text-[#B89555] dark:hover:text-[#C9A96A] hover:bg-light-hover dark:hover:bg-[#22211E] active:scale-95 rounded-xl transition-colors"
                  aria-label="Toggle navigation menu"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* DESKTOP NAVBAR (hidden lg:flex) */}
            {/* ========================================================================= */}
            <div className="hidden lg:flex items-center justify-between w-full">
              {/* Desktop Header Logo */}
              <div className="flex items-center">
                <Link href="/" className="flex items-center group py-0.5">
                  <div className="relative w-[180px] lg:w-[210px] xl:w-[232px] h-12 lg:h-14 xl:h-15 overflow-hidden flex-shrink-0 transition-transform duration-300 ease-out group-hover:scale-[1.02]">
                    <Image
                      src={logoSrc}
                      alt="Amin Raisat Hosiery"
                      fill
                      sizes="(max-width: 1024px) 210px, 240px"
                      className="object-contain object-left"
                      priority
                    />
                  </div>
                </Link>
              </div>

              {/* Desktop Navigation Links */}
              <div className="flex items-center space-x-1 lg:space-x-1.5">
                {/* 1. HOME */}
                <Link
                  href="/"
                  className={`px-3 py-1.5 text-xs font-bold tracking-wide uppercase transition-colors rounded-lg ${
                    pathname === '/'
                      ? 'text-[#B89555] dark:text-[#C9A96A] bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D]'
                      : 'text-charcoal-700 dark:text-[#B8B3A8] hover:text-[#B89555] dark:hover:text-[#C9A96A] hover:bg-light-hover dark:hover:bg-[#22211E]'
                  }`}
                >
                  Home
                </Link>

                {/* 2. DYNAMIC CATEGORIES ▾ DROPDOWN / MEGA MENU */}
                <div
                  className="relative"
                  onMouseEnter={handleMouseEnterCategories}
                  onMouseLeave={handleMouseLeaveCategories}
                >
                  <button
                    type="button"
                    onClick={() => setIsCategoriesDropdownOpen(!isCategoriesDropdownOpen)}
                    className={`px-3 py-1.5 text-xs font-bold tracking-wide uppercase transition-colors rounded-lg flex items-center gap-1.5 ${
                      isCategoryActive || isCategoriesDropdownOpen
                        ? 'text-[#B89555] dark:text-[#C9A96A] bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D]'
                        : 'text-charcoal-700 dark:text-[#B8B3A8] hover:text-[#B89555] dark:hover:text-[#C9A96A] hover:bg-light-hover dark:hover:bg-[#22211E]'
                    }`}
                    aria-expanded={isCategoriesDropdownOpen}
                  >
                    <span>Categories</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-charcoal-400 dark:text-[#8E8A80] transition-transform duration-200 ${
                        isCategoriesDropdownOpen ? 'rotate-180 text-[#B89555] dark:text-[#C9A96A]' : ''
                      }`}
                    />
                  </button>

                  {/* Desktop Dropdown Container */}
                  {isCategoriesDropdownOpen && (
                    <div
                      className={`absolute top-full left-0 mt-1 bg-white dark:bg-[#191917] rounded-2xl shadow-elevation border border-light-border dark:border-[#34322D] p-4 z-50 animate-in fade-in slide-in-from-top-1 duration-150 max-h-[75vh] overflow-y-auto ${
                        activeCategories.length > 3
                          ? 'w-[560px] lg:w-[640px]'
                          : activeCategories.length > 1
                          ? 'w-[420px]'
                          : 'w-[290px]'
                      }`}
                    >
                      <div className="px-3 py-2 border-b border-light-border dark:border-[#34322D] mb-3 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-charcoal-500 dark:text-[#8E8A80] uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#B89555] dark:text-[#C9A96A]" />
                          <span>Garment Collections ({activeCategories.length})</span>
                        </span>
                        <Link
                          href="/shop"
                          onClick={() => setIsCategoriesDropdownOpen(false)}
                          className="text-[11px] font-semibold text-[#B89555] dark:text-[#C9A96A] hover:underline transition-colors"
                        >
                          View All Products &rarr;
                        </Link>
                      </div>

                      {/* Adaptive Grid for Categories */}
                      <div
                        className={`grid gap-4 ${
                          activeCategories.length > 3
                            ? 'grid-cols-3'
                            : activeCategories.length > 1
                            ? 'grid-cols-2'
                            : 'grid-cols-1'
                        }`}
                      >
                        {activeCategories.map((category) => {
                          const subs = getActiveSubcategoriesForCat(category.id, category.subcategories);

                          return (
                            <div key={category.id} className="space-y-2 p-2 rounded-xl hover:bg-light-hover dark:hover:bg-[#22211E] transition-colors">
                              <Link
                                href={`/category/${category.slug}`}
                                onClick={() => setIsCategoriesDropdownOpen(false)}
                                className="block font-bold text-xs text-charcoal-900 dark:text-[#F4F1E9] hover:text-[#B89555] dark:hover:text-[#C9A96A] transition-colors border-b border-light-border dark:border-[#34322D] pb-1.5"
                              >
                                <span>{category.name}</span>
                              </Link>

                              {subs.length > 0 ? (
                                <ul className="space-y-1 pl-1">
                                  {subs.map((sub) => (
                                    <li key={sub.id}>
                                      <Link
                                        href={`/category/${category.slug}/${sub.slug}`}
                                        onClick={() => setIsCategoriesDropdownOpen(false)}
                                        className="text-[11px] text-charcoal-500 dark:text-[#8E8A80] hover:text-charcoal-900 dark:hover:text-[#F4F1E9] hover:underline flex items-center gap-1 transition-colors py-0.5"
                                      >
                                        <span className="text-[#B89555] dark:text-[#C9A96A]">&bull;</span>
                                        <span>{sub.name}</span>
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-[10px] text-charcoal-400 dark:text-[#8E8A80] italic pl-1">
                                  View all {category.name.toLowerCase()} items
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Bottom Banner inside Dropdown */}
                      <div className="mt-3 pt-2.5 border-t border-light-border dark:border-[#34322D] flex items-center justify-between text-[11px] text-charcoal-500 dark:text-[#8E8A80] px-2">
                        <span>Free Delivery Across Pakistan on 3+ Pieces</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold">100% Combed Cotton</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. SHOP */}
                <Link
                  href="/shop"
                  className={`px-3 py-1.5 text-xs font-bold tracking-wide uppercase transition-colors rounded-lg ${
                    pathname === '/shop'
                      ? 'text-[#B89555] dark:text-[#C9A96A] bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D]'
                      : 'text-charcoal-700 dark:text-[#B8B3A8] hover:text-[#B89555] dark:hover:text-[#C9A96A] hover:bg-light-hover dark:hover:bg-[#22211E]'
                  }`}
                >
                  Shop
                </Link>

                {/* 4. ABOUT */}
                <Link
                  href="/about"
                  className={`px-3 py-1.5 text-xs font-bold tracking-wide uppercase transition-colors rounded-lg ${
                    pathname === '/about'
                      ? 'text-[#B89555] dark:text-[#C9A96A] bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D]'
                      : 'text-charcoal-700 dark:text-[#B8B3A8] hover:text-[#B89555] dark:hover:text-[#C9A96A] hover:bg-light-hover dark:hover:bg-[#22211E]'
                  }`}
                >
                  About
                </Link>

                {/* 5. CONTACT */}
                <Link
                  href="/contact"
                  className={`px-3 py-1.5 text-xs font-bold tracking-wide uppercase transition-colors rounded-lg ${
                    pathname === '/contact'
                      ? 'text-[#B89555] dark:text-[#C9A96A] bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D]'
                      : 'text-charcoal-700 dark:text-[#B8B3A8] hover:text-[#B89555] dark:hover:text-[#C9A96A] hover:bg-light-hover dark:hover:bg-[#22211E]'
                  }`}
                >
                  Contact
                </Link>
              </div>

              {/* Desktop Right Actions: Theme Toggle, Search, Customer Account, Cart */}
              <div className="flex items-center gap-1.5 lg:gap-2">
                {/* Theme Toggle Button */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-9 h-9 lg:w-10 lg:h-10 flex items-center justify-center rounded-xl text-charcoal-700 dark:text-[#B8B3A8] hover:text-[#B89555] dark:hover:text-[#C9A96A] hover:bg-light-hover dark:hover:bg-[#22211E] border border-transparent hover:border-light-border dark:hover:border-[#34322D] transition-all duration-200"
                  aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                  title={`Current theme: ${theme}. Click to switch to ${isDark ? 'Light' : 'Dark'} mode.`}
                >
                  {isDark ? (
                    <Sun className="w-4 h-4 text-[#C9A96A] hover:rotate-90 transition-transform duration-300" />
                  ) : (
                    <Moon className="w-4 h-4 text-charcoal-700 hover:-rotate-12 transition-transform duration-300" />
                  )}
                </button>

                {/* Search Trigger */}
                <button
                  type="button"
                  onClick={() => setSearchOpen(!searchOpen)}
                  className={`w-9 h-9 lg:w-10 lg:h-10 flex items-center justify-center rounded-xl transition-colors ${
                    searchOpen
                      ? 'bg-light-hover dark:bg-[#22211E] text-[#B89555] dark:text-[#C9A96A] border border-light-border dark:border-[#34322D]'
                      : 'text-charcoal-700 dark:text-[#B8B3A8] hover:text-[#B89555] dark:hover:text-[#C9A96A] hover:bg-light-hover dark:hover:bg-[#22211E]'
                  }`}
                  aria-label="Search products"
                >
                  <Search className="w-4 h-4" />
                </button>

                {/* Shopping Cart Drawer Trigger */}
                <button
                  type="button"
                  onClick={openDrawer}
                  className="relative h-9 lg:h-10 px-3.5 bg-champagne-500 hover:bg-champagne-400 text-charcoal-950 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 shadow-xs hover:shadow-xs active:scale-[0.98]"
                  aria-label="Shopping Cart"
                >
                  <ShoppingBag className="w-4 h-4 text-charcoal-950 stroke-[2.2]" />
                  <span className="text-xs font-bold text-charcoal-950">Cart</span>
                  {totalQuantity > 0 && (
                    <span className="bg-charcoal-950 text-[#C9A96A] text-[10px] font-extrabold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center ml-0.5">
                      {totalQuantity}
                    </span>
                  )}
                </button>
              </div>
            </div>

          </div>

          {/* Integrated Search Bar Drawer */}
          {searchOpen && (
            <div className="py-3 border-t border-light-border dark:border-[#34322D] animate-in fade-in">
              <form onSubmit={handleSearchSubmit} className="relative max-w-lg mx-auto">
                <input
                  ref={searchInputRef}
                  type="text"
                  autoFocus
                  enterKeyHint="search"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Search products by name, category, or style..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-24 py-2.5 bg-white dark:bg-[#191917] border border-light-border dark:border-[#34322D] text-charcoal-900 dark:text-[#F4F1E9] placeholder-charcoal-400 dark:placeholder-[#8E8A80] rounded-xl text-xs focus:outline-none focus:border-[#B89555] dark:focus:border-[#C9A96A] shadow-xs"
                />
                <Search className="w-4 h-4 text-charcoal-400 dark:text-[#8E8A80] absolute left-3.5 top-3" />
                <button
                  type="submit"
                  className="absolute right-2 top-1.5 px-3 py-1 bg-champagne-500 text-charcoal-950 rounded-lg text-xs font-bold hover:bg-champagne-400 active:scale-95 transition-all shadow-2xs"
                  aria-label="Submit Search"
                >
                  Search
                </button>
              </form>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* MOBILE NAVIGATION DRAWER */}
        {/* ========================================================================= */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-light-border dark:border-[#34322D] bg-white dark:bg-[#191917] px-4 pt-3 pb-6 space-y-2 shadow-elevation max-h-[85vh] overflow-y-auto">
            {/* Theme Toggle Bar inside Mobile Drawer */}
            <div className="flex items-center justify-between p-3 bg-light-elevated dark:bg-[#22211E] rounded-xl border border-light-border dark:border-[#34322D] mb-2">
              <span className="text-xs font-semibold text-charcoal-700 dark:text-[#F4F1E9] flex items-center gap-2">
                {isDark ? <Moon className="w-4 h-4 text-[#C9A96A]" /> : <Sun className="w-4 h-4 text-[#B89555]" />}
                <span>Theme: {isDark ? 'Dark Mode' : 'Light Mode'}</span>
              </span>
              <button
                type="button"
                onClick={toggleTheme}
                className="px-3 py-1 bg-white dark:bg-[#191917] border border-light-border dark:border-[#34322D] text-xs font-bold text-charcoal-900 dark:text-[#F4F1E9] rounded-lg shadow-2xs"
              >
                Switch to {isDark ? 'Light' : 'Dark'}
              </button>
            </div>

              <>
                {/* 1. Home */}
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 text-sm font-semibold text-charcoal-900 dark:text-[#F4F1E9] hover:text-[#B89555] dark:hover:text-[#C9A96A] hover:bg-light-hover dark:hover:bg-[#22211E] rounded-xl"
                >
                  Home
                </Link>

                {/* 2. Dynamic Categories Accordion */}
                <div className="border-t border-light-border dark:border-[#34322D] pt-2 space-y-1.5">
                  <div
                    onClick={() => setMobileCategoriesOpen(!mobileCategoriesOpen)}
                    className="flex items-center justify-between px-3 py-2.5 text-sm font-bold text-charcoal-800 dark:text-[#F4F1E9] hover:bg-light-hover dark:hover:bg-[#22211E] rounded-xl cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#B89555] dark:text-[#C9A96A]" />
                      <span>Categories ({activeCategories.length})</span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-charcoal-400 dark:text-[#8E8A80] transition-transform duration-200 ${
                        mobileCategoriesOpen ? 'rotate-180 text-[#B89555] dark:text-[#C9A96A]' : ''
                      }`}
                    />
                  </div>

                  {mobileCategoriesOpen && (
                    <div className="space-y-2 pl-2 pr-1 pt-1">
                      {activeCategories.map((cat) => {
                        const subs = getActiveSubcategoriesForCat(cat.id, cat.subcategories);
                        const isExpanded = expandedMobileCategory === cat.id;

                        return (
                          <div key={cat.id} className="bg-light-elevated dark:bg-[#22211E] rounded-xl border border-light-border dark:border-[#34322D] overflow-hidden">
                            <div className="flex items-center justify-between min-h-[44px]">
                              <Link
                                href={`/category/${cat.slug}`}
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex-1 py-3 px-3.5 font-bold text-xs text-charcoal-900 dark:text-[#F4F1E9] hover:text-[#B89555] dark:hover:text-[#C9A96A] flex items-center justify-between gap-1"
                              >
                                <span>{cat.name}</span>
                                <span className="text-[10px] text-charcoal-400 dark:text-[#8E8A80] font-normal">&rarr;</span>
                              </Link>

                              {subs.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedMobileCategory(isExpanded ? null : cat.id)}
                                  className="w-11 h-11 flex items-center justify-center text-charcoal-400 dark:text-[#8E8A80] hover:text-[#B89555] dark:hover:text-[#C9A96A] hover:bg-light-hover dark:hover:bg-[#2A2925] border-l border-light-border dark:border-[#34322D]"
                                  aria-label={`Toggle ${cat.name} subcategories`}
                                >
                                  <ChevronDown
                                    className={`w-4 h-4 transition-transform duration-200 ${
                                      isExpanded ? 'rotate-180 text-[#B89555] dark:text-[#C9A96A]' : ''
                                    }`}
                                  />
                                </button>
                              )}
                            </div>

                            {subs.length > 0 && isExpanded && (
                              <div className="px-3.5 pb-3 pt-1 border-t border-light-border dark:border-[#34322D] bg-white dark:bg-[#191917]/60 space-y-1 animate-in fade-in">
                                {subs.map((sub) => (
                                  <Link
                                    key={sub.id}
                                    href={`/category/${cat.slug}/${sub.slug}`}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="block py-2 px-2 text-xs text-charcoal-600 dark:text-[#B8B3A8] hover:text-[#B89555] dark:hover:text-[#C9A96A] hover:bg-light-hover dark:hover:bg-[#22211E] rounded-lg transition-colors"
                                  >
                                    &bull; {sub.name}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Shop All Products */}
                <Link
                  href="/shop"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 text-sm font-semibold text-charcoal-900 dark:text-[#F4F1E9] hover:text-[#B89555] dark:hover:text-[#C9A96A] hover:bg-light-hover dark:hover:bg-[#22211E] rounded-xl"
                >
                  Shop All Products
                </Link>
              </>

            {/* 5. About / Contact */}
            <div className="pt-2 border-t border-light-border dark:border-[#34322D] space-y-1">
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 text-sm font-semibold text-charcoal-600 dark:text-[#B8B3A8] hover:text-[#B89555] dark:hover:text-[#C9A96A] hover:bg-light-hover dark:hover:bg-[#22211E] rounded-xl"
              >
                About Us
              </Link>
              <Link
                href="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 text-sm font-semibold text-charcoal-600 dark:text-[#B8B3A8] hover:text-[#B89555] dark:hover:text-[#C9A96A] hover:bg-light-hover dark:hover:bg-[#22211E] rounded-xl"
              >
                Contact Us
              </Link>
            </div>

            {/* 6. Mobile Menu WhatsApp CTA */}
            <div className="pt-2 border-t border-light-border dark:border-[#34322D]">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                id="mobile-menu-whatsapp-cta"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 font-bold text-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                aria-label={`Chat on WhatsApp ${DISPLAY_WHATSAPP_NUMBER}`}
              >
                <div className="flex items-center gap-2">
                  <WhatsAppIcon size={16} className="text-[#25D366] fill-current flex-shrink-0" />
                  <span>WhatsApp Orders</span>
                </div>
                <span className="font-mono text-[11px] font-semibold">{DISPLAY_WHATSAPP_NUMBER}</span>
              </a>
            </div>

            {/* 7. Mobile Menu Email CTA */}
            <div className="pt-2 border-t border-light-border dark:border-[#34322D]">
              <a
                href={EMAIL_URL}
                id="mobile-menu-email-cta"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] text-charcoal-700 dark:text-[#B8B3A8] font-bold text-xs hover:text-[#B89555] dark:hover:text-[#C9A96A] transition-colors"
                aria-label={`Email ${BUSINESS_EMAIL}`}
              >
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#B89555] dark:text-[#C9A96A] flex-shrink-0" />
                  <span>Support Email</span>
                </div>
                <span className="font-mono text-[11px] font-normal">{BUSINESS_EMAIL}</span>
              </a>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};
