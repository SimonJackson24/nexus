import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { decryptApiKey } from '@/lib/billing/api-key-service';
import { 
  checkUsageEligibility, 
  calculateCredits, 
  recordUsage,
  getUserApiKeys,
  updateKeyLastUsed,
  markKeyInvalid,
  getUserSubscription 
} from '@/lib/billing/usage-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Supported providers
const PROVIDERS = ['openai', 'anthropic', 'google', 'deepseek', 'openrouter'] as const;
type Provider = typeof PROVIDERS[number];

// POST /api/chat/completions - Handle AI chat completions with BYOK support
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      messages, 
      model, 
      provider = 'openai', 
      temperature, 
      max_tokens, 
      stream = false,
      chat_id,
      use_byok = false,
    } = body;

    if (!messages || !model) {
      return NextResponse.json(
        { error: 'Messages and model are required' },
        { status: 400 }
      );
    }

    if (!PROVIDERS.includes(provider as Provider)) {
      return NextResponse.json(
        { error: `Unsupported provider: ${provider}` },
        { status: 400 }
      );
    }

    // Get user's subscription
    const subscription = await getUserSubscription(user.id);
    
    // Determine if we should use BYOK
    const shouldUseByok = use_byok || 
      (subscription?.subscription_mode === 'byok') ||
      (!subscription?.credits_balance || subscription.credits_balance <= 0);

    let apiKey: string | undefined;
    let keyId: string | undefined;

    if (shouldUseByok) {
      // Get user's API keys for this provider
      const keys = await getUserApiKeys(user.id, provider);
      
      if (keys.length === 0) {
        return NextResponse.json(
          { 
            error: 'No API key found for this provider',
            requires_byok_setup: true,
            provider,
          },
          { status: 402 }
        );
      }

      // Use the first valid key
      const userKey = keys[0];
      try {
        apiKey = decryptApiKey(userKey.encrypted_key);
        keyId = userKey.id;
      } catch (error) {
        console.error('Error decrypting API key:', error);
        return NextResponse.json(
          { error: 'Failed to decrypt API key' },
          { status: 500 }
        );
      }
    } else {
      // Use platform's API key (from environment)
      switch (provider) {
        case 'openai':
          apiKey = process.env.OPENAI_API_KEY;
          break;
        case 'anthropic':
          apiKey = process.env.ANTHROPIC_API_KEY;
          break;
        // Add other providers as needed
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Calculate estimated credits (will be adjusted based on actual usage)
    const estimatedCredits = calculateCredits(provider, model, 0, 0).credits;

    // Check eligibility (skip for BYOK)
    if (!shouldUseByok) {
      const eligibility = await checkUsageEligibility(user.id, provider, model, estimatedCredits);
      
      if (!eligibility.allowed) {
        return NextResponse.json(
          { 
            error: eligibility.reason,
            credits_remaining: eligibility.credits_remaining,
            requires_byok: eligibility.requires_byok,
          },
          { status: 402 }
        );
      }
    }

    // Make the API call
    let response;
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      switch (provider) {
        case 'openai': {
          const client = new OpenAI({ apiKey });
          response = await client.chat.completions.create({
            model,
            messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
            temperature,
            max_tokens,
            stream,
          });

          if (!stream) {
            const chatResponse = response as OpenAI.Chat.ChatCompletion;
            inputTokens = chatResponse.usage?.prompt_tokens || 0;
            outputTokens = chatResponse.usage?.completion_tokens || 0;
          }
          break;
        }

        case 'anthropic': {
          const client = new Anthropic({ apiKey });
          const systemMessage = messages.find((m: any) => m.role === 'system');
          const userMessages = messages.filter((m: any) => m.role !== 'system');

          response = await client.messages.create({
            model,
            max_tokens: max_tokens || 4096,
            temperature,
            system: systemMessage?.content,
            messages: userMessages.map((m: any) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })),
            stream,
          });

          if (!stream) {
            inputTokens = response.usage.input_tokens;
            outputTokens = response.usage.output_tokens;
          }
          break;
        }

        case 'deepseek': {
          const client = new OpenAI({
            apiKey,
            baseURL: 'https://api.deepseek.com',
          });
          response = await client.chat.completions.create({
            model,
            messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
            temperature,
            max_tokens,
            stream,
          });

          if (!stream) {
            const chatResponse = response as OpenAI.Chat.ChatCompletion;
            inputTokens = chatResponse.usage?.prompt_tokens || 0;
            outputTokens = chatResponse.usage?.completion_tokens || 0;
          }
          break;
        }

        default:
          return NextResponse.json(
            { error: `Provider ${provider} not yet implemented` },
            { status: 501 }
          );
      }
    } catch (apiError: any) {
      // If BYOK key failed, mark it as invalid
      if (shouldUseByok && keyId) {
        await markKeyInvalid(keyId, apiError.message || 'API call failed');
      }

      return NextResponse.json(
        { 
          error: apiError.message || 'AI API error',
          provider_error: true,
        },
        { status: apiError.status || 500 }
      );
    }

    // Calculate actual credits used
    const { credits: creditsUsed, cost: costPence } = calculateCredits(
      provider,
      model,
      inputTokens,
      outputTokens
    );

    // Record usage
    await recordUsage({
      user_id: user.id,
      provider,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      credits_deducted: creditsUsed,
      cost_pence: costPence,
      is_byok: shouldUseByok,
      chat_id,
    });

    // Update key last used timestamp
    if (shouldUseByok && keyId) {
      await updateKeyLastUsed(keyId);
    }

    // Return response
    if (stream) {
      // For streaming, we need to proxy the stream
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            if (provider === 'anthropic') {
              // Anthropic streaming
              const stream = response as any;
              for await (const chunk of stream) {
                if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                  controller.enqueue(encoder.encode(chunk.delta.text));
                }
              }
            } else {
              // OpenAI/DeepSeek streaming
              const stream = response as unknown as AsyncIterable<any>;
              for await (const chunk of stream) {
                const content = chunk.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(content));
                }
              }
            }
          } catch (error) {
            controller.error(error);
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Credits-Used': creditsUsed.toString(),
          'X-Byok': shouldUseByok.toString(),
        },
      });
    }

    // Non-streaming response
    return NextResponse.json(response, {
      headers: {
        'X-Credits-Used': creditsUsed.toString(),
        'X-Byok': shouldUseByok.toString(),
      },
    });
  } catch (error) {
    console.error('Chat completions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/chat/completions - Get available models for a provider
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider');

  if (!provider || !PROVIDERS.includes(provider as Provider)) {
    return NextResponse.json(
      { error: 'Provider is required' },
      { status: 400 }
    );
  }

  // Return available models for each provider
  const models: Record<string, string[]> = {
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    anthropic: ['claude-sonnet-4-20250514', 'claude-haiku-3-20250514', 'claude-opus-4-20240307'],
    google: ['gemini-1.5-pro', 'gemini-1.5-flash'],
    deepseek: ['deepseek-chat'],
    openrouter: ['meta-llama/llama-3.1-405b', 'anthropic/claude-3.5-sonnet'],
  };

  return NextResponse.json({
    provider,
    models: models[provider] || [],
  });
}
