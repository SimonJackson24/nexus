// Stub types for backwards compatibility
// This module is deprecated - use /lib/db and /lib/auth instead

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Database type stub for Supabase compatibility
export interface Database {
  public: {
    Tables: {
      [key: string]: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
  };
}
