-- GitHub Integration Schema
-- Add this to nexus/supabase/schema-hybrid.sql or run separately

-- ============================================
-- GITHUB CONNECTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS github_connections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  github_user_id INTEGER NOT NULL,
  github_username TEXT NOT NULL,
  github_avatar_url TEXT,
  access_token TEXT NOT NULL, -- Encrypted
  refresh_token TEXT, -- For token refresh
  token_expires_at TIMESTAMPTZ,
  scope TEXT DEFAULT 'repo,read:user',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, github_user_id)
);

ALTER TABLE github_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own GitHub connections" ON github_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own GitHub connections" ON github_connections
  FOR ALL USING (auth.uid() = user_id);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_github_connections_user_id ON github_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_github_connections_github_user_id ON github_connections(github_user_id);

-- ============================================
-- GITHUB REPOSITORIES (Cached)
-- ============================================
CREATE TABLE IF NOT EXISTS github_repos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  connection_id UUID REFERENCES github_connections(id) ON DELETE CASCADE NOT NULL,
  repo_id INTEGER NOT NULL,
  repo_name TEXT NOT NULL,
  repo_full_name TEXT NOT NULL,
  repo_description TEXT,
  repo_url TEXT,
  default_branch TEXT DEFAULT 'main',
  is_private BOOLEAN DEFAULT FALSE,
  language TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(connection_id, repo_id)
);

ALTER TABLE github_repos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view repos from their own connections" ON github_repos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM github_connections 
      WHERE id = github_repos.connection_id 
      AND github_connections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own repos" ON github_repos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM github_connections 
      WHERE id = github_repos.connection_id 
      AND github_connections.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_github_repos_connection_id ON github_repos(connection_id);
CREATE INDEX IF NOT EXISTS idx_github_repos_repo_id ON github_repos(repo_id);
CREATE INDEX IF NOT EXISTS idx_github_repos_name ON github_repos(repo_name);

-- ============================================
-- GITHUB REPO CACHE (File tree for RAG)
-- ============================================
CREATE TABLE IF NOT EXISTS github_repo_files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  repo_id UUID REFERENCES github_repos(id) ON DELETE CASCADE NOT NULL,
  file_path TEXT NOT NULL,
  file_sha TEXT,
  file_size INTEGER,
  file_type TEXT, -- 'file' or 'dir'
  content TEXT, -- Cached file content (truncated for large files)
  content_hash TEXT, -- SHA of content for change detection
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(repo_id, file_path)
);

ALTER TABLE github_repo_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cached files from their own repos" ON github_repo_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM github_repos 
      WHERE id = github_repo_files.repo_id
      AND EXISTS (
        SELECT 1 FROM github_connections 
        WHERE id = github_repos.connection_id 
        AND github_connections.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can manage repo files" ON github_repo_files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM github_repos 
      WHERE id = github_repo_files.repo_id
      AND EXISTS (
        SELECT 1 FROM github_connections 
        WHERE id = github_repos.connection_id 
        AND github_connections.user_id = auth.uid()
      )
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_github_repo_files_repo_id ON github_repo_files(repo_id);
CREATE INDEX IF NOT EXISTS idx_github_repo_files_path ON github_repo_files(file_path);

-- ============================================
-- GITHUB SEARCH HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS github_search_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  query TEXT NOT NULL,
  repo_id UUID REFERENCES github_repos(id) ON DELETE SET NULL,
  result_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE github_search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own search history" ON github_search_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert search history" ON github_search_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own search history" ON github_search_history
  FOR DELETE USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_github_search_history_user_id ON github_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_github_search_history_created_at ON github_search_history(created_at DESC);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE TRIGGER update_github_connections_updated_at
  BEFORE UPDATE ON github_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_github_repos_updated_at
  BEFORE UPDATE ON github_repos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_github_repo_files_updated_at
  BEFORE UPDATE ON github_repo_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get active GitHub connection for user
CREATE OR REPLACE FUNCTION get_active_github_connection(user_id UUID)
RETURNS SETOF github_connections AS $$
  SELECT * FROM github_connections
  WHERE user_id = user_id
  AND is_active = true
  AND (token_expires_at IS NULL OR token_expires_at > NOW())
  ORDER BY created_at DESC
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to refresh token if needed
CREATE OR REPLACE FUNCTION refresh_github_token(connection_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  conn RECORD;
  new_access_token TEXT;
  new_refresh_token TEXT;
  new_expires_at TIMESTAMPTZ;
BEGIN
  -- Get connection details
  SELECT * INTO conn FROM github_connections WHERE id = connection_id;
  
  IF conn.refresh_token IS NULL THEN
    RETURN false;
  END IF;
  
  -- Refresh via GitHub API
  -- Note: GitHub doesn't currently support token refresh for PATs
  -- This is a placeholder for future OAuth app implementation
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE github_connections;
ALTER PUBLICATION supabase_realtime ADD TABLE github_repos;
