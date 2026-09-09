'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingCart,
  Boxes,
  MessageSquare,
  Settings,
  Sliders,
  LogOut,
  ExternalLink,
  Store,
  Menu,
  X,
  Users,
  Sun,
  Moon,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { useTheme } from '@/context/ThemeContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings, loadOrders } = useStore();
  const { theme, isDark, toggleTheme } = useTheme();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (pathname === '/admin/login') {
      setIsAuthenticated(true);
      return;
    }

    let isMounted = true;
    fetch('/api/admin/auth/check', { cache: 'no-store' })
      .then((res) => res.json().catch(() => ({})))
      .then((data) => {
        if (!isMounted) return;
        if (data && data.authenticated) {
          setIsAuthenticated(true);
          loadOrders();
        } else {
          setIsAuthenticated(false);
          router.push('/admin/login');
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setIsAuthenticated(false);
        router.push('/admin/login');
      });

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    } catch {}
    setIsAuthenticated(false);
    router.push('/admin/login');
  };

  if (pathname === '/admin/login') {
    return <div className="min-h-screen bg-light-bg dark:bg-[#101114] text-charcoal-900 dark:text-[#F1F0EC]">{children}</div>;
  }

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-[#101114] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-[#C9A96A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-charcoal-500 dark:text-[#85888E] font-medium">Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  const navLinks = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/wholesale', label: 'Wholesale Pricing', icon: Store },
    { href: '/admin/products', label: 'Products & Variants', icon: Package },
    { href: '/admin/categories', label: 'Categories & Subs', icon: Layers },
    { href: '/admin/orders', label: 'Customer Orders', icon: ShoppingCart },
    { href: '/admin/customers', label: 'Customers', icon: Users },
    { href: '/admin/stock', label: 'Inventory / Stock', icon: Boxes },
    { href: '/admin/hero', label: 'Hero Banners & Slider', icon: Sliders },
    { href: '/admin/reviews', label: 'Customer Reviews', icon: MessageSquare },
    { href: '/admin/settings', label: 'Delivery & Settings', icon: Settings },
  ];

  const logoSrc = isDark ? '/images/header logo.png' : '/images/light logo.png';

  return (
    <div className="min-h-screen bg-light-bg dark:bg-[#11110F] text-charcoal-900 dark:text-[#F4F1E9] flex flex-col md:flex-row transition-colors duration-200">
      {/* Dedicated Admin Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-[#151513] text-charcoal-700 dark:text-[#D7D7D4] border-r border-light-border dark:border-[#34322D] p-5 justify-between flex-shrink-0 min-h-screen sticky top-0">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-light-border dark:border-[#34322D]">
            <div className="flex items-center gap-2">
              <div className="relative w-[142px] lg:w-[150px] h-10 lg:h-11 overflow-hidden flex-shrink-0">
                <Image
                  src={logoSrc}
                  alt="Amin Raisat Hosiery"
                  fill
                  sizes="160px"
                  className="object-contain object-left"
                  priority
                />
              </div>
            </div>

            {/* Admin Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-charcoal-600 dark:text-gray-400 hover:text-[#B89555] dark:hover:text-[#C9A96A] hover:bg-light-hover dark:hover:bg-[#22211E] transition-colors"
              title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            >
              {isDark ? <Sun className="w-4 h-4 text-[#C9A96A]" /> : <Moon className="w-4 h-4 text-charcoal-700" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-champagne-100/70 dark:bg-[#1F2227] text-[#A07D38] dark:text-[#F1F0EC] border-l-2 border-[#C9A96A] shadow-xs'
                      : 'hover:bg-light-hover dark:hover:bg-[#17191D] text-charcoal-600 dark:text-[#8C8F95] hover:text-charcoal-900 dark:hover:text-[#D7D7D4]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#B89555] dark:text-[#C9A96A]' : 'text-charcoal-400 dark:text-[#8E8A80]'}`} />
                    <span>{link.label}</span>
                  </div>
                </a>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="space-y-2 pt-4 border-t border-light-border dark:border-[#30343A]">
          <a
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-charcoal-600 dark:text-[#8C8F95] hover:text-[#C9A96A] hover:bg-light-hover dark:hover:bg-[#17191D] transition-colors"
          >
            <span className="flex items-center gap-2">
              <Store className="w-4 h-4" /> Live Storefront
            </span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#D96B6B] hover:bg-[#D96B6B]/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header Bar for Admin */}
      <div className="md:hidden bg-white dark:bg-[#151513] text-charcoal-900 dark:text-[#F4F1E9] p-4 flex items-center justify-between sticky top-0 z-40 border-b border-light-border dark:border-[#34322D]">
        <div className="flex items-center gap-2.5">
          <div className="relative w-[110px] sm:w-[120px] h-8 sm:h-9 overflow-hidden flex-shrink-0">
            <Image
              src={logoSrc}
              alt="Amin Raisat Hosiery"
              fill
              sizes="130px"
              className="object-contain object-left"
              priority
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 text-charcoal-600 dark:text-gray-400 hover:text-[#B89555] dark:hover:text-[#C9A96A] hover:bg-light-hover dark:hover:bg-[#22211E] rounded-xl"
            title="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-[#C9A96A]" /> : <Moon className="w-4 h-4 text-charcoal-700" />}
          </button>
          <button
            type="button"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="p-2 text-charcoal-600 dark:text-[#B8B3A8] hover:text-charcoal-900 dark:hover:text-[#F4F1E9] hover:bg-light-hover dark:hover:bg-[#22211E] rounded-xl"
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileNavOpen && (
        <div className="md:hidden bg-white dark:bg-[#151513] border-b border-light-border dark:border-[#34322D] p-4 space-y-2 sticky top-[65px] z-30 animate-in fade-in">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold ${
                  isActive
                    ? 'bg-champagne-100/80 dark:bg-[#22211E] text-[#B89555] dark:text-[#C9A96A] border-l-2 border-[#B89555]'
                    : 'text-charcoal-600 dark:text-[#8E8A80] hover:bg-light-hover dark:hover:bg-[#22211E] hover:text-charcoal-900 dark:hover:text-[#F4F1E9]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#B89555] dark:text-[#C9A96A]' : 'text-charcoal-400 dark:text-[#8E8A80]'}`} />
                  <span>{link.label}</span>
                </div>
              </a>
            );
          })}

          <div className="pt-2 border-t border-light-border dark:border-[#34322D] flex justify-between items-center text-xs">
            <a href="/" target="_blank" className="text-charcoal-600 dark:text-[#8E8A80] hover:text-[#B89555] dark:hover:text-[#C9A96A] flex items-center gap-1">
              <Store className="w-3.5 h-3.5" /> View Storefront
            </a>
            <button onClick={handleLogout} className="text-rose-600 dark:text-rose-400 font-semibold">
              Log Out
            </button>
          </div>
        </div>
      )}

      {/* Main Admin Content Viewport */}
      <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8 bg-light-bg dark:bg-[#11110F]">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
