// GitHub API Service
import { query } from '@/lib/db';
import { decryptApiKey } from '../billing/api-key-service';

const GITHUB_API = 'https://api.github.com';

// Get user's GitHub access token from database
export async function getGitHubAccessToken(userId: string): Promise<string | null> {
  try {
    const result = await query(
      `SELECT access_token FROM github_connections 
       WHERE user_id = $1 AND is_active = true 
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].access_token;
  } catch (error) {
    console.error('Error getting GitHub access token:', error);
    return null;
  }
}

// Store GitHub connection
export async function storeGitHubConnection(
  userId: string,
  githubUserId: number,
  username: string,
  accessToken: string,
  scope: string
): Promise<string | null> {
  try {
    const result = await query(
      `INSERT INTO github_connections (user_id, github_user_id, github_username, access_token, scope, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (user_id, github_user_id) 
       DO UPDATE SET access_token = $4, is_active = true, updated_at = NOW()
       RETURNING id`,
      [userId, githubUserId, username, accessToken, scope]
    );

    return result.rows[0]?.id || null;
  } catch (error) {
    console.error('Error storing GitHub connection:', error);
    return null;
  }
}

// Get user repos from database (cached)
export async function getUserRepos(userId: string) {
  try {
    const result = await query(
      `SELECT * FROM github_repos 
       WHERE connection_id IN (SELECT id FROM github_connections WHERE user_id = $1)
       ORDER BY updated_at DESC`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting user repos:', error);
    return [];
  }
}

// Sync user repos from GitHub API
export async function syncUserRepos(userId: string, connectionId: string): Promise<number> {
  const accessToken = await getGitHubAccessToken(userId);
  if (!accessToken) return 0;

  try {
    const response = await fetch(`${GITHUB_API}/user/repos?per_page=100&sort=updated`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) return 0;

    const repos = await response.json();

    for (const repo of repos) {
      await query(
        `INSERT INTO github_repos (connection_id, repo_id, repo_name, repo_full_name, repo_description, repo_url, default_branch, is_private, language, last_synced_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
         ON CONFLICT (repo_id) 
         DO UPDATE SET last_synced_at = NOW()`,
        [
          connectionId,
          repo.id,
          repo.name,
          repo.full_name,
          repo.description,
          repo.html_url,
          repo.default_branch,
          repo.private,
          repo.language,
        ]
      );
    }

    return repos.length;
  } catch (error) {
    console.error('Error syncing repos:', error);
    return 0;
  }
}

// Get repository tree
export async function getRepoTree(owner: string, repo: string, accessToken: string, path?: string) {
  try {
    const response = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents${path ? `/${path}` : ''}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error('Error getting repo tree:', error);
    return null;
  }
}

// Get file content
export async function getFileContent(owner: string, repo: string, path: string, accessToken: string) {
  try {
    const response = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error('Error getting file content:', error);
    return null;
  }
}

// Search code
export async function searchCode(queryText: string, owner: string, repo: string, accessToken: string) {
  try {
    const response = await fetch(
      `${GITHUB_API}/search/code?q=${encodeURIComponent(queryText)}+repo:${owner}/${repo}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) return [];
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error searching code:', error);
    return [];
  }
}

// Get user from token (for auth verification)
export async function getGitHubUser(accessToken: string) {
  try {
    const response = await fetch(`${GITHUB_API}/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error('Error getting GitHub user:', error);
    return null;
  }
}
