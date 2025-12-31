// GitHub Extended API Service
// Phase 2: Issues, PRs, Comments
// Phase 3: Actions, Workflows

import { createClient } from '@supabase/supabase-js';
import { decryptApiKey } from '../billing/api-key-service';
import { getGitHubAccessToken } from './api-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const GITHUB_API = 'https://api.github.com';

// ============================================
// Helper to get access token
// ============================================

async function getAccessToken(userId: string): Promise<string | null> {
  return getGitHubAccessToken(userId);
}

// ============================================
// Issues API
// ============================================

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  labels: { name: string; color: string }[];
  assignees: { login: string; id: number }[];
  user: { login: string; id: number };
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  html_url: string;
}

export interface CreateIssueParams {
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
  milestone?: number;
}

export interface UpdateIssueParams {
  title?: string;
  body?: string;
  state?: 'open' | 'closed';
  labels?: string[];
  assignees?: string[];
}

// List issues in a repo
export async function listIssues(
  userId: string,
  owner: string,
  repo: string,
  options: {
    state?: 'open' | 'closed' | 'all';
    labels?: string;
    sort?: 'created' | 'updated' | 'comments';
    direction?: 'asc' | 'desc';
    perPage?: number;
    page?: number;
  } = {}
): Promise<GitHubIssue[]> {
  const accessToken = await getAccessToken(userId);
  if (!accessToken) throw new Error('Not authenticated');

  const { state = 'open', labels, sort = 'created', direction = 'desc', perPage = 30, page = 1 } = options;

  try {
    const params = new URLSearchParams({
      state,
      sort,
      direction,
      per_page: perPage.toString(),
      page: page.toString(),
      filter: 'all', // Include assigned issues
    });

    if (labels) params.append('labels', labels);

    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/issues?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Nexus-AI',
      },
    });

    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('List issues error:', error);
    return [];
  }
}

// Get a single issue
export async function getIssue(
  userId: string,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<GitHubIssue | null> {
  const accessToken = await getAccessToken(userId);
  if (!accessToken) throw new Error('Not authenticated');

  try {
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/issues/${issueNumber}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Nexus-AI',
      },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Get issue error:', error);
    return null;
  }
}

// Create an issue
export async function createIssue(
  userId: string,
  owner: string,
  repo: string,
  params: CreateIssueParams
): Promise<GitHubIssue | null> {
  const accessToken = await getAccessToken(userId);
  if (!accessToken) throw new Error('Not authenticated');

  try {
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Nexus-AI',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create issue');
    }

    return await response.json();
  } catch (error) {
    console.error('Create issue error:', error);
    return null;
  }
}

// Update an issue
export async function updateIssue(
  userId: string,
  owner: string,
  repo: string,
  issueNumber: number,
  params: UpdateIssueParams
): Promise<GitHubIssue | null> {
  const accessToken = await getAccessToken(userId);
  if (!accessToken) throw new Error('Not authenticated');

  try {
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/issues/${issueNumber}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Nexus-AI',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Update issue error:', error);
    return null;
  }
}

// ============================================
// Pull Requests API
// ============================================

export interface GitHubPR {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  draft: boolean;
  mergeable: boolean | null;
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  user: { login: string; id: number };
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  closed_at: string | null;
  html_url: string;
}

export interface CreatePRParams {
  title: string;
  body?: string;
  head: string;
  base: string;
  draft?: boolean;
}

// List pull requests
export async function listPRs(
  userId: string,
  owner: string,
  repo: string,
  options: {
    state?: 'open' | 'closed' | 'all';
    sort?: 'created' | 'updated' | 'popularity' | 'long-running';
    direction?: 'asc' | 'desc';
    perPage?: number;
    page?: number;
  } = {}
): Promise<GitHubPR[]> {
  const accessToken = await getAccessToken(userId);
  if (!accessToken) throw new Error('Not authenticated');

  const { state = 'open', sort = 'created', direction = 'desc', perPage = 30, page = 1 } = options;

  try {
    const params = new URLSearchParams({
      state,
      sort,
      direction,
      per_page: perPage.toString(),
      page: page.toString(),
    });

    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Nexus-AI',
      },
    });

    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('List PRs error:', error);
    return [];
  }
}

// Get a single PR
export async function getPR(
  userId: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<GitHubPR | null> {
  const accessToken = await getAccessToken(userId);
  if (!accessToken) throw new Error('Not authenticated');

  try {
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Nexus-AI',
      },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Get PR error:', error);
    return null;
  }
}

