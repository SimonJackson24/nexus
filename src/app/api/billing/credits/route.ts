import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { query } from '@/lib/db';

// GET /api/billing/credits - Get user credits and transactions
export async function GET(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    // Get user credits (simplified - credits stored in user_subscriptions)
    const subResult = await query(
      `SELECT us.credits_balance, us.subscription_mode, st.name as tier_name, st.monthly_credits
       FROM user_subscriptions us
       LEFT JOIN subscription_tiers st ON us.tier_id = st.id
       WHERE us.user_id = $1 AND us.status = 'active'`,
      [userId]
    );

    const subscription = subResult.rows[0] || {
      credits_balance: 0,
      subscription_mode: 'credits',
      tier_name: 'Free',
      monthly_credits: 100
    };

    // Get recent transactions
    const txResult = await query(
      `SELECT * FROM credit_transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [userId]
    );

    return NextResponse.json({
      credits: subscription.credits_balance || 0,
      subscription_mode: subscription.subscription_mode,
      tier: subscription.tier_name,
      monthly_credits: subscription.monthly_credits,
      transactions: txResult.rows || []
    });
  } catch (error) {
    console.error('Credits GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
