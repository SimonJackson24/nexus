import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Helper to get current user
export async function getUser(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Helper to sign in with email/password
export async function signInWithEmail(supabase: ReturnType<typeof createClient>, email: string, password: string) {
  return supabase.auth.signInWithPassword({
    email,
    password,
  })
}

// Helper to sign up with email/password
export async function signUpWithEmail(supabase: ReturnType<typeof createClient>, email: string, password: string) {
  return supabase.auth.signUp({
    email,
    password,
  })
}

// Helper to sign out
export async function signOut(supabase: ReturnType<typeof createClient>) {
  return supabase.auth.signOut()
}

// Helper to get session
export async function getSession(supabase: ReturnType<typeof createClient>) {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}
