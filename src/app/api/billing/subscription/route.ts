import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { query } from '@/lib/db';

// GET /api/billing/subscription - Get user's subscription
export async function GET(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    // Fetch user's subscription with tier details
    const result = await query(
      `SELECT us.*, st.* 
       FROM user_subscriptions us
       LEFT JOIN subscription_tiers st ON us.tier_id = st.id
       WHERE us.user_id = $1
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // No subscription found, return default free tier
      const defaultTierResult = await query(
        'SELECT * FROM subscription_tiers WHERE id = $1',
        ['free']
      );

      return NextResponse.json({
        subscription: {
          user_id: userId,
          tier_id: 'free',
          tier: defaultTierResult.rows[0] || null,
          status: 'active',
          subscription_mode: 'credits',
          credits_balance: 0,
          credits_this_cycle: 0,
        },
      });
    }

    const subscription = result.rows[0];
    return NextResponse.json({
      subscription: {
        id: subscription.id,
        user_id: subscription.user_id,
        tier_id: subscription.tier_id,
        status: subscription.status,
        subscription_mode: subscription.subscription_mode,
        credits_balance: subscription.credits_balance,
        credits_this_cycle: subscription.credits_this_cycle,
        current_cycle_start: subscription.current_cycle_start,
        current_cycle_end: subscription.current_cycle_end,
        tier: {
          id: subscription.tier_id,
          name: subscription.name,
          price_pence_monthly: subscription.price_pence_monthly,
          monthly_credits: subscription.monthly_credits,
          currency: subscription.currency,
          is_active: subscription.is_active,
        },
      },
    });
  } catch (error) {
    console.error('Subscription GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/billing/subscription - Create or update subscription
export async function POST(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    const body = await request.json();
    const { tier_id, subscription_mode = 'credits' } = body;

    // Validate tier exists
    const tierResult = await query(
      'SELECT * FROM subscription_tiers WHERE id = $1 AND is_active = true',
      [tier_id]
    );

    const tier = tierResult.rows[0];

    if (!tier) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Check if subscription already exists
    const existingResult = await query(
      'SELECT * FROM user_subscriptions WHERE user_id = $1',
      [userId]
    );

    const existing = existingResult.rows[0];
    const now = new Date();
    const cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    if (existing) {
      // Update existing subscription
      const updatedResult = await query(
        `UPDATE user_subscriptions
         SET tier_id = $1, subscription_mode = $2, status = $3, 
             current_cycle_end = $4, updated_at = $5
         WHERE id = $6
         RETURNING *`,
        [tier_id, subscription_mode, 'active', cycleEnd.toISOString(), now.toISOString(), existing.id]
      );

      const updated = updatedResult.rows[0];

      return NextResponse.json({
        subscription: {
          ...updated,
          tier,
        },
      });
    }

    // Create new subscription
    const newResult = await query(
      `INSERT INTO user_subscriptions 
       (user_id, tier_id, subscription_mode, status, credits_balance, credits_this_cycle, 
        current_cycle_start, current_cycle_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        tier_id,
        subscription_mode,
        'active',
        tier.monthly_credits,
        0,
        now.toISOString(),
        cycleEnd.toISOString(),
      ]
    );

    const newSubscription = newResult.rows[0];

    return NextResponse.json({
      subscription: {
        ...newSubscription,
        tier,
      },
    });
  } catch (error) {
    console.error('Subscription POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/billing/subscription - Update subscription mode (credits/byok)
export async function PATCH(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    const body = await request.json();
    const { subscription_mode, tier_id } = body;

    if (!['credits', 'byok'].includes(subscription_mode)) {
      return NextResponse.json({ error: 'Invalid subscription mode' }, { status: 400 });
    }

    // Check if subscription exists
    const existingResult = await query(
      'SELECT * FROM user_subscriptions WHERE user_id = $1',
      [userId]
    );

    const existing = existingResult.rows[0];

    if (!existing) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }

    const updateFields: string[] = ['subscription_mode = $1', 'updated_at = $2'];
    const updateValues: any[] = [subscription_mode, new Date().toISOString()];
    let paramIndex = 3;

    if (tier_id) {
      // Also update tier if provided
      const tierResult = await query(
        'SELECT monthly_credits FROM subscription_tiers WHERE id = $1',
        [tier_id]
      );

      const tier = tierResult.rows[0];

      if (tier) {
        updateFields.push(`tier_id = $${paramIndex++}`);
        updateValues.push(tier_id);
        // Reset credits if switching to credits mode
        if (subscription_mode === 'credits') {
          updateFields.push(`credits_balance = $${paramIndex++}`);
          updateValues.push(tier.monthly_credits);
          updateFields.push(`credits_this_cycle = $${paramIndex}`);
          updateValues.push(0);
        }
      }
    }

    updateValues.push(existing.id);

    await query(
      `UPDATE user_subscriptions SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
      updateValues
    );

    // Fetch updated with tier
    const updatedResult = await query(
      `SELECT us.*, st.* 
       FROM user_subscriptions us
       LEFT JOIN subscription_tiers st ON us.tier_id = st.id
       WHERE us.id = $1`,
      [existing.id]
    );

    const updated = updatedResult.rows[0];

    return NextResponse.json({
      subscription: {
        ...updated,
        tier: {
          id: updated.tier_id,
          name: updated.name,
          monthly_credits: updated.monthly_credits,
        },
      },
    });
  } catch (error) {
    console.error('Subscription PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/billing/subscription - Cancel subscription
export async function DELETE(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    // Cancel subscription - move to free tier
    await query(
      `UPDATE user_subscriptions
       SET tier_id = 'free', status = 'cancelled', cancelled_at = $1, updated_at = $1
       WHERE user_id = $2`,
      [new Date().toISOString(), userId]
    );

    return NextResponse.json({ success: true, message: 'Subscription cancelled' });
  } catch (error) {
    console.error('Subscription DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
