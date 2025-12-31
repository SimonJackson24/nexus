-- ============================================
-- Nexus Credit System Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE transaction_type AS ENUM ('purchase', 'subscription', 'bonus', 'refund', 'usage');
CREATE TYPE payment_provider AS ENUM ('revolut', 'stripe', 'manual');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'paused');

-- ============================================
-- CREDIT PACKAGES (One-time purchases)
-- ============================================
CREATE TABLE credit_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    credits_amount INTEGER NOT NULL,
    price_pence INTEGER NOT NULL, -- Price in pence (e.g., 999 = £9.99)
    currency VARCHAR(3) DEFAULT 'GBP',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default packages
INSERT INTO credit_packages (name, description, credits_amount, price_pence, sort_order) VALUES
('Starter Pack', 'Perfect for trying out Nexus', 100, 499, 1),
('Standard Pack', 'Great for regular use', 500, 1999, 2),
('Pro Pack', 'For power users', 1500, 4999, 3),
('Ultimate Pack', 'Best value for heavy usage', 5000, 14999, 4);

-- ============================================
-- SUBSCRIPTION PLANS (Recurring billing)
-- ============================================
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    monthly_credits INTEGER NOT NULL,
    price_pence_monthly INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'GBP',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default plans
INSERT INTO subscription_plans (name, description, monthly_credits, price_pence_monthly, sort_order) VALUES
('Free Tier', 'Get started with basic features', 50, 0, 0),
('Basic', 'For casual users', 500, 999, 1),
('Pro', 'For professionals', 2000, 2999, 2),
('Enterprise', 'Unlimited possibilities', 10000, 9999, 3);

-- ============================================
-- USER CREDITS (Current balance)
-- ============================================
CREATE TABLE user_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credits_balance INTEGER NOT NULL DEFAULT 0,
    total_earned_credits INTEGER NOT NULL DEFAULT 0,
    total_spent_credits INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ============================================
-- CREDIT TRANSACTIONS (All credit movements)
-- ============================================
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    amount INTEGER NOT NULL, -- Positive for credits added, negative for credits deducted
    balance_after INTEGER NOT NULL,
    description TEXT,
    metadata JSONB, -- Store payment details, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SUBSCRIPTIONS (User subscription status)
-- ============================================
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status subscription_status NOT NULL DEFAULT 'active',
    credits_this_cycle INTEGER NOT NULL DEFAULT 0,
    current_cycle_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_cycle_end TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PAYMENT RECORDS
-- ============================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider payment_provider NOT NULL,
    amount_pence INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'GBP',
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
    revolut_order_id VARCHAR(255), -- For Revolut integration
    revolut_payment_id VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USAGE TRACKING (AI model usage per request)
-- ============================================
CREATE TABLE ai_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- openai, anthropic, minimax
    model VARCHAR(100) NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    credits_deducted INTEGER NOT NULL DEFAULT 0,
    cost_pence DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created ON credit_transactions(created_at DESC);
