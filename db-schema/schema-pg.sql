-- Nexus Complete PostgreSQL Schema (Direct PostgreSQL, no Supabase dependencies)
-- Run this in PostgreSQL directly

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE (Custom auth, replaces auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token TEXT,
  password_reset_token TEXT,
  password_reset_expires_at TIMESTAMPTZ,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);

-- ============================================
-- SESSIONS TABLE (JWT token storage for logout/blacklist)
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- SITE SETTINGS TABLE (Branding & Configuration)
-- ============================================
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type TEXT DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Default site settings
INSERT INTO site_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
  ('site_name', 'Nexus AI', 'string', 'Site display name', TRUE),
  ('site_description', 'AI-Powered Development Platform', 'string', 'Site description', TRUE),
  ('site_logo', '/favicon.ico', 'string', 'Logo URL', TRUE),
  ('site_theme', 'dark', 'string', 'Default theme (dark/light)', TRUE),
  ('allow_registration', 'true', 'boolean', 'Allow new user registration', FALSE),
  ('require_email_verification', 'false', 'boolean', 'Require email verification', FALSE),
  ('max_sessions_per_user', '5', 'number', 'Maximum concurrent sessions', FALSE),
  ('session_duration_days', '30', 'number', 'Session duration in days', FALSE),
  ('default_ai_provider', 'openai', 'string', 'Default AI provider', FALSE),
  ('default_ai_model', 'gpt-4o', 'string', 'Default AI model', FALSE),
  ('enable_github_integration', 'true', 'boolean', 'Enable GitHub integration', FALSE),
  ('enable_billing', 'true', 'boolean', 'Enable billing system', FALSE),
  ('primary_color', '#8b5cf6', 'string', 'Primary brand color', TRUE),
  ('secondary_color', '#3b82f6', 'string', 'Secondary brand color', TRUE),
  ('accent_color', '#06b6d4', 'string', 'Accent brand color', TRUE),
  ('footer_text', 'Powered by Nexus AI', 'string', 'Footer text', TRUE),
  ('privacy_policy_url', '', 'string', 'Privacy policy URL', TRUE),
  ('terms_of_service_url', '', 'string', 'Terms of service URL', TRUE),
  ('support_email', '', 'string', 'Support email', TRUE)
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================
-- EMAIL PROVIDER SETTINGS
-- ============================================
CREATE TABLE IF NOT EXISTS email_providers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('smtp', 'api')),
  host TEXT,
  port INTEGER,
  username TEXT,
  encrypted_password TEXT,
  api_key TEXT,
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Default email provider (none configured initially)
-- Users can configure SMTP providers like SendGrid, Mailgun, AWS SES, etc.

-- ============================================
-- EMAIL TEMPLATES
-- ============================================
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  template_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_html BOOLEAN DEFAULT TRUE,
  variables JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Default email templates
INSERT INTO email_templates (template_key, name, subject, body, is_html, variables) VALUES
  ('welcome', 'Welcome Email', 'Welcome to Nexus AI!', 
   '<h1>Welcome, {{name}}!</h1><p>Thanks for joining Nexus AI. Your account has been created successfully.</p><p>Start exploring our AI-powered development platform today!</p>', 
   TRUE, '["name", "email"]'),
  ('password_reset', 'Password Reset', 'Reset your Nexus AI password',
   '<h1>Password Reset Request</h1><p>Hi {{name}},</p><p>You requested a password reset. Click the link below to reset your password:</p><p><a href="{{reset_link}}">Reset Password</a></p><p>This link expires in 1 hour.</p>',
   TRUE, '["name", "reset_link"]'),
  ('email_verification', 'Email Verification', 'Verify your Nexus AI email',
   '<h1>Verify Your Email</h1><p>Hi {{name}},</p><p>Click the link below to verify your email address:</p><p><a href="{{verify_link}}">Verify Email</a></p>',
   TRUE, '["name", "verify_link"]'),
  ('password_changed', 'Password Changed', 'Your password has been changed',
   '<h1>Password Changed</h1><p>Hi {{name}},</p><p>Your password has been successfully changed. If you did not make this change, please contact support immediately.</p>',
   TRUE, '["name"]')
ON CONFLICT (template_key) DO NOTHING;

-- ============================================
-- AGENT PROFILES (Custom user agents)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  avatar TEXT,
  color TEXT,
  system_prompt TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'minimax')),
  model TEXT NOT NULL,
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 4096,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_profiles_user_id ON agent_profiles(user_id);

