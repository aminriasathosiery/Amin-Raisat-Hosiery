import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const isValidHttpUrl = (url?: string): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const supabaseUrl = isValidHttpUrl(rawUrl)
  ? rawUrl!
  : 'https://placeholder-project.supabase.co';

export function isServerSupabaseConfigured(): boolean {
  return isValidHttpUrl(rawUrl) && getRuntimeKeyInfo().keyType !== 'missing';
}

export function getRuntimeKeyInfo(): {
  serviceRoleKeyPresent: boolean;
  keyType: 'server-secret' | 'publishable' | 'anon' | 'missing';
} {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (serviceKey && serviceKey.length > 20 && !serviceKey.includes('PASTE_')) {
    if (serviceKey.startsWith('sb_publishable_')) {
      return { serviceRoleKeyPresent: true, keyType: 'publishable' };
    }
    if (serviceKey.startsWith('eyJ')) {
      try {
        const parts = serviceKey.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          if (payload.role === 'anon') {
            return { serviceRoleKeyPresent: true, keyType: 'anon' };
          }
        }
      } catch {}
    }
    return { serviceRoleKeyPresent: true, keyType: 'server-secret' };
  }
  if (publishableKey && publishableKey.length > 20 && !publishableKey.includes('PASTE_')) {
    return { serviceRoleKeyPresent: false, keyType: 'publishable' };
  }
  return { serviceRoleKeyPresent: false, keyType: 'missing' };
}

/**
 * Creates a standard server client for public read queries.
 */
export function createServerClient(): SupabaseClient {
  const rawKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

  return createClient(supabaseUrl, rawKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const supabaseServer = createServerClient();

/**
 * Creates an authoritative Admin client strictly using SUPABASE_SERVICE_ROLE_KEY.
 * ZERO fallback to publishable/anon keys for admin mutations.
 */
export function createAdminClient(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey || serviceKey.length < 20 || serviceKey.includes('PASTE_')) {
    throw new Error(
      'Server Admin Database Configuration Error: SUPABASE_SERVICE_ROLE_KEY is required for admin database operations. Please configure SUPABASE_SERVICE_ROLE_KEY in your server environment variables.'
    );
  }

  // Detect if publishable key was mistakenly supplied as service role key
  if (serviceKey.startsWith('sb_publishable_')) {
    throw new Error(
      'Server Admin Database Configuration Error: SUPABASE_SERVICE_ROLE_KEY is set to a publishable key (starts with "sb_publishable_"). Admin mutations require the secret service_role key (starts with "sb_secret_" or service_role JWT). Please update SUPABASE_SERVICE_ROLE_KEY in Hostinger / Vercel.'
    );
  }

  // Detect if anon JWT was supplied
  if (serviceKey.startsWith('eyJ')) {
    try {
      const parts = serviceKey.split('.');
      if (parts.length >= 2) {
        const payloadStr = Buffer.from(parts[1], 'base64').toString('utf-8');
        const payload = JSON.parse(payloadStr);
        if (payload.role === 'anon') {
          throw new Error(
            'Server Admin Database Configuration Error: SUPABASE_SERVICE_ROLE_KEY contains an "anon" role token. Admin mutations require the "service_role" secret key from Supabase Dashboard -> Project Settings -> API.'
          );
        }
      }
    } catch (e: any) {
      if (e.message?.includes('Server Admin Database Configuration Error:')) {
        throw e;
      }
    }
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

