// POST /api/github/repos/create - Create a new repository with initial files
import { NextRequest, NextResponse } from 'next/server';
import { createRepository, commitInitialFiles, initNewProject } from '@/lib/github/create-repo';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // If files are provided, initialize project with files
    if (files && Array.isArray(files) && files.length > 0) {
      const result = await initNewProject(user.id, {
        name,
        description,
        isPrivate: isPrivate ?? true,
        autoInit: false,
      }, files);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to create project' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        repo: result.repo,
        files_committed: result.files_committed,
        message: `Created repository "${result.repo?.full_name}" with ${result.files_committed} files`,
      });
    }

    // Just create empty repository
    const repo = await createRepository(user.id, {
      name,
      description,
      isPrivate: isPrivate ?? true,
      autoInit: false,
    });

    if (!repo) {
      return NextResponse.json(
        { error: 'Failed to create repository' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      repo,
      message: `Created repository "${repo.full_name}"`,
    });
  } catch (error) {
    console.error('Create repo API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
