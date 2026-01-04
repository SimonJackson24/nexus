// Stub for backwards compatibility
// This module is deprecated - use /lib/db and /lib/auth instead

export function getSupabaseAdmin() {
  throw new Error('Supabase admin is deprecated. Use /lib/db instead.');
}

export function getSupabaseService() {
  throw new Error('Supabase service is deprecated. Use /lib/db instead.');
}
