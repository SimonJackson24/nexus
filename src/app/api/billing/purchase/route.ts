import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { query } from '@/lib/db';

// POST /api/billing/purchase - Create a purchase order
export async function POST(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
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
      const result = await query(
        'SELECT * FROM credit_packages WHERE id = $1',
        [package_id]
      );
      item = result.rows[0];
    } else if (plan_id) {
      const result = await query(
        'SELECT * FROM subscription_tiers WHERE id = $1',
        [plan_id]
      );
      item = result.rows[0];
    }

    if (!item) {
      return NextResponse.json(
        { error: 'Package or plan not found' },
        { status: 404 }
      );
    }

    // Create payment record
    const amountPence = package_id ? item.price_pence : item.price_pence_monthly;
    const credits = package_id ? item.credits_amount : item.monthly_credits;

    const result = await query(
      `INSERT INTO payments (user_id, provider, amount_pence, currency, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userId,
        'revolut',
        amountPence,
        item.currency || 'GBP',
        'pending',
        JSON.stringify({
          package_id: package_id || null,
          plan_id: plan_id || null,
          credits,
          item_name: item.name,
        }),
      ]
    );

    const payment = result.rows[0];

    // In production, create Revolut order here
    const siteUrl = process.env.SITE_URL || 'http://localhost:3000';

    return NextResponse.json({
      payment_id: payment.id,
      amount: payment.amount_pence,
      currency: payment.currency,
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
