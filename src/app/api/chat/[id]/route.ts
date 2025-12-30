import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/chat/[id] - Get a single chat with messages
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient()
  const { id } = await params
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get the chat
  const { data: chat, error: chatError } = await supabase
    .from('chats')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (chatError || !chat) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
  }

  // Get messages
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', id)
    .order('created_at', { ascending: true })

  if (messagesError) {
    return NextResponse.json({ error: messagesError.message }, { status: 500 })
  }

  // Get subtasks
  const { data: subtasks, error: subtasksError } = await supabase
    .from('subtasks')
    .select('*')
    .eq('chat_id', id)
    .order('created_at', { ascending: true })

  if (subtasksError) {
    return NextResponse.json({ error: subtasksError.message }, { status: 500 })
  }

  return NextResponse.json({ chat, messages, subtasks })
}

// PATCH /api/chat/[id] - Update a chat
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient()
  const { id } = await params
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, agent_id, folder_id, tags, pinned, is_archived } = body

    // Verify ownership
    const { data: existingChat } = await supabase
      .from('chats')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!existingChat || existingChat.user_id !== user.id) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    const { data: chat, error } = await supabase
      .from('chats')
      .update({
        title,
        agent_id,
        folder_id,
        tags,
        pinned,
        is_archived,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ chat })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

// DELETE /api/chat/[id] - Delete a chat
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient()
  const { id } = await params
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify ownership
  const { data: existingChat } = await supabase
    .from('chats')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!existingChat || existingChat.user_id !== user.id) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
  }

  // Delete the chat (messages and subtasks will be deleted due to CASCADE)
  const { error } = await supabase
    .from('chats')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
