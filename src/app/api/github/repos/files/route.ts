// POST /api/github/repos/files - Add/Update files in an existing repository
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { createOrUpdateFile } from '@/lib/github/extended-api';
import { getGitHubAccessToken } from '@/lib/github/api-service';

export async function POST(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    const body = await request.json();
    const { owner, repo, path, content, message, branch } = body;

    // Validate required fields
    if (!owner || !repo || !path || !content || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: owner, repo, path, content, message' },
        { status: 400 }
      );
    }

    // Validate path
    if (path.startsWith('/') || path.includes('..')) {
      return NextResponse.json(
        { error: 'Invalid path: must be relative and cannot contain ".." or start with "/"' },
        { status: 400 }
      );
    }

    const accessToken = await getGitHubAccessToken(userId!);
    if (!accessToken) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 401 });
    }

    // Base64 encode content
    const encodedContent = Buffer.from(content).toString('base64');

    const result = await createOrUpdateFile(userId!, owner, repo, path, {
      message,
      content: encodedContent,
      branch: branch || 'main',
    });

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to add file' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      path,
      message: `Committed "${path}" successfully`,
    });
  } catch (error) {
    console.error('Add file API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
