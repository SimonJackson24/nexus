import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import fs from 'fs';
import path from 'path';

// Read config from file
function getConfig(): Record<string, string> {
  try {
    const configPath = path.join(process.cwd(), '.env.nexus');
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      const config: Record<string, string> = {};
      content.split('\n').forEach((line) => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          config[key.trim()] = valueParts.join('=').trim();
        }
      });
      return config;
    }
  } catch (error) {
    console.error('Error reading config file:', error);
  }
  return {};
}

const config = getConfig();

// Database configuration
const dbConfig = {
  host: config.DATABASE_HOST || process.env.DATABASE_HOST || 'localhost',
  port: parseInt(config.DATABASE_PORT || process.env.DATABASE_PORT || '5432'),
  database: config.DATABASE_NAME || process.env.DATABASE_NAME || 'nexus',
  user: config.DATABASE_USER || process.env.DATABASE_USER || 'nexus',
  password: config.DATABASE_PASSWORD || process.env.DATABASE_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create connection pool
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(dbConfig);
    
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  return pool;
}

// Query helper
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const pool = getPool();
  return pool.query<T>(text, params);
}

// Get a client for transactions
export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return pool.connect();
}

// Check database connection
export async function checkConnection(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Close pool
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Initialize database schema
// Looks for schema.sql in root first, then falls back to db-schema/schema-pg.sql
export async function initializeDatabase(): Promise<void> {
  const possiblePaths = [
    path.join(process.cwd(), 'schema.sql'),
    path.join(process.cwd(), 'db-schema', 'schema-pg.sql'),
  ];
  
  const schemaPath = possiblePaths.find(p => fs.existsSync(p));
  
  if (schemaPath) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await query(schema);
    console.log('Database schema initialized successfully from:', schemaPath);
  } else {
    throw new Error('Schema file not found. Looked in: ' + possiblePaths.join(', '));
  }
}

// Transaction helper
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
