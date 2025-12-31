import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encryptApiKey, validateApiKey, maskApiKey } from '@/lib/billing/api-key-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET /api/billing/api-keys - List user's API keys
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's API keys (without the encrypted key)
    const { data: keys, error } = await supabase
      .from('user_api_keys')
      .select(`
        id,
        provider,
        key_name,
        is_active,
        last_used_at,
        rate_limit_per_minute,
        last_validated_at,
        is_valid,
        validation_error,
        created_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching API keys:', error);
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
    }

    // Mask the keys (we don't return the actual key, just masked version if needed)
    const maskedKeys = keys?.map(key => ({
      ...key,
      key_mask: key.key_name || `${key.provider}-••••`,
    })) || [];

    return NextResponse.json({ keys: maskedKeys });
  } catch (error) {
    console.error('API keys GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/billing/api-keys - Add a new API key
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    const { data: newKey, error } = await supabase
      .from('user_api_keys')
      .insert({
        user_id: user.id,
        provider,
        encrypted_key: encryptedKey,
        key_name: key_name || null,
        rate_limit_per_minute: rate_limit_per_minute || validation.rate_limit || 60,
        last_validated_at: new Date().toISOString(),
        is_valid: true,
      })
      .select('id, provider, key_name, is_active, rate_limit_per_minute, created_at')
      .single();

    if (error) {
      console.error('Error storing API key:', error);
      return NextResponse.json({ error: 'Failed to store API key' }, { status: 500 });
    }

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
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 });
    }

    // Verify the key belongs to the user
    const { data: existingKey, error: fetchError } = await supabase
      .from('user_api_keys')
      .select('id, user_id')
      .eq('id', keyId)
      .single();

    if (fetchError || !existingKey) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    if (existingKey.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the key
    const { error: deleteError } = await supabase
      .from('user_api_keys')
      .delete()
      .eq('id', keyId);

    if (deleteError) {
      console.error('Error deleting API key:', deleteError);
      return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API keys DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/billing/api-keys - Update key settings (activate/deactivate)
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { key_id, is_active, key_name, rate_limit_per_minute } = body;

    if (!key_id) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 });
    }

    // Verify the key belongs to the user
    const { data: existingKey, error: fetchError } = await supabase
      .from('user_api_keys')
      .select('id, user_id')
      .eq('id', key_id)
      .single();

    if (fetchError || !existingKey) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    if (existingKey.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update the key
    const updateData: Record<string, unknown> = {};
    if (typeof is_active === 'boolean') updateData.is_active = is_active;
    if (key_name !== undefined) updateData.key_name = key_name;
    if (rate_limit_per_minute !== undefined) updateData.rate_limit_per_minute = rate_limit_per_minute;

    const { data: updatedKey, error: updateError } = await supabase
      .from('user_api_keys')
      .update(updateData)
      .eq('id', key_id)
      .select('id, provider, key_name, is_active, rate_limit_per_minute, updated_at')
      .single();

    if (updateError) {
      console.error('Error updating API key:', updateError);
      return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 });
    }

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
