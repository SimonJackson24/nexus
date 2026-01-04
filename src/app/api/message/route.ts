import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { query } from '@/lib/db';

// GET /api/message - List messages in a chat
export async function GET(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chat_id');

    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    // Verify chat ownership
    const chatResult = await query(
      `SELECT id FROM chats WHERE id = $1 AND user_id = $2`,
      [chatId, userId]
    );

    if (chatResult.rows.length === 0) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const result = await query(
      `SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at ASC`,
      [chatId]
    );

    return NextResponse.json({ messages: result.rows || [] });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST /api/message - Create a new message
export async function POST(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    const body = await request.json();
    const { chat_id, role, content, provider, model } = body;

    if (!chat_id || !role || !content) {
      return NextResponse.json(
        { error: 'Chat ID, role, and content are required' },
        { status: 400 }
      );
    }

    // Verify chat ownership
    const chatResult = await query(
      `SELECT id FROM chats WHERE id = $1 AND user_id = $2`,
      [chat_id, userId]
    );

    if (chatResult.rows.length === 0) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const result = await query(
      `INSERT INTO messages (chat_id, role, content, provider, model)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [chat_id, role, content, provider || null, model || null]
    );

    return NextResponse.json({ message: result.rows[0] });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
  }
}

// DELETE /api/message - Delete a message
export async function DELETE(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
  }

  try {
    // Verify message ownership through chat
    const messageResult = await query(
      `SELECT m.id FROM messages m
       JOIN chats c ON m.chat_id = c.id
       WHERE m.id = $1 AND c.user_id = $2`,
      [id, userId]
    );

    if (messageResult.rows.length === 0) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    await query(`DELETE FROM messages WHERE id = $1`, [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
