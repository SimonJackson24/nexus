import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/billing/tiers - Get available subscription tiers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeHidden = searchParams.get('include_hidden') === 'true';

    let text = `SELECT * FROM subscription_tiers WHERE is_active = true`;
    
    if (!includeHidden) {
      text += ` AND id != 'hidden'`;
    }
    
    text += ` ORDER BY sort_order ASC`;

    const result = await query(text);

    return NextResponse.json({ tiers: result.rows || [] });
  } catch (error) {
    console.error('Tiers GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
