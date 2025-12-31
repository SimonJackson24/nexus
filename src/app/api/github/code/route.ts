import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase/admin';
import {
  listBranches,
  getBranch,
  createBranch,
  createOrUpdateFile,
  deleteFile,
  listWorkflowRuns,
} from '@/lib/github/extended-api';

// Helper to encode content to base64
function encodeContent(content: string): string {
  return Buffer.from(content).toString('base64');
}

// GET /api/github/code - List branches or get pending changes
// Query params: repo, branch, status (for pending changes)
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseService();
    
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
    const status = searchParams.get('status');

    // If status is provided, return pending changes instead
    if (status) {
      const { data: pendingChanges, error } = await supabase
        .from('github_pending_changes')
        .select(`
          *,
          repo:github_repos(repo_full_name)
        `)
        .eq('user_id', user.id)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch pending changes' }, { status: 500 });
      }

      return NextResponse.json({
        pending_changes: pendingChanges || [],
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
      const branchInfo = await getBranch(user.id, owner, repoName, branch);

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
    const branches = await listBranches(user.id, owner, repoName);

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
  try {
    const supabase = getSupabaseService();
    
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
    const { action, repo, branch, from_branch, path, content, message, sha, file_action } = body;

    if (!repo) {
      return NextResponse.json({ error: 'Repository is required' }, { status: 400 });
    }

    const [owner, repoName] = repo.split('/');

    // Create a new branch
    if (action === 'create_branch' && branch && from_branch) {
      // Get the SHA of the source branch
      const sourceBranch = await getBranch(user.id, owner, repoName, from_branch);
      if (!sourceBranch) {
        return NextResponse.json({ error: 'Source branch not found' }, { status: 404 });
      }

      const success = await createBranch(user.id, owner, repoName, branch, sourceBranch.commit.sha);

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
        const branchInfo = await getBranch(user.id, owner, repoName, branch || 'main');
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
          user.id,
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

      const result = await createOrUpdateFile(user.id, owner, repoName, path, {
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
      const sourceBranch = await getBranch(user.id, owner, repoName, from_branch);
      if (!sourceBranch) {
        return NextResponse.json({ error: 'Source branch not found' }, { status: 404 });
      }

      const branchCreated = await createBranch(user.id, owner, repoName, branch, sourceBranch.commit.sha);
      if (!branchCreated) {
        return NextResponse.json({ error: 'Failed to create branch' }, { status: 500 });
      }

      // Then create the file
      const fileResult = await createOrUpdateFile(user.id, owner, repoName, path, {
        message,
        content: encodeContent(content),
        branch,
      });

      if (!fileResult) {
        return NextResponse.json({ error: 'Failed to update file' }, { status: 500 });
      }

      // Store pending change for user approval
      const { data: pendingChange, error: insertError } = await supabase
        .from('github_pending_changes')
        .insert({
          user_id: user.id,
          connection_id: (
            await supabase
              .from('github_connections')
              .select('id')
              .eq('user_id', user.id)
              .single()
          ).data?.id || '',
          repo_id: (
            await supabase
              .from('github_repos')
              .select('id')
              .eq('repo_full_name', repo)
              .single()
          ).data?.id || '',
          branch_name: branch,
          file_path: path,
          action: 'update',
          original_sha: sha || sourceBranch.commit.sha,
          new_sha: fileResult.sha,
          change_summary: message,
          diff_content: `--- a/${path}\n+++ b/${path}\n${content}`,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error storing pending change:', insertError);
      }

      return NextResponse.json({
        success: true,
        branch_created: branch,
        file_updated: path,
        pending_approval: true,
        pending_id: pendingChange?.id,
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
  try {
    const supabase = getSupabaseService();
    
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
    const { action, pending_id, pr_title, pr_body, pr_head, pr_base } = body;

    if (!pending_id) {
      return NextResponse.json({ error: 'Pending change ID required' }, { status: 400 });
    }

    // Get the pending change
    const { data: pendingChange, error: fetchError } = await supabase
      .from('github_pending_changes')
      .select('*')
      .eq('id', pending_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !pendingChange) {
      return NextResponse.json({ error: 'Pending change not found' }, { status: 404 });
    }

    if (pendingChange.status !== 'pending') {
      return NextResponse.json({ error: 'Change already processed' }, { status: 400 });
    }

    // Approve and create PR
    if (action === 'approve') {
      // Update pending change status
      await supabase
        .from('github_pending_changes')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id,
        })
        .eq('id', pending_id);

      // Get repo info
      const { data: repo } = await supabase
        .from('github_repos')
        .select('repo_full_name')
        .eq('id', pendingChange.repo_id)
        .single();

      if (!repo) {
        return NextResponse.json({ error: 'Repo not found' }, { status: 404 });
      }

      const [owner, repoName] = repo.repo_full_name.split('/');

      // Create PR using the extended API
      const { createPR } = await import('@/lib/github/extended-api');
      const pr = await createPR(user.id, owner, repoName, {
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
      await supabase
        .from('github_pending_changes')
        .update({
          status: 'rejected',
          approved_at: new Date().toISOString(),
        })
        .eq('id', pending_id);

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


