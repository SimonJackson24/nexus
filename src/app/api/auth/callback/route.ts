import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Handle auth callback from Supabase (email confirmation, etc.)
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') || '/'

  if (code) {
    const supabase = await createClient()
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(
        new URL(`/auth/error?message=${encodeURIComponent(error.message)}`, request.url)
      )
    }
  }

  // Handle different auth types
  switch (type) {
    case 'signup':
      // Redirect to welcome page or settings
      return NextResponse.redirect(new URL(`${next}?welcome=true`, request.url))
    
    case 'recovery':
      // Password reset flow
      return NextResponse.redirect(new URL('/auth/reset-password', request.url))
    
    case 'invite':
      // invitation flow
      return NextResponse.redirect(new URL(`${next}?invite=true`, request.url))
    
    default:
      return NextResponse.redirect(new URL(next, request.url))
  }
}
