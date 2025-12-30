import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/message - Add a message to a chat
export async function POST(request: Request) {
  const supabase = createClient()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { chat_id, role, content, provider, model } = body

    if (!chat_id || !role || !content) {
      return NextResponse.json({ 
        error: 'Missing required fields: chat_id, role, content' 
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

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        chat_id,
        role,
        content,
        provider,
        model,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

// GET /api/message?chat_id=xxx - Get messages for a chat
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

  // Verify chat ownership
  const { data: chat } = await supabase
    .from('chats')
    .select('user_id')
    .eq('id', chatId)
    .single()

  if (!chat || chat.user_id !== user.id) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
  }

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ messages })
}
