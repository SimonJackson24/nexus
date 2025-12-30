import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/subtask?chat_id=xxx - Get subtasks for a chat
export async function GET(request: Request) {
  const supabase = createClient()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const chatId = searchParams.get('chat_id')

  if (!chatId) {
    return NextResponse.json({ error: 'Missing chat_id parameter' }, { status: 400 })
  }

  const { data: subtasks, error } = await supabase
    .from('subtasks')
    .select('*')
    .eq('chat_id', chatId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ subtasks })
}

// POST /api/subtask - Create a subtask
export async function POST(request: Request) {
  const supabase = createClient()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { chat_id, parent_message_id, title, description, priority } = body

    if (!chat_id || !title) {
      return NextResponse.json({ 
        error: 'Missing required fields: chat_id, title' 
      }, { status: 400 })
    }

    // Verify chat ownership
    const { data: chat } = await supabase
      .from('chats')
      .select('user_id')
      .eq('id', chat_id)
      .single()

    if (!chat || chat.user_id !== user.id) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    const { data: subtask, error } = await supabase
      .from('subtasks')
      .insert({
        user_id: user.id,
        chat_id,
        parent_message_id,
        title,
        description,
        priority: priority || 'medium',
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ subtask }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

// PATCH /api/subtask - Update a subtask
export async function PATCH(request: Request) {
  const supabase = createClient()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, title, description, status, priority, linked_context } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing subtask id' }, { status: 400 })
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from('subtasks')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 })
    }

    const updateData: any = {
      title,
      description,
      status,
      priority,
      linked_context,
      updated_at: new Date().toISOString(),
    }

    // Set completed_at if status is completed
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    const { data: subtask, error } = await supabase
      .from('subtasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ subtask })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

// DELETE /api/subtask?id=xxx - Delete a subtask
export async function DELETE(request: Request) {
  const supabase = createClient()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing subtask id' }, { status: 400 })
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from('subtasks')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Subtask not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('subtasks')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
