// Credit Package type
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

// Subscription Plan type
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  monthly_credits: number;
  price_pence_monthly: number;
  currency: string;
  is_active: boolean;
  sort_order: number;
}

// User Credits type
export interface UserCredits {
  user_id: string;
  credits_balance: number;
  total_earned_credits: number;
  total_spent_credits: number;
}

// Credit Transaction type
export interface CreditTransaction {
  id: string;
  user_id: string;
  type: 'purchase' | 'subscription' | 'bonus' | 'refund' | 'usage';
  amount: number;
  balance_after: number;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// User Subscription type
export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  plan?: SubscriptionPlan;
  status: 'active' | 'cancelled' | 'past_due' | 'paused';
  credits_this_cycle: number;
  current_cycle_start: string;
  current_cycle_end: string;
  cancelled_at: string | null;
}

// Payment type
export interface Payment {
  id: string;
  user_id: string;
  provider: 'revolut' | 'stripe' | 'manual';
  amount_pence: number;
  currency: string;
  status: string;
  revolut_order_id: string | null;
  revolut_payment_id: string | null;
  created_at: string;
}

// AI Usage type
export interface AIUsage {
  id: string;
  user_id: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  credits_deducted: number;
  cost_pence: number;
  created_at: string;
}

// User Summary type
export interface UserSummary {
  user_id: string;
  email: string;
  credits_balance: number;
  total_earned_credits: number;
  total_spent_credits: number;
  active_subscription: {
    plan_name: string;
    status: string;
    credits_this_cycle: number;
    cycle_end: string;
  } | null;
  total_tokens_used: number;
  total_requests: number;
}

// Pricing display helper
export function formatPrice(pricePence: number, currency: string = 'GBP'): string {
  const pounds = pricePence / 100;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency,
  }).format(pounds);
}

// Calculate credits needed for AI request
export function calculateCreditsNeeded(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  // Credit rates per 1K tokens
  const rates: Record<string, number> = {
    // OpenAI
    'gpt-4-turbo-preview': 10, // 10 credits per 1K tokens
    'gpt-4': 30,
    'gpt-3.5-turbo': 1,
    // Anthropic
    'claude-opus-4-20240307': 15,
    'claude-sonnet-4-20250514': 3,
    'claude-haiku-3-20250514': 1,
    // MiniMax
    'abab6.5s-chat': 1,
    'abab6.5-chat': 1,
  };

  const rate = rates[model] || 5; // Default rate
  const totalTokens = inputTokens + outputTokens;
  return Math.ceil((totalTokens / 1000) * rate);
}
