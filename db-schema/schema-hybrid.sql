-- Nexus Supabase Schema - Hybrid BYOK + Token Subscriptions
-- Run this in Supabase SQL Editor or apply via migration
-- Self-hosted Supabase includes: PostgreSQL, Auth (GoTrue), Storage, Realtime

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  subscription_mode TEXT DEFAULT 'credits' CHECK (subscription_mode IN ('credits', 'byok')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "System can insert profiles" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- API KEYS (Bring Your Own Key)
-- ============================================
CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google', 'deepseek', 'openrouter')),
  encrypted_key TEXT NOT NULL, -- AES-256 encrypted
  key_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  rate_limit_per_minute INTEGER DEFAULT 60,
  last_validated_at TIMESTAMPTZ,
  is_valid BOOLEAN DEFAULT TRUE,
  validation_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own API keys" ON user_api_keys
  FOR ALL USING (auth.uid() = user_id);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider ON user_api_keys(provider);

-- ============================================
-- SUBSCRIPTION TIERS (Hybrid Platform Features)
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id TEXT PRIMARY KEY, -- 'free', 'pro', 'enterprise'
  name TEXT NOT NULL,
  description TEXT,
  monthly_credits INTEGER DEFAULT 0, -- 0 = unlimited BYOK mode
  price_pence_monthly INTEGER DEFAULT 0,
  max_chats INTEGER DEFAULT 10,
  max_messages_per_chat INTEGER DEFAULT 50,
  max_storage_gb INTEGER DEFAULT 1,
  max_integrations INTEGER DEFAULT 3,
  max_workflows INTEGER DEFAULT 5,
  max_seats INTEGER DEFAULT 1,
  has_advanced_analytics BOOLEAN DEFAULT FALSE,
  has_priority_support BOOLEAN DEFAULT FALSE,
  has_custom_agents BOOLEAN DEFAULT TRUE,
  has_sharing BOOLEAN DEFAULT TRUE,
  has_api_access BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0
);

-- Insert default tiers
INSERT INTO subscription_tiers (id, name, description, monthly_credits, price_pence_monthly, max_chats, max_messages_per_chat, max_storage_gb, max_integrations, max_workflows, max_seats, has_advanced_analytics, has_priority_support, has_custom_agents, has_sharing, has_api_access, sort_order)
VALUES
  ('free', 'Free', 'Basic access with BYOK or limited credits', 100, 0, 10, 30, 1, 2, 3, 1, FALSE, FALSE, TRUE, TRUE, FALSE, 0),
  ('pro', 'Pro', 'More credits and platform features', 50000, 1900, 100, 200, 10, 10, 50, 3, TRUE, FALSE, TRUE, TRUE, TRUE, 1),
  ('enterprise', 'Enterprise', 'Maximum power and flexibility', 500000, 9900, -1, -1, 100, -1, -1, 10, TRUE, TRUE, TRUE, TRUE, TRUE, 2)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  monthly_credits = EXCLUDED.monthly_credits,
  price_pence_monthly = EXCLUDED.price_pence_monthly,
  max_chats = EXCLUDED.max_chats,
  max_messages_per_chat = EXCLUDED.max_messages_per_chat,
  max_storage_gb = EXCLUDED.max_storage_gb,
  max_integrations = EXCLUDED.max_integrations,
  max_workflows = EXCLUDED.max_workflows,
  max_seats = EXCLUDED.max_seats,
  has_advanced_analytics = EXCLUDED.has_advanced_analytics,
  has_priority_support = EXCLUDED.has_priority_support,
  has_custom_agents = EXCLUDED.has_custom_agents,
  has_sharing = EXCLUDED.has_sharing,
  has_api_access = EXCLUDED.has_api_access,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- ============================================
-- USER SUBSCRIPTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tier_id TEXT REFERENCES subscription_tiers(id) DEFAULT 'free',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'paused', 'trial')),
  subscription_mode TEXT DEFAULT 'credits' CHECK (subscription_mode IN ('credits', 'byok')),
  credits_balance INTEGER DEFAULT 0,
  credits_this_cycle INTEGER DEFAULT 0,
  trial_ends_at TIMESTAMPTZ,
  current_cycle_start TIMESTAMPTZ DEFAULT NOW(),
  current_cycle_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id)
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own subscription" ON user_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Index for status checks
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

