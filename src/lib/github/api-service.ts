// GitHub API Service
// Handles all interactions with GitHub API

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { decryptApiKey } from '../billing/api-key-service';
import {
  GitHubUser,
  GitHubRepository,
  GitHubTreeItem,
  GitHubBlobResponse,
  GitHubTreeResponse,
  decodeGitHubContent,
  isCodeFile,
  getLanguageFromExtension,
} from './types';

// GitHub API base URL
const GITHUB_API = 'https://api.github.com';
const GITHUB_RAW = 'https://raw.githubusercontent.com';

// ============================================
// Token Management
// ============================================

// Get decrypted access token for a user
export async function getGitHubAccessToken(userId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin() as any;
  const { data: connection, error } = await supabase
    .from('github_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .is('token_expires_at', null)
    .or('token_expires_at.is_null,token_expires_at.gt.now()')
    .single();

  if (error || !connection) {
    return null;
  }

  try {
    return decryptApiKey(connection.access_token);
  } catch {
    return null;
  }
}

// ============================================
// User Operations
// ============================================

// Get authenticated user info
export async function getGitHubUser(accessToken: string): Promise<GitHubUser | null> {
  try {
    const response = await fetch(`${GITHUB_API}/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Nexus-AI',
      },
    });

    if (!response.ok) {
      console.error('GitHub user fetch failed:', response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('GitHub user fetch error:', error);
    return null;
  }
}

// ============================================
// Repository Operations
// ============================================

// List user repositories
export async function listUserRepos(
  accessToken: string,
  options: {
    sort?: 'updated' | 'pushed' | 'full_name' | 'created';
    direction?: 'asc' | 'desc';
    perPage?: number;
    page?: number;
    type?: 'all' | 'owner' | 'member' | 'public' | 'private';
  } = {}
): Promise<GitHubRepository[]> {
  const { sort = 'updated', direction = 'desc', perPage = 100, page = 1, type = 'all' } = options;

  try {
    const params = new URLSearchParams({
      sort,
      direction,
      per_page: perPage.toString(),
      page: page.toString(),
      type,
    });

    const response = await fetch(`${GITHUB_API}/user/repos?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Nexus-AI',
      },
    });

    if (!response.ok) {
      console.error('GitHub repos fetch failed:', response.statusText);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error('GitHub repos fetch error:', error);
    return [];
  }
}

// Get a specific repository
export async function getRepo(
  accessToken: string,
  owner: string,
  repo: string
): Promise<GitHubRepository | null> {
  try {
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Nexus-AI',
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('GitHub repo fetch error:', error);
    return null;
  }
}

// ============================================
// File Operations
// ============================================

// Get repository tree (recursive)
export async function getRepoTree(
  accessToken: string,
  owner: string,
  repo: string,
  sha: string,
  recursive: boolean = true
): Promise<GitHubTreeItem[]> {
  try {
    const params = new URLSearchParams({
      recursive: recursive.toString(),
    });

    const response = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${sha}?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Nexus-AI',
        },
      }
    );

    if (!response.ok) {
      console.error('GitHub tree fetch failed:', response.statusText);
      return [];
    }

    const data: GitHubTreeResponse = await response.json();
    return data.tree || [];
  } catch (error) {
    console.error('GitHub tree fetch error:', error);
    return [];
  }
}

// Get file content (blob)
export async function getFileContent(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  sha: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/git/blobs/${sha}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Nexus-AI',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data: GitHubBlobResponse = await response.json();
    return decodeGitHubContent(data.content);
  } catch (error) {
    console.error('GitHub blob fetch error:', error);
    return null;
  }
}

