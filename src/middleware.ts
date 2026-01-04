import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Skip for API routes, static files, and install page
  if (
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname.startsWith('/_next/') ||
    request.nextUrl.pathname.startsWith('/static/') ||
    request.nextUrl.pathname === '/install' ||
    request.nextUrl.pathname === '/auth/'
  ) {
    return NextResponse.next();
  }

  // Check for config using environment variables
  // In production, NEXUS_SECRET_KEY and DATABASE_HOST must be set
  const nexusConfigured = process.env.NEXUS_SECRET_KEY || process.env.DATABASE_HOST;

  // Redirect to install if not configured
  if (!nexusConfigured) {
    return NextResponse.redirect(new URL('/install', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|auth/|install).*)',
  ],
};
