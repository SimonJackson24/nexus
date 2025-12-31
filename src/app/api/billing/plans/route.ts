import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/billing/plans - Get available subscription plans
export async function GET() {
  try {
    const supabase = createClient();
    
    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      throw error;
    }

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}
