import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { query } from '@/lib/db';
import { getGitHubAccessToken, syncUserRepos } from '@/lib/github/api-service';

// GET /api/github/repos - List user's repositories
export async function GET(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    const { searchParams } = new URL(request.url);
    const sync = searchParams.get('sync') === 'true';

    // Check if user has a GitHub connection
    const accessToken = await getGitHubAccessToken(userId!);

    if (!accessToken) {
      return NextResponse.json({
        error: 'GitHub not connected',
        connected: false,
        repos: [],
      });
    }

    // Sync repos if requested
    if (sync) {
      const connectionResult = await query(
        `SELECT id FROM github_connections WHERE user_id = $1 AND is_active = true LIMIT 1`,
        [userId]
      );

      if (connectionResult.rows.length > 0) {
        await syncUserRepos(userId!, connectionResult.rows[0].id);
      }
    }

    // Get repos from database (cached)
    const cachedResult = await query(
      `SELECT * FROM github_repos 
       WHERE connection_id IN (SELECT id FROM github_connections WHERE user_id = $1 AND is_active = true)
       ORDER BY updated_at DESC`,
      [userId]
    );

    return NextResponse.json({
      connected: true,
      synced: sync,
      repos: cachedResult.rows.map((repo: any) => ({
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
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');
  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get('connection_id');

  if (!connectionId) {
    return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
  }

  try {
    // Verify connection belongs to user
    const connectionResult = await query(
      `SELECT id, user_id FROM github_connections WHERE id = $1`,
      [connectionId]
    );

    if (connectionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    if (connectionResult.rows[0].user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete connection (cascades to repos and files)
    await query(`DELETE FROM github_connections WHERE id = $1`, [connectionId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('GitHub disconnect error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
