import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, SessionPayload } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function getSession(request: NextRequest): Promise<SessionPayload | null> {
  try {
    const token = request.cookies.get('nexus_token')?.value;
    if (!token) {
      return null;
    }
    return verifyToken(token);
  } catch (error) {
    console.error('Session verification error:', error);
    return null;
  }
}

export async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  const session = await getSession(request);
  
  if (!session) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  
  // Add user info to request headers for downstream use
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', session.userId);
  requestHeaders.set('x-user-email', session.email);
  requestHeaders.set('x-user-admin', String(session.isAdmin));
  
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  const session = await getSession(request);
  
  if (!session) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  
  if (!session.isAdmin) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }
  
  // Add user info to request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', session.userId);
  requestHeaders.set('x-user-email', session.email);
  requestHeaders.set('x-user-admin', String(session.isAdmin));
  
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export function getOptionalSession(request: NextRequest): { session: SessionPayload | null; headers: Headers } {
  const session = typeof window === 'undefined' ? getSessionSync(request) : null;
  const headers = new Headers();
  
  if (session) {
    headers.set('x-user-id', session.userId);
    headers.set('x-user-email', session.email);
    headers.set('x-user-admin', String(session.isAdmin));
  }
  
  return { session, headers };
}

// Synchronous version for server components
function getSessionSync(request: NextRequest): SessionPayload | null {
  try {
    const token = request.cookies.get('nexus_token')?.value;
    if (!token) {
      return null;
    }
    // This will be async in practice, so we return null for sync calls
    // In Next.js 14+ we can use the async version
    return null;
  } catch (error) {
    return null;
  }
}
