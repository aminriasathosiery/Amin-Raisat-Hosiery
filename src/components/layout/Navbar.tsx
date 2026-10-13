'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingBag, Menu, X, Search, ChevronDown, Layers, Mail } from 'lucide-react';
import { WhatsAppIcon } from '@/components/common/WhatsAppIcon';
import { WHATSAPP_URL, DISPLAY_WHATSAPP_NUMBER, BUSINESS_EMAIL, EMAIL_URL } from '@/lib/whatsapp';
import { useCart } from '@/context/CartContext';
import { useStore } from '@/context/StoreContext';
import { AnnouncementMarquee } from '@/components/home/AnnouncementMarquee';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { totalQuantity, openDrawer } = useCart();
  const { categories, subcategories } = useStore();

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
    const rawList =
      directSubs && directSubs.length > 0
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

    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setSearchOpen(false);
    setMobileMenuOpen(false);

    router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(searchQuery);
  };

  const isCategoryActive = pathname.startsWith('/category');
  const logoSrc = '/logo2.png';

  return (
    <header className="sticky top-0 z-40 w-full select-none">
      {/* 1. Continuous Motion Announcement Bar */}
      <AnnouncementMarquee />

      {/* 2. Main Brand Navbar (Permanent Dark Navy #23384D) */}
      <nav
        className={`w-full bg-[#23384D] border-b border-[#3B5064] transition-all duration-200 ${
          isScrolled ? 'shadow-md py-0.5' : 'py-1'
        }`}
      >
        <div className="mx-auto w-full max-w-[1280px] px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[68px] sm:h-[74px] lg:h-[84px]">
            {/* ================================================================= */}
            {/* MOBILE / TABLET NAVBAR ROW (lg:hidden)                           */}
            {/* ================================================================= */}
            <div className="flex items-center justify-between w-full lg:hidden min-h-[54px]">
              {/* Left: Brand Logo directly on dark navy navbar */}
              <Link
                href="/"
                className="flex items-center py-1 group flex-shrink-0"
                aria-label="Amin Raisat Hosiery Home"
              >
                <div className="relative w-[112px] xs:w-[124px] sm:w-[138px] h-8 xs:h-9 sm:h-10 overflow-hidden flex-shrink-0 transition-transform duration-200 group-hover:scale-[1.02]">
                  <Image
                    src={logoSrc}
                    alt="Amin Raisat Hosiery"
                    fill
                    sizes="(max-width: 640px) 130px, 150px"
                    className="object-contain object-left"
                    priority
                  />
                </div>
              </Link>

              {/* Right: Actions (Search, Cart, Menu) */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {/* Search Trigger */}
                <button
                  type="button"
                  onClick={() => setSearchOpen(!searchOpen)}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
                    searchOpen
                      ? 'bg-[#23384D] text-[#C99A3D] border border-[#3B5064]'
                      : 'text-white hover:text-[#C99A3D] hover:bg-[#23384D]'
                  }`}
                  aria-label="Search products"
                >
                  <Search className="w-[18px] h-[18px]" />
                </button>

                {/* Shopping Cart Button */}
                <button
                  type="button"
                  onClick={openDrawer}
                  className="relative w-9 h-9 bg-[#23384D] hover:bg-[#16283A] text-white rounded-xl transition-all duration-200 flex items-center justify-center border border-[#3B5064] shadow-xs active:scale-[0.96]"
                  aria-label="Shopping Cart"
                >
                  <ShoppingBag className="w-[18px] h-[18px] text-white stroke-[2.2]" />
                  {totalQuantity > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#C99A3D] text-[#23384D] text-[10px] font-extrabold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border border-[#23384D] shadow-xs">
                      {totalQuantity}
                    </span>
                  )}
                </button>

                {/* Hamburger Menu Trigger */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="w-9 h-9 flex items-center justify-center text-white hover:text-[#C99A3D] hover:bg-[#23384D] active:scale-95 rounded-xl transition-colors"
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
              {/* Desktop Header Logo directly on dark navy navbar */}
              <div className="flex items-center">
                <Link
                  href="/"
                  className="flex items-center group py-1"
                  aria-label="Amin Raisat Hosiery Home"
                >
                  <div className="relative w-[155px] lg:w-[170px] xl:w-[180px] h-12 lg:h-14 overflow-hidden flex-shrink-0 transition-transform duration-200 group-hover:scale-[1.02]">
                    <Image
                      src={logoSrc}
                      alt="Amin Raisat Hosiery"
                      fill
                      sizes="(max-width: 1024px) 170px, 180px"
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
                      ? 'text-[#C99A3D] bg-[#23384D] border border-[#3B5064]'
                      : 'text-white hover:text-[#C99A3D] hover:bg-[#23384D]'
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
                        ? 'text-[#C99A3D] bg-[#23384D] border border-[#3B5064]'
                        : 'text-white hover:text-[#C99A3D] hover:bg-[#23384D]'
                    }`}
                    aria-expanded={isCategoriesDropdownOpen}
                  >
                    <span>Categories</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#B8C3CE] transition-transform duration-200 ${
                        isCategoriesDropdownOpen ? 'rotate-180 text-[#C99A3D]' : ''
                      }`}
                    />
                  </button>

                  {/* Desktop Dropdown Container */}
                  {isCategoriesDropdownOpen && (
                    <div
                      className={`absolute top-full left-0 mt-1 bg-[#23384D] rounded-2xl shadow-elevation border border-[#3B5064] p-4 z-50 animate-in fade-in slide-in-from-top-1 duration-150 max-h-[75vh] overflow-y-auto ${
                        activeCategories.length > 3
                          ? 'w-[560px] lg:w-[640px]'
                          : activeCategories.length > 1
                          ? 'w-[420px]'
                          : 'w-[290px]'
                      }`}
                    >
                      <div className="px-3 py-2 border-b border-[#3B5064] mb-3 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#B8C3CE] uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#C99A3D]" />
                          <span>Garment Collections ({activeCategories.length})</span>
                        </span>
                        <Link
                          href="/shop"
                          onClick={() => setIsCategoriesDropdownOpen(false)}
                          className="text-[11px] font-semibold text-[#C99A3D] hover:underline transition-colors"
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
                            <div key={category.id} className="space-y-2 p-2 rounded-xl hover:bg-[#23384D] transition-colors">
                              <Link
                                href={`/category/${category.slug}`}
                                onClick={() => setIsCategoriesDropdownOpen(false)}
                                className="block font-bold text-xs text-white hover:text-[#C99A3D] transition-colors border-b border-[#3B5064] pb-1.5"
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
                                        className="text-[11px] text-[#B8C3CE] hover:text-[#C99A3D] hover:underline flex items-center gap-1 transition-colors py-0.5"
                                      >
                                        <span className="text-[#C99A3D]">&bull;</span>
                                        <span>{sub.name}</span>
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-[10px] text-[#B8C3CE] italic pl-1">
                                  View all {category.name.toLowerCase()} items
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Bottom Banner inside Dropdown */}
                      <div className="mt-3 pt-2.5 border-t border-[#3B5064] flex items-center justify-between text-[11px] text-[#B8C3CE] px-2">
                        <span>Free Delivery Across Pakistan on 3+ Pieces</span>
                        <span className="text-[#2F9B70] font-semibold">100% Combed Cotton</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. SHOP */}
                <Link
                  href="/shop"
                  className={`px-3 py-1.5 text-xs font-bold tracking-wide uppercase transition-colors rounded-lg ${
                    pathname === '/shop'
                      ? 'text-[#C99A3D] bg-[#23384D] border border-[#3B5064]'
                      : 'text-white hover:text-[#C99A3D] hover:bg-[#23384D]'
                  }`}
                >
                  Shop
                </Link>

                {/* 4. DEALS (Clean label - no emojis or decorative AI icons) */}
                <Link
                  href="/deals"
                  className={`px-3 py-1.5 text-xs font-bold tracking-wide uppercase transition-colors rounded-lg ${
                    pathname === '/deals' || pathname.startsWith('/deals/')
                      ? 'text-[#C99A3D] bg-[#23384D] border border-[#3B5064]'
                      : 'text-white hover:text-[#C99A3D] hover:bg-[#23384D]'
                  }`}
                >
                  Deals
                </Link>

                {/* 5. ABOUT */}
                <Link
                  href="/about"
                  className={`px-3 py-1.5 text-xs font-bold tracking-wide uppercase transition-colors rounded-lg ${
                    pathname === '/about'
                      ? 'text-[#C99A3D] bg-[#23384D] border border-[#3B5064]'
                      : 'text-white hover:text-[#C99A3D] hover:bg-[#23384D]'
                  }`}
                >
                  About
                </Link>

                {/* 6. CONTACT */}
                <Link
                  href="/contact"
                  className={`px-3 py-1.5 text-xs font-bold tracking-wide uppercase transition-colors rounded-lg ${
                    pathname === '/contact'
                      ? 'text-[#C99A3D] bg-[#23384D] border border-[#3B5064]'
                      : 'text-white hover:text-[#C99A3D] hover:bg-[#23384D]'
                  }`}
                >
                  Contact
                </Link>
              </div>

              {/* Desktop Right Actions: Search, Cart */}
              <div className="flex items-center gap-1.5 lg:gap-2">
                {/* Search Trigger */}
                <button
                  type="button"
                  onClick={() => setSearchOpen(!searchOpen)}
                  className={`w-9 h-9 lg:w-10 lg:h-10 flex items-center justify-center rounded-xl transition-colors ${
                    searchOpen
                      ? 'bg-[#23384D] text-[#C99A3D] border border-[#3B5064]'
                      : 'text-white hover:text-[#C99A3D] hover:bg-[#23384D]'
                  }`}
                  aria-label="Search products"
                >
                  <Search className="w-4 h-4" />
                </button>

                {/* Shopping Cart Drawer Trigger */}
                <button
                  type="button"
                  onClick={openDrawer}
                  className="relative h-9 lg:h-10 px-3.5 bg-[#23384D] hover:bg-[#16283A] text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 border border-[#3B5064] shadow-xs active:scale-[0.98]"
                  aria-label="Shopping Cart"
                >
                  <ShoppingBag className="w-4 h-4 text-white stroke-[2.2]" />
                  <span className="text-xs font-bold text-white">Cart</span>
                  {totalQuantity > 0 && (
                    <span className="bg-[#C99A3D] text-[#23384D] text-[10px] font-extrabold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center ml-0.5 shadow-xs">
                      {totalQuantity}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Integrated Search Bar Drawer */}
          {searchOpen && (
            <div className="py-3 border-t border-[#3B5064] animate-in fade-in">
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
                  className="w-full pl-10 pr-24 py-2.5 bg-[#16283A] border border-[#3B5064] text-white placeholder-[#B8C3CE] rounded-xl text-xs focus:outline-none focus:border-[#C99A3D] shadow-xs"
                />
                <Search className="w-4 h-4 text-[#B8C3CE] absolute left-3.5 top-3" />
                <button
                  type="submit"
                  className="absolute right-2 top-1.5 px-3 py-1 bg-[#C99A3D] hover:bg-[#D9B15C] text-[#23384D] rounded-lg text-xs font-bold active:scale-95 transition-all shadow-2xs"
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
          <div className="lg:hidden border-t border-[#3B5064] bg-[#23384D] px-4 pt-3 pb-6 space-y-2 shadow-elevation max-h-[85vh] overflow-y-auto">
            <>
              {/* 1. Home */}
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 text-sm font-semibold text-white hover:text-[#C99A3D] hover:bg-[#23384D] rounded-xl"
              >
                Home
              </Link>

              {/* 2. Dynamic Categories Accordion */}
              <div className="border-t border-[#3B5064] pt-2 space-y-1.5">
                <div
                  onClick={() => setMobileCategoriesOpen(!mobileCategoriesOpen)}
                  className="flex items-center justify-between px-3 py-2.5 text-sm font-bold text-white hover:bg-[#23384D] rounded-xl cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#C99A3D]" />
                    <span>Categories ({activeCategories.length})</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-[#B8C3CE] transition-transform duration-200 ${
                      mobileCategoriesOpen ? 'rotate-180 text-[#C99A3D]' : ''
                    }`}
                  />
                </div>

                {mobileCategoriesOpen && (
                  <div className="space-y-2 pl-2 pr-1 pt-1">
                    {activeCategories.map((cat) => {
                      const subs = getActiveSubcategoriesForCat(cat.id, cat.subcategories);
                      const isExpanded = expandedMobileCategory === cat.id;

                      return (
                        <div key={cat.id} className="bg-[#23384D] rounded-xl border border-[#3B5064] overflow-hidden">
                          <div className="flex items-center justify-between min-h-[44px]">
                            <Link
                              href={`/category/${cat.slug}`}
                              onClick={() => setMobileMenuOpen(false)}
                              className="flex-1 py-3 px-3.5 font-bold text-xs text-white hover:text-[#C99A3D] flex items-center justify-between gap-1"
                            >
                              <span>{cat.name}</span>
                              <span className="text-[10px] text-[#B8C3CE] font-normal">&rarr;</span>
                            </Link>

                            {subs.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setExpandedMobileCategory(isExpanded ? null : cat.id)}
                                className="w-11 h-11 flex items-center justify-center text-[#B8C3CE] hover:text-[#C99A3D] hover:bg-[#16283A] border-l border-[#3B5064]"
                                aria-label={`Toggle ${cat.name} subcategories`}
                              >
                                <ChevronDown
                                  className={`w-4 h-4 transition-transform duration-200 ${
                                    isExpanded ? 'rotate-180 text-[#C99A3D]' : ''
                                  }`}
                                />
                              </button>
                            )}
                          </div>

                          {subs.length > 0 && isExpanded && (
                            <div className="px-3.5 pb-3 pt-1 border-t border-[#3B5064] bg-[#16283A] space-y-1 animate-in fade-in">
                              {subs.map((sub) => (
                                <Link
                                  key={sub.id}
                                  href={`/category/${cat.slug}/${sub.slug}`}
                                  onClick={() => setMobileMenuOpen(false)}
                                  className="block py-2 px-2 text-xs text-[#B8C3CE] hover:text-[#C99A3D] hover:bg-[#23384D] rounded-lg transition-colors"
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
                className="block px-3 py-2.5 text-sm font-semibold text-white hover:text-[#C99A3D] hover:bg-[#23384D] rounded-xl"
              >
                Shop All Products
              </Link>

              {/* 4. Deals */}
              <Link
                href="/deals"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 text-sm font-semibold text-white hover:text-[#C99A3D] hover:bg-[#23384D] rounded-xl"
              >
                Deals
              </Link>
            </>

            {/* 5. About / Contact */}
            <div className="pt-2 border-t border-[#3B5064] space-y-1">
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 text-sm font-semibold text-[#B8C3CE] hover:text-[#C99A3D] hover:bg-[#23384D] rounded-xl"
              >
                About Us
              </Link>
              <Link
                href="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 text-sm font-semibold text-[#B8C3CE] hover:text-[#C99A3D] hover:bg-[#23384D] rounded-xl"
              >
                Contact Us
              </Link>
            </div>

            {/* 6. Mobile Menu WhatsApp CTA */}
            <div className="pt-2 border-t border-[#3B5064]">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                id="mobile-menu-whatsapp-cta"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#23384D] border border-[#3B5064] text-white font-bold text-xs hover:border-[#25D366] transition-colors"
                aria-label={`Chat on WhatsApp ${DISPLAY_WHATSAPP_NUMBER}`}
              >
                <div className="flex items-center gap-2">
                  <WhatsAppIcon size={16} className="text-[#25D366] fill-current flex-shrink-0" />
                  <span>WhatsApp Orders</span>
                </div>
                <span className="font-mono text-[11px] text-[#25D366] font-semibold">{DISPLAY_WHATSAPP_NUMBER}</span>
              </a>
            </div>

            {/* 7. Mobile Menu Email CTA */}
            <div className="pt-2 border-t border-[#3B5064]">
              <a
                href={EMAIL_URL}
                id="mobile-menu-email-cta"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#23384D] border border-[#3B5064] text-[#E7ECF1] font-bold text-xs hover:text-[#C99A3D] transition-colors"
                aria-label={`Email ${BUSINESS_EMAIL}`}
              >
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#C99A3D] flex-shrink-0" />
                  <span>Support Email</span>
                </div>
                <span className="font-mono text-[11px] text-[#B8C3CE] font-normal">{BUSINESS_EMAIL}</span>
              </a>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};
