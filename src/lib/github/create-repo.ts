// GitHub Repository Creation Service
// Phase 5: Create new repos and push files

import { createClient } from '@supabase/supabase-js';
import { getGitHubAccessToken } from './api-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const GITHUB_API = 'https://api.github.com';

// ============================================
// Types
// ============================================

export interface CreateRepoParams {
  name: string;
  description?: string;
  isPrivate?: boolean;
  autoInit?: boolean;
  gitignoreTemplate?: string;
  licenseTemplate?: string;
}

export interface CreatedRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  clone_url: string;
  default_branch: string;
}

export interface CommitFileParams {
  path: string;
  content: string; // Plain text, will be base64 encoded
  message: string;
}

export interface InitProjectResult {
  success: boolean;
  repo?: CreatedRepo;
  files_committed: number;
  error?: string;
}

// ============================================
// Create Repository
// ============================================

export async function createRepository(
  userId: string,
  params: CreateRepoParams
): Promise<CreatedRepo | null> {
  const accessToken = await getGitHubAccessToken(userId);
  if (!accessToken) throw new Error('Not authenticated with GitHub');

  try {
    const response = await fetch(`${GITHUB_API}/user/repos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Nexus-AI',
      },
      body: JSON.stringify({
        name: params.name,
        description: params.description || '',
        private: params.isPrivate ?? true,
        auto_init: params.autoInit ?? false,
        gitignore_template: params.gitignoreTemplate || null,
        license_template: params.licenseTemplate || null,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create repository');
    }

    const repo = await response.json();

    // Store repo in our database
    await storeCreatedRepo(userId, repo);

    return {
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      html_url: repo.html_url,
      clone_url: repo.clone_url,
      default_branch: repo.default_branch,
    };
  } catch (error) {
    console.error('Create repo error:', error);
    return null;
  }
}

// ============================================
// Store created repo in database
// ============================================

async function storeCreatedRepo(userId: string, githubRepo: any) {
  try {
    // Get the user's GitHub connection
    const { data: connection } = await supabase
      .from('github_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (!connection) return;

    // Insert into github_repos
    await supabase.from('github_repos').upsert(
      {
        connection_id: connection.id,
        repo_id: githubRepo.id,
        repo_name: githubRepo.name,
        repo_full_name: githubRepo.full_name,
        repo_description: githubRepo.description,
        repo_url: githubRepo.html_url,
        default_branch: githubRepo.default_branch,
        is_private: githubRepo.private,
        language: githubRepo.language,
        last_synced_at: new Date().toISOString(),
      },
      {
        onConflict: 'connection_id, repo_id',
        ignoreDuplicates: false,
      }
    );
  } catch (error) {
    console.error('Error storing created repo:', error);
  }
}

// ============================================
// Initial Commit - Create files in new repo
// ============================================

export async function commitInitialFiles(
  userId: string,
  owner: string,
  repo: string,
  files: CommitFileParams[],
  branch: string = 'main'
): Promise<{ success: boolean; files_committed: number; error?: string }> {
  const accessToken = await getGitHubAccessToken(userId);
  if (!accessToken) {
    return { success: false, files_committed: 0, error: 'Not authenticated' };
  }

  let filesCommitted = 0;

  try {
    // First, we need to create the initial branch
    // For a new repo, we need to get the default branch's SHA
    
    // Get the repository to find default branch
    const repoResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Nexus-AI',
      },
    });

    if (!repoResponse.ok) {
      return { success: false, files_committed: 0, error: 'Repository not found' };
    }

    const repoData = await repoResponse.json();
    const defaultBranch = branch || repoData.default_branch;

    // Get the SHA of the current default branch (empty repo has no commits yet)
    // We need to create the first commit with all files

    // Create a combined tree with all files
    interface TreeItem {
      path: string;
      mode: string;
      type: string;
      sha?: string;
    }
    const blobs: TreeItem[] = [];

    for (const file of files) {
      const base64Content = Buffer.from(file.content).toString('base64');

      // Create blob for each file
      const blobResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/blobs`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Nexus-AI',
        },
        body: JSON.stringify({
          content: base64Content,
          encoding: 'base64',
        }),
      });

      if (blobResponse.ok) {
        const blob = await blobResponse.json();
        blobs.push({
          path: file.path,
          mode: '100644',
          type: 'blob',
          sha: blob.sha,
        });
      }
    }

    if (blobs.length === 0) {
      return { success: false, files_committed: 0, error: 'Failed to create any files' };
    }

    // Create tree
    const treeResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Nexus-AI',
      },
      body: JSON.stringify({
        tree: blobs,
        base_tree: undefined, // No parent for first commit
      }),
    });

    if (!treeResponse.ok) {
      return { success: false, files_committed: 0, error: 'Failed to create tree' };
    }

    const tree = await treeResponse.json();

    // Create commit
    const commitMessage = files.length === 1 
      ? files[0].message 
      : `Initial commit: ${files.length} files generated by Nexus AI`;

    const commitResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Nexus-AI',
      },
      body: JSON.stringify({
        message: commitMessage,
        tree: tree.sha,
        parents: [], // No parents for first commit
      }),
    });

    if (!commitResponse.ok) {
      return { success: false, files_committed: 0, error: 'Failed to create commit' };
    }

    const commit = await commitResponse.json();

    // Update reference to point to new commit
    const refResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/refs/heads/${defaultBranch}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Nexus-AI',
      },
      body: JSON.stringify({
        sha: commit.sha,
        force: true,
      }),
    });

    if (!refResponse.ok) {
      // Try creating the ref if it doesn't exist
      const createRefResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/refs`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Nexus-AI',
        },
        body: JSON.stringify({
          ref: `refs/heads/${defaultBranch}`,
          sha: commit.sha,
        }),
      });

      if (!createRefResponse.ok) {
        return { success: false, files_committed: blobs.length, error: 'Failed to update branch' };
      }
    }

    filesCommitted = blobs.length;

    return { success: true, files_committed: filesCommitted };
  } catch (error) {
    console.error('Commit files error:', error);
    return { success: false, files_committed: filesCommitted, error: String(error) };
  }
}

// ============================================
// Add single file to existing repo
// ============================================

export async function addFile(
  userId: string,
  owner: string,
  repo: string,
  file: CommitFileParams,
  branch: string = 'main'
): Promise<{ success: boolean; sha?: string; error?: string }> {
  const accessToken = await getGitHubAccessToken(userId);
  if (!accessToken) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Get current branch SHA
    const refResponse = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/git/refs/heads/${branch}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Nexus-AI',
        },
      }
    );

    if (!refResponse.ok) {
      return { success: false, error: 'Branch not found' };
    }

    const refData = await refResponse.json();
    const parentSha = refData.object.sha;

    // Create blob
    const base64Content = Buffer.from(file.content).toString('base64');
    const blobResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/blobs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Nexus-AI',
      },
      body: JSON.stringify({
        content: base64Content,
        encoding: 'base64',
      }),
    });

    if (!blobResponse.ok) {
      return { success: false, error: 'Failed to create blob' };
    }

    const blob = await blobResponse.json();

    // Create tree with new file
    const treeResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Nexus-AI',
      },
      body: JSON.stringify({
        tree: [
          {
            path: file.path,
            mode: '100644',
            type: 'blob',
            sha: blob.sha,
          },
        ],
        base_tree: parentSha,
      }),
    });

    if (!treeResponse.ok) {
      return { success: false, error: 'Failed to create tree' };
    }

    const tree = await treeResponse.json();

    // Create commit
    const commitResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Nexus-AI',
      },
      body: JSON.stringify({
        message: file.message,
        tree: tree.sha,
        parents: [parentSha],
      }),
    });

    if (!commitResponse.ok) {
      return { success: false, error: 'Failed to create commit' };
    }

    const commit = await commitResponse.json();

    // Update reference
    await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Nexus-AI',
      },
      body: JSON.stringify({
        sha: commit.sha,
      }),
    });

    return { success: true, sha: blob.sha };
  } catch (error) {
    console.error('Add file error:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================
// Complete project initialization
// ============================================

export async function initNewProject(
  userId: string,
  repoParams: CreateRepoParams,
  files: CommitFileParams[]
): Promise<InitProjectResult> {
  // Step 1: Create the repository
  const repo = await createRepository(userId, {
    ...repoParams,
    autoInit: false, // We'll create our own initial commit
  });

  if (!repo) {
    return { success: false, files_committed: 0, error: 'Failed to create repository' };
  }

  // Step 2: Commit all files
  const result = await commitInitialFiles(
    userId,
    repo.full_name.split('/')[0],
    repo.full_name.split('/')[1],
    files
  );

  if (!result.success) {
    return {
      success: false,
      files_committed: result.files_committed,
      error: result.error || 'Failed to commit files',
    };
  }

  return {
    success: true,
    repo,
    files_committed: result.files_committed,
  };
}
