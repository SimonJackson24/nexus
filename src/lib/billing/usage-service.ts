// Usage tracking service
import { query } from '@/lib/db';

// Default model rates (credits per 1k tokens)
export const DEFAULT_MODEL_RATES = {
  'gpt-4': { input: 10, output: 30 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'claude-3-opus': { input: 15, output: 75 },
  'claude-3-sonnet': { input: 3, output: 15 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'minimax-2': { input: 0.5, output: 1.5 },
  'minimax-2.1': { input: 0.5, output: 1.5 },
};

// Get user subscription
export async function getUserSubscription(userId: string) {
  try {
    const result = await query(
      `SELECT us.*, st.name as tier_name, st.monthly_credits
       FROM user_subscriptions us
       LEFT JOIN subscription_tiers st ON us.tier_id = st.id
       WHERE us.user_id = $1 AND us.status = 'active'
       ORDER BY us.created_at DESC LIMIT 1`,
      [userId]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting subscription:', error);
    return null;
  }
}

// Record AI usage
export async function recordUsage(record: {
  userId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  creditsDeducted: number;
  chatId?: string;
}) {
  try {
    // Insert usage record
    await query(
      `INSERT INTO ai_usage (user_id, provider, model, input_tokens, output_tokens, credits_deducted, chat_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [record.userId, record.provider, record.model, record.inputTokens, record.outputTokens, record.creditsDeducted, record.chatId || null]
    );

    // Deduct credits from subscription
    await query(
      `UPDATE user_subscriptions 
       SET credits_balance = credits_balance - $1, updated_at = NOW()
       WHERE user_id = $2 AND status = 'active'`,
      [record.creditsDeducted, record.userId]
    );

    return { success: true };
  } catch (error) {
    console.error('Error recording usage:', error);
    return { success: false, error: 'Failed to record usage' };
  }
}

// Get usage history
export async function getUsageHistory(
  userId: string,
  options: { startDate?: Date; endDate?: Date; limit?: number } = {}
) {
  try {
    let text = `SELECT * FROM ai_usage WHERE user_id = $1`;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (options.startDate) {
      text += ` AND created_at >= $${paramIndex}`;
      params.push(options.startDate);
      paramIndex++;
    }

    if (options.endDate) {
      text += ` AND created_at <= $${paramIndex}`;
      params.push(options.endDate);
      paramIndex++;
    }

    text += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(options.limit || 100);

    const result = await query(text, params);
    return result.rows;
  } catch (error) {
    console.error('Error getting usage history:', error);
    return [];
  }
}

// Get usage stats
export async function getUsageStats(userId: string, period: 'day' | 'week' | 'month' = 'month') {
  try {
    const intervalMap = {
      day: 'INTERVAL \'1 day\'',
      week: 'INTERVAL \'1 week\'',
      month: 'INTERVAL \'1 month\'',
    };

    const result = await query(
      `SELECT 
         SUM(input_tokens) as total_input_tokens,
         SUM(output_tokens) as total_output_tokens,
         SUM(credits_deducted) as total_credits_used,
         COUNT(*) as total_requests,
         provider
       FROM ai_usage 
       WHERE user_id = $1 AND created_at >= NOW() - ${intervalMap[period]}
       GROUP BY provider`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting usage stats:', error);
    return [];
  }
}
