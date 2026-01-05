import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { host, port, database, user, password } = body;

    if (!host || !port || !database || !user) {
      return NextResponse.json(
        { error: 'Database configuration is required' },
        { status: 400 }
      );
    }

    const { Pool } = await import('pg');
    const pool = new Pool({
      host,
      port,
      database,
      user,
      password,
      connectionTimeoutMillis: 30000,
    });

    // Read and execute schema
    const schemaPath = path.join(process.cwd(), 'supabase', 'schema-pg.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error('Schema file not found');
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema in batches (split by semicolons)
    const statements = schema.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement);
        } catch (err: any) {
          // Ignore "already exists" errors
          if (!err.message.includes('already exists') && !err.message.includes('duplicate key')) {
            console.warn('Schema statement warning:', err.message);
          }
        }
      }
    }
    
    await pool.end();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Database initialization failed:', error);
    return NextResponse.json(
      { error: 'Database initialization failed: ' + error.message },
      { status: 500 }
    );
  }
}