// Get raw file content
export async function getRawFile(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  branch: string = 'main'
): Promise<string | null> {
  try {
    const response = await fetch(
      `${GITHUB_RAW}/${owner}/${repo}/${branch}/${path}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'Nexus-AI',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch (error) {
    console.error('GitHub raw file fetch error:', error);
    return null;
  }
}

// ============================================
// Search Operations
// ============================================

// Search code in repositories
export async function searchCode(
  accessToken: string,
  query: string,
  options: {
    repo?: string;
    user?: string;
    language?: string;
    perPage?: number;
    page?: number;
  } = {}
): Promise<{ items: any[]; totalCount: number }> {
  const { repo, user, language, perPage = 30, page = 1 } = options;

  try {
    let searchQuery = query;

    if (repo) searchQuery += ` repo:${repo}`;
    if (user) searchQuery += ` user:${user}`;
    if (language) searchQuery += ` language:${language}`;

    const params = new URLSearchParams({
      q: searchQuery,
      per_page: perPage.toString(),
      page: page.toString(),
      sort: 'indexed',
      order: 'desc',
    });

    const response = await fetch(`${GITHUB_API}/search/code?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Nexus-AI',
      },
    });

    if (!response.ok) {
      console.error('GitHub search failed:', response.statusText);
      return { items: [], totalCount: 0 };
    }

    const data = await response.json();
    return {
      items: data.items || [],
      totalCount: data.total_count || 0,
    };
  } catch (error) {
    console.error('GitHub search error:', error);
    return { items: [], totalCount: 0 };
  }
}

// ============================================
// Sync Operations
// ============================================

// Sync user repositories to database
export async function syncUserRepos(userId: string, connectionId: string): Promise<number> {
  const supabase = getSupabaseAdmin() as any;
  const accessToken = await getGitHubAccessToken(userId);
  if (!accessToken) {
    throw new Error('No valid GitHub access token');
  }

  const repos = await listUserRepos(accessToken, { type: 'all', perPage: 100 });

  let syncedCount = 0;

  for (const repo of repos) {
    const { error } = await supabase.from('github_repos').upsert(
      {
        connection_id: connectionId,
        repo_id: repo.id,
        repo_name: repo.name,
        repo_full_name: repo.full_name,
        repo_description: repo.description,
        repo_url: repo.html_url,
        default_branch: repo.default_branch,
        is_private: repo.private,
        language: repo.language,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'connection_id, repo_id' }
    );

    if (!error) {
      syncedCount++;
    }
  }

  return syncedCount;
}

// Get file tree for a repo (from cache or fetch)
export async function getRepoFileTree(
  userId: string,
  repoFullName: string
): Promise<{ path: string; type: 'file' | 'dir'; size?: number }[]> {
  const accessToken = await getGitHubAccessToken(userId);
  if (!accessToken) {
    throw new Error('No valid GitHub access token');
  }

  const [owner, repo] = repoFullName.split('/');

  // Get repo default branch
  const repoData = await getRepo(accessToken, owner, repo);
  if (!repoData) {
    throw new Error('Repository not found');
  }

  // Get tree
  const tree = await getRepoTree(accessToken, owner, repo, repoData.default_branch, true);

  return tree.map((item) => ({
    path: item.path,
    type: item.type as 'file' | 'dir',
    size: item.size,
  }));
}

// Read file content with context
export async function readRepoFile(
  userId: string,
  repoFullName: string,
  filePath: string
): Promise<{ content: string; language: string | null } | null> {
  const accessToken = await getGitHubAccessToken(userId);
  if (!accessToken) {
    throw new Error('No valid GitHub access token');
  }

  const [owner, repo] = repoFullName.split('/');

  // Get repo default branch
  const repoData = await getRepo(accessToken, owner, repo);
  if (!repoData) {
    return null;
  }

  // Get tree to find file SHA
  const tree = await getRepoTree(accessToken, owner, repo, repoData.default_branch, false);
  const fileItem = tree.find((item) => item.path === filePath);

  if (!fileItem || fileItem.type !== 'blob') {
    return null;
  }

  // Get file content
  const content = await getFileContent(accessToken, owner, repo, filePath, fileItem.sha);
  if (content === null) {
    return null;
  }

  const language = getLanguageFromExtension(filePath);

  return { content, language };
}

// ============================================
// Rate Limit Handling
// ============================================

// Get current rate limit status
export async function getRateLimit(accessToken: string): Promise<{
  remaining: number;
  limit: number;
  resetAt: string | null;
}> {
  try {
    const response = await fetch(`${GITHUB_API}/rate_limit`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Nexus-AI',
      },
    });

    if (!response.ok) {
      return { remaining: 0, limit: 0, resetAt: null };
    }

    const data = await response.json();
    const core = data.resources?.core || {};

    return {
      remaining: core.remaining || 0,
      limit: core.limit || 0,
      resetAt: core.reset ? new Date(core.reset * 1000).toISOString() : null,
    };
  } catch {
    return { remaining: 0, limit: 0, resetAt: null };
  }
}
