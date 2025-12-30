import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/folder - List all folders for the current user
export async function GET(request: Request) {
  const supabase = createClient()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: folders, error } = await supabase
    .from('folders')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ folders })
}

// POST /api/folder - Create a new folder
export async function POST(request: Request) {
  const supabase = createClient()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, icon, color, parent_id } = body

    if (!name) {
      return NextResponse.json({ error: 'Missing folder name' }, { status: 400 })
    }

    const { data: folder, error } = await supabase
      .from('folders')
      .insert({
        user_id: user.id,
        name,
        icon: icon || '📁',
        color: color || '#3b82f6',
        parent_id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ folder }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

// PATCH /api/folder - Update a folder
export async function PATCH(request: Request) {
  const supabase = createClient()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, name, icon, color, sort_order } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing folder id' }, { status: 400 })
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from('folders')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    const { data: folder, error } = await supabase
      .from('folders')
      .update({
        name,
        icon,
        color,
        sort_order,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ folder })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

// DELETE /api/folder?id=xxx - Delete a folder
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
    return NextResponse.json({ error: 'Missing folder id' }, { status: 400 })
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from('folders')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
  }

  // Delete folder (chats will be unlinked due to CASCADE behavior)
  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
