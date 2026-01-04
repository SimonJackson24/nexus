import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { query } from '@/lib/db';

// GET /api/subtask - List user's subtasks
export async function GET(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chat_id');
    const status = searchParams.get('status');

    let text = `SELECT * FROM subtasks WHERE user_id = $1`;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (chatId) {
      text += ` AND chat_id = $${paramIndex}`;
      params.push(chatId);
      paramIndex++;
    }

    if (status) {
      text += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    text += ` ORDER BY created_at DESC`;

    const result = await query(text, params);

    return NextResponse.json({ subtasks: result.rows || [] });
  } catch (error) {
    console.error('Error fetching subtasks:', error);
    return NextResponse.json({ error: 'Failed to fetch subtasks' }, { status: 500 });
  }
}

// POST /api/subtask - Create a new subtask
export async function POST(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    const body = await request.json();
    const { chat_id, parent_message_id, title, description, priority } = body;

    const result = await query(
      `INSERT INTO subtasks (user_id, chat_id, parent_message_id, title, description, priority)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, chat_id, parent_message_id || null, title, description || null, priority || 'medium']
    );

    return NextResponse.json({ subtask: result.rows[0] });
  } catch (error) {
    console.error('Error creating subtask:', error);
    return NextResponse.json({ error: 'Failed to create subtask' }, { status: 500 });
  }
}

// PATCH /api/subtask - Update a subtask
export async function PATCH(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    const body = await request.json();
    const { id, status, title, description, priority } = body;

    // Verify ownership
    const existing = await query(
      `SELECT user_id FROM subtasks WHERE id = $1`,
      [id]
    );

    if (existing.rows.length === 0 || existing.rows[0].user_id !== userId) {
      return NextResponse.json({ error: 'Subtask not found or forbidden' }, { status: 404 });
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    if (title) {
      updates.push(`title = $${paramIndex++}`);
      params.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(description);
    }
    if (priority) {
      updates.push(`priority = $${paramIndex++}`);
      params.push(priority);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    params.push(id);

    const result = await query(
      `UPDATE subtasks SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    return NextResponse.json({ subtask: result.rows[0] });
  } catch (error) {
    console.error('Error updating subtask:', error);
    return NextResponse.json({ error: 'Failed to update subtask' }, { status: 500 });
  }
}

// DELETE /api/subtask - Delete a subtask
export async function DELETE(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Subtask ID is required' }, { status: 400 });
  }

  try {
    // Verify ownership
    const existing = await query(
      `SELECT user_id FROM subtasks WHERE id = $1`,
      [id]
    );

    if (existing.rows.length === 0 || existing.rows[0].user_id !== userId) {
      return NextResponse.json({ error: 'Subtask not found or forbidden' }, { status: 404 });
    }

    await query(`DELETE FROM subtasks WHERE id = $1`, [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting subtask:', error);
    return NextResponse.json({ error: 'Failed to delete subtask' }, { status: 500 });
  }
}
