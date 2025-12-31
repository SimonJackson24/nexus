import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase/admin';
import { encryptApiKey } from '@/lib/billing/api-key-service';
import { getGitHubUser } from '@/lib/github/api-service';

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/api/github/callback';

// OAuth authorization URL
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  if (action === 'authorize') {
    // Generate OAuth URL
    const scope = 'repo,read:user,read:org';
    const state = crypto.randomUUID(); // CSRF protection

    const oauthUrl = `https://github.com/login/oauth/authorize?` +
      `client_id=${GITHUB_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(GITHUB_REDIRECT_URI)}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&state=${state}`;

    // Store state in cookie for verification
    const response = NextResponse.redirect(oauthUrl);
    response.cookies.set('github_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
    });

    return response;
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// OAuth callback handler
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseService();
    
    const body = await request.json();
    const { code, state } = body;

    if (!code) {
      return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 });
    }

    // Verify state
    const storedState = request.cookies.get('github_oauth_state')?.value;
    if (state !== storedState) {
      return NextResponse.json({ error: 'Invalid state parameter' }, { status: 400 });
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: GITHUB_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('GitHub token exchange failed');
      return NextResponse.json({ error: 'Failed to exchange authorization code' }, { status: 500 });
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return NextResponse.json({ error: tokenData.error_description }, { status: 400 });
    }

    const accessToken = tokenData.access_token;

    // Get GitHub user info
    const githubUser = await getGitHubUser(accessToken);
    if (!githubUser) {
      return NextResponse.json({ error: 'Failed to get GitHub user info' }, { status: 500 });
    }

    // Get authenticated user from Supabase
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Encrypt the access token
    const encryptedToken = encryptApiKey(accessToken);

    // Store the connection
    const { data: connection, error: insertError } = await supabase
      .from('github_connections')
      .upsert(
        {
          user_id: user.id,
          github_user_id: githubUser.id,
          github_username: githubUser.login,
          github_avatar_url: githubUser.avatar_url,
          access_token: encryptedToken,
          scope: tokenData.scope || 'repo,read:user',
          is_active: true,
        },
        {
          onConflict: 'user_id, github_user_id',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (insertError) {
      console.error('Error storing GitHub connection:', insertError);
      return NextResponse.json({ error: 'Failed to store GitHub connection' }, { status: 500 });
    }

    // Clear the state cookie
    const response = NextResponse.json({
      success: true,
      connection: {
        id: connection.id,
        github_username: githubUser.login,
        github_avatar_url: githubUser.avatar_url,
      },
    });
    response.cookies.delete('github_oauth_state');

    return response;
  } catch (error) {
    console.error('GitHub OAuth callback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