-- ============================================
-- CREDIT PACKAGES (One-time purchases)
-- ============================================
CREATE TABLE IF NOT EXISTS credit_packages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
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

-- Insert default packages
INSERT INTO credit_packages (name, description, credits_amount, price_pence, sort_order)
VALUES
  ('Starter', 'Perfect for trying out', 1000, 290, 1),
  ('Standard', 'Great for daily use', 10000, 2400, 2),
  ('Power User', 'For heavy users', 50000, 9900, 3),
  ('Professional', 'Maximum value', 200000, 35000, 4)
ON CONFLICT DO NOTHING;

ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view credit packages" ON credit_packages
  FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage credit packages" ON credit_packages
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE email LIKE '%@nexus%'));

-- ============================================
-- CREDIT TRANSACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'subscription', 'bonus', 'refund', 'usage', 'expiration', 'adjustment')),
  amount INTEGER NOT NULL, -- Positive = credit added, Negative = credit deducted
  balance_after INTEGER NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions" ON credit_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Index for history lookups
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

-- ============================================
-- AI USAGE TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google', 'deepseek', 'openrouter', 'byok')),
  model TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  credits_deducted INTEGER DEFAULT 0,
  cost_pence DECIMAL(10, 4) DEFAULT 0, -- Actual cost from provider
  is_byok BOOLEAN DEFAULT FALSE, -- TRUE if user used their own key
  chat_id UUID, -- Optional reference to chat
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage" ON ai_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert usage records" ON ai_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes for usage analytics
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_provider_model ON ai_usage(provider, model);

-- ============================================
-- MODEL RATES (Credit pricing per model)
-- ============================================
CREATE TABLE IF NOT EXISTS model_rates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  credits_per_1k_input INTEGER DEFAULT 1,
  credits_per_1k_output INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(provider, model_id)
);

-- Insert default rates
INSERT INTO model_rates (provider, model_id, credits_per_1k_input, credits_per_1k_output)
VALUES
  -- OpenAI
  ('openai', 'gpt-4o', 2, 6),
  ('openai', 'gpt-4o-mini', 0.15, 0.6),
  ('openai', 'gpt-4-turbo', 10, 30),
  ('openai', 'gpt-4', 30, 90),
  ('openai', 'gpt-3.5-turbo', 0.5, 1.5),
  -- Anthropic
  ('anthropic', 'claude-sonnet-4-20250514', 3, 15),
  ('anthropic', 'claude-haiku-3-20250514', 0.25, 1.25),
  ('anthropic', 'claude-opus-4-20240307', 15, 75),
  -- Google
  ('google', 'gemini-1.5-pro', 5, 15),
  ('google', 'gemini-1.5-flash', 0.075, 0.3),
  -- DeepSeek
  ('deepseek', 'deepseek-chat', 0.14, 0.28),
  -- OpenRouter
  ('openrouter', 'meta-llama/llama-3.1-405b', 2.5, 2.5)
ON CONFLICT (provider, model_id) DO UPDATE SET
  credits_per_1k_input = EXCLUDED.credits_per_1k_input,
  credits_per_1k_output = EXCLUDED.credits_per_1k_output,
  is_active = EXCLUDED.is_active;

-- ============================================
-- PAYMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT DEFAULT 'revolut' CHECK (provider IN ('revolut', 'stripe', 'manual', 'free')),
  amount_pence INTEGER NOT NULL,
  currency TEXT DEFAULT 'GBP',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  credits_granted INTEGER DEFAULT 0,
  revolut_order_id TEXT,
  revolut_payment_id TEXT,
  stripe_payment_intent_id TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ============================================
