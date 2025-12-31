import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/message - List chat messages
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
    const chat_id = searchParams.get('chat_id');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!chat_id) {
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      );
    }

    // Verify chat ownership
    const { data: chat } = await supabase
      .from('chats')
      .select('user_id')
      .eq('id', chat_id)
      .single();

    if (!chat || chat.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Chat not found or forbidden' },
        { status: 404 }
      );
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chat_id)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST /api/message - Create a new message
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
    const { chat_id, content, role, provider, model } = body;

    if (!chat_id || !content) {
      return NextResponse.json(
        { error: 'Chat ID and content are required' },
        { status: 400 }
      );
    }

    // Verify chat ownership
    const { data: chat } = await supabase
      .from('chats')
      .select('user_id')
      .eq('id', chat_id)
      .single();

    if (!chat || chat.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Chat not found or forbidden' },
        { status: 404 }
      );
    }

    // Create message
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        chat_id,
        content,
        role: role || 'user',
        provider: provider || null,
        model: model || null,
      })
      .select()
      .single();

    if (msgError) {
      console.error('Error creating message:', msgError);
      return NextResponse.json(
        { error: 'Failed to create message' },
        { status: 500 }
      );
    }

    // Update chat's last_message_at
    await supabase
      .from('chats')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', chat_id);

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }
}

// DELETE /api/message - Delete a message
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
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    // Verify message ownership through chat
    const { data: message } = await supabase
      .from('messages')
      .select(`
        id,
        chat:chats(user_id)
      `)
      .eq('id', id)
      .single();

    if (!message || message.chat?.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Message not found or forbidden' },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting message:', error);
      return NextResponse.json(
        { error: 'Failed to delete message' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}
