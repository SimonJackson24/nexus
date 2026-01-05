-- GitHub Integration Extended Schema
-- Phase 2: Issues, PRs, and Actions
-- Add this to nexus/supabase/schema-github.sql

-- ============================================
-- GITHUB ISSUES (Cached/Tracked)
-- ============================================
CREATE TABLE IF NOT EXISTS github_issues (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  connection_id UUID REFERENCES github_connections(id) ON DELETE CASCADE NOT NULL,
  repo_id UUID REFERENCES github_repos(id) ON DELETE CASCADE NOT NULL,
  issue_number INTEGER NOT NULL,
  issue_id INTEGER NOT NULL, -- GitHub's internal ID
  title TEXT NOT NULL,
  body TEXT,
  state TEXT DEFAULT 'open' CHECK (state IN ('open', 'closed', 'all')),
  labels TEXT[] DEFAULT '{}',
  assignees TEXT[] DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(connection_id, issue_number)
);

ALTER TABLE github_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tracked issues" ON github_issues
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM github_connections 
      WHERE id = github_issues.connection_id 
      AND github_connections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own tracked issues" ON github_issues
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM github_connections 
      WHERE id = github_issues.connection_id 
      AND github_connections.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_github_issues_connection_id ON github_issues(connection_id);
CREATE INDEX IF NOT EXISTS idx_github_issues_repo_id ON github_issues(repo_id);
CREATE INDEX IF NOT EXISTS idx_github_issues_state ON github_issues(state);
CREATE INDEX IF NOT EXISTS idx_github_issues_synced_at ON github_issues(synced_at);

-- ============================================
-- GITHUB PULL REQUESTS (Cached/Tracked)
-- ============================================
CREATE TABLE IF NOT EXISTS github_pull_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  connection_id UUID REFERENCES github_connections(id) ON DELETE CASCADE NOT NULL,
  repo_id UUID REFERENCES github_repos(id) ON DELETE CASCADE NOT NULL,
  pr_number INTEGER NOT NULL,
  pr_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  state TEXT DEFAULT 'open' CHECK (state IN ('open', 'closed', 'merged', 'all')),
  head_branch TEXT NOT NULL,
  base_branch TEXT NOT NULL,
  draft BOOLEAN DEFAULT FALSE,
  mergeable BOOLEAN,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  merged_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(connection_id, pr_number)
);

ALTER TABLE github_pull_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tracked PRs" ON github_pull_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM github_connections 
      WHERE id = github_pull_requests.connection_id 
      AND github_connections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own tracked PRs" ON github_pull_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM github_connections 
      WHERE id = github_pull_requests.connection_id 
      AND github_connections.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_github_prs_connection_id ON github_pull_requests(connection_id);
CREATE INDEX IF NOT EXISTS idx_github_prs_repo_id ON github_pull_requests(repo_id);
CREATE INDEX IF NOT EXISTS idx_github_prs_state ON github_pull_requests(state);

-- ============================================
-- GITHUB ISSUE/PR COMMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS github_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  connection_id UUID REFERENCES github_connections(id) ON DELETE CASCADE NOT NULL,
  parent_type TEXT NOT NULL CHECK (parent_type IN ('issue', 'pr', 'pr_review')),
  parent_id TEXT NOT NULL, -- issue number or PR number
  comment_id INTEGER NOT NULL,
  body TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(connection_id, parent_type, parent_id, comment_id)
);

ALTER TABLE github_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on their tracked items" ON github_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM github_connections 
      WHERE id = github_comments.connection_id 
      AND github_connections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage comments" ON github_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM github_connections 
      WHERE id = github_comments.connection_id 
      AND github_connections.user_id = auth.uid()
    )
  );

-- ============================================
-- GITHUB WORKFLOWS (Actions)
-- ============================================
CREATE TABLE IF NOT EXISTS github_workflows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  connection_id UUID REFERENCES github_connections(id) ON DELETE CASCADE NOT NULL,
  repo_id UUID REFERENCES github_repos(id) ON DELETE CASCADE NOT NULL,
  workflow_id INTEGER NOT NULL,
  workflow_name TEXT NOT NULL,
  path TEXT NOT NULL,
  state TEXT DEFAULT 'active' CHECK (state IN ('active', 'disabled_manually', 'disabled_inactivity', 'all')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(connection_id, workflow_id)
);

ALTER TABLE github_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflows on their repos" ON github_workflows
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM github_connections 
      WHERE id = github_workflows.connection_id 
      AND github_connections.user_id = auth.uid()
    )
  );

-- ============================================
-- GITHUB WORKFLOW RUNS
-- ============================================
CREATE TABLE IF NOT EXISTS github_workflow_runs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  connection_id UUID REFERENCES github_connections(id) ON DELETE CASCADE NOT NULL,
  workflow_id UUID REFERENCES github_workflows(id) ON DELETE CASCADE NOT NULL,
  run_id INTEGER NOT NULL,
  run_number INTEGER,
  status TEXT NOT NULL CHECK (status IN ('queued', 'in_progress', 'completed', 'action_required', 'cancelled', 'failure', 'neutral', 'skipped', 'stale', 'success', 'timed_out', 'all')),
  conclusion TEXT, -- for completed runs
  branch TEXT NOT NULL,
  event TEXT NOT NULL,
  actor TEXT NOT NULL,
  run_started_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL,
  run_completed_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(workflow_id, run_id)
);

ALTER TABLE github_workflow_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflow runs on their repos" ON github_workflow_runs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM github_connections 
      WHERE id = github_workflow_runs.connection_id 
      AND github_connections.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_github_workflow_runs_workflow_id ON github_workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_github_workflow_runs_status ON github_workflow_runs(status);
