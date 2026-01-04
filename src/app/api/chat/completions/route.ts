import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { query } from '@/lib/db';

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
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    // Get user subscription with credits from database
    const subscriptionResult = await query(
      'SELECT credits_balance FROM user_subscriptions WHERE user_id = $1',
      [userId]
    );

    const subscription = subscriptionResult.rows[0];
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

    await query(
      'UPDATE user_subscriptions SET credits_balance = credits_balance - $1 WHERE user_id = $2',
      [creditsToDeduct, userId]
    );

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
