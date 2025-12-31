// POST /api/github/repos/files - Add/Update files in an existing repository
import { NextRequest, NextResponse } from 'next/server';
import { addFile } from '@/lib/github/create-repo';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const result = await addFile(user.id, owner, repo, {
      path,
      content,
      message,
    }, branch || 'main');

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to add file' },
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
