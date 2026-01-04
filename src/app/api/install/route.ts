import { NextRequest, NextResponse } from 'next/server';
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

// POST /api/install - Generic handler that delegates to sub-routes
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const action = url.pathname.split('/').pop();

  // Import and delegate to appropriate handler
  switch (action) {
    case 'test-connection':
      return handleTestConnection(request);
    case 'init-database':
      return handleInitDatabase(request);
    case 'create-admin':
      return handleCreateAdmin(request);
    case 'save-config':
      return handleSaveConfig(request);
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 404 });
  }
}

async function handleTestConnection(request: NextRequest) {
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

async function handleInitDatabase(request: NextRequest) {
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

async function handleCreateAdmin(request: NextRequest) {
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
    const configPath = path.join(process.cwd(), '.env.nexus');
    if (!fs.existsSync(configPath)) {
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

async function handleSaveConfig(request: NextRequest) {
  try {
    const body = await request.json();
    const { database, ai, redis, github, email, branding, features, nexusSecret } = body;

    if (!database || !nexusSecret) {
      return NextResponse.json(
        { error: 'Database and secret key are required' },
        { status: 400 }
      );
    }

    // Build config content
    let configContent = `# Nexus Configuration
# Generated by installation wizard
# Generated at: ${new Date().toISOString()}

# ================================================
# DATABASE (PostgreSQL)
# ================================================
DATABASE_HOST=${database.host}
DATABASE_PORT=${database.port}
DATABASE_NAME=${database.name}
DATABASE_USER=${database.user}
DATABASE_PASSWORD=${database.password}

# ================================================
# NEXUS AUTH
# ================================================
NEXUS_SECRET_KEY=${nexusSecret}

# ================================================
# AI PROVIDERS (Optional)
# ================================================
`;

    if (ai?.openaiKey) {
      configContent += `OPENAI_API_KEY=${ai.openaiKey}\n`;
    }
    if (ai?.anthropicKey) {
      configContent += `ANTHROPIC_API_KEY=${ai.anthropicKey}\n`;
    }
    if (ai?.minimaxKey) {
      configContent += `MINIMAX_API_KEY=${ai.minimaxKey}\n`;
    }

    configContent += `
# ================================================
# REDIS CACHE (Optional)
# ================================================
REDIS_HOST=${redis?.host || 'localhost'}
REDIS_PORT=${redis?.port || '6379'}
REDIS_PASSWORD=${redis?.password || ''}
REDIS_KEY_PREFIX=${redis?.keyPrefix || 'nexus:'}

# ================================================
# GITHUB OAUTH (Optional)
# ================================================
GITHUB_CLIENT_ID=${github?.clientId || ''}
GITHUB_CLIENT_SECRET=${github?.clientSecret || ''}
GITHUB_REDIRECT_URI=${github?.redirectUri || 'http://localhost:3000/api/github/callback'}

# ================================================
# EMAIL PROVIDER (Optional)
# ================================================
EMAIL_HOST=${email?.host || ''}
EMAIL_PORT=${email?.port || '587'}
EMAIL_USER=${email?.user || ''}
EMAIL_PASSWORD=${email?.password || ''}
EMAIL_FROM_NAME=${email?.fromName || 'Nexus AI'}
EMAIL_FROM_EMAIL=${email?.fromEmail || 'noreply@nexus.local'}
EMAIL_PROVIDER=${email?.provider || 'smtp'}

# ================================================
# SITE BRANDING
# ================================================
SITE_NAME=${branding?.siteName || 'Nexus AI'}
SITE_DESCRIPTION=${branding?.siteDescription || 'AI-Powered Development Platform'}
SITE_LOGO=${branding?.siteLogo || '/favicon.ico'}
PRIMARY_COLOR=${branding?.primaryColor || '#8b5cf6'}
SECONDARY_COLOR=${branding?.secondaryColor || '#3b82f6'}
ACCENT_COLOR=${branding?.accentColor || '#06b6d4'}
FOOTER_TEXT=${branding?.footerText || 'Powered by Nexus AI'}

# ================================================
# FEATURES
# ================================================
ALLOW_REGISTRATION=${features?.allowRegistration ? 'true' : 'false'}
ENABLE_BILLING=${features?.enableBilling ? 'true' : 'false'}
ENABLE_GITHUB_INTEGRATION=${features?.enableGithubIntegration ? 'true' : 'false'}
`;

    // Write to config file
    const configPath = path.join(process.cwd(), '.env.nexus');
    fs.writeFileSync(configPath, configContent, 'utf8');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving config:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}