-- ============================================
-- GITHUB OAUTH CONFIGURATION
-- ============================================
CREATE TABLE IF NOT EXISTS github_oauth_config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id TEXT NOT NULL,
  encrypted_client_secret TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  scopes TEXT[] DEFAULT ARRAY['repo', 'read:user', 'read:org'],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- GITHUB CONNECTIONS (User-linked GitHub accounts)
-- ============================================
CREATE TABLE IF NOT EXISTS github_connections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  github_user_id BIGINT NOT NULL,
  github_username TEXT NOT NULL,
  github_avatar_url TEXT,
  access_token TEXT NOT NULL,
  scope TEXT DEFAULT 'repo,read:user',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, github_user_id)
);

CREATE INDEX IF NOT EXISTS idx_github_connections_user_id ON github_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_github_connections_github_user_id ON github_connections(github_user_id);

-- ============================================
-- GITHUB REPOS (Cached repositories)
-- ============================================
CREATE TABLE IF NOT EXISTS github_repos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  connection_id UUID REFERENCES github_connections(id) ON DELETE CASCADE NOT NULL,
  repo_id BIGINT NOT NULL,
  repo_name TEXT NOT NULL,
  repo_full_name TEXT NOT NULL,
  repo_description TEXT,
  repo_url TEXT NOT NULL,
  default_branch TEXT DEFAULT 'main',
  is_private BOOLEAN DEFAULT TRUE,
  language TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(repo_id)
);

CREATE INDEX IF NOT EXISTS idx_github_repos_connection_id ON github_repos(connection_id);
CREATE INDEX IF NOT EXISTS idx_github_repos_full_name ON github_repos(repo_full_name);

-- ============================================
-- GITHUB PENDING CHANGES (PR approval workflow)
-- ============================================
CREATE TABLE IF NOT EXISTS github_pending_changes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  connection_id UUID REFERENCES github_connections(id) ON DELETE SET NULL,
  repo_id UUID REFERENCES github_repos(id) ON DELETE SET NULL,
  branch_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  original_sha TEXT,
  new_sha TEXT,
  change_summary TEXT,
  diff_content TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_github_pending_changes_user_id ON github_pending_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_github_pending_changes_repo_id ON github_pending_changes(repo_id);
CREATE INDEX IF NOT EXISTS idx_github_pending_changes_status ON github_pending_changes(status);

