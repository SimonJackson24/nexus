import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/subtask - List subtasks
export async function GET(request: Request) {
  try {
    const supabase = createClient() as any;
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const task_id = searchParams.get('task_id');
    const parent_id = searchParams.get('parent_id');

    let query = supabase
      .from('subtasks')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true });

    if (task_id) {
      query = query.eq('task_id', task_id);
    }

    if (parent_id) {
      query = query.eq('parent_id', parent_id);
    }

    const { data: subtasks, error } = await query;

    if (error) {
      console.error('Error fetching subtasks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subtasks' },
        { status: 500 }
      );
    }

    return NextResponse.json({ subtasks: subtasks || [] });
  } catch (error) {
    console.error('Error fetching subtasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subtasks' },
      { status: 500 }
    );
  }
}

// POST /api/subtask - Create a new subtask
export async function POST(request: Request) {
  try {
    const supabase = createClient() as any;
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { task_id, parent_id, title, description, status, sort_order } = body;

    const { data: subtask, error } = await supabase
      .from('subtasks')
      .insert({
        user_id: user.id,
        task_id: task_id || null,
        parent_id: parent_id || null,
        title,
        description: description || null,
        status: status || 'pending',
        sort_order: sort_order || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating subtask:', error);
      return NextResponse.json(
        { error: 'Failed to create subtask' },
        { status: 500 }
      );
    }

    return NextResponse.json({ subtask });
  } catch (error) {
    console.error('Error creating subtask:', error);
    return NextResponse.json(
      { error: 'Failed to create subtask' },
      { status: 500 }
    );
  }
}

// PATCH /api/subtask - Update a subtask
export async function PATCH(request: Request) {
  try {
    const supabase = createClient() as any;
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, title, description, status, sort_order, completed_at } = body;

    // Verify ownership
    const { data: existing } = await supabase
      .from('subtasks')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Subtask not found or forbidden' },
        { status: 404 }
      );
    }

    const { data: subtask, error } = await supabase
      .from('subtasks')
      .update({
        title,
        description,
        status,
        sort_order,
        completed_at: completed_at || (status === 'completed' ? new Date().toISOString() : null),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating subtask:', error);
      return NextResponse.json(
        { error: 'Failed to update subtask' },
        { status: 500 }
      );
    }

    return NextResponse.json({ subtask });
  } catch (error) {
    console.error('Error updating subtask:', error);
    return NextResponse.json(
      { error: 'Failed to update subtask' },
      { status: 500 }
    );
  }
}

// DELETE /api/subtask - Delete a subtask
export async function DELETE(request: Request) {
  try {
    const supabase = createClient() as any;
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Subtask ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from('subtasks')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Subtask not found or forbidden' },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from('subtasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting subtask:', error);
      return NextResponse.json(
        { error: 'Failed to delete subtask' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting subtask:', error);
    return NextResponse.json(
      { error: 'Failed to delete subtask' },
      { status: 500 }
    );
  }
}
