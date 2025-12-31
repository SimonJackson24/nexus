import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase/admin';
import { getGitHubAccessToken, getRepoTree, getFileContent, searchCode } from '@/lib/github/api-service';
import { isCodeFile } from '@/lib/github/types';

// GET /api/github/files - List files in a repo or search code
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
    const repo = searchParams.get('repo'); // full_name (owner/repo)
    const path = searchParams.get('path');
    const query = searchParams.get('q'); // Search query
    const branch = searchParams.get('branch') || 'main';

    if (!repo) {
      return NextResponse.json({ error: 'Repository is required' }, { status: 400 });
    }

    const accessToken = await getGitHubAccessToken(user.id);
    if (!accessToken) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 402 });
    }

    const [owner, repoName] = repo.split('/');

    // Search code if query provided
    if (query) {
      const results = await searchCode(accessToken, query, {
        repo: repo,
        perPage: 20,
      });

      // Record search history
      await supabase.from('github_search_history').insert({
        user_id: user.id,
        query,
        result_count: results.totalCount,
      });

      return NextResponse.json({
        type: 'search',
        query,
        total_count: results.totalCount,
        results: results.items.map((item) => ({
          path: item.path,
          sha: item.sha,
          size: item.size,
          html_url: item.html_url,
          repository: {
            name: item.repository.name,
            full_name: item.repository.full_name,
          },
        })),
      });
    }

    // Get file tree
    const tree = await getRepoTree(accessToken, owner, repoName, branch, true);

    // Filter to code files if path not specified
    const filteredTree = path
      ? tree.filter((item) => item.path.startsWith(path))
      : tree.filter((item) => isCodeFile(item.path) || item.type === 'tree');

    // Build directory structure
    if (!path) {
      // Return root structure
      const rootItems: { path: string; type: 'file' | 'dir'; size?: number }[] = [];
      const processedPaths = new Set<string>();

      // First pass: collect direct children of root
      for (const item of filteredTree) {
        const parts = item.path.split('/');
        if (parts.length === 1) {
          rootItems.push({
            path: item.path,
            type: item.type as 'file' | 'dir',
            size: item.size,
          });
          processedPaths.add(item.path);
        }
      }

      return NextResponse.json({
        type: 'tree',
        repo,
        branch,
        items: rootItems,
      });
    }

    // Return specific path contents
    const pathItems: { path: string; type: 'file' | 'dir'; size?: number }[] = [];
    const processedPaths = new Set<string>();

    for (const item of filteredTree) {
      if (!item.path.startsWith(path)) continue;

      const relativePath = item.path.slice(path.length + 1);
      const parts = relativePath.split('/');

      if (parts.length === 1) {
        pathItems.push({
          path: item.path,
          type: item.type as 'file' | 'dir',
          size: item.size,
        });
      }
    }

    return NextResponse.json({
      type: 'tree',
      repo,
      path,
      branch,
      items: pathItems,
    });
  } catch (error) {
    console.error('GitHub files error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/github/files/content - Get file content
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { repo, path, branch = 'main' } = body;

    if (!repo || !path) {
      return NextResponse.json({ error: 'Repository and path are required' }, { status: 400 });
    }

    const accessToken = await getGitHubAccessToken(user.id);
    if (!accessToken) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 402 });
    }

    const [owner, repoName] = repo.split('/');

    // Get tree to find file SHA
    const tree = await getRepoTree(accessToken, owner, repoName, branch, false);
    const fileItem = tree.find((item) => item.path === path);

    if (!fileItem || (fileItem as any).type !== 'blob') {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Get file content
    const content = await getFileContent(accessToken, owner, repoName, path, fileItem.sha);

    if (content === null) {
      return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
    }

    return NextResponse.json({
      repo,
      path,
      branch,
      content,
      size: fileItem.size,
      sha: fileItem.sha,
    });
  } catch (error) {
    console.error('GitHub file content error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
