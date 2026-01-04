import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getGitHubAccessToken, getRepoTree, getFileContent, searchCode } from '@/lib/github/api-service';
import { isCodeFile } from '@/lib/github/types';
import { query } from '@/lib/db';

// GET /api/github/files - List files in a repo or search code
export async function GET(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    const searchParams = request.nextUrl.searchParams;
    const repo = searchParams.get('repo'); // full_name (owner/repo)
    const path = searchParams.get('path');
    const queryText = searchParams.get('q'); // Search query
    const branch = searchParams.get('branch') || 'main';

    if (!repo) {
      return NextResponse.json({ error: 'Repository is required' }, { status: 400 });
    }

    const accessToken = await getGitHubAccessToken(userId!);
    if (!accessToken) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 402 });
    }

    const [owner, repoName] = repo.split('/');

    // Search code if query provided
    if (queryText) {
      const results = await searchCode(queryText, owner, repoName, accessToken);

      return NextResponse.json({
        type: 'search',
        query: queryText,
        total_count: results.length,
        results: results.map((item: any) => ({
          path: item.path,
          sha: item.sha,
          size: item.size,
          html_url: item.html_url,
          repository: {
            name: item.repository?.name,
            full_name: item.repository?.full_name,
          },
        })),
      });
    }

    // Get file tree
    const tree = await getRepoTree(owner, repoName, accessToken);

    // Filter to code files if path not specified
    const filteredTree = path
      ? tree?.filter((item: any) => item.path.startsWith(path))
      : tree?.filter((item: any) => isCodeFile(item.path) || item.type === 'tree');

    // Build directory structure
    if (!path && filteredTree) {
      // Return root structure
      const rootItems: { path: string; type: 'file' | 'dir'; size?: number }[] = [];

      // First pass: collect direct children of root
      for (const item of filteredTree) {
        const parts = item.path.split('/');
        if (parts.length === 1) {
          rootItems.push({
            path: item.path,
            type: item.type as 'file' | 'dir',
            size: item.size,
          });
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
    if (filteredTree) {
      const pathItems: { path: string; type: 'file' | 'dir'; size?: number }[] = [];

      for (const item of filteredTree) {
        if (!item.path.startsWith(path!)) continue;

        const relativePath = item.path.slice(path!.length + 1);
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
    }

    return NextResponse.json({
      type: 'tree',
      repo,
      branch,
      items: [],
    });
  } catch (error) {
    console.error('GitHub files error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/github/files/content - Get file content
export async function POST(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    const body = await request.json();
    const { repo, path, branch = 'main' } = body;

    if (!repo || !path) {
      return NextResponse.json({ error: 'Repository and path are required' }, { status: 400 });
    }

    const accessToken = await getGitHubAccessToken(userId!);
    if (!accessToken) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 402 });
    }

    const [owner, repoName] = repo.split('/');

    // Get file content directly
    const contentResult = await getFileContent(owner, repoName, path, accessToken);

    if (!contentResult) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Decode base64 content if it's a file
    let decodedContent = null;
    if (contentResult.type === 'file' && contentResult.content) {
      decodedContent = Buffer.from(contentResult.content, 'base64').toString('utf-8');
    }

    return NextResponse.json({
      repo,
      path,
      branch,
      content: decodedContent || contentResult,
      sha: contentResult.sha,
      size: contentResult.size,
    });
  } catch (error) {
    console.error('GitHub file content error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
