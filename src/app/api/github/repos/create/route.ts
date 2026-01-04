// POST /api/github/repos/create - Create a new repository with initial files
import { NextRequest, NextResponse } from 'next/server';
import { createRepository, commitInitialFiles } from '@/lib/github/create-repo';
import { requireAuth } from '@/lib/auth/middleware';
import { query } from '@/lib/db';
import { getGitHubAccessToken } from '@/lib/github/api-service';

export async function POST(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    const body = await request.json();
    const { name, description, isPrivate, files } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Repository name is required' },
        { status: 400 }
      );
    }

    // Validate name (GitHub repo naming rules)
    const validNameRegex = /^[a-zA-Z0-9._-]+$/;
    if (!validNameRegex.test(name)) {
      return NextResponse.json(
        { error: 'Repository name can only contain alphanumeric characters, hyphens, underscores, and periods' },
        { status: 400 }
      );
    }

    // First create the repository
    const repoResult = await createRepository(userId!, name, description || '', isPrivate ?? true, false);

    if (!repoResult.success || !repoResult.repo) {
      return NextResponse.json(
        { error: repoResult.error || 'Failed to create repository' },
        { status: 500 }
      );
    }

    // If files are provided, commit them
    if (files && Array.isArray(files) && files.length > 0) {
      const [owner, repoName] = repoResult.repo.full_name.split('/');
      
      const commitResult = await commitInitialFiles(userId!, owner, repoName, files);

      if (!commitResult.success) {
        return NextResponse.json(
          { error: commitResult.error || 'Failed to commit files' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        repo: repoResult.repo,
        files_committed: files.length,
        message: `Created repository "${repoResult.repo.full_name}" with ${files.length} files`,
      });
    }

    return NextResponse.json({
      success: true,
      repo: repoResult.repo,
      message: `Created repository "${repoResult.repo.full_name}"`,
    });
  } catch (error) {
    console.error('Create repo API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
