import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET /api/billing/tiers - Get available subscription tiers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeHidden = searchParams.get('include_hidden') === 'true';

    let query = supabase
      .from('subscription_tiers')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (!includeHidden) {
      query = query.neq('id', 'hidden'); // Filter out hidden tiers if any
    }

    const { data: tiers, error } = await query;

    if (error) {
      console.error('Error fetching tiers:', error);
      return NextResponse.json({ error: 'Failed to fetch tiers' }, { status: 500 });
    }

    return NextResponse.json({ tiers });
  } catch (error) {
    console.error('Tiers GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