// Create a PR
export async function createPR(
  userId: string,
  owner: string,
  repo: string,
  params: CreatePRParams
): Promise<GitHubPR | null> {
  const accessToken = await getAccessToken(userId);
  if (!accessToken) throw new Error('Not authenticated');

  try {
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Nexus-AI',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create PR');
    }

    return await response.json();
  } catch (error) {
    console.error('Create PR error:', error);
    return null;
  }
}

// ============================================
// Comments API
// ============================================

export interface GitHubComment {
  id: number;
  body: string;
  user: { login: string; id: number };
  created_at: string;
  updated_at: string;
  html_url: string;
}

// List comments on an issue
export async function listIssueComments(
  userId: string,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<GitHubComment[]> {
  const accessToken = await getAccessToken(userId);
  if (!accessToken) throw new Error('Not authenticated');

  try {
    const response = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Nexus-AI',
        },
      }
    );

    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('List issue comments error:', error);
    return [];
  }
}

// List comments on a PR (review comments)
export async function listPRReviewComments(
  userId: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<GitHubComment[]> {
  const accessToken = await getAccessToken(userId);
  if (!accessToken) throw new Error('Not authenticated');

  try {
    const response = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}/comments`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Nexus-AI',
        },
      }
    );

    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('List PR comments error:', error);
    return [];
  }
}

// Create a comment on an issue
export async function createIssueComment(
  userId: string,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string
): Promise<GitHubComment | null> {
  const accessToken = await getAccessToken(userId);
  if (!accessToken) throw new Error('Not authenticated');

  try {
    const response = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Nexus-AI',
        },
        body: JSON.stringify({ body }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create comment');
    }

    return await response.json();
  } catch (error) {
    console.error('Create comment error:', error);
    return null;
  }
}

// Create a PR review comment
export async function createPRReviewComment(
  userId: string,
  owner: string,
  repo: string,
  prNumber: number,
  body: string,
  commitId: string,
  path: string,
  line: number
): Promise<GitHubComment | null> {
  const accessToken = await getAccessToken(userId);
  if (!accessToken) throw new Error('Not authenticated');

  try {
    const response = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}/comments`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Nexus-AI',
        },
        body: JSON.stringify({
          body,
          commit_id: commitId,
          path,
          line,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create PR comment');
    }

    return await response.json();
  } catch (error) {
    console.error('Create PR comment error:', error);
    return null;
  }
}

// ============================================
// GitHub Actions API
// ============================================

export interface GitHubWorkflow {
  id: number;
  name: string;
  path: string;
  state: 'active' | 'disabled_manually' | 'disabled_inactivity';
  created_at: string;
  updated_at: string;
}

export interface GitHubWorkflowRun {
  id: number;
  run_number: number;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: string | null; // for completed runs
  head_branch: string;
  event: string;
  actor: { login: string };
  created_at: string;
  updated_at: string;
  run_started_at: string;
  run_completed_at: string | null;
  html_url: string;
}

export interface WorkflowDispatchParams {
  ref?: string;
  inputs?: Record<string, string>;
}

// List workflows
export async function listWorkflows(
  userId: string,
  owner: string,
  repo: string
): Promise<GitHubWorkflow[]> {
  const accessToken = await getAccessToken(userId);
  if (!accessToken) throw new Error('Not authenticated');

  try {
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/actions/workflows`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Nexus-AI',
      },
    });

    if (!response.ok) return [];
    const data = await response.json();
    return data.workflows || [];
  } catch (error) {
    console.error('List workflows error:', error);
    return [];
  }
}

// Get workflow runs
export async function listWorkflowRuns(
  userId: string,
  owner: string,
  repo: string,
  options: {
    workflowId?: number;
    branch?: string;
    status?: string;
    perPage?: number;
    page?: number;
  } = {}
): Promise<GitHubWorkflowRun[]> {
  const accessToken = await getAccessToken(userId);
  if (!accessToken) throw new Error('Not authenticated');

  const { workflowId, branch, status, perPage = 30, page = 1 } = options;

  try {
    let endpoint = workflowId
      ? `${GITHUB_API}/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs`
      : `${GITHUB_API}/repos/${owner}/${repo}/actions/runs`;

    const params = new URLSearchParams({
      per_page: perPage.toString(),
      page: page.toString(),
    });

    if (branch) params.append('branch', branch);
    if (status) params.append('status', status);

    const response = await fetch(`${endpoint}?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Nexus-AI',
      },
    });

    if (!response.ok) return [];
    const data = await response.json();
    return data.workflow_runs || [];
  } catch (error) {
    console.error('List workflow runs error:', error);
    return [];
  }
}

