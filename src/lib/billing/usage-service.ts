// AI Usage Tracking Service
// Handles credit deduction and usage recording

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { DEFAULT_MODEL_RATES } from './hybrid-types';

export interface UsageRecord {
  user_id: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  credits_deducted: number;
  cost_pence: number;
  is_byok: boolean;
  chat_id?: string;
}

export interface CheckResult {
  allowed: boolean;
  reason?: string;
  credits_remaining?: number;
  requires_byok?: boolean;
}

// Get user's subscription and credit balance
export async function getUserSubscription(userId: string) {
  const supabase = getSupabaseAdmin() as any;
  const { data: subscription, error } = await supabase
    .from('user_subscriptions')
    .select(`
      *,
      tier:subscription_tiers(*)
    `)
    .eq('user_id', userId)
    .single();

  if (error || !subscription) {
    return null;
  }

  return subscription;
}

// Check if user can make an AI request
export async function checkUsageEligibility(
  userId: string,
  provider: string,
  model: string,
  estimatedCredits: number
): Promise<CheckResult> {
  const subscription = await getUserSubscription(userId);

  // No subscription = no credits, require BYOK
  if (!subscription) {
    return {
      allowed: false,
      reason: 'No active subscription. Please subscribe or add an API key.',
      requires_byok: true,
    };
  }

  // Check if user is in BYOK mode
  if (subscription.subscription_mode === 'byok') {
    return {
      allowed: true,
      credits_remaining: -1, // Unlimited
    };
  }

  // Check subscription status
  if (subscription.status !== 'active' && subscription.status !== 'trial') {
    return {
      allowed: false,
      reason: 'Subscription is not active',
    };
  }

  // Check if credits are available
  if (subscription.credits_balance < estimatedCredits) {
    return {
      allowed: false,
      reason: `Insufficient credits. Need ${estimatedCredits}, have ${subscription.credits_balance}`,
      credits_remaining: subscription.credits_balance,
    };
  }

  return {
    allowed: true,
    credits_remaining: subscription.credits_balance - estimatedCredits,
  };
}

// Calculate credits needed for a request
export function calculateCredits(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): { credits: number; cost: number } {
  const modelKey = `${provider}:${model}`;
  const rates = DEFAULT_MODEL_RATES[modelKey] || { input: 1, output: 2 };
  
  const inputCredits = Math.ceil((inputTokens / 1000) * rates.input);
  const outputCredits = Math.ceil((outputTokens / 1000) * rates.output);
  const totalCredits = inputCredits + outputCredits;

  // Estimate cost in pence (very rough approximation for tracking)
  const costPerCredit = 0.01;
  const estimatedCost = Math.round(totalCredits * costPerCredit * 100);

  return {
    credits: totalCredits,
    cost: estimatedCost,
  };
}

// Record AI usage and deduct credits
export async function recordUsage(record: UsageRecord): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin() as any;
  try {
    // Insert usage record (credit deduction happens via database trigger)
    const { error: insertError } = await supabase
      .from('ai_usage')
      .insert({
        user_id: record.user_id,
        provider: record.provider,
        model: record.model,
        input_tokens: record.input_tokens,
        output_tokens: record.output_tokens,
        credits_deducted: record.credits_deducted,
        cost_pence: record.cost_pence,
        is_byok: record.is_byok,
        chat_id: record.chat_id || null,
      });

    if (insertError) {
      console.error('Error recording usage:', insertError);
      return { success: false, error: 'Failed to record usage' };
    }

    return { success: true };
  } catch (error) {
    console.error('Usage recording error:', error);
    return { success: false, error: 'Internal error' };
  }
}

// Get usage statistics for a user
export async function getUserUsageStats(
  userId: string,
  startDate?: Date,
  endDate?: Date
) {
  const supabase = getSupabaseAdmin() as any;
  let query = supabase
    .from('ai_usage')
    .select(`
      provider,
      model,
      input_tokens,
      output_tokens,
      credits_deducted,
      is_byok,
      created_at
    `)
    .eq('user_id', userId);

  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }
  if (endDate) {
    query = query.lte('created_at', endDate.toISOString());
  }

  const { data: usage, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching usage stats:', error);
    return null;
  }

  // Aggregate stats
  const stats = {
    total_requests: usage?.length || 0,
    total_input_tokens: 0,
    total_output_tokens: 0,
    total_credits_used: 0,
    byok_requests: 0,
    byok_tokens: 0,
    by_provider: {} as Record<string, { requests: number; tokens: number; credits: number }>,
  };

  usage?.forEach((record: any) => {
    stats.total_input_tokens += record.input_tokens;
    stats.total_output_tokens += record.output_tokens;
    stats.total_credits_used += record.credits_deducted;

    if (record.is_byok) {
      stats.byok_requests += 1;
      stats.byok_tokens += record.input_tokens + record.output_tokens;
    }

    const providerKey = record.provider;
    if (!stats.by_provider[providerKey]) {
      stats.by_provider[providerKey] = { requests: 0, tokens: 0, credits: 0 };
    }
    stats.by_provider[providerKey].requests += 1;
    stats.by_provider[providerKey].tokens += record.input_tokens + record.output_tokens;
    stats.by_provider[providerKey].credits += record.credits_deducted;
  });

  return stats;
}

// Get user's API keys for a provider
export async function getUserApiKeys(userId: string, provider: string) {
  const supabase = getSupabaseAdmin() as any;
  const { data: keys, error } = await supabase
    .from('user_api_keys')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .eq('is_active', true)
    .eq('is_valid', true);

  if (error) {
    console.error('Error fetching API keys:', error);
    return [];
  }

  return keys || [];
}

// Update last_used_at for an API key
export async function updateKeyLastUsed(keyId: string) {
  const supabase = getSupabaseAdmin() as any;
  await supabase
    .from('user_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyId);
}

// Validate and mark a key as invalid
export async function markKeyInvalid(keyId: string, error: string) {
  const supabase = getSupabaseAdmin() as any;
  await supabase
    .from('user_api_keys')
    .update({
      is_valid: false,
      validation_error: error,
      last_validated_at: new Date().toISOString(),
    })
    .eq('id', keyId);
}
