import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

// Initialize AI clients
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

// MiniMax API configuration
const MINIMAX_API_URL = 'https://api.minimax.chat/v1/text/chatcompletion_v2'
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY

// POST /api/chat/completions - Get AI response
export async function POST(request: Request) {
  const supabase = createClient()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { chat_id, message, provider, model, temperature, max_tokens } = body

    if (!chat_id || !message) {
      return NextResponse.json({ 
        error: 'Missing required fields: chat_id, message' 
      }, { status: 400 })
    }

    // Verify chat ownership and get existing messages
    const { data: chat } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chat_id)
      .eq('user_id', user.id)
      .single()

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    // Get conversation history
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chat_id)
      .order('created_at', { ascending: true })

    // Build messages array for AI
    const conversationMessages = [
      ...(messages?.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content
      })) || []),
      { role: 'user', content: message }
    ]

    // Determine provider and model
    const selectedProvider = provider || chat.provider || 'openai'
    const selectedModel = model || chat.model || 'gpt-4-turbo-preview'
    const selectedTemp = temperature || 0.7
    const selectedMaxTokens = max_tokens || 4096

    let aiResponse: string

    try {
      switch (selectedProvider) {
        case 'openai':
          if (!openai) {
            throw new Error('OpenAI API key not configured')
          }
          aiResponse = await getOpenAIResponse(openai, selectedModel, conversationMessages, selectedTemp, selectedMaxTokens)
          break

        case 'anthropic':
          if (!anthropic) {
            throw new Error('Anthropic API key not configured')
          }
          aiResponse = await getAnthropicResponse(anthropic, selectedModel, conversationMessages, selectedTemp, selectedMaxTokens)
          break

        case 'minimax':
          if (!MINIMAX_API_KEY) {
            throw new Error('MiniMax API key not configured')
          }
          aiResponse = await getMiniMaxResponse(conversationMessages, selectedModel, selectedTemp, selectedMaxTokens)
          break

        default:
          throw new Error(`Unsupported provider: ${selectedProvider}`)
      }
    } catch (aiError: any) {
      // Return error if AI providers fail
      return NextResponse.json({ error: aiError.message }, { status: 500 })
    }

    // Save user message
    const { data: userMsg } = await supabase
      .from('messages')
      .insert({
        chat_id,
        role: 'user',
        content: message,
        provider: selectedProvider,
        model: selectedModel,
      })
      .select()
      .single()

    // Save AI response
    const { data: assistantMsg } = await supabase
      .from('messages')
      .insert({
        chat_id,
        role: 'assistant',
        content: aiResponse,
        provider: selectedProvider,
        model: selectedModel,
      })
      .select()
      .single()

    return NextResponse.json({
      userMessage: userMsg,
      assistantMessage: assistantMsg,
    })

  } catch (error) {
    console.error('Chat completion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// OpenAI response helper
async function getOpenAIResponse(
  client: OpenAI,
  model: string,
  messages: Array<{ role: string; content: string }>,
  temperature: number,
  maxTokens: number
): Promise<string> {
  const response = await client.chat.completions.create({
    model,
    messages: messages as any,
    temperature,
    max_tokens: maxTokens,
    stream: false,
  })

  return response.choices[0]?.message?.content || 'No response generated'
}

// Anthropic response helper
async function getAnthropicResponse(
  client: Anthropic,
  model: string,
  messages: Array<{ role: string; content: string }>,
  temperature: number,
  maxTokens: number
): Promise<string> {
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    messages: messages as any,
  })

  return response.content[0]?.type === 'text' 
    ? response.content[0].text 
    : 'No response generated'
}

// MiniMax response helper
async function getMiniMaxResponse(
  messages: Array<{ role: string; content: string }>,
  model: string,
  temperature: number,
  maxTokens: number
): Promise<string> {
  const response = await fetch(MINIMAX_API_URL!, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MINIMAX_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
        content: m.content
      })),
      temperature,
      max_output_tokens: maxTokens,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`MiniMax API error: ${error}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || 'No response generated'
}
