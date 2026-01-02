import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient, User } from '@supabase/supabase-js';

// Get environment variables from window.ENV (injected by layout.tsx)
function getEnv(name: string): string {
  if (typeof window !== 'undefined' && (window as any).ENV) {
    return (window as any).ENV[name] || '';
  }
  return process.env[name] || '';
}

export function createClient(): SupabaseClient {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase configuration:', { supabaseUrl, supabaseAnonKey });
    throw new Error('Supabase URL and API key are required');
  }
  
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export async function getUser(supabase: SupabaseClient): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getSession(supabase: SupabaseClient) {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function signInWithEmail(
  supabase: SupabaseClient,
  email: string,
  password: string
) {
  return supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signUpWithEmail(
  supabase: SupabaseClient,
  email: string,
  password: string
) {
  return supabase.auth.signUp({
    email,
    password,
  });
}

export async function signOut(supabase: SupabaseClient) {
  return supabase.auth.signOut();
}
