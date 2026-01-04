import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Handle auth callback - redirect to app with success
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = requestUrl.searchParams.get('next') || '/app';
  
  // With our new auth system, we don't use OAuth callbacks from Supabase
  // This route is a placeholder for future OAuth providers
  return NextResponse.redirect(new URL(next, request.url));
}
