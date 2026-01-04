import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/billing/plans - Get available subscription plans
export async function GET(request: NextRequest) {
  try {
    const result = await query(
      `SELECT * FROM subscription_tiers WHERE is_active = true ORDER BY sort_order ASC`
    );

    return NextResponse.json({ plans: result.rows || [] });
  } catch (error) {
    console.error('Plans GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