// Trigger workflow dispatch
export async function triggerWorkflow(
  userId: string,
  owner: string,
  repo: string,
  workflowId: number,
  ref: string = 'main',
  inputs?: Record<string, string>
): Promise<boolean> {
  const accessToken = await getAccessToken(userId);
  if (!accessToken) throw new Error('Not authenticated');

  try {
    const response = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Nexus-AI',
        },
        body: JSON.stringify({
          ref,
          inputs: inputs || {},
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Trigger workflow error:', error);
    return false;
  }
}

// Cancel a workflow run
export async function cancelWorkflowRun(
  userId: string,
  owner: string,
  repo: string,
  runId: number
): Promise<boolean> {
  const accessToken = await getAccessToken(userId);
  if (!accessToken) throw new Error('Not authenticated');

  try {
    const response = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/actions/runs/${runId}/cancel`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Nexus-AI',
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Cancel workflow error:', error);
    return false;
  }
}

// Rerun a workflow
export async function rerunWorkflow(
  userId: string,
  owner: string,
  repo: string,
  runId: number
): Promise<boolean> {
  const accessToken = await getAccessToken(userId);
  if (!accessToken) throw new Error('Not authenticated');

  try {
    const response = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/actions/runs/${runId}/rerun`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Nexus-AI',
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Rerun workflow error:', error);
    return false;
  }
}

// ============================================
// Branches API (Phase 4)
// ============================================

export interface GitHubBranch {
  name: string;
  commit: { sha: string; url: string };
  protected: boolean;
}

// List branches
export async function listBranches(
  userId: string,
  owner: string,
  repo: string
): Promise<GitHubBranch[]> {
  const accessToken = await getAccessToken(userId);
  if (!accessToken) throw new Error('Not authenticated');

  try {
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/branches`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Nexus-AI',
      },
    });

    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('List branches error:', error);
    return [];
  }
}

// Get a branch
export async function getBranch(
  userId: string,
  owner: string,
  repo: string,
  branch: string
): Promise<GitHubBranch | null> {
  const accessToken = await getAccessToken(userId);
  if (!accessToken) throw new Error('Not authenticated');

  try {
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/branches/${branch}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Nexus-AI',
      },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Get branch error:', error);
    return null;
  }
}

// ============================================
// File Operations (Phase 4)
// ============================================

export interface CreateUpdateFileParams {
  message: string;
  content: string; // Base64 encoded
  sha?: string; // Required for updates
  branch?: string;
}

// Create or update a file
export async function createOrUpdateFile(
  userId: string,
  owner: string,
  repo: string,
  path: string,
  params: CreateUpdateFileParams
): Promise<{ sha: string; content: { path: string; sha: string } } | null> {
  const accessToken = await getAccessToken(userId);
  if (!accessToken) throw new Error('Not authenticated');

  try {
    const response = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Nexus-AI',
        },
        body: JSON.stringify(params),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create/update file');
    }

    return await response.json();
  } catch (error) {
    console.error('Create/update file error:', error);
    return null;
  }
}

// Delete a file
export async function deleteFile(
  userId: string,
  owner: string,
  repo: string,
  path: string,
  sha: string,
  message: string,
  branch?: string
): Promise<boolean> {
  const accessToken = await getAccessToken(userId);
  if (!accessToken) throw new Error('Not authenticated');

  try {
    const params: Record<string, string> = {
      message,
      sha,
    };

    if (branch) params.branch = branch;

    const response = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Nexus-AI',
        },
        body: JSON.stringify(params),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Delete file error:', error);
    return false;
  }
}

// Create a ref (branch or tag)
export async function createBranch(
  userId: string,
  owner: string,
  repo: string,
  branchName: string,
  fromSha: string
): Promise<boolean> {
  const accessToken = await getAccessToken(userId);
  if (!accessToken) throw new Error('Not authenticated');

  try {
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Nexus-AI',
      },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: fromSha,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Create branch error:', error);
    return false;
  }
}
