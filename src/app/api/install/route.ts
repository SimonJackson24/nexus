import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// GET /api/install - Check if already configured
export async function GET() {
  try {
    const configPath = path.join(process.cwd(), '.env.nexus');
    const configExists = fs.existsSync(configPath);
    
    return NextResponse.json({
      configured: configExists
    });
  } catch (error) {
    return NextResponse.json(
      { configured: false },
      { status: 500 }
    );
  }
}
