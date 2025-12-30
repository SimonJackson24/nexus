// Provider Types
export type Provider = 'openai' | 'anthropic' | 'minimax';

export interface ModelInfo {
  id: string;
  name: string;
  provider: Provider;
  contextWindow: number;
  maxTokens: number;
}

export const MODELS: Record<Provider, ModelInfo[]> = {
  openai: [
    { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo', provider: 'openai', contextWindow: 128000, maxTokens: 4096 },
    { id: 'gpt-4', name: 'GPT-4', provider: 'openai', contextWindow: 8192, maxTokens: 4096 },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', contextWindow: 16385, maxTokens: 4096 },
  ],
  anthropic: [
    { id: 'claude-opus-4-20240307', name: 'Claude 3 Opus', provider: 'anthropic', contextWindow: 200000, maxTokens: 4096 },
    { id: 'claude-sonnet-4-20250514', name: 'Claude 3 Sonnet', provider: 'anthropic', contextWindow: 200000, maxTokens: 4096 },
    { id: 'claude-haiku-3-20250514', name: 'Claude 3 Haiku', provider: 'anthropic', contextWindow: 200000, maxTokens: 4096 },
  ],
  minimax: [
    { id: 'abab6.5s-chat', name: 'MiniMax 2.1', provider: 'minimax', contextWindow: 1000000, maxTokens: 8192 },
    { id: 'abab6.5-chat', name: 'MiniMax 2.1 (Standard)', provider: 'minimax', contextWindow: 1000000, maxTokens: 8192 },
  ],
};

// Message Types
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  provider?: Provider;
  model?: string;
  subtasks?: Subtask[];
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  agentId?: string;
  provider?: Provider;
  model?: string;
  folderId?: string;
  tags: string[];
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

// Agent Profile Types
export interface AgentProfile {
  id: string;
  name: string;
  description: string;
  avatar: string;
  color: string;
  systemPrompt: string;
  provider: Provider;
  model: string;
  temperature: number;
  maxTokens: number;
  isDefault: boolean;
}

// Subtask Types
export interface Subtask {
  id: string;
  chatId: string;
  parentMessageId: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  linkedContext: string[];
  createdAt: number;
  completedAt?: number;
}

// Security Scanner Types
export interface SecurityVulnerability {
  id: string;
  file: string;
  line: number;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  title: string;
  description: string;
  codeSnippet: string;
  fix: string;
  cwe?: string;
  owasp?: string;
  references: string[];
}

export interface SecurityScanResult {
  id: string;
  timestamp: number;
  filesScanned: number;
  linesScanned: number;
  vulnerabilities: SecurityVulnerability[];
  score: number;
  duration: number;
}

export interface CodeFile {
  id: string;
  name: string;
  path: string;
  language: string;
  content: string;
  lines: number;
}

// Folder Types
export interface Folder {
  id: string;
  name: string;
  icon: string;
  color: string;
  chatIds: string[];
  createdAt: number;
}

// Demo Mode
export interface DemoState {
  enabled: boolean;
  chats: Chat[];
  agents: AgentProfile[];
  folders: Folder[];
}

// API Response Types
export interface ChatResponse {
  message: Message;
  subtasks?: Subtask[];
}

export interface StreamingChunk {
  content: string;
  done: boolean;
}
