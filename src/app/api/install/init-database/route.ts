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

    // Read schema - look in multiple locations (db-schema is the new name, not supabase)
    const possiblePaths = [
      path.join(process.cwd(), 'schema.sql'),
      path.join(process.cwd(), 'db-schema', 'schema-pg.sql'),
      path.join(process.cwd(), 'db-schema', 'schema.sql'),
    ];

    let schemaPath = possiblePaths.find(p => fs.existsSync(p));
    
    if (!schemaPath) {
      throw new Error('Schema file not found. Looked for: ' + possiblePaths.join(', '));
    }

    console.log('Using schema file:', schemaPath);
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema in batches (split by semicolons)
    const statements = schema.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement);
        } catch (err: any) {
          // Ignore "already exists" errors
          if (!err.message.includes('already exists') && !err.message.includes('duplicate key') && !err.message.includes('no results to return')) {
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