-- AGENT PROFILES (Custom user agents)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  avatar TEXT,
  color TEXT,
  system_prompt TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'minimax', 'google', 'deepseek', 'openrouter', 'byok')),
  model TEXT NOT NULL,
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 4096,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE agent_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own agents" ON agent_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create agents" ON agent_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agents" ON agent_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agents" ON agent_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- FOLDERS (Chat organization)
-- ============================================
CREATE TABLE IF NOT EXISTS folders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📁',
  color TEXT DEFAULT '#3b82f6',
  parent_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own folders" ON folders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage folders" ON folders
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- CHATS (Conversations)
-- ============================================
CREATE TABLE IF NOT EXISTS chats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  agent_id UUID REFERENCES agent_profiles(id) ON DELETE SET NULL,
  provider TEXT CHECK (provider IN ('openai', 'anthropic', 'minimax', 'google', 'deepseek', 'openrouter', 'byok')),
  model TEXT,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  pinned BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chats" ON chats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create chats" ON chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats" ON chats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats" ON chats
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for chats
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
  provider TEXT CHECK (provider IN ('openai', 'anthropic', 'minimax', 'google', 'deepseek', 'openrouter', 'byok')),
  model TEXT,
  token_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their chats" ON messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM chats WHERE id = messages.chat_id AND chats.user_id = auth.uid())
  );

CREATE POLICY "Users can insert messages in their chats" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM chats WHERE id = messages.chat_id AND chats.user_id = auth.uid())
  );

CREATE POLICY "Users can delete messages in their chats" ON messages
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM chats WHERE id = messages.chat_id AND chats.user_id = auth.uid())
  );

-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- ============================================
-- SUBTASKS (Task breakdowns)
-- ============================================
CREATE TABLE IF NOT EXISTS subtasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  parent_message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
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

ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subtasks" ON subtasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage subtasks" ON subtasks
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for subtasks
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

ALTER TABLE chat_shares ENABLE ROW LEVEL SECURITY;

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
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_api_keys_updated_at
  BEFORE UPDATE ON user_api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_packages_updated_at
  BEFORE UPDATE ON credit_packages
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

-- Function to deduct credits for AI usage
CREATE OR REPLACE FUNCTION deduct_credits_for_usage()
RETURNS TRIGGER AS $$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
BEGIN
  -- Get current balance
  SELECT credits_balance INTO current_balance
  FROM user_subscriptions
  WHERE user_id = NEW.user_id;

  -- Check if BYOK mode (unlimited credits)
  IF current_balance IS NULL THEN
    -- No subscription, treat as BYOK
    RETURN NEW;
  END IF;

  -- Deduct credits
  new_balance := current_balance - NEW.credits_deducted;
  
  UPDATE user_subscriptions
  SET credits_balance = new_balance,
      credits_this_cycle = credits_this_cycle + NEW.credits_deducted,
      updated_at = NOW()
  WHERE user_id = NEW.user_id;

  -- Record transaction
  INSERT INTO credit_transactions (user_id, type, amount, balance_after, description, metadata)
  VALUES (
    NEW.user_id,
    'usage',
    -NEW.credits_deducted,
    new_balance,
    format('AI usage: %s/%s', NEW.provider, NEW.model),
    JSONB_BUILD_OBJECT(
      'usage_id', NEW.id,
      'input_tokens', NEW.input_tokens,
      'output_tokens', NEW.output_tokens,
      'is_byok', NEW.is_byok
    )
  );

  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for automatic credit deduction
CREATE TRIGGER ai_usage_after_insert
  AFTER INSERT ON ai_usage
  FOR EACH ROW EXECUTE FUNCTION deduct_credits_for_usage();

-- Function to reset monthly credits at cycle end
CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_cycle_end <= NOW() AND OLD.current_cycle_end >= NOW() THEN
    -- Cycle just ended, reset credits
    UPDATE user_subscriptions
    SET credits_this_cycle = 0,
        current_cycle_start = NEW.current_cycle_end,
        current_cycle_end = NEW.current_cycle_end + INTERVAL '1 month'
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE subtasks;

-- ============================================
-- DEFAULT DATA (Built-in agents)
-- ============================================

-- Note: Built-in agents are stored in app code, not database
-- Users can create custom agents that override defaults
