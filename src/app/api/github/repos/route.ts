import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase/admin';
import { listUserRepos, getGitHubAccessToken, syncUserRepos } from '@/lib/github/api-service';

// GET /api/github/repos - List user's repositories
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseService() as any;
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const sync = searchParams.get('sync') === 'true';
    const sort = (searchParams.get('sort') || 'updated') as 'updated' | 'pushed' | 'full_name' | 'created';
    const type = (searchParams.get('type') || 'all') as 'all' | 'owner' | 'member' | 'public' | 'private';

    // Check if user has a GitHub connection
    const accessToken = await getGitHubAccessToken(user.id);

    if (!accessToken) {
      return NextResponse.json({
        error: 'GitHub not connected',
        connected: false,
        repos: [],
      });
    }

    // Sync repos if requested
    if (sync) {
      const { data: connection } = await supabase
        .from('github_connections')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (connection) {
        await syncUserRepos(user.id, connection.id);
      }
    }

    // Get repos from database (cached)
    const { data: cachedRepos, error: cacheError } = await supabase
      .from('github_repos')
      .select('*')
      .eq('connection_id', (
        await supabase
          .from('github_connections')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single()
      ).data?.id || '')
      .order('updated_at', { ascending: false });

    if (cacheError) {
      console.error('Error fetching cached repos:', cacheError);
    }

    // If no cached repos or sync requested, fetch from GitHub
    if (!cachedRepos || cachedRepos.length === 0 || sync) {
      const repos = await listUserRepos(accessToken, { sort, type, perPage: 100 });

      return NextResponse.json({
        connected: true,
        synced: sync,
        repos: repos.map((repo) => ({
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          html_url: repo.html_url,
          default_branch: repo.default_branch,
          private: repo.private,
          language: repo.language,
          owner: {
            login: repo.owner.login,
            avatar_url: repo.owner.avatar_url,
          },
        })),
      });
    }

    // Return cached repos
    return NextResponse.json({
      connected: true,
      synced: false,
      repos: cachedRepos.map((repo: any) => ({
        id: repo.repo_id,
        name: repo.repo_name,
        full_name: repo.repo_full_name,
        description: repo.repo_description,
        html_url: repo.repo_url,
        default_branch: repo.default_branch,
        private: repo.is_private,
        language: repo.language,
        synced_at: repo.last_synced_at,
      })),
    });
  } catch (error) {
    console.error('GitHub repos error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/github/repos - Disconnect GitHub
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseService() as any;
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const connectionId = searchParams.get('connection_id');

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
    }

    // Verify connection belongs to user
    const { data: connection, error: fetchError } = await supabase
      .from('github_connections')
      .select('id, user_id')
      .eq('id', connectionId)
      .single();

    if (fetchError || !connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    if (connection.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete connection (cascades to repos and files)
    await supabase.from('github_connections').delete().eq('id', connectionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('GitHub disconnect error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
