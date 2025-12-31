import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase/admin';

// GET /api/billing/subscription - Get user's subscription
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseService();
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's subscription with tier details
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        tier:subscription_tiers(*)
      `)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No subscription found, return default
        const { data: defaultTier } = await supabase
          .from('subscription_tiers')
          .select('*')
          .eq('id', 'free')
          .single();

        return NextResponse.json({
          subscription: {
            user_id: user.id,
            tier_id: 'free',
            tier: defaultTier,
            status: 'active',
            subscription_mode: 'credits',
            credits_balance: 0,
            credits_this_cycle: 0,
          },
        });
      }
      console.error('Error fetching subscription:', error);
      return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
    }

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error('Subscription GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/billing/subscription - Create or update subscription
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseService();
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tier_id, subscription_mode = 'credits' } = body;

    // Validate tier exists
    const { data: tier, error: tierError } = await supabase
      .from('subscription_tiers')
      .select('*')
      .eq('id', tier_id)
      .eq('is_active', true)
      .single();

    if (tierError || !tier) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Check if subscription already exists
    const { data: existing, error: existingError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const now = new Date();
    const cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    if (existing) {
      // Update existing subscription
      const { data: updated, error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          tier_id,
          subscription_mode,
          status: 'active',
          current_cycle_end: cycleEnd.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', existing.id)
        .select('*, tier:subscription_tiers(*)')
        .single();

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
      }

      return NextResponse.json({ subscription: updated });
    }

    // Create new subscription
    const { data: newSubscription, error: createError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: user.id,
        tier_id,
        subscription_mode,
        status: 'active',
        credits_balance: tier.monthly_credits,
        credits_this_cycle: 0,
        current_cycle_start: now.toISOString(),
        current_cycle_end: cycleEnd.toISOString(),
      })
      .select('*, tier:subscription_tiers(*)')
      .single();

    if (createError) {
      console.error('Error creating subscription:', createError);
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
    }

    return NextResponse.json({ subscription: newSubscription });
  } catch (error) {
    console.error('Subscription POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/billing/subscription - Update subscription mode (credits/byok)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabaseService();
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subscription_mode, tier_id } = body;

    if (!['credits', 'byok'].includes(subscription_mode)) {
      return NextResponse.json({ error: 'Invalid subscription mode' }, { status: 400 });
    }

    // Check if subscription exists
    const { data: existing, error: existingError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }

    // Update subscription mode
    const updateData: Record<string, unknown> = {
      subscription_mode,
      updated_at: new Date().toISOString(),
    };

    if (tier_id) {
      // Also update tier if provided
      const { data: tier } = await supabase
        .from('subscription_tiers')
        .select('monthly_credits')
        .eq('id', tier_id)
        .single();

      if (tier) {
        updateData.tier_id = tier_id;
        // Reset credits if switching to credits mode
        if (subscription_mode === 'credits') {
          updateData.credits_balance = tier.monthly_credits;
          updateData.credits_this_cycle = 0;
        }
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('user_subscriptions')
      .update(updateData)
      .eq('id', existing.id)
      .select('*, tier:subscription_tiers(*)')
      .single();

    if (updateError) {
      console.error('Error updating subscription mode:', updateError);
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
    }

    return NextResponse.json({ subscription: updated });
  } catch (error) {
    console.error('Subscription PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/billing/subscription - Cancel subscription
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseService();
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cancel subscription - move to free tier
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        tier_id: 'free',
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error cancelling subscription:', updateError);
      return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Subscription cancelled' });
  } catch (error) {
    console.error('Subscription DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
