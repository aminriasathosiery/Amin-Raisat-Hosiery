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
    <div className="min-h-screen bg-[#F7F3EA] text-[#1D2730] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-[#D8D0C3] rounded-3xl p-8 sm:p-10 shadow-elevation space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="relative w-20 h-20 sm:w-22 sm:h-22 mx-auto overflow-hidden flex items-center justify-center bg-[#EEE8DC]/40 rounded-2xl border border-[#D8D0C3] p-2">
            <Image
              src="/logo2.png"
              alt="Amin Raisat Hosiery"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1D2730]">Owner Admin Portal</h1>
            <p className="text-xs sm:text-sm text-[#C99A3D] font-semibold mt-0.5">
              Amin Raisat Hosiery
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-[#B8423A]/10 border border-[#B8423A]/30 text-[#B8423A] rounded-xl text-xs font-semibold text-center animate-in fade-in">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#1D2730]">
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
                className="w-full pl-10 pr-4 py-3 bg-[#EEE8DC]/40 border border-[#D8D0C3] rounded-xl text-xs font-semibold text-[#1D2730] focus:border-[#C99A3D] focus:outline-none transition-all placeholder:text-[#66717C]"
                autoFocus
                required
              />
              <Lock className="w-4 h-4 text-[#C99A3D] absolute left-3.5 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-6 rounded-xl bg-[#23384D] hover:bg-[#182B3D] text-[#F7F3EA] font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
          >
            <span>{isLoading ? 'Authenticating...' : 'Access Admin Dashboard'}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>

        <div className="pt-2 text-center flex items-center justify-center gap-1.5 text-[11px] text-[#66717C]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2F7D5A]" />
          <span>Encrypted Store Management Session</span>
        </div>
      </div>
    </div>
  );
}
