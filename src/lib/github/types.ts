// GitHub Integration Types

// ============================================
// GitHub Connection
// ============================================

export interface GitHubConnection {
  id: string;
  user_id: string;
  github_user_id: number;
  github_username: string;
  github_avatar_url: string | null;
  is_active: boolean;
  scope: string;
  created_at: string;
  updated_at: string;
}

export interface GitHubConnectionCreate {
  github_user_id: number;
  github_username: string;
  github_avatar_url?: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
}

// ============================================
// GitHub Repository
// ============================================

export interface GitHubRepo {
  id: string;
  connection_id: string;
  repo_id: number;
  repo_name: string;
  repo_full_name: string;
  repo_description: string | null;
  repo_url: string | null;
  default_branch: string;
  is_private: boolean;
  language: string | null;
  last_synced_at: string | null;
}

// ============================================
// GitHub File
// ============================================

export interface GitHubFile {
  id: string;
  repo_id: string;
  file_path: string;
  file_sha: string | null;
  file_size: number;
  file_type: 'file' | 'dir';
  content: string | null;
  last_checked_at: string | null;
}

export interface GitHubFileTreeItem {
  path: string;
  type: 'file' | 'dir';
  size?: number;
  sha?: string;
  content?: string; // Only for file reads
}

// ============================================
// GitHub API Responses
// ============================================

export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  name: string | null;
  email: string | null;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  default_branch: string;
  private: boolean;
  language: string | null;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
  };
}

export interface GitHubTreeResponse {
  sha: string;
  truncated: boolean;
  tree: GitHubTreeItem[];
}

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubBlobResponse {
  sha: string;
  size: number;
  url: string;
  content: string; // Base64 encoded
  encoding: string;
}

// ============================================
// GitHub Search
// ============================================

export interface GitHubSearchResult {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubSearchItem[];
}

export interface GitHubSearchItem {
  id: number;
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: 'file' | 'dir';
  content?: string; // For code search
  repository: {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    html_url: string;
    private: boolean;
    owner: {
      login: string;
      avatar_url: string;
    };
  };
  score: number;
}

// ============================================
// OAuth Types
// ============================================

export interface GitHubOAuthConfig {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  scope: string;
}

export interface GitHubOAuthTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

// ============================================
// UI State Types
// ============================================

export interface RepoSelectionState {
  connection_id: string;
  repo_full_name: string;
  branch: string;
  selected_paths: string[];
}

export interface GitHubConnectionStatus {
  is_connected: boolean;
  username: string | null;
  avatar_url: string | null;
  repo_count: number;
  last_synced: string | null;
}

// ============================================
// Helper Functions
// ============================================

export function decodeGitHubContent(base64Content: string): string {
  // GitHub API returns base64 encoded content
  return Buffer.from(base64Content, 'base64').toString('utf-8');
}

export function encodeGitHubContent(text: string): string {
  return Buffer.from(text).toString('base64');
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
}

export function isCodeFile(filename: string): boolean {
  const codeExtensions = [
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h',
    'cs', 'go', 'rb', 'php', 'swift', 'kt', 'rs', 'scala',
    'html', 'css', 'scss', 'less', 'json', 'yaml', 'yml',
    'md', 'txt', 'xml', 'graphql', 'sql', 'sh', 'bash',
    'dockerfile', 'makefile', 'gradle', 'plist'
  ];
  return codeExtensions.includes(getFileExtension(filename));
}

export function getLanguageFromExtension(filename: string): string | null {
  const langMap: Record<string, string> = {
    'js': 'JavaScript',
    'jsx': 'JavaScript React',
    'ts': 'TypeScript',
    'tsx': 'TypeScript React',
    'py': 'Python',
    'java': 'Java',
    'c': 'C',
    'cpp': 'C++',
    'h': 'C',
    'cs': 'C#',
    'go': 'Go',
    'rb': 'Ruby',
    'php': 'PHP',
    'swift': 'Swift',
    'kt': 'Kotlin',
    'rs': 'Rust',
    'scala': 'Scala',
    'html': 'HTML',
    'css': 'CSS',
    'scss': 'SCSS',
    'less': 'Less',
    'json': 'JSON',
    'yaml': 'YAML',
    'yml': 'YAML',
    'md': 'Markdown',
    'xml': 'XML',
    'graphql': 'GraphQL',
    'sql': 'SQL',
    'sh': 'Shell',
    'bash': 'Bash',
  };
  return langMap[getFileExtension(filename)] || null;
}
