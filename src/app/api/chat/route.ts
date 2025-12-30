import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/chat - List all chats for the current user
export async function GET(request: Request) {
  const supabase = createClient()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const folderId = searchParams.get('folder_id')
  const pinned = searchParams.get('pinned')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('chats')
    .select(`
      *,
      messages (
        id,
        role,
        content,
        created_at
      )
    `)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (folderId) {
    query = query.eq('folder_id', folderId)
  }

  if (pinned === 'true') {
    query = query.eq('pinned', true)
  } else if (pinned === 'false') {
    query = query.eq('pinned', false)
  }

  const { data: chats, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ chats })
}

// POST /api/chat - Create a new chat
export async function POST(request: Request) {
  const supabase = createClient()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, agent_id, provider, model, folder_id, tags } = body

    // Create the chat
    const { data: chat, error } = await supabase
      .from('chats')
      .insert({
        user_id: user.id,
        title: title || 'New Conversation',
        agent_id,
        provider,
        model,
        folder_id,
        tags: tags || [],
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create system message if agent is specified
    if (agent_id) {
      const { data: agent } = await supabase
        .from('agent_profiles')
        .select('system_prompt')
        .eq('id', agent_id)
        .single()

      if (agent) {
        await supabase.from('messages').insert({
          chat_id: chat.id,
          role: 'system',
          content: agent.system_prompt,
        })
      }
    }

    return NextResponse.json({ chat }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
