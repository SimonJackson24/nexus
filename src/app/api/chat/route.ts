import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { query } from '@/lib/db';

// GET /api/chat - List user's chats
export async function GET(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folder_id');
    const archived = searchParams.get('archived') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let text = `
      SELECT 
        c.*,
        ap.id as agent_id,
        ap.name as agent_name,
        ap.description as agent_description,
        ap.avatar as agent_avatar,
        ap.color as agent_color,
        ap.provider as agent_provider,
        ap.model as agent_model
      FROM chats c
      LEFT JOIN agent_profiles ap ON c.agent_id = ap.id
      WHERE c.user_id = $1 AND c.is_archived = $2
    `;
    
    const params: any[] = [userId, archived];
    let paramIndex = 3;

    if (folderId) {
      text += ` AND c.folder_id = $${paramIndex}`;
      params.push(folderId);
      paramIndex++;
    }

    text += ` ORDER BY c.last_message_at DESC NULLS LAST LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(text, params);

    // Get total count
    let countText = `SELECT COUNT(*) FROM chats WHERE user_id = $1 AND is_archived = $2`;
    const countParams = [userId, archived];
    if (folderId) {
      countText += ` AND folder_id = $3`;
      countParams.push(folderId);
    }
    const countResult = await query(countText, countParams);
    const count = parseInt(countResult.rows[0]?.count || '0');

    // Transform agent data structure
    const chats = (result.rows || []).map((row: any) => ({
      ...row,
      agent: row.agent_id ? {
        id: row.agent_id,
        name: row.agent_name,
        description: row.agent_description,
        avatar: row.agent_avatar,
        color: row.agent_color,
        provider: row.agent_provider,
        model: row.agent_model,
      } : null,
    }));

    return NextResponse.json({
      chats,
      count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chats' },
      { status: 500 }
    );
  }
}

// POST /api/chat - Create a new chat
export async function POST(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    const body = await request.json();
    const { title, agent_id, provider, model, folder_id } = body;

    const result = await query(
      `INSERT INTO chats (user_id, title, agent_id, provider, model, folder_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, title || 'New Chat', agent_id || null, provider || null, model || null, folder_id || null]
    );

    const chat = result.rows[0];

    return NextResponse.json({ chat });
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json(
      { error: 'Failed to create chat' },
      { status: 500 }
    );
  }
}
