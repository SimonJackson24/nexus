import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAIClient, MODELS, Provider } from '@/lib/ai/clients';
import { calculateCreditsNeeded } from '@/lib/billing/types';

// Credit rates per model (credits per 1K tokens)
const CREDIT_RATES: Record<string, number> = {
  // OpenAI
  'gpt-4-turbo-preview': 10,
  'gpt-4': 30,
  'gpt-3.5-turbo': 1,
  // Anthropic
  'claude-opus-4-20240307': 15,
  'claude-sonnet-4-20250514': 3,
  'claude-haiku-3-20250514': 1,
  // MiniMax
  'abab6.5s-chat': 1,
  'abab6.5-chat': 1,
};

// POST /api/chat/completions - AI chat completion
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in to use AI features' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { messages, provider, model, chatId } = body;

    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Get the AI client
    const selectedProvider: Provider = (provider as Provider) || 'openai';
    const selectedModel = model || MODELS[selectedProvider]?.[0]?.id || 'gpt-4-turbo-preview';

    // Check if API key is configured
    const apiKeyConfigured = 
      (selectedProvider === 'openai' && process.env.OPENAI_API_KEY) ||
      (selectedProvider === 'anthropic' && process.env.ANTHROPIC_API_KEY) ||
      (selectedProvider === 'minimax' && process.env.MINIMAX_API_KEY);

    if (!apiKeyConfigured) {
      return NextResponse.json(
        { error: `API key not configured for ${selectedProvider}` },
        { status: 503 }
      );
    }

    // Check user credits
    const { data: userCredits } = await supabase
      .from('user_credits')
      .select('credits_balance')
      .eq('user_id', user.id)
      .single();

    // Estimate credits needed (pre-check)
    const estimatedCredits = Math.ceil(CREDIT_RATES[selectedModel] || 5);
    
    if (!userCredits || userCredits.credits_balance < estimatedCredits) {
      return NextResponse.json(
        { 
          error: 'Insufficient credits',
          code: 'INSUFFICIENT_CREDITS',
          required: estimatedCredits,
          current: userCredits?.credits_balance || 0,
        },
        { status: 402 }
      );
    }

    // Get AI client and make the request
    const aiClient = getAIClient(selectedProvider, selectedModel);
    
    const response = await aiClient.complete(messages, {
      temperature: 0.7,
      maxTokens: 4096,
    });

    // Calculate actual credits used
    const inputTokens = response.usage?.inputTokens || 0;
    const outputTokens = response.usage?.outputTokens || 0;
    const totalTokens = inputTokens + outputTokens;
    const creditsUsed = Math.ceil((totalTokens / 1000) * (CREDIT_RATES[selectedModel] || 5));

    // Deduct credits
    const { error: deductError } = await supabase
      .rpc('deduct_credits', {
        p_user_id: user.id,
        p_amount: creditsUsed,
        p_description: `AI request: ${selectedModel}`,
      });

    if (deductError) {
      console.error('Error deducting credits:', deductError);
      // Continue anyway - credits will be reconciled later
    }

    // Log usage for analytics
    if (response.usage) {
      await supabase
        .from('ai_usage')
        .insert({
          user_id: user.id,
          provider: selectedProvider,
          model: selectedModel,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          credits_deducted: creditsUsed,
          cost_pence: 0, // Could calculate actual cost based on provider pricing
        });
    }

    return NextResponse.json({
      content: response.content,
      provider: selectedProvider,
      model: selectedModel,
      usage: response.usage,
      credits_used: creditsUsed,
    });
  } catch (error) {
    console.error('AI Completion Error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'AI request failed',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
