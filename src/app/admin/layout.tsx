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
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loadOrders } = useStore();

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
  }, [pathname, router, loadOrders]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    } catch {}
    setIsAuthenticated(false);
    router.push('/admin/login');
  };

  if (pathname === '/admin/login') {
    return <div className="min-h-screen bg-[#F7F3EA] text-[#1D2730]">{children}</div>;
  }

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#F7F3EA] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-[#C99A3D] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#66717C] font-medium">Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  const navLinks = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/products', label: 'Products & Variants', icon: Package },
    { href: '/admin/categories', label: 'Categories & Subs', icon: Layers },
    { href: '/admin/orders', label: 'Customer Orders', icon: ShoppingCart },
    { href: '/admin/customers', label: 'Customers', icon: Users },
    { href: '/admin/stock', label: 'Inventory / Stock', icon: Boxes },
    { href: '/admin/hero', label: 'Hero Banners & Slider', icon: Sliders },
    { href: '/admin/reviews', label: 'Customer Reviews', icon: MessageSquare },
    { href: '/admin/settings', label: 'Delivery & Settings', icon: Settings },
  ];

  const logoSrc = '/logo2.png';

  return (
    <div className="min-h-screen bg-[#F7F3EA] text-[#1D2730] flex flex-col md:flex-row">
      {/* Dedicated Admin Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white text-[#1D2730] border-r border-[#D8D0C3] p-5 justify-between flex-shrink-0 min-h-screen sticky top-0">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#D8D0C3]">
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
                      ? 'bg-[#EEE8DC] text-[#C99A3D] border-l-2 border-[#C99A3D] shadow-xs font-bold'
                      : 'hover:bg-[#EEE8DC] text-[#66717C] hover:text-[#1D2730]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#C99A3D]' : 'text-[#66717C]'}`} />
                    <span>{link.label}</span>
                  </div>
                </a>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="space-y-2 pt-4 border-t border-[#D8D0C3]">
          <a
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-[#66717C] hover:text-[#C99A3D] hover:bg-[#EEE8DC] transition-colors"
          >
            <span className="flex items-center gap-2">
              <Store className="w-4 h-4" /> Live Storefront
            </span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#B8423A] hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header Bar for Admin */}
      <div className="md:hidden bg-white text-[#1D2730] p-4 flex items-center justify-between sticky top-0 z-40 border-b border-[#D8D0C3]">
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
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="p-2 text-[#66717C] hover:text-[#1D2730] hover:bg-[#EEE8DC] rounded-xl"
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileNavOpen && (
        <div className="md:hidden bg-white border-b border-[#D8D0C3] p-4 space-y-2 sticky top-[65px] z-30 animate-in fade-in">
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
                    ? 'bg-[#EEE8DC] text-[#C99A3D] border-l-2 border-[#C99A3D]'
                    : 'text-[#66717C] hover:bg-[#EEE8DC] hover:text-[#1D2730]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#C99A3D]' : 'text-[#66717C]'}`} />
                  <span>{link.label}</span>
                </div>
              </a>
            );
          })}

          <div className="pt-2 border-t border-[#D8D0C3] flex justify-between items-center text-xs">
            <a href="/" target="_blank" className="text-[#66717C] hover:text-[#C99A3D] flex items-center gap-1">
              <Store className="w-3.5 h-3.5" /> View Storefront
            </a>
            <button onClick={handleLogout} className="text-[#B8423A] font-semibold">
              Log Out
            </button>
          </div>
        </div>
      )}

      {/* Main Admin Content Viewport */}
      <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8 bg-[#F7F3EA]">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
