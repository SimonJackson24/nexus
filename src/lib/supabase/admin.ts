import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Lazy-initialized typed Supabase client for admin operations
let adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseAdmin(): ReturnType<typeof createClient<Database>> {
  if (!adminClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('Supabase admin client created with missing environment variables');
    }
    
    adminClient = createClient<Database>(supabaseUrl, supabaseServiceKey);
  }
  return adminClient;
}

// Lazy-initialized typed Supabase client for service operations (anon key)
let serviceClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseService(): ReturnType<typeof createClient<Database>> {
  if (!serviceClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase service client created with missing environment variables');
    }
    
    serviceClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  return serviceClient;
}
