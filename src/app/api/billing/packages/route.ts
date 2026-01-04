import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/billing/packages - Get available credit packages
export async function GET(request: NextRequest) {
  try {
    const result = await query(
      `SELECT * FROM credit_packages WHERE is_active = true ORDER BY sort_order ASC`
    );

    return NextResponse.json({ packages: result.rows || [] });
  } catch (error) {
    console.error('Packages GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
