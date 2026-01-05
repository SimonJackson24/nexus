import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { host, port, database, user, password } = body;

    if (!host || !port || !database || !user) {
      return NextResponse.json(
        { error: 'All database fields are required' },
        { status: 400 }
      );
    }

    const { Pool } = await import('pg');
    const testPool = new Pool({
      host,
      port,
      database,
      user,
      password,
      connectionTimeoutMillis: 5000,
    });

    await testPool.query('SELECT 1');
    await testPool.end();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Database connection test failed:', error);
    return NextResponse.json(
      { error: 'Database connection failed: ' + error.message },
      { status: 500 }
    );
  }
}