CREATE INDEX idx_user_credits_user ON user_credits(user_id);
CREATE INDEX idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_ai_usage_user ON ai_usage(user_id);
CREATE INDEX idx_ai_usage_created ON ai_usage(created_at DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_credit_packages_updated_at BEFORE UPDATE ON credit_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_credits_updated_at BEFORE UPDATE ON user_credits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES (Row Level Security)
-- ============================================
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own credits" ON user_credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own transactions" ON credit_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own usage" ON ai_usage FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- VIEW: User Summary
-- ============================================
CREATE VIEW user_summary AS
SELECT 
    u.id AS user_id,
    u.email,
    uc.credits_balance,
    uc.total_earned_credits,
    uc.total_spent_credits,
    COALESCE(json_agg(DISTINCT jsonb_build_object(
        'plan_name', sp.name,
        'status', us.status,
        'credits_this_cycle', us.credits_this_cycle,
        'cycle_end', us.current_cycle_end
    )) FILTER (WHERE us.status = 'active'), '[]') AS active_subscription,
    COALESCE(SUM(au.input_tokens + au.output_tokens), 0) AS total_tokens_used,
    COUNT(au.id) AS total_requests
FROM auth.users u
LEFT JOIN user_credits uc ON u.id = uc.user_id
LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
LEFT JOIN ai_usage au ON u.id = au.user_id
GROUP BY u.id, u.email, uc.credits_balance, uc.total_earned_credits, uc.total_spent_credits;

-- ============================================
-- FUNCTION: Add credits to user
-- ============================================
CREATE OR REPLACE FUNCTION add_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_type transaction_type,
    p_description TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    -- Get current balance or initialize
    SELECT COALESCE(credits_balance, 0) INTO v_new_balance 
    FROM user_credits WHERE user_id = p_user_id;
    
    IF v_new_balance IS NULL THEN
        v_new_balance := 0;
        INSERT INTO user_credits (user_id, credits_balance, total_earned_credits)
        VALUES (p_user_id, p_amount, p_amount);
    ELSE
        v_new_balance := v_new_balance + p_amount;
        UPDATE user_credits 
        SET credits_balance = v_new_balance,
            total_earned_credits = total_earned_credits + p_amount
        WHERE user_id = p_user_id;
    END IF;
    
    -- Record transaction
    INSERT INTO credit_transactions (user_id, type, amount, balance_after, description)
    VALUES (p_user_id, p_type, p_amount, v_new_balance, p_description);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Deduct credits from user
-- ============================================
CREATE OR REPLACE FUNCTION deduct_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    -- Check sufficient balance
    SELECT credits_balance INTO v_new_balance 
    FROM user_credits 
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    IF v_new_balance IS NULL OR v_new_balance < p_amount THEN
        RETURN FALSE;
    END IF;
    
    v_new_balance := v_new_balance - p_amount;
    
    UPDATE user_credits 
    SET credits_balance = v_new_balance,
        total_spent_credits = total_spent_credits + p_amount
    WHERE user_id = p_user_id;
    
    -- Record transaction
    INSERT INTO credit_transactions (user_id, type, amount, balance_after, description)
    VALUES (p_user_id, 'usage', -p_amount, v_new_balance, p_description);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Handle subscription renewal
-- ============================================
CREATE OR REPLACE FUNCTION handle_subscription_renewal()
RETURNS trigger AS $$
BEGIN
    IF NEW.current_cycle_start >= NEW.current_cycle_end THEN
        -- Reset credits for new cycle
        UPDATE user_credits 
        SET credits_balance = credits_balance + (
            SELECT monthly_credits FROM subscription_plans WHERE id = NEW.plan_id
        )
        WHERE user_id = NEW.user_id;
        
        -- Record the credit addition
        INSERT INTO credit_transactions (user_id, type, amount, balance_after, description)
        SELECT 
            NEW.user_id,
            'subscription',
            sp.monthly_credits,
            uc.credits_balance + sp.monthly_credits,
            'Monthly subscription renewal: ' || sp.name
        FROM subscription_plans sp
        CROSS JOIN user_credits uc
        WHERE sp.id = NEW.plan_id AND uc.user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscription_renewal_trigger
BEFORE UPDATE ON user_subscriptions
FOR EACH ROW EXECUTE FUNCTION handle_subscription_renewal();

-- ============================================
-- FUNCTION: Track AI usage
-- ============================================
CREATE OR REPLACE FUNCTION track_ai_usage(
    p_user_id UUID,
    p_provider VARCHAR(50),
    p_model VARCHAR(100),
    p_input_tokens INTEGER,
    p_output_tokens INTEGER,
    p_credits_deducted INTEGER,
    p_cost_pence DECIMAL(10,2)
)
RETURNS void AS $$
BEGIN
    INSERT INTO ai_usage (user_id, provider, model, input_tokens, output_tokens, credits_deducted, cost_pence)
    VALUES (p_user_id, p_provider, p_model, p_input_tokens, p_output_tokens, p_credits_deducted, p_cost_pence);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
