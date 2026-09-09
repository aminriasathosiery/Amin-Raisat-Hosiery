'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabaseBrowser, isSupabaseConfigured } from '@/lib/supabase/client';
import { CustomerProfile, CustomerAddress } from '@/types';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: CustomerProfile | null;
  addresses: CustomerAddress[];
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string; message?: string }>;
  updateProfile: (updates: Partial<CustomerProfile>) => Promise<{ error?: string }>;
  addAddress: (address: Omit<CustomerAddress, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<{ error?: string; address?: CustomerAddress }>;
  saveAddress: (address: Omit<CustomerAddress, 'id' | 'userId' | 'createdAt' | 'updatedAt'> | CustomerAddress) => Promise<{ error?: string; address?: CustomerAddress }>;
  updateAddress: (id: string, updates: Partial<CustomerAddress>) => Promise<{ error?: string }>;
  deleteAddress: (id: string) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
  refreshAddresses: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Customer Profile with smart fallback to auth metadata / signup name
  const fetchProfile = useCallback(async (userId: string, userEmail?: string, fallbackName?: string) => {
    const cleanFallback = fallbackName?.trim() || (userEmail ? userEmail.split('@')[0] : 'Valued Customer');

    if (!isSupabaseConfigured()) {
      const localProfile = typeof window !== 'undefined' ? localStorage.getItem('arh_customer_profile') : null;
      if (localProfile) {
        try {
          const parsed = JSON.parse(localProfile);
          setProfile(parsed);
          return;
        } catch {}
      }
      return;
    }

    try {
      const { data, error } = await supabaseBrowser
        .from('customer_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        // Use real saved name, or fallback to signup name if name in DB was generic
        const hasValidDbName = data.full_name && data.full_name !== 'Customer' && data.full_name.trim().length > 0;
        const effectiveName = hasValidDbName ? data.full_name : (fallbackName?.trim() || data.full_name || cleanFallback);

        setProfile({
          id: data.id,
          fullName: effectiveName,
          phone: data.phone || undefined,
          email: data.email || userEmail || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });

        // Sync fallback name to database if DB was unpopulated
        if (!hasValidDbName && fallbackName?.trim() && fallbackName.trim() !== 'Customer') {
          await supabaseBrowser
            .from('customer_profiles')
            .update({ full_name: fallbackName.trim(), updated_at: new Date().toISOString() })
            .eq('id', userId);
        }
      } else if (error && error.code === 'PGRST116') {
        // Profile does not exist yet; auto-create with the actual user/signup name
        const initialProfile = {
          id: userId,
          full_name: cleanFallback,
          email: userEmail || '',
        };
        await supabaseBrowser.from('customer_profiles').upsert(initialProfile);
        setProfile({
          id: userId,
          fullName: cleanFallback,
          email: userEmail || undefined,
        });
      }
    } catch (err) {
      console.warn('Error fetching customer profile:', err);
    }
  }, []);

  // Fetch Customer Addresses
  const fetchAddresses = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured()) {
      const localAddresses = typeof window !== 'undefined' ? localStorage.getItem('arh_customer_addresses') : null;
      if (localAddresses) {
        try {
          setAddresses(JSON.parse(localAddresses));
          return;
        } catch {}
      }
      return;
    }

    try {
      const { data, error } = await supabaseBrowser
        .from('customer_addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false });

      if (!error && data) {
        setAddresses(
          data.map((a: any) => ({
            id: a.id,
            userId: a.user_id,
            addressType: a.address_type || 'shipping',
            fullName: a.full_name,
            phone: a.phone,
            address: a.address,
            city: a.city,
            province: a.province || 'Punjab',
            postalCode: a.postal_code || undefined,
            isDefault: a.is_default || false,
            createdAt: a.created_at,
            updatedAt: a.updated_at,
          }))
        );
      }
    } catch (err) {
      console.warn('Error fetching customer addresses:', err);
    }
  }, []);

  // Initialize Auth Listener
  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession();
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            const metaName = session.user.user_metadata?.full_name || session.user.user_metadata?.name;
            await Promise.all([
              fetchProfile(session.user.id, session.user.email, metaName),
              fetchAddresses(session.user.id),
            ]);
          }
        }
      } catch (err) {
        console.warn('Auth initialization error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          const metaName = newSession.user.user_metadata?.full_name || newSession.user.user_metadata?.name;
          await Promise.all([
            fetchProfile(newSession.user.id, newSession.user.email, metaName),
            fetchAddresses(newSession.user.id),
          ]);
        } else {
          setProfile(null);
          setAddresses([]);
        }
        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, fetchAddresses]);

  // Sign In with Sanitized Error Handling
  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured()) {
      return { error: 'Database authentication is currently in demo mode.' };
    }
    try {
      const { data, error } = await supabaseBrowser.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
          return { error: 'Incorrect email or password. Please check your credentials and try again.' };
        }
        if (msg.includes('email not confirmed')) {
          return { error: 'Please confirm your email address before signing in.' };
        }
        if (msg.includes('rate limit')) {
          return { error: 'Too many login attempts. Please wait a moment and try again.' };
        }
        return { error: 'Unable to sign in. Please verify your email and password.' };
      }

      if (data.user) {
        setUser(data.user);
        const metaName = data.user.user_metadata?.full_name || data.user.user_metadata?.name;
        await Promise.all([
          fetchProfile(data.user.id, data.user.email, metaName),
          fetchAddresses(data.user.id),
        ]);
      }
      return {};
    } catch (err: any) {
      return { error: 'Network error occurred. Please check your internet connection and try again.' };
    }
  };

  // Sign Up with Sanitized Error Handling & Immediate Full Name Profile Upsert
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phone?: string
  ): Promise<{ error?: string }> => {
    const cleanEmail = email.trim();
    const cleanName = fullName.trim();
    const cleanPhone = phone ? phone.trim() : '';

    if (!isSupabaseConfigured()) {
      const demoUser: any = { id: `usr-${Date.now()}`, email: cleanEmail };
      const demoProfile: CustomerProfile = {
        id: demoUser.id,
        fullName: cleanName,
        email: cleanEmail,
        phone: cleanPhone || undefined,
        createdAt: new Date().toISOString(),
      };
      setUser(demoUser);
      setProfile(demoProfile);
      if (typeof window !== 'undefined') {
        localStorage.setItem('arh_customer_profile', JSON.stringify(demoProfile));
      }
      return {};
    }

    try {
      const { data, error } = await supabaseBrowser.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
            phone: cleanPhone,
          },
        },
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('already registered') || msg.includes('user already exists') || msg.includes('duplicate key')) {
          return { error: 'This email is already registered. Please sign in.' };
        }
        if (msg.includes('password should be at least') || msg.includes('password is too short')) {
          return { error: 'Password must be at least 6 characters.' };
        }
        return { error: 'Failed to create your account. Please try again with valid information.' };
      }

      if (data.user) {
        setUser(data.user);
        const newProfile: CustomerProfile = {
          id: data.user.id,
          fullName: cleanName,
          email: cleanEmail,
          phone: cleanPhone || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setProfile(newProfile);

        // Upsert exact full name into customer_profiles table
        await supabaseBrowser.from('customer_profiles').upsert({
          id: data.user.id,
          full_name: cleanName,
          phone: cleanPhone || null,
          email: cleanEmail,
          updated_at: new Date().toISOString(),
        });

        await Promise.all([
          fetchProfile(data.user.id, cleanEmail, cleanName),
          fetchAddresses(data.user.id),
        ]);
      }

      return {};
    } catch (err: any) {
      return { error: 'Network error occurred while creating your account. Please try again.' };
    }
  };

  // Password Reset Request
  const resetPassword = async (email: string): Promise<{ error?: string; message?: string }> => {
    if (!isSupabaseConfigured()) {
      return { error: 'Password reset requires active Supabase email configuration.' };
    }
    try {
      const { error } = await supabaseBrowser.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/account`,
      });
      if (error) {
        return { error: 'Unable to send password reset email. Please ensure the email is correct.' };
      }
      return { message: 'Password reset email has been sent. Please check your inbox.' };
    } catch (err: any) {
      return { error: 'Failed to request password reset. Please try again later.' };
    }
  };

  // Sign Out
  const signOut = async () => {
    if (isSupabaseConfigured()) {
      try {
        await supabaseBrowser.auth.signOut();
      } catch (err) {
        console.warn('Sign out exception:', err);
      }
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setAddresses([]);
  };

  // Update Profile
  const updateProfile = async (updates: Partial<CustomerProfile>): Promise<{ error?: string }> => {
    if (!user) return { error: 'You must be signed in to update your profile.' };
    if (!isSupabaseConfigured()) {
      const updated = { ...profile, ...updates } as CustomerProfile;
      setProfile(updated);
      localStorage.setItem('arh_customer_profile', JSON.stringify(updated));
      return {};
    }

    try {
      const payload: any = {
        updated_at: new Date().toISOString(),
      };
      if (updates.fullName !== undefined) payload.full_name = updates.fullName.trim();
      if (updates.phone !== undefined) payload.phone = updates.phone.trim();
      if (updates.whatsappNumber !== undefined) payload.phone = updates.whatsappNumber.trim();
      if (updates.email !== undefined) payload.email = updates.email.trim();

      const { error } = await supabaseBrowser
        .from('customer_profiles')
        .update(payload)
        .eq('id', user.id);

      if (error) return { error: 'Failed to update profile information. Please try again.' };

      // Update local state and re-fetch
      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
      await fetchProfile(user.id, user.email, updates.fullName);
      return {};
    } catch (err: any) {
      return { error: 'Network error occurred while saving profile updates.' };
    }
  };

  // Add Address
  const addAddress = async (
    addressData: Omit<CustomerAddress, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<{ error?: string; address?: CustomerAddress }> => {
    if (!user) return { error: 'You must be signed in to save addresses.' };

    const effectiveAddress = addressData.address || addressData.streetAddress || '';

    if (!isSupabaseConfigured()) {
      const newAddr: CustomerAddress = {
        ...addressData,
        address: effectiveAddress,
        id: `addr-${Date.now()}`,
        userId: user.id,
        createdAt: new Date().toISOString(),
      };
      const updated = [newAddr, ...addresses];
      setAddresses(updated);
      localStorage.setItem('arh_customer_addresses', JSON.stringify(updated));
      return { address: newAddr };
    }

    try {
      if (addressData.isDefault) {
        await supabaseBrowser
          .from('customer_addresses')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const { data, error } = await supabaseBrowser
        .from('customer_addresses')
        .insert({
          user_id: user.id,
          address_type: addressData.addressType || 'shipping',
          full_name: addressData.fullName,
          phone: addressData.phone,
          address: effectiveAddress,
          city: addressData.city,
          province: addressData.province || 'Punjab',
          postal_code: addressData.postalCode || null,
          is_default: addressData.isDefault || false,
        })
        .select()
        .single();

      if (error) return { error: 'Failed to save address. Please check your fields and try again.' };

      await fetchAddresses(user.id);
      return {
        address: data
          ? {
              id: data.id,
              userId: data.user_id,
              addressType: data.address_type,
              fullName: data.full_name,
              phone: data.phone,
              address: data.address,
              city: data.city,
              province: data.province,
              postalCode: data.postal_code || undefined,
              isDefault: data.is_default,
              createdAt: data.created_at,
            }
          : undefined,
      };
    } catch (err: any) {
      return { error: 'Network error occurred while saving address.' };
    }
  };

  const saveAddress = async (
    addressData: Omit<CustomerAddress, 'id' | 'userId' | 'createdAt' | 'updatedAt'> | CustomerAddress
  ): Promise<{ error?: string; address?: CustomerAddress }> => {
    if ('id' in addressData && addressData.id) {
      const err = await updateAddress(addressData.id, addressData);
      return { error: err.error, address: addressData as CustomerAddress };
    }
    return await addAddress(addressData);
  };

  // Update Address
  const updateAddress = async (
    id: string,
    updates: Partial<CustomerAddress>
  ): Promise<{ error?: string }> => {
    if (!user) return { error: 'You must be signed in to update addresses.' };

    if (!isSupabaseConfigured()) {
      const updated = addresses.map((a) => (a.id === id ? { ...a, ...updates } : a));
      setAddresses(updated);
      localStorage.setItem('arh_customer_addresses', JSON.stringify(updated));
      return {};
    }

    try {
      if (updates.isDefault) {
        await supabaseBrowser
          .from('customer_addresses')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const payload: any = {
        updated_at: new Date().toISOString(),
      };
      if (updates.fullName !== undefined) payload.full_name = updates.fullName;
      if (updates.phone !== undefined) payload.phone = updates.phone;
      if (updates.address !== undefined) payload.address = updates.address;
      if (updates.city !== undefined) payload.city = updates.city;
      if (updates.province !== undefined) payload.province = updates.province;
      if (updates.postalCode !== undefined) payload.postal_code = updates.postalCode;
      if (updates.isDefault !== undefined) payload.is_default = updates.isDefault;

      const { error } = await supabaseBrowser
        .from('customer_addresses')
        .update(payload)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) return { error: 'Failed to update address.' };
      await fetchAddresses(user.id);
      return {};
    } catch (err: any) {
      return { error: 'Network error occurred while updating address.' };
    }
  };

  // Delete Address
  const deleteAddress = async (id: string): Promise<{ error?: string }> => {
    if (!user) return { error: 'You must be signed in to delete addresses.' };

    if (!isSupabaseConfigured()) {
      const updated = addresses.filter((a) => a.id !== id);
      setAddresses(updated);
      localStorage.setItem('arh_customer_addresses', JSON.stringify(updated));
      return {};
    }

    try {
      const { error } = await supabaseBrowser
        .from('customer_addresses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) return { error: 'Failed to delete address.' };
      await fetchAddresses(user.id);
      return {};
    } catch (err: any) {
      return { error: 'Network error occurred while deleting address.' };
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id, user.email);
  };

  const refreshAddresses = async () => {
    if (user) await fetchAddresses(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        addresses,
        isLoading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updateProfile,
        addAddress,
        saveAddress,
        updateAddress,
        deleteAddress,
        refreshProfile,
        refreshAddresses,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
