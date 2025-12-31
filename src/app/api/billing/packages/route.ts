import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/billing/packages - Get available credit packages
export async function GET() {
  try {
    const supabase = createClient();
    
    const { data: packages, error } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      throw error;
    }

    return NextResponse.json({ packages });
  } catch (error) {
    console.error('Error fetching packages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch packages' },
      { status: 500 }
    );
  }
}
