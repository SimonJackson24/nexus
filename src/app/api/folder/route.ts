import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { query } from '@/lib/db';

// GET /api/folder - List user's folders
export async function GET(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    const result = await query(
      `SELECT * FROM folders WHERE user_id = $1 ORDER BY sort_order ASC`,
      [userId]
    );

    return NextResponse.json({ folders: result.rows || [] });
  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch folders' },
      { status: 500 }
    );
  }
}

// POST /api/folder - Create a new folder
export async function POST(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    const body = await request.json();
    const { name, icon, color, parent_id } = body;

    // Get max sort_order
    const lastResult = await query(
      `SELECT sort_order FROM folders WHERE user_id = $1 ORDER BY sort_order DESC LIMIT 1`,
      [userId]
    );

    const sort_order = (lastResult.rows[0]?.sort_order || 0) + 1;

    const result = await query(
      `INSERT INTO folders (user_id, name, icon, color, parent_id, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, name, icon || '📁', color || '#3b82f6', parent_id || null, sort_order]
    );

    return NextResponse.json({ folder: result.rows[0] });
  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    );
  }
}

// PATCH /api/folder - Update a folder
export async function PATCH(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    const body = await request.json();
    const { id, name, icon, color, sort_order } = body;

    // Verify ownership
    const existing = await query(
      `SELECT user_id FROM folders WHERE id = $1`,
      [id]
    );

    if (existing.rows.length === 0 || existing.rows[0].user_id !== userId) {
      return NextResponse.json(
        { error: 'Folder not found or forbidden' },
        { status: 404 }
      );
    }

    const result = await query(
      `UPDATE folders SET name = $1, icon = $2, color = $3, sort_order = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [name, icon, color, sort_order, id]
    );

    return NextResponse.json({ folder: result.rows[0] });
  } catch (error) {
    console.error('Error updating folder:', error);
    return NextResponse.json(
      { error: 'Failed to update folder' },
      { status: 500 }
    );
  }
}

// DELETE /api/folder - Delete a folder
export async function DELETE(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Folder ID is required' },
      { status: 400 }
    );
  }

  try {
    // Verify ownership
    const existing = await query(
      `SELECT user_id FROM folders WHERE id = $1`,
      [id]
    );

    if (existing.rows.length === 0 || existing.rows[0].user_id !== userId) {
      return NextResponse.json(
        { error: 'Folder not found or forbidden' },
        { status: 404 }
      );
    }

    // Delete folder (subfolders will be affected by CASCADE)
    await query(`DELETE FROM folders WHERE id = $1`, [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 }
    );
  }
}
