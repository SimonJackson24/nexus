import { createClient } from '@supabase/supabase-js';

// Lazy-initialized admin client (for server-side use only)
let adminClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin(): ReturnType<typeof createClient> {
  if (!adminClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      // Return a placeholder client that will fail at runtime if used without proper env vars
      console.warn('Supabase admin client created with missing environment variables');
    }
    
    adminClient = createClient(supabaseUrl, supabaseServiceKey);
  }
  return adminClient;
}

// Lazy-initialized service client (for server-side use with anon key)
let serviceClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseService(): ReturnType<typeof createClient> {
  if (!serviceClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase service client created with missing environment variables');
    }
    
    serviceClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return serviceClient;
}
