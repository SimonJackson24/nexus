// Repository creation helpers
import { query } from '@/lib/db';
import { getGitHubAccessToken } from './api-service';

const GITHUB_API = 'https://api.github.com';

// Store created repo in database
export async function storeCreatedRepo(userId: string, githubRepo: any) {
  try {
    // Get connection
    const connectionResult = await query(
      `SELECT id FROM github_connections 
       WHERE user_id = $1 AND is_active = true 
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (connectionResult.rows.length === 0) {
      return null;
    }

    const connectionId = connectionResult.rows[0].id;

    const result = await query(
      `INSERT INTO github_repos (connection_id, repo_id, repo_name, repo_full_name, repo_description, repo_url, default_branch, is_private, language)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        connectionId,
        githubRepo.id,
        githubRepo.name,
        githubRepo.full_name,
        githubRepo.description,
        githubRepo.html_url,
        githubRepo.default_branch,
        githubRepo.private,
        githubRepo.language,
      ]
    );

    return result.rows[0]?.id || null;
  } catch (error) {
    console.error('Error storing created repo:', error);
    return null;
  }
}

// Create a new repository on GitHub
export async function createRepository(
  userId: string,
  name: string,
  description: string,
  isPrivate: boolean,
  initializeWithReadme: boolean
) {
  const accessToken = await getGitHubAccessToken(userId);
  if (!accessToken) {
    return { success: false, error: 'GitHub not connected' };
  }

  try {
    const response = await fetch(`${GITHUB_API}/user/repos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        description,
        private: isPrivate,
        auto_init: initializeWithReadme,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || 'Failed to create repository' };
    }

    const repo = await response.json();

    // Store in database
    await storeCreatedRepo(userId, repo);

    return { success: true, repo };
  } catch (error) {
    console.error('Error creating repository:', error);
    return { success: false, error: 'Failed to create repository' };
  }
}

// Commit initial files to a new repo
export async function commitInitialFiles(
  userId: string,
  owner: string,
  repo: string,
  files: { path: string; content: string }[]
) {
  const accessToken = await getGitHubAccessToken(userId);
  if (!accessToken) {
    return { success: false, error: 'GitHub not connected' };
  }

  try {
    // Get the default branch SHA
    const refResponse = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/git/refs/heads/${await getDefaultBranch(owner, repo, accessToken)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!refResponse.ok) {
      return { success: false, error: 'Failed to get repository reference' };
    }

    const refData = await refResponse.json();
    const baseSha = refData.object.sha;

    // Create blobs and tree
    const blobs: { path: string; sha: string }[] = [];

    for (const file of files) {
      const blobResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/blobs`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: Buffer.from(file.content).toString('base64'),
          encoding: 'base64',
        }),
      });

      if (blobResponse.ok) {
        const blob = await blobResponse.json();
        blobs.push({ path: file.path, sha: blob.sha });
      }
    }

    // Create tree
    const treeResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base_tree: baseSha,
        tree: blobs.map((b) => ({
          path: b.path,
          mode: '100644',
          type: 'blob',
          sha: b.sha,
        })),
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
      },
      body: JSON.stringify({
        message: 'Initial commit',
        tree: tree.sha,
        parents: [baseSha],
      }),
    });

    if (!commitResponse.ok) {
      return { success: false, error: 'Failed to create commit' };
    }

    // Update reference
    const defaultBranch = await getDefaultBranch(owner, repo, accessToken);
    await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/refs/heads/${defaultBranch}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sha: (await commitResponse.json()).sha,
      }),
    });

    return { success: true };
  } catch (error) {
    console.error('Error committing files:', error);
    return { success: false, error: 'Failed to commit files' };
  }
}

// Initialize a new project with template files
export async function initNewProject(
  userId: string,
  owner: string,
  repo: string,
  template: 'nextjs' | 'react' | 'node' | 'python' | 'blank'
) {
  const templates: Record<string, { path: string; content: string }[]> = {
    blank: [],
    nextjs: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: repo,
          version: '0.1.0',
          private: true,
          scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
            lint: 'next lint',
          },
          dependencies: {
            next: '^14.2.0',
            react: '^18',
            'react-dom': '^18',
          },
        }, null, 2),
      },
      {
        path: 'README.md',
        content: `# ${repo}\n\nA Next.js project created with Nexus AI.\n`,
      },
    ],
    react: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: repo,
          version: '0.1.0',
          private: true,
          scripts: {
            dev: 'vite',
            build: 'vite build',
            preview: 'vite preview',
          },
          dependencies: {
            react: '^18',
            'react-dom': '^18',
          },
          devDependencies: {
            vite: '^5',
            '@vitejs/plugin-react': '^4',
          },
        }, null, 2),
      },
      {
        path: 'index.html',
        content: '<!DOCTYPE html><html><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>',
      },
      {
        path: 'README.md',
        content: `# ${repo}\n\nA React project created with Nexus AI.\n`,
      },
    ],
    node: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: repo,
          version: '0.1.0',
          main: 'index.js',
          scripts: {
            start: 'node index.js',
          },
        }, null, 2),
      },
      {
        path: 'index.js',
        content: `// ${repo}\n\nconsole.log('Hello from Nexus AI!');\n`,
      },
      {
        path: 'README.md',
        content: `# ${repo}\n\nA Node.js project created with Nexus AI.\n`,
      },
    ],
    python: [
      {
        path: 'main.py',
        content: `# ${repo}\n\ndef main():\n    print("Hello from Nexus AI!")\n\nif __name__ == "__main__":\n    main()\n`,
      },
      {
        path: 'requirements.txt',
        content: '# Add your dependencies here\n',
      },
      {
        path: 'README.md',
        content: `# ${repo}\n\nA Python project created with Nexus AI.\n`,
      },
    ],
  };

  return commitInitialFiles(userId, owner, repo, templates[template] || templates.blank);
}

// Get default branch name
async function getDefaultBranch(owner: string, repo: string, accessToken: string): Promise<string> {
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (response.ok) {
    const repo = await response.json();
    return repo.default_branch;
  }

  return 'main';
}
