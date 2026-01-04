import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { query } from '@/lib/db';

// GET /api/chat/[id] - Get a chat by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');
  const { id } = await params;

  try {
    // Get chat with agent info
    const chatResult = await query(
      `SELECT c.*, 
              ap.id as agent_id, ap.name as agent_name, ap.description as agent_description,
              ap.avatar as agent_avatar, ap.color as agent_color, ap.provider as agent_provider,
              ap.model as agent_model
       FROM chats c
       LEFT JOIN agent_profiles ap ON c.agent_id = ap.id
       WHERE c.id = $1`,
      [id]
    );

    if (chatResult.rows.length === 0) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const chat = chatResult.rows[0];

    // Verify ownership
    if (chat.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get messages
    const messagesResult = await query(
      `SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    return NextResponse.json({
      chat: {
        ...chat,
        agent: chat.agent_id ? {
          id: chat.agent_id,
          name: chat.agent_name,
          description: chat.agent_description,
          avatar: chat.agent_avatar,
          color: chat.agent_color,
          provider: chat.agent_provider,
          model: chat.agent_model,
        } : null,
      },
      messages: messagesResult.rows || [],
    });
  } catch (error) {
    console.error('Error fetching chat:', error);
    return NextResponse.json({ error: 'Failed to fetch chat' }, { status: 500 });
  }
}

// DELETE /api/chat/[id] - Delete a chat
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');
  const { id } = await params;

  try {
    // Get chat
    const chatResult = await query(
      `SELECT user_id FROM chats WHERE id = $1`,
      [id]
    );

    if (chatResult.rows.length === 0) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Verify ownership
    if (chatResult.rows[0].user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete messages first (cascades from chats table, but do it explicitly)
    await query(`DELETE FROM messages WHERE chat_id = $1`, [id]);

    // Delete chat
    await query(`DELETE FROM chats WHERE id = $1`, [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json({ error: 'Failed to delete chat' }, { status: 500 });
  }
}
