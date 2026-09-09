'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        router.push('/admin');
      } else {
        setError(data.error || 'Incorrect password. Please verify and try again.');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Unable to authenticate with server. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-light-bg dark:bg-[#11110F] text-charcoal-900 dark:text-[#F4F1E9] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-[#191917] border border-light-border dark:border-[#34322D] rounded-3xl p-8 sm:p-10 shadow-elevation space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="relative w-20 h-20 sm:w-22 sm:h-22 mx-auto overflow-hidden flex items-center justify-center bg-light-elevated dark:bg-[#22211E] rounded-2xl border border-light-border dark:border-[#34322D] p-2">
            <Image
              src="/images/Favicon Logo.jpeg"
              alt="Amin Raisat Hosiery"
              fill
              className="object-contain rounded-xl"
              priority
            />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-charcoal-900 dark:text-[#F4F1E9]">Owner Admin Portal</h1>
            <p className="text-xs sm:text-sm text-[#B89555] dark:text-[#C9A96A] font-semibold mt-0.5">
              Amin Raisat Hosiery
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 rounded-xl text-xs font-semibold text-center animate-in fade-in">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-charcoal-700 dark:text-[#B8B3A8]">
              Admin Security Password
            </label>
            <div className="relative">
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                className="w-full pl-10 pr-4 py-3 bg-light-elevated dark:bg-[#22211E] border border-light-border dark:border-[#34322D] rounded-xl text-xs font-semibold text-charcoal-900 dark:text-[#F4F1E9] focus:border-[#B89555] dark:focus:border-[#C9A96A] focus:outline-none transition-all placeholder:text-charcoal-400 dark:placeholder-[#8E8A80]"
                autoFocus
                required
              />
              <Lock className="w-4 h-4 text-[#B89555] dark:text-[#C9A96A] absolute left-3.5 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-6 rounded-xl bg-champagne-500 hover:bg-champagne-400 text-charcoal-950 font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
          >
            <span>{isLoading ? 'Authenticating...' : 'Access Admin Dashboard'}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>

        <div className="pt-2 text-center flex items-center justify-center gap-1.5 text-[11px] text-charcoal-500 dark:text-[#8E8A80]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Encrypted Store Management Session</span>
        </div>
      </div>
    </div>
  );
}
