// Hybrid BYOK + Token Subscription Types

// ============================================
// API Key Types
// ============================================

export type ApiProvider = 'openai' | 'anthropic' | 'google' | 'deepseek' | 'openrouter';

export interface UserApiKey {
  id: string;
  user_id: string;
  provider: ApiProvider;
  key_name: string | null;
  is_active: boolean;
  last_used_at: string | null;
  rate_limit_per_minute: number;
  last_validated_at: string | null;
  is_valid: boolean;
  validation_error: string | null;
  created_at: string;
}

export interface ApiKeyCreate {
  provider: ApiProvider;
  api_key: string; // Plain text, will be encrypted
  key_name?: string;
  rate_limit_per_minute?: number;
}

export interface ApiKeyValidation {
  is_valid: boolean;
  error?: string;
  rate_limit?: number;
}

// ============================================
// Subscription Tier Types
// ============================================

export interface SubscriptionTier {
  id: string;
  name: string;
  description: string | null;
  monthly_credits: number; // 0 = BYOK unlimited
  price_pence_monthly: number;
  max_chats: number; // -1 = unlimited
  max_messages_per_chat: number;
  max_storage_gb: number;
  max_integrations: number; // -1 = unlimited
  max_workflows: number; // -1 = unlimited
  max_seats: number;
  has_advanced_analytics: boolean;
  has_priority_support: boolean;
  has_custom_agents: boolean;
  has_sharing: boolean;
  has_api_access: boolean;
  is_active: boolean;
  sort_order: number;
}

// ============================================
// User Subscription Types
// ============================================

export type SubscriptionMode = 'credits' | 'byok';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'paused' | 'trial';

export interface UserSubscription {
  id: string;
  user_id: string;
  tier_id: string;
  tier?: SubscriptionTier;
  status: SubscriptionStatus;
  subscription_mode: SubscriptionMode;
  credits_balance: number;
  credits_this_cycle: number;
  trial_ends_at: string | null;
  current_cycle_start: string;
  current_cycle_end: string | null;
  cancelled_at: string | null;
  created_at: string;
}

// ============================================
// Credit Types
// ============================================

export interface CreditPackage {
  id: string;
  name: string;
  description: string | null;
  credits_amount: number;
  price_pence: number;
  currency: string;
  is_active: boolean;
  sort_order: number;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  type: 'purchase' | 'subscription' | 'bonus' | 'refund' | 'usage' | 'expiration' | 'adjustment';
  amount: number;
  balance_after: number;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ============================================
// AI Usage Types
// ============================================

export interface AIUsage {
  id: string;
  user_id: string;
  provider: ApiProvider | 'byok';
  model: string;
  input_tokens: number;
  output_tokens: number;
  credits_deducted: number;
  cost_pence: number;
  is_byok: boolean;
  chat_id: string | null;
  created_at: string;
}

// ============================================
// Model Rate Types
// ============================================

export interface ModelRate {
  id: string;
  provider: ApiProvider;
  model_id: string;
  credits_per_1k_input: number;
  credits_per_1k_output: number;
  is_active: boolean;
}

// ============================================
// User Summary for Dashboard
// ============================================

export interface UserBillingSummary {
  user_id: string;
  email: string;
  subscription_mode: SubscriptionMode;
  tier?: SubscriptionTier;
  credits_balance: number;
  credits_this_cycle: number;
  total_earned_credits: number;
  total_spent_credits: number;
  active_subscription: {
    status: SubscriptionStatus;
    cycle_end: string | null;
  } | null;
  has_api_keys: boolean;
  total_tokens_used: number;
  total_requests: number;
  byok_usage: {
    requests: number;
    tokens: number;
  };
}

// ============================================
// Pricing Helper Functions
// ============================================

export function formatPrice(pricePence: number, currency: string = 'GBP'): string {
  const pounds = pricePence / 100;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency,
  }).format(pounds);
}

// Calculate credits needed for AI request
export function calculateCreditsNeeded(
  provider: ApiProvider,
  model: string,
  inputTokens: number,
  outputTokens: number,
  rates: Record<string, { input: number; output: number }>
): number {
  const modelKey = `${provider}:${model}`;
  const rate = rates[modelKey] || { input: 1, output: 2 }; // Default rate
  const inputCredits = (inputTokens / 1000) * rate.input;
  const outputCredits = (outputTokens / 1000) * rate.output;
  return Math.ceil(inputCredits + outputCredits);
}

// ============================================
// Default Model Rates
// ============================================

export const DEFAULT_MODEL_RATES: Record<string, { input: number; output: number }> = {
  // OpenAI
  'openai:gpt-4o': { input: 2, output: 6 },
  'openai:gpt-4o-mini': { input: 0.15, output: 0.6 },
  'openai:gpt-4-turbo': { input: 10, output: 30 },
  'openai:gpt-4': { input: 30, output: 90 },
  'openai:gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  // Anthropic
  'anthropic:claude-sonnet-4-20250514': { input: 3, output: 15 },
  'anthropic:claude-haiku-3-20250514': { input: 0.25, output: 1.25 },
  'anthropic:claude-opus-4-20240307': { input: 15, output: 75 },
  // Google
  'google:gemini-1.5-pro': { input: 5, output: 15 },
  'google:gemini-1.5-flash': { input: 0.075, output: 0.3 },
  // DeepSeek
  'deepseek:deepseek-chat': { input: 0.14, output: 0.28 },
};

// ============================================
// Subscription Mode Helper
// ============================================

export function isByokMode(subscription: UserSubscription): boolean {
  return subscription.subscription_mode === 'byok';
}

export function hasUnlimitedCredits(tier: SubscriptionTier): boolean {
  return tier.monthly_credits === 0;
}

export function hasUnlimitedChats(tier: SubscriptionTier): boolean {
  return tier.max_chats === -1;
}

export function hasUnlimitedIntegrations(tier: SubscriptionTier): boolean {
  return tier.max_integrations === -1;
}

export function hasUnlimitedWorkflows(tier: SubscriptionTier): boolean {
  return tier.max_workflows === -1;
}
