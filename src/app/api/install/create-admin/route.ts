import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, displayName } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Admin credentials are required' },
        { status: 400 }
      );
    }

    // Get DB config from environment
    const configPath = process.env.NEXUS_CONFIG_PATH 
      ? process.env.NEXUS_CONFIG_PATH
      : path.join(process.cwd(), '.env');
    
    // Check if config file exists and is a file (not a directory - handle Docker mount issues)
    if (!fs.existsSync(configPath) || fs.lstatSync(configPath).isDirectory()) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }
    
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config: Record<string, string> = {};
    configContent.split('\n').forEach((line) => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        config[key.trim()] = valueParts.join('=').trim();
      }
    });

    const { Pool } = await import('pg');
    const pool = new Pool({
      host: config.DATABASE_HOST,
      port: parseInt(config.DATABASE_PORT),
      database: config.DATABASE_NAME,
      user: config.DATABASE_USER,
      password: config.DATABASE_PASSWORD,
      connectionTimeoutMillis: 10000,
    });

    // Hash password and create admin user
    const { hashPassword } = await import('@/lib/auth');
    const hashedPassword = await hashPassword(password);
    
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, display_name, is_admin)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id, email, display_name, is_admin, created_at`,
      [email.toLowerCase(), hashedPassword, displayName || 'Admin']
    );

    await pool.end();

    return NextResponse.json({
      success: true,
      admin: result.rows[0]
    });
  } catch (error: any) {
    console.error('Admin creation failed:', error);
    return NextResponse.json(
      { error: 'Admin creation failed: ' + error.message },
      { status: 500 }
    );
  }
}
