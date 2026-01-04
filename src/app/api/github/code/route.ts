import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import {
  listBranches,
  getBranch,
  createBranch,
  createOrUpdateFile,
  deleteFile,
  createPR,
} from '@/lib/github/extended-api';
import { query } from '@/lib/db';

// Helper to encode content to base64
function encodeContent(content: string): string {
  return Buffer.from(content).toString('base64');
}

// GET /api/github/code - List branches or get pending changes
// Query params: repo, branch, status (for pending changes)
export async function GET(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    // If status is provided, return pending changes instead
    if (status) {
      const result = await query(
        `SELECT gpc.*, gr.repo_full_name 
         FROM github_pending_changes gpc
         LEFT JOIN github_repos gr ON gpc.repo_id = gr.id
         WHERE gpc.user_id = $1
         ORDER BY gpc.created_at DESC`,
        [userId]
      );

      return NextResponse.json({
        pending_changes: result.rows,
      });
    }

    const repo = searchParams.get('repo');
    const branch = searchParams.get('branch');

    if (!repo) {
      return NextResponse.json({ error: 'Repository is required' }, { status: 400 });
    }

    const [owner, repoName] = repo.split('/');

    // Get specific branch
    if (branch) {
      const branchInfo = await getBranch(userId!, owner, repoName, branch);

      if (!branchInfo) {
        return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
      }

      return NextResponse.json({
        repo,
        branch: {
          name: branchInfo.name,
          sha: branchInfo.commit.sha,
          protected: branchInfo.protected,
        },
      });
    }

    // List all branches
    const branches = await listBranches(userId!, owner, repoName);

    return NextResponse.json({
      repo,
      branches: branches.map((b) => ({
        name: b.name,
        sha: b.commit.sha,
        protected: b.protected,
      })),
    });
  } catch (error) {
    console.error('List branches error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/github/code - Create branch, update files, create PR
export async function POST(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    const body = await request.json();
    const { action, repo, branch, from_branch, path, content, message, sha, file_action } = body;

    if (!repo) {
      return NextResponse.json({ error: 'Repository is required' }, { status: 400 });
    }

    const [owner, repoName] = repo.split('/');

    // Create a new branch
    if (action === 'create_branch' && branch && from_branch) {
      // Get the SHA of the source branch
      const sourceBranch = await getBranch(userId!, owner, repoName, from_branch);
      if (!sourceBranch) {
        return NextResponse.json({ error: 'Source branch not found' }, { status: 404 });
      }

      const success = await createBranch(userId!, owner, repoName, branch, sourceBranch.commit.sha);

      if (!success) {
        return NextResponse.json({ error: 'Failed to create branch' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        branch: {
          name: branch,
          from_branch: from_branch,
          sha: sourceBranch.commit.sha,
        },
      });
    }

    // Create or update a file
    if (action === 'update_file' && path && content && message) {
      // Get current file SHA if updating
      let currentSha: string | undefined;
      if (file_action === 'update' || file_action === 'delete') {
        const branchInfo = await getBranch(userId!, owner, repoName, branch || 'main');
        if (!branchInfo) {
          return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
        }

        // We need the file SHA - for simplicity, require it
        if (!sha) {
          return NextResponse.json(
            { error: 'SHA is required for file updates' },
            { status: 400 }
          );
        }
        currentSha = sha;
      }

      if (file_action === 'delete') {
        const success = await deleteFile(
          userId!,
          owner,
          repoName,
          path,
          sha!,
          message,
          branch
        );

        if (!success) {
          return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          action: 'deleted',
          path,
        });
      }

      const result = await createOrUpdateFile(userId!, owner, repoName, path, {
        message,
        content: encodeContent(content),
        sha: currentSha,
        branch,
      });

      if (!result) {
        return NextResponse.json({ error: 'Failed to update file' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        action: file_action === 'create' ? 'created' : 'updated',
        path,
        sha: result.sha,
        branch,
      });
    }

    // Create a branch and update files in one transaction (AI workflow)
    if (action === 'suggest_changes' && branch && from_branch && path && content && message) {
      // First create the branch
      const sourceBranch = await getBranch(userId!, owner, repoName, from_branch);
      if (!sourceBranch) {
        return NextResponse.json({ error: 'Source branch not found' }, { status: 404 });
      }

      const branchCreated = await createBranch(userId!, owner, repoName, branch, sourceBranch.commit.sha);
      if (!branchCreated) {
        return NextResponse.json({ error: 'Failed to create branch' }, { status: 500 });
      }

      // Then create the file
      const fileResult = await createOrUpdateFile(userId!, owner, repoName, path, {
        message,
        content: encodeContent(content),
        branch,
      });

      if (!fileResult) {
        return NextResponse.json({ error: 'Failed to update file' }, { status: 500 });
      }

      // Get connection and repo IDs
      const connectionResult = await query(
        'SELECT id FROM github_connections WHERE user_id = $1 LIMIT 1',
        [userId]
      );

      const repoResult = await query(
        'SELECT id FROM github_repos WHERE repo_full_name = $1 LIMIT 1',
        [repo]
      );

      // Store pending change for user approval
      const pendingResult = await query(
        `INSERT INTO github_pending_changes 
         (user_id, connection_id, repo_id, branch_name, file_path, action, original_sha, new_sha, 
          change_summary, diff_content, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
         RETURNING *`,
        [
          userId,
          connectionResult.rows[0]?.id || null,
          repoResult.rows[0]?.id || null,
          branch,
          path,
          'update',
          sha || sourceBranch.commit.sha,
          fileResult.sha,
          message,
          `--- a/${path}\n+++ b/${path}\n${content}`,
        ]
      );

      const pendingChange = pendingResult.rows[0];

      return NextResponse.json({
        success: true,
        branch_created: branch,
        file_updated: path,
        pending_approval: true,
        pending_id: pendingChange.id,
        message: 'Changes created in new branch. Create a PR to merge when ready.',
        pr_template: {
          title: `AI: ${message}`,
          body: `AI-generated changes to ${path}`,
          head: branch,
          base: from_branch,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Code POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/github/code - Approve or reject pending changes
export async function PATCH(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    const body = await request.json();
    const { action, pending_id, pr_title, pr_body, pr_head, pr_base } = body;

    if (!pending_id) {
      return NextResponse.json({ error: 'Pending change ID required' }, { status: 400 });
    }

    // Get the pending change
    const pendingChangeResult = await query(
      'SELECT * FROM github_pending_changes WHERE id = $1',
      [pending_id]
    );

    const pendingChange = pendingChangeResult.rows[0];

    if (!pendingChange || pendingChange.user_id !== userId) {
      return NextResponse.json({ error: 'Pending change not found' }, { status: 404 });
    }

    if (pendingChange.status !== 'pending') {
      return NextResponse.json({ error: 'Change already processed' }, { status: 400 });
    }

    // Approve and create PR
    if (action === 'approve') {
      // Update pending change status
      await query(
        `UPDATE github_pending_changes 
         SET status = 'approved', approved_at = $1, approved_by = $2
         WHERE id = $3`,
        [new Date().toISOString(), userId, pending_id]
      );

      // Get repo info
      const repoResult = await query(
        'SELECT repo_full_name FROM github_repos WHERE id = $1',
        [pendingChange.repo_id]
      );

      const repo = repoResult.rows[0];

      if (!repo) {
        return NextResponse.json({ error: 'Repo not found' }, { status: 404 });
      }

      const [owner, repoName] = repo.repo_full_name.split('/');

      // Create PR
      const pr = await createPR(userId!, owner, repoName, {
        title: pr_title || `AI: ${pendingChange.change_summary}`,
        body: pr_body || `AI-generated changes.\n\n${pendingChange.change_summary}`,
        head: pr_head || pendingChange.branch_name,
        base: pr_base || 'main',
      });

      if (!pr) {
        return NextResponse.json({ error: 'Failed to create PR' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        pr: {
          number: pr.number,
          title: pr.title,
          html_url: pr.html_url,
        },
      });
    }

    // Reject
    if (action === 'reject') {
      await query(
        `UPDATE github_pending_changes 
         SET status = 'rejected', approved_at = $1
         WHERE id = $2`,
        [new Date().toISOString(), pending_id]
      );

      return NextResponse.json({
        success: true,
        message: 'Changes rejected',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Code PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
