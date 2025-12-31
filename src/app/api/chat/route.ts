import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/chat - List user's chats
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
    const folderId = searchParams.get('folder_id');
    const archived = searchParams.get('archived') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('chats')
      .select(`
        *,
        agent:agent_profiles(id, name, description, avatar, color, provider, model)
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .eq('is_archived', archived)
      .order('last_message_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (folderId) {
      query = query.eq('folder_id', folderId);
    }

    const { data: chats, error, count } = await query;

    if (error) {
      console.error('Error fetching chats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch chats' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      chats: chats || [],
      count: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chats' },
      { status: 500 }
    );
  }
}

// POST /api/chat - Create a new chat
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
    const { title, agent_id, provider, model, folder_id } = body;

    // Create chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert({
        user_id: user.id,
        title: title || 'New Chat',
        agent_id: agent_id || null,
        provider: provider || null,
        model: model || null,
        folder_id: folder_id || null,
      })
      .select()
      .single();

    if (chatError) {
      console.error('Error creating chat:', chatError);
      return NextResponse.json(
        { error: 'Failed to create chat' },
        { status: 500 }
      );
    }

    return NextResponse.json({ chat });
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json(
      { error: 'Failed to create chat' },
      { status: 500 }
    );
  }
}
