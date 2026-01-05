import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcrypt';
import { cookies } from 'next/headers';
import { query } from '../db';
import fs from 'fs';
import path from 'path';

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SessionPayload {
  userId: string;
  email: string;
  isAdmin: boolean;
  exp: number;
}

// Read config from file
function getConfig(): Record<string, string> {
  try {
    // Support NEXUS_CONFIG_PATH environment variable
    const configPath = process.env.NEXUS_CONFIG_PATH 
      ? process.env.NEXUS_CONFIG_PATH
      : path.join(process.cwd(), '.env');
    
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

// JWT secret - must be at least 32 characters
const JWT_SECRET = new TextEncoder().encode(
  config.NEXUS_SECRET_KEY || process.env.NEXUS_SECRET_KEY || 'default-secret-key-change-in-production'
);

const JWT_EXPIRY = '7d'; // 7 days
const SALT_ROUNDS = 12;

// Hash password with bcrypt
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Verify password
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Create JWT token
export async function createToken(payload: Omit<SessionPayload, 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET);
}

// Verify JWT token
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// Register new user
export async function registerUser(
  email: string,
  password: string,
  displayName?: string
): Promise<{ user: User; token: string } | { error: string }> {
  try {
    // Check if user exists
    const existing = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (existing.rows.length > 0) {
      return { error: 'User with this email already exists' };
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Insert user
    const result = await query(
      `INSERT INTO users (email, password_hash, display_name, is_admin)
       VALUES ($1, $2, $3, FALSE)
       RETURNING id, email, display_name, avatar_url, is_admin, created_at, updated_at`,
      [email.toLowerCase(), hashedPassword, displayName || null]
    );

    const user = result.rows[0] as User;

    // Create token
    const token = await createToken({
      userId: user.id,
      email: user.email,
      isAdmin: user.is_admin,
    });

    return { user, token };
  } catch (error) {
    console.error('Registration error:', error);
    return { error: 'Failed to register user' };
  }
}

// Login user
export async function loginUser(
  email: string,
  password: string
): Promise<{ user: User; token: string } | { error: string }> {
  try {
    // Find user
    const result = await query(
      `SELECT id, email, password_hash, display_name, avatar_url, is_admin, created_at, updated_at
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return { error: 'Invalid email or password' };
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return { error: 'Invalid email or password' };
    }

    // Create token
    const token = await createToken({
      userId: user.id,
      email: user.email,
      isAdmin: user.is_admin,
    });

    // Return user without password hash
    const { password_hash, ...safeUser } = user;
    return { user: safeUser as User, token };
  } catch (error) {
    console.error('Login error:', error);
    return { error: 'Failed to login' };
  }
}

// Get current user from request
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('nexus_token')?.value;

    if (!token) {
      return null;
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return null;
    }

    const result = await query(
      `SELECT id, email, display_name, avatar_url, is_admin, created_at, updated_at
       FROM users WHERE id = $1`,
      [payload.userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as User;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

// Get user by ID
export async function getUserById(id: string): Promise<User | null> {
  try {
    const result = await query(
      `SELECT id, email, display_name, avatar_url, is_admin, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as User;
  } catch (error) {
    console.error('Get user by ID error:', error);
    return null;
  }
}

// Update user profile
export async function updateUserProfile(
  userId: string,
  updates: { display_name?: string; avatar_url?: string }
): Promise<User | null> {
  try {
    const result = await query(
      `UPDATE users 
       SET display_name = COALESCE($2, display_name),
           avatar_url = COALESCE($3, avatar_url),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, display_name, avatar_url, is_admin, created_at, updated_at`,
      [userId, updates.display_name, updates.avatar_url]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as User;
  } catch (error) {
    console.error('Update profile error:', error);
    return null;
  }
}

// Change password
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user with password
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'User not found' };
    }

    // Verify current password
    const validPassword = await verifyPassword(currentPassword, result.rows[0].password_hash);
    if (!validPassword) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, userId]
    );

    return { success: true };
  } catch (error) {
    console.error('Change password error:', error);
    return { success: false, error: 'Failed to change password' };
  }
}

// Create admin user (for initial setup)
export async function createAdminUser(
  email: string,
  password: string,
  displayName: string
): Promise<{ user: User; token: string } | { error: string }> {
  try {
    // Check if admin already exists
    const existing = await query(
      'SELECT id FROM users WHERE is_admin = TRUE LIMIT 1'
    );

    if (existing.rows.length > 0) {
      return { error: 'Admin user already exists' };
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Insert admin user
    const result = await query(
      `INSERT INTO users (email, password_hash, display_name, is_admin)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id, email, display_name, avatar_url, is_admin, created_at, updated_at`,
      [email.toLowerCase(), hashedPassword, displayName]
    );

    const user = result.rows[0] as User;
    const token = await createToken({
      userId: user.id,
      email: user.email,
      isAdmin: true,
    });

    return { user, token };
  } catch (error) {
    console.error('Create admin error:', error);
    return { error: 'Failed to create admin user' };
  }
}
