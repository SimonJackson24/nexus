import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { query } from '@/lib/db';
import { encryptApiKey, validateApiKey } from '@/lib/billing/api-key-service';

// GET /api/billing/api-keys - List user's API keys
export async function GET(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    const result = await query(
      `SELECT id, provider, key_name, is_active, rate_limit_per_minute, 
              last_validated_at, is_valid, validation_error, created_at
       FROM user_api_keys
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    const maskedKeys = (result.rows || []).map((key: any) => ({
      ...key,
      key_mask: key.key_name || `${key.provider}-••••`,
    }));

    return NextResponse.json({ keys: maskedKeys });
  } catch (error) {
    console.error('API keys GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/billing/api-keys - Add a new API key
export async function POST(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    const body = await request.json();
    const { provider, api_key, key_name, rate_limit_per_minute } = body;

    if (!provider || !api_key) {
      return NextResponse.json(
        { error: 'Provider and API key are required' },
        { status: 400 }
      );
    }

    // Validate the API key with the provider
    const validation = await validateApiKey(provider, api_key);

    if (!validation.is_valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid API key', validation_failed: true },
        { status: 400 }
      );
    }

    // Encrypt the API key
    const encryptedKey = encryptApiKey(api_key);

    // Store the key in the database
    const result = await query(
      `INSERT INTO user_api_keys (user_id, provider, encrypted_key, key_name, rate_limit_per_minute, last_validated_at, is_valid)
       VALUES ($1, $2, $3, $4, $5, NOW(), TRUE)
       RETURNING id, provider, key_name, is_active, rate_limit_per_minute, created_at`,
      [userId, provider, encryptedKey, key_name || null, rate_limit_per_minute || validation.rate_limit || 60]
    );

    const newKey = result.rows[0];

    return NextResponse.json({
      success: true,
      key: {
        ...newKey,
        key_mask: newKey.key_name || `${newKey.provider}-••••`,
      },
    });
  } catch (error) {
    console.error('API keys POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/billing/api-keys - Remove an API key
export async function DELETE(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');
  const { searchParams } = new URL(request.url);
  const keyId = searchParams.get('id');

  if (!keyId) {
    return NextResponse.json({ error: 'Key ID is required' }, { status: 400 });
  }

  try {
    // Verify the key belongs to the user
    const existingResult = await query(
      'SELECT id, user_id FROM user_api_keys WHERE id = $1',
      [keyId]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    if (existingResult.rows[0].user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the key
    await query('DELETE FROM user_api_keys WHERE id = $1', [keyId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API keys DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/billing/api-keys - Update key settings
export async function PATCH(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    const body = await request.json();
    const { key_id, is_active, key_name, rate_limit_per_minute } = body;

    if (!key_id) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 });
    }

    // Verify the key belongs to the user
    const existingResult = await query(
      'SELECT id, user_id FROM user_api_keys WHERE id = $1',
      [key_id]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    if (existingResult.rows[0].user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (typeof is_active === 'boolean') {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(is_active);
    }
    if (key_name !== undefined) {
      updates.push(`key_name = $${paramIndex++}`);
      params.push(key_name);
    }
    if (rate_limit_per_minute !== undefined) {
      updates.push(`rate_limit_per_minute = $${paramIndex++}`);
      params.push(rate_limit_per_minute);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    params.push(key_id);

    const result = await query(
      `UPDATE user_api_keys SET ${updates.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, provider, key_name, is_active, rate_limit_per_minute, updated_at`,
      params
    );

    const updatedKey = result.rows[0];

    return NextResponse.json({
      success: true,
      key: {
        ...updatedKey,
        key_mask: updatedKey.key_name || `${updatedKey.provider}-••••`,
      },
    });
  } catch (error) {
    console.error('API keys PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
