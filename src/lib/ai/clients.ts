import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';

// Provider type
export type Provider = 'openai' | 'anthropic' | 'minimax';

// Model configuration
export interface ModelConfig {
  id: string;
  name: string;
  provider: Provider;
  contextWindow: number;
  maxOutputTokens: number;
  defaultTemperature: number;
}

// Model catalog
export const MODELS: Record<Provider, ModelConfig[]> = {
  openai: [
    { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo', provider: 'openai', contextWindow: 128000, maxOutputTokens: 4096, defaultTemperature: 0.7 },
    { id: 'gpt-4', name: 'GPT-4', provider: 'openai', contextWindow: 8192, maxOutputTokens: 4096, defaultTemperature: 0.7 },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', contextWindow: 16385, maxOutputTokens: 4096, defaultTemperature: 0.7 },
  ],
  anthropic: [
    { id: 'claude-opus-4-20240307', name: 'Claude 3 Opus', provider: 'anthropic', contextWindow: 200000, maxOutputTokens: 4096, defaultTemperature: 0.7 },
    { id: 'claude-sonnet-4-20250514', name: 'Claude 3 Sonnet', provider: 'anthropic', contextWindow: 200000, maxOutputTokens: 4096, defaultTemperature: 0.7 },
    { id: 'claude-haiku-3-20250514', name: 'Claude 3 Haiku', provider: 'anthropic', contextWindow: 200000, maxOutputTokens: 4096, defaultTemperature: 0.7 },
  ],
  minimax: [
    { id: 'abab6.5s-chat', name: 'MiniMax 2.1', provider: 'minimax', contextWindow: 1000000, maxOutputTokens: 8192, defaultTemperature: 0.7 },
    { id: 'abab6.5-chat', name: 'MiniMax 2.1 (Standard)', provider: 'minimax', contextWindow: 1000000, maxOutputTokens: 8192, defaultTemperature: 0.7 },
  ],
};

// AI Client interface
export interface AIClient {
  provider: Provider;
  model: string;
  complete(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>, options?: {
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  }): Promise<{ content: string; usage?: { inputTokens: number; outputTokens: number } }>;
  stream(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>, options?: {
    temperature?: number;
    maxTokens?: number;
  }): AsyncGenerator<string>;
}

// OpenAI Client
export class OpenAIClient implements AIClient {
  provider: Provider = 'openai';
  model: string;
  private client: OpenAI;

  constructor(model: string = 'gpt-4-turbo-preview') {
    this.model = model;
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async complete(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>, options?: {
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  }): Promise<{ content: string; usage?: { inputTokens: number; outputTokens: number } }> {
    const modelConfig = MODELS.openai.find(m => m.id === this.model) || MODELS.openai[0];
    
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
      temperature: options?.temperature ?? modelConfig.defaultTemperature,
      max_tokens: options?.maxTokens ?? modelConfig.maxOutputTokens,
      stream: options?.stream ?? false,
    });

    if (options?.stream) {
      throw new Error('Use stream() method for streaming responses');
    }

    // Type guard for ChatCompletion response
    const chatResponse = response as OpenAI.Chat.ChatCompletion;
    const choice = chatResponse.choices[0];
    const usage = chatResponse.usage;

    return {
      content: choice.message.content || '',
      usage: usage ? {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
      } : undefined,
    };
  }

  async *stream(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>, options?: {
    temperature?: number;
    maxTokens?: number;
  }): AsyncGenerator<string> {
    const modelConfig = MODELS.openai.find(m => m.id === this.model) || MODELS.openai[0];
    
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
      temperature: options?.temperature ?? modelConfig.defaultTemperature,
      max_tokens: options?.maxTokens ?? modelConfig.maxOutputTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}

// Anthropic Client
export class AnthropicClient implements AIClient {
  provider: Provider = 'anthropic';
  model: string;
  private client: Anthropic;

  constructor(model: string = 'claude-sonnet-4-20250514') {
    this.model = model;
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async complete(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>, options?: {
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  }): Promise<{ content: string; usage?: { inputTokens: number; outputTokens: number } }> {
    const modelConfig = MODELS.anthropic.find(m => m.id === this.model) || MODELS.anthropic[0];
    
    // Convert to Anthropic format
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options?.maxTokens ?? modelConfig.maxOutputTokens,
      temperature: options?.temperature ?? modelConfig.defaultTemperature,
      system: systemMessage?.content,
      messages: userMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    return {
      content: response.content[0]?.type === 'text' ? response.content[0].text || '' : '',
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  async *stream(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>, options?: {
    temperature?: number;
    maxTokens?: number;
  }): AsyncGenerator<string> {
    const modelConfig = MODELS.anthropic.find(m => m.id === this.model) || MODELS.anthropic[0];
    
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    const stream = await this.client.messages.stream({
      model: this.model,
      max_tokens: options?.maxTokens ?? modelConfig.maxOutputTokens,
      temperature: options?.temperature ?? modelConfig.defaultTemperature,
      system: systemMessage?.content,
      messages: userMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text;
      }
    }
  }
}

// Factory function to get the appropriate client
export function getAIClient(provider: Provider, model: string): AIClient {
  switch (provider) {
    case 'openai':
      return new OpenAIClient(model);
    case 'anthropic':
      return new AnthropicClient(model);
    case 'minimax':
      // MiniMax integration would go here
      throw new Error('MiniMax client not yet implemented');
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// Get default model for a provider
export function getDefaultModel(provider: Provider): string {
  return MODELS[provider]?.[0]?.id || 'gpt-4-turbo-preview';
}
