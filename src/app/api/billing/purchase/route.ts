import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/billing/purchase - Create a purchase order
export async function POST(request: Request) {
  try {
    const supabase = createClient() as any;
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { package_id, plan_id } = body;

    if (!package_id && !plan_id) {
      return NextResponse.json(
        { error: 'Package ID or Plan ID is required' },
        { status: 400 }
      );
    }

    // Get package or plan details
    let item;
    if (package_id) {
      const { data: pkg } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('id', package_id)
        .single();
      item = pkg;
    } else if (plan_id) {
      const { data: plan } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('id', plan_id)
        .single();
      item = plan;
    }

    if (!item) {
      return NextResponse.json(
        { error: 'Package or plan not found' },
        { status: 404 }
      );
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        provider: 'revolut',
        amount_pence: package_id ? item.price_pence : item.price_pence_monthly,
        currency: item.currency || 'GBP',
        status: 'pending',
        metadata: {
          package_id: package_id || null,
          plan_id: plan_id || null,
          credits: package_id ? item.credits_amount : item.monthly_credits,
          item_name: item.name,
        },
      })
      .select()
      .single();

    if (paymentError) {
      throw paymentError;
    }

    // In production, create Revolut order here
    // For now, return the payment record
    const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
    
    return NextResponse.json({
      payment_id: payment.id,
      amount: payment.amount_pence,
      currency: payment.currency,
      // In production, this would be the Revolut checkout URL
      checkout_url: `${siteUrl}/billing/checkout?payment_id=${payment.id}`,
    });
  } catch (error) {
    console.error('Error creating purchase:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase' },
      { status: 500 }
    );
  }
}
