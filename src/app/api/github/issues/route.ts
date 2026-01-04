import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import {
  listIssues,
  getIssue,
  createIssue,
  updateIssue,
  listIssueComments,
  createIssueComment,
} from '@/lib/github/extended-api';

// GET /api/github/issues - List issues
export async function GET(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    const searchParams = request.nextUrl.searchParams;
    const repo = searchParams.get('repo'); // owner/repo format
    const state = (searchParams.get('state') || 'open') as 'open' | 'closed' | 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '30');

    if (!repo) {
      return NextResponse.json({ error: 'Repository is required' }, { status: 400 });
    }

    const [owner, repoName] = repo.split('/');

    const issues = await listIssues(userId!, owner, repoName, {
      state,
      page,
      perPage,
    });

    return NextResponse.json({
      repo,
      state,
      page,
      issues: issues.map((issue) => ({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        body: issue.body,
        state: issue.state,
        labels: issue.labels.map((l) => l.name),
        assignees: issue.assignees.map((a) => a.login),
        created_by: issue.user.login,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        html_url: issue.html_url,
      })),
    });
  } catch (error) {
    console.error('List issues error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/github/issues - Create or interact with issue
export async function POST(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    const body = await request.json();
    const { action, repo, issue_number, title, body: issueBody, state, labels, comment } = body;

    if (!repo) {
      return NextResponse.json({ error: 'Repository is required' }, { status: 400 });
    }

    const [owner, repoName] = repo.split('/');

    // Create a new issue
    if (action === 'create' && title) {
      const issue = await createIssue(userId!, owner, repoName, {
        title,
        body: issueBody,
        labels,
      });

      if (!issue) {
        return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        issue: {
          id: issue.id,
          number: issue.number,
          title: issue.title,
          html_url: issue.html_url,
        },
      });
    }

    // Update issue state or properties
    if (action === 'update' && issue_number) {
      const updateParams: any = {};
      if (state) updateParams.state = state;
      if (title) updateParams.title = title;
      if (issueBody !== undefined) updateParams.body = issueBody;
      if (labels) updateParams.labels = labels;

      const issue = await updateIssue(userId!, owner, repoName, issue_number, updateParams);

      if (!issue) {
        return NextResponse.json({ error: 'Failed to update issue' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        issue: {
          number: issue.number,
          state: issue.state,
          title: issue.title,
        },
      });
    }

    // Add comment to issue
    if (action === 'comment' && issue_number && comment) {
      const newComment = await createIssueComment(userId!, owner, repoName, issue_number, comment);

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

    // List comments on issue
    if (action === 'list_comments' && issue_number) {
      const comments = await listIssueComments(userId!, owner, repoName, issue_number);

      return NextResponse.json({
        issue_number,
        comments: comments.map((c) => ({
          id: c.id,
          body: c.body,
          created_by: c.user.login,
          created_at: c.created_at,
          html_url: c.html_url,
        })),
      });
    }

    // Get single issue
    if (issue_number) {
      const issue = await getIssue(userId!, owner, repoName, issue_number);

      if (!issue) {
        return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
      }

      return NextResponse.json({
        issue: {
          id: issue.id,
          number: issue.number,
          title: issue.title,
          body: issue.body,
          state: issue.state,
          labels: issue.labels.map((l) => l.name),
          created_by: issue.user.login,
          created_at: issue.created_at,
          updated_at: issue.updated_at,
          closed_at: issue.closed_at,
          html_url: issue.html_url,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Issues POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