-- ============================================
-- REDIS CACHE CONFIGURATION
-- ============================================
CREATE TABLE IF NOT EXISTS redis_config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  host TEXT NOT NULL DEFAULT 'localhost',
  port INTEGER DEFAULT 6379,
  password TEXT,
  database INTEGER DEFAULT 0,
  key_prefix TEXT DEFAULT 'nexus:',
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Default Redis config (can be updated)
INSERT INTO redis_config (host, port, key_prefix, is_default) VALUES
  ('localhost', 6379, 'nexus:', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================
-- CACHE ENTRIES (Optional: for caching expensive queries)
-- ============================================
CREATE TABLE IF NOT EXISTS cache_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  cache_value TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cache_entries_key ON cache_entries(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_entries_expires ON cache_entries(expires_at);

-- ============================================
-- FOLDERS (Chat organization)
-- ============================================
CREATE TABLE IF NOT EXISTS folders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📁',
  color TEXT DEFAULT '#3b82f6',
  parent_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);

-- ============================================
-- CHATS (Conversations)
-- ============================================
CREATE TABLE IF NOT EXISTS chats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  agent_id UUID REFERENCES agent_profiles(id) ON DELETE SET NULL,
  provider TEXT CHECK (provider IN ('openai', 'anthropic', 'minimax')),
  model TEXT,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  pinned BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_folder_id ON chats(folder_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_pinned ON chats(user_id, pinned) WHERE pinned = TRUE;

-- ============================================
-- MESSAGES (Chat messages)
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  provider TEXT CHECK (provider IN ('openai', 'anthropic', 'minimax')),
  model TEXT,
  token_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- ============================================
-- SUBTASKS (Task breakdowns)
-- ============================================
CREATE TABLE IF NOT EXISTS subtasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  parent_message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  linked_context TEXT[] DEFAULT '{}',
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_subtasks_chat_id ON subtasks(chat_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_status ON subtasks(status);
CREATE INDEX IF NOT EXISTS idx_subtasks_priority ON subtasks(priority);

-- ============================================
-- CHAT_SHARES (Sharing chats with others)
-- ============================================
CREATE TABLE IF NOT EXISTS chat_shares (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  share_token UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  allow_edit BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_shares_chat_id ON chat_shares(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_shares_token ON chat_shares(share_token);

-- ============================================
-- CREDIT PACKAGES (Available credit packages)
-- ============================================
CREATE TABLE IF NOT EXISTS credit_packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  credits_amount INTEGER NOT NULL,
  price_pence INTEGER NOT NULL,
  currency TEXT DEFAULT 'GBP',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

INSERT INTO credit_packages (id, name, description, credits_amount, price_pence, sort_order) VALUES
  ('starter', 'Starter Pack', 'Perfect for trying out Nexus AI', 100, 999, 1),
  ('pro', 'Pro Pack', 'Great for regular users', 500, 3999, 2),
  ('power', 'Power Pack', 'Best value for power users', 1500, 9999, 3),
  ('enterprise', 'Enterprise Pack', 'For teams and heavy usage', 5000, 24999, 4)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SUBSCRIPTION TIERS
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_pence_monthly INTEGER NOT NULL,
  monthly_credits INTEGER NOT NULL,
  currency TEXT DEFAULT 'GBP',
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

INSERT INTO subscription_tiers (id, name, description, price_pence_monthly, monthly_credits, sort_order) VALUES
  ('free', 'Free', 'For casual users', 0, 50, 0),
  ('basic', 'Basic', 'For regular users', 999, 500, 1),
  ('pro', 'Pro', 'For power users', 2999, 2000, 2),
  ('enterprise', 'Enterprise', 'For teams', 9999, 10000, 3)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- USER SUBSCRIPTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  tier_id TEXT REFERENCES subscription_tiers(id) NOT NULL,
  subscription_mode TEXT DEFAULT 'credits' CHECK (subscription_mode IN ('credits', 'byok')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'paused')),
  credits_balance INTEGER DEFAULT 0,
  credits_this_cycle INTEGER DEFAULT 0,
  current_cycle_start TIMESTAMPTZ,
  current_cycle_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tier_id ON user_subscriptions(tier_id);

-- ============================================
-- USER CREDITS
-- ============================================
CREATE TABLE IF NOT EXISTS user_credits (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  credits_balance INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- PAYMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('revolut', 'stripe', 'paypal')),
  amount_pence INTEGER NOT NULL,
  currency TEXT DEFAULT 'GBP',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  revolut_order_id TEXT,
  revolut_payment_id TEXT,
  stripe_payment_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_revolut_order_id ON payments(revolut_order_id);

-- ============================================
-- API KEYS (User API keys for BYOK)
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'minimax')),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_provider ON api_keys(provider);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to tables
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_profiles_updated_at
  BEFORE UPDATE ON agent_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_folders_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subtasks_updated_at
  BEFORE UPDATE ON subtasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_redis_config_updated_at
  BEFORE UPDATE ON redis_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_github_connections_updated_at
  BEFORE UPDATE ON github_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_github_repos_updated_at
  BEFORE UPDATE ON github_repos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pending_changes_updated_at
  BEFORE UPDATE ON github_pending_changes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_providers_updated_at
  BEFORE UPDATE ON email_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON user_credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update chat's last_message_at when message is added
CREATE OR REPLACE FUNCTION update_chat_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chats SET last_message_at = NEW.created_at, updated_at = NOW()
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER messages_after_insert
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_chat_last_message();

-- Function to create profile when user is created
CREATE OR REPLACE FUNCTION create_profile_on_user_create()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name, avatar_url)
  VALUES (NEW.id, NEW.email, NEW.display_name, NEW.avatar_url);
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER users_after_insert
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_profile_on_user_create();

-- Function to create user_credits when user is created
CREATE OR REPLACE FUNCTION create_user_credits_on_user_create()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_credits (user_id, credits_balance)
  VALUES (NEW.id, 0);
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER users_after_insert_credits
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_user_credits_on_user_create();

-- ============================================
-- CLEANUP FUNCTIONS
-- ============================================

-- Function to clean expired sessions
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM cache_entries WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Run cleanup daily (can be called by cron)
-- SELECT clean_expired_sessions();
-- SELECT clean_expired_cache();