CREATE INDEX IF NOT EXISTS idx_github_workflow_runs_created_at ON github_workflow_runs(run_completed_at DESC);

-- ============================================
-- GITHUB CODE CHANGES (Phase 4)
-- ============================================
CREATE TABLE IF NOT EXISTS github_branches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  connection_id UUID REFERENCES github_connections(id) ON DELETE CASCADE NOT NULL,
  repo_id UUID REFERENCES github_repos(id) ON DELETE CASCADE NOT NULL,
  branch_name TEXT NOT NULL,
  branch_sha TEXT NOT NULL,
  protected BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE(repo_id, branch_name)
);

ALTER TABLE github_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view branches on their repos" ON github_branches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM github_connections 
      WHERE id = github_branches.connection_id 
      AND github_connections.user_id = auth.uid()
    )
  );

-- ============================================
-- PENDING CODE CHANGES (For Phase 4 approval)
-- ============================================
CREATE TABLE IF NOT EXISTS github_pending_changes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  connection_id UUID REFERENCES github_connections(id) ON DELETE CASCADE NOT NULL,
  repo_id UUID REFERENCES github_repos(id) ON DELETE CASCADE NOT NULL,
  branch_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  original_sha TEXT,
  new_sha TEXT,
  change_summary TEXT,
  diff_content TEXT, -- The actual diff
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'failed')),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  applied_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

ALTER TABLE github_pending_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pending changes" ON github_pending_changes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own pending changes" ON github_pending_changes
  FOR ALL USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_github_pending_changes_status ON github_pending_changes(status);
CREATE INDEX IF NOT EXISTS idx_github_pending_changes_expires ON github_pending_changes(expires_at);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

CREATE TRIGGER update_github_issues_updated_at
  BEFORE UPDATE ON github_issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_github_pull_requests_updated_at
  BEFORE UPDATE ON github_pull_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_github_comments_updated_at
  BEFORE UPDATE ON github_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_github_workflows_updated_at
  BEFORE UPDATE ON github_workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_github_workflow_runs_updated_at
  BEFORE UPDATE ON github_workflow_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_github_branches_updated_at
  BEFORE UPDATE ON github_branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create issue via GitHub API
CREATE OR REPLACE FUNCTION create_github_issue(
  connection_id UUID,
  owner TEXT,
  repo TEXT,
  title TEXT,
  body TEXT,
  labels TEXT[] DEFAULT '{}',
  assignees TEXT[] DEFAULT '{}'
) RETURNS JSON AS $$
DECLARE
  access_token TEXT;
  result JSON;
BEGIN
  -- Get access token
  SELECT decryptApiKey(access_token) INTO access_token
  FROM github_connections WHERE id = connection_id;

  -- Call GitHub API
  result := null; -- Would call API here
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add comment on issue/PR
CREATE OR REPLACE FUNCTION add_github_comment(
  connection_id UUID,
  owner TEXT,
  repo TEXT,
  parent_type TEXT,
  parent_number INTEGER,
  body TEXT
) RETURNS JSON AS $$
DECLARE
  access_token TEXT;
  endpoint TEXT;
  result JSON;
BEGIN
  SELECT decryptApiKey(access_token) INTO access_token
  FROM github_connections WHERE id = connection_id;

  -- Determine endpoint based on parent type
  IF parent_type = 'issue' THEN
    endpoint := format('/repos/%s/%s/issues/%s/comments', owner, repo, parent_number);
  ELSIF parent_type = 'pr' THEN
    endpoint := format('/repos/%s/%s/pulls/%s/comments', owner, repo, parent_number);
  END IF;

  -- Would call GitHub API here
  result := null;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to trigger workflow
CREATE OR REPLACE FUNCTION trigger_github_workflow(
  connection_id UUID,
  owner TEXT,
  repo TEXT,
  workflow_id TEXT,
  ref TEXT DEFAULT 'main',
  inputs JSONB DEFAULT '{}'
) RETURNS JSON AS $$
DECLARE
  access_token TEXT;
  result JSON;
BEGIN
  SELECT decryptApiKey(access_token) INTO access_token
  FROM github_connections WHERE id = connection_id;

  -- Would call GitHub API to dispatch workflow
  result := null;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create branch
CREATE OR REPLACE FUNCTION create_github_branch(
  connection_id UUID,
  owner TEXT,
  repo TEXT,
  branch_name TEXT,
  from_sha TEXT
) RETURNS JSON AS $$
DECLARE
  access_token TEXT;
  result JSON;
BEGIN
  SELECT decryptApiKey(access_token) INTO access_token
  FROM github_connections WHERE id = connection_id;

  -- Would call GitHub API to create ref
  result := null;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create/update file
CREATE OR REPLACE FUNCTION create_or_update_file(
  connection_id UUID,
  owner TEXT,
  repo TEXT,
  path TEXT,
  content TEXT,
  message TEXT,
  branch TEXT,
  sha TEXT
) RETURNS JSON AS $$
DECLARE
  access_token TEXT;
  result JSON;
BEGIN
  SELECT decryptApiKey(access_token) INTO access_token
  FROM github_connections WHERE id = connection_id;

  -- Would call GitHub API to create/update file
  result := null;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create PR from branch
CREATE OR REPLACE FUNCTION create_pull_request(
  connection_id UUID,
  owner TEXT,
  repo TEXT,
  title TEXT,
  body TEXT,
  head_branch TEXT,
  base_branch TEXT
) RETURNS JSON AS $$
DECLARE
  access_token TEXT;
  result JSON;
BEGIN
  SELECT decryptApiKey(access_token) INTO access_token
  FROM github_connections WHERE id = connection_id;

  -- Would call GitHub API to create PR
  result := null;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
