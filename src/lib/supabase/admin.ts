import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Re-export Database type for convenience
export type { Database } from './types';

// Define the typed Supabase client type
export type TypedSupabaseClient = SupabaseClient<Database>;

// Lazy-initialized typed Supabase client for admin operations
let adminClient: TypedSupabaseClient | null = null;

export function getSupabaseAdmin(): TypedSupabaseClient {
  if (!adminClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('Supabase admin client created with missing environment variables');
    }
    
    adminClient = createClient<Database>(supabaseUrl, supabaseServiceKey) as TypedSupabaseClient;
  }
  return adminClient;
}

// Lazy-initialized typed Supabase client for service operations (anon key)
let serviceClient: TypedSupabaseClient | null = null;

export function getSupabaseService(): TypedSupabaseClient {
  if (!serviceClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase service client created with missing environment variables');
    }
    
    serviceClient = createClient<Database>(supabaseUrl, supabaseAnonKey) as TypedSupabaseClient;
  }
  return serviceClient;
}
