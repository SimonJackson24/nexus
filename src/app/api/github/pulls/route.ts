import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import {
  listPRs,
  getPR,
  createPR,
  listPRReviewComments,
  createPRReviewComment,
} from '@/lib/github/extended-api';

// GET /api/github/pulls - List pull requests
export async function GET(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    const searchParams = request.nextUrl.searchParams;
    const repo = searchParams.get('repo');
    const state = (searchParams.get('state') || 'open') as 'open' | 'closed' | 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '30');

    if (!repo) {
      return NextResponse.json({ error: 'Repository is required' }, { status: 400 });
    }

    const [owner, repoName] = repo.split('/');

    const prs = await listPRs(userId!, owner, repoName, {
      state,
      page,
      perPage,
    });

    return NextResponse.json({
      repo,
      state,
      page,
      pull_requests: prs.map((pr) => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        body: pr.body,
        state: pr.state,
        draft: pr.draft,
        mergeable: pr.mergeable,
        head_branch: pr.head.ref,
        base_branch: pr.base.ref,
        created_by: pr.user.login,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        merged_at: pr.merged_at,
        closed_at: pr.closed_at,
        html_url: pr.html_url,
      })),
    });
  } catch (error) {
    console.error('List PRs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/github/pulls - Create PR or interact
export async function POST(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    const body = await request.json();
    const { action, repo, pr_number, title, body: prBody, head, base, draft, comment } = body;

    if (!repo) {
      return NextResponse.json({ error: 'Repository is required' }, { status: 400 });
    }

    const [owner, repoName] = repo.split('/');

    // Create a new PR
    if (action === 'create' && title && head && base) {
      const pr = await createPR(userId!, owner, repoName, {
        title,
        body: prBody,
        head,
        base,
        draft,
      });

      if (!pr) {
        return NextResponse.json({ error: 'Failed to create PR' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        pull_request: {
          id: pr.id,
          number: pr.number,
          title: pr.title,
          html_url: pr.html_url,
        },
      });
    }

    // Get single PR
    if (pr_number) {
      const pr = await getPR(userId!, owner, repoName, pr_number);

      if (!pr) {
        return NextResponse.json({ error: 'PR not found' }, { status: 404 });
      }

      return NextResponse.json({
        pull_request: {
          id: pr.id,
          number: pr.number,
          title: pr.title,
          body: pr.body,
          state: pr.state,
          draft: pr.draft,
          mergeable: pr.mergeable,
          head_branch: pr.head.ref,
          head_sha: pr.head.sha,
          base_branch: pr.base.ref,
          base_sha: pr.base.sha,
          created_by: pr.user.login,
          created_at: pr.created_at,
          updated_at: pr.updated_at,
          merged_at: pr.merged_at,
          closed_at: pr.closed_at,
          html_url: pr.html_url,
        },
      });
    }

    // List PR review comments
    if (action === 'list_comments' && pr_number) {
      const comments = await listPRReviewComments(userId!, owner, repoName, pr_number);

      return NextResponse.json({
        pr_number,
        comments: comments.map((c) => ({
          id: c.id,
          body: c.body,
          created_by: c.user.login,
          created_at: c.created_at,
          html_url: c.html_url,
        })),
      });
    }

    // Add PR review comment
    if (action === 'comment' && pr_number && comment) {
      // For review comments, we need commit_id, path, and line
      const { commit_id, path, line } = body;
      if (!commit_id || !path || !line) {
        return NextResponse.json(
          { error: 'commit_id, path, and line are required for PR comments' },
          { status: 400 }
        );
      }

      const newComment = await createPRReviewComment(
        userId!,
        owner,
        repoName,
        pr_number,
        comment,
        commit_id,
        path,
        line
      );

      if (!newComment) {
        return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        comment: {
          id: newComment.id,
          body: newComment.body,
          created_at: newComment.created_at,
          html_url: newComment.html_url,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('PRs POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
