import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient, User } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read config from file
function getConfig() {
  try {
    const configPath = path.join(process.cwd(), '.env.nexus');
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      const config: Record<string, string> = {};
      content.split('\n').forEach((line) => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          config[key.trim()] = valueParts.join('=').trim();
        }
      });
      return config;
    }
  } catch (error) {
    console.error('Error reading config file:', error);
  }
  return {};
}

const config = getConfig();

export function createClient(): SupabaseClient {
  const supabaseUrl = config.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = config.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and API key are required. Please configure at /install');
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

// Server-side client for server components
export function createServerClient() {
  const supabaseUrl = config.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = config.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceKey = config.SUPABASE_SERVICE_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const { createServerClient } = require('@supabase/ssr');
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return null; // Server components don't have cookies
      },
    },
  });
}
