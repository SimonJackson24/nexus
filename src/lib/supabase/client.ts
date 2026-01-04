// DEPRECATED: This module is deprecated
// Use /lib/auth and /lib/db instead
// This file exists only for backwards compatibility with remaining imports

export function createClient() {
  throw new Error('Supabase client is deprecated. Use /lib/auth and /lib/db instead.');
}

export async function getUser() {
  throw new Error('Supabase client is deprecated. Use /lib/auth instead.');
}

export async function getSession() {
  throw new Error('Supabase client is deprecated. Use /lib/auth instead.');
}

export async function signInWithEmail() {
  throw new Error('Supabase client is deprecated. Use /lib/auth instead.');
}

export async function signUpWithEmail() {
  throw new Error('Supabase client is deprecated. Use /lib/auth instead.');
}

export async function signOut() {
  throw new Error('Supabase client is deprecated. Use /lib/auth instead.');
}

export function createServerClient() {
  throw new Error('Supabase client is deprecated. Use /lib/auth and /lib/db instead.');
}
