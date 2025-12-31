import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase/admin';

// GET /api/chat/completions - Get available models and providers
export async function GET() {
  return NextResponse.json({
    providers: ['openai', 'anthropic', 'minimax'],
    models: {
      openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
      anthropic: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-haiku-3-20250514'],
      minimax: ['abab6.5s-chat', 'abab6.5-chat', 'abab6-chat'],
    },
  });
}

// POST /api/chat/completions - Handle chat completions with credits system
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabaseAdmin = getSupabaseService() as any;
    
    // Get user from token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user subscription with credits from database
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('credits_balance')
      .eq('user_id', user.id)
      .single();

    const availableCredits = subscription?.credits_balance ?? 0;
    if (availableCredits <= 0) {
      return NextResponse.json(
        { error: 'Insufficient credits. Please purchase more credits to continue.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { messages, model, provider } = body as {
      messages: any[];
      model: string;
      provider: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages are required and must be a non-empty array' },
        { status: 400 }
      );
    }

    // Calculate and deduct credits (simplified: 1 credit per message)
    const creditsToDeduct = Math.max(1, Math.ceil(messages.length / 2));
    
    await supabaseAdmin
      .from('user_subscriptions')
      .update({ credits_balance: availableCredits - creditsToDeduct })
      .eq('user_id', user.id);

    // Create a ReadableStream for the response (simplified - returns basic response)
    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode('AI response placeholder'));
        controller.close();
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Credits-Deducted': creditsToDeduct.toString(),
        'X-Credits-Remaining': (availableCredits - creditsToDeduct).toString(),
      },
    });
  } catch (error) {
    console.error('Chat completion error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}
