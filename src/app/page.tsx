'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Search, Settings, ChevronDown, ChevronRight,
  MessageSquare, Folder, Tag, Pin, MoreVertical,
  Send, Sparkles, Bot, User, Copy, Check,
  Play, Pause, CheckCircle, Clock, AlertCircle,
  Menu, X, Zap, BookOpen, Code, FileText, BarChart,
  Globe, Aperture, Brain, Layers, Link2, RefreshCw,
  Volume2, VolumeX, Sun, Moon, Wifi, WifiOff,
  ChevronLeft, ChevronUp, ChevronDown as ChevronDownIcon,
  ArrowRight, MoreHorizontal, FolderPlus, Archive, Shield,
  CreditCard, Crown, LogOut
} from 'lucide-react';
import DOMPurify from 'dompurify';
import SecurityScanner from '@/components/SecurityScanner';
import BillingDashboard from '@/components/BillingDashboard';
import AdminDashboard from '@/components/AdminDashboard';
import { Chat, AgentProfile, Subtask, Folder as FolderType, Provider, Message, MODELS } from '@/lib/types';
import { DEMO_AGENTS, getDemoAgent } from '@/lib/demo-data';
import { createClient } from '@/lib/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';

// Escape HTML entities - correct order (ampersand first!)
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&',
    '<': '<',
    '>': '>',
    '"': '"',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Safe markdown parser with DOMPurify
function parseMarkdown(text: string): string {
  // First, escape any HTML in the input to prevent XSS
  const escaped = escapeHtml(text);
  
  // Then parse markdown
  let html = escaped
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => `<pre class="code-block"><code class="language-${lang || ''}">${code.trim()}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^\- (.*$)/gm, '<li>$1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
    .replace(/\n/g, '<br>');
  
  // Finally, sanitize with DOMPurify to ensure no XSS slips through
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'strong', 'em', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'code', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'lang']
  });
}

// Provider icons
const PROVIDER_ICONS: Record<Provider, React.ReactNode> = {
  openai: <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center text-black text-xs font-bold">O</div>,
  anthropic: <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">A</div>,
  minimax: <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">M</div>,
};

// Provider colors
const PROVIDER_COLORS: Record<Provider, string> = {
  openai: '#10b981',
  anthropic: '#f59e0b',
  minimax: '#ef4444',
};

// Demo mode banner
function DemoBanner({ onExit }: { onExit: () => void }) {
  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 text-sm flex items-center justify-between animate-fade-in">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        <span className="font-medium">Demo Mode - Try Nexus without API keys!</span>
        <span className="opacity-75 text-xs">(Pre-loaded chats, agents, and subtasks)</span>
      </div>
      <button
        onClick={onExit}
        className="flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-sm transition-colors"
      >
        Exit Demo <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// Chat list item
function ChatItem({
  chat,
  isActive,
  onClick,
  onContextMenu,
}: {
  chat: Chat;
  isActive: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const agent = chat.agentId ? getDemoAgent(chat.agentId) : undefined;
  const [copied, setCopied] = useState(false);
  const lastMessage = chat.messages[chat.messages.length - 1];

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(lastMessage?.content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`group p-3 rounded-lg cursor-pointer transition-all duration-200 ${
        isActive
          ? 'bg-nexus-hover border-l-2 border-primary-500'
          : 'hover:bg-nexus-hover border-l-2 border-transparent'
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">
          {agent ? (
            <span className="text-lg">{agent.avatar}</span>
          ) : (
            <MessageSquare className="w-4 h-4 text-nexus-muted" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium text-sm truncate ${isActive ? 'text-white' : 'text-nexus-text'}`}>
              {chat.title}
            </span>
            {chat.pinned && <Pin className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
          </div>
          <p className="text-xs text-nexus-muted truncate mt-0.5">
            {lastMessage?.content?.replace(/[#*`]/g, '').substring(0, 50)}...
          </p>
          <div className="flex items-center gap-2 mt-1">
            {chat.provider && (
              <div className="flex items-center gap-1">
                {PROVIDER_ICONS[chat.provider]}
              </div>
            )}
            <span className="text-xs text-nexus-muted">
              {new Date(chat.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-nexus-border rounded transition-all"
        >
          {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-nexus-muted" />}
        </button>
      </div>
    </div>
  );
}

// Folder item
function FolderItem({
  folder,
  isExpanded,
  onToggle,
  chats,
  activeChatId,
  onChatSelect,
}: {
  folder: FolderType;
  isExpanded: boolean;
  onToggle: () => void;
  chats: Chat[];
  activeChatId: string | null;
  onChatSelect: (chat: Chat) => void;
}) {
  const folderChats = chats.filter(c => c.folderId === folder.id);

  return (
    <div className="select-none">
      <div
        onClick={onToggle}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-nexus-hover cursor-pointer transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-nexus-muted" />
        ) : (
          <ChevronRight className="w-4 h-4 text-nexus-muted" />
        )}
        <span className="text-lg">{folder.icon}</span>
        <span className="text-sm text-nexus-text">{folder.name}</span>
        <span className="text-xs text-nexus-muted ml-auto">{folderChats.length}</span>
      </div>
      {isExpanded && folderChats.map(chat => (
        <div key={chat.id} className="ml-6">
          <ChatItem
            chat={chat}
            isActive={activeChatId === chat.id}
            onClick={() => onChatSelect(chat)}
            onContextMenu={() => {}}
          />
        </div>
      ))}
    </div>
  );
}

// Agent selector
function AgentSelector({
  agents,
  selectedAgent,
  onSelect,
  onCreateNew,
}: {
  agents: AgentProfile[];
  selectedAgent: AgentProfile | null;
  onSelect: (agent: AgentProfile) => void;
  onCreateNew: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-nexus-card hover:bg-nexus-hover rounded-lg transition-colors border border-nexus-border"
      >
        {selectedAgent ? (
          <>
            <span className="text-lg">{selectedAgent.avatar}</span>
            <span className="text-sm font-medium">{selectedAgent.name}</span>
          </>
        ) : (
          <>
            <Bot className="w-4 h-4 text-primary-500" />
            <span className="text-sm">Select Agent</span>
          </>
        )}
        <ChevronDown className={`w-4 h-4 text-nexus-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-72 bg-nexus-card border border-nexus-border rounded-lg shadow-xl z-20 overflow-hidden animate-slide-in-up">
            <div className="p-2 border-b border-nexus-border">
              <button
                onClick={() => { onCreateNew(); setIsOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary-400 hover:bg-nexus-hover rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Custom Agent
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {agents.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => { onSelect(agent); setIsOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-nexus-hover transition-colors ${
                    selectedAgent?.id === agent.id ? 'bg-nexus-hover' : ''
                  }`}
                >
                  <span className="text-lg">{agent.avatar}</span>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{agent.name}</div>
                    <div className="text-xs text-nexus-muted">{agent.description}</div>
                  </div>
                  {agent.isDefault && (
                    <span className="text-xs bg-primary-500/20 text-primary-400 px-1.5 py-0.5 rounded">
                      Default
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Provider selector
function ProviderSelector({
  provider,
  model,
  onProviderChange,
  onModelChange,
  disabled,
}: {
  provider: Provider;
  model: string;
  onProviderChange: (p: Provider) => void;
  onModelChange: (m: string) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative flex items-center gap-2">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-2 bg-nexus-card rounded-lg border border-nexus-border transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-nexus-hover'
        }`}
      >
        {PROVIDER_ICONS[provider]}
        <span className="text-sm capitalize">{provider}</span>
        <ChevronDown className={`w-4 h-4 text-nexus-muted ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-48 bg-nexus-card border border-nexus-border rounded-lg shadow-xl z-20 overflow-hidden animate-slide-in-up">
            {(['openai', 'anthropic', 'minimax'] as Provider[]).map(p => (
              <button
                key={p}
                onClick={() => { onProviderChange(p); onModelChange(MODELS[p][0].id); setIsOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-nexus-hover transition-colors ${
                  provider === p ? 'bg-nexus-hover' : ''
                }`}
              >
                {PROVIDER_ICONS[p]}
                <span className="text-sm capitalize">{p}</span>
                {provider === p && <Check className="w-4 h-4 text-primary-500 ml-auto" />}
              </button>
            ))}
          </div>
        </>
      )}
      <select
        value={model}
        onChange={(e) => onModelChange(e.target.value)}
        disabled={disabled}
        className="bg-nexus-card border border-nexus-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
      >
        {MODELS[provider].map(m => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
    </div>
  );
}

// Subtask item
function SubtaskItem({
  subtask,
  onToggle,
  onClick,
}: {
  subtask: Subtask;
  onToggle: () => void;
  onClick: () => void;
}) {
  const statusColors = {
    pending: 'text-nexus-muted border-nexus-border',
    in_progress: 'text-blue-400 border-blue-500 bg-blue-500/10',
    completed: 'text-green-400 border-green-500 bg-green-500/10',
    cancelled: 'text-red-400 border-red-500 bg-red-500/10',
  };

  const statusIcons = {
    pending: <Clock className="w-4 h-4" />,
    in_progress: <Play className="w-4 h-4" />,
    completed: <CheckCircle className="w-4 h-4" />,
    cancelled: <X className="w-4 h-4" />,
  };

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border transition-all cursor-pointer hover:bg-nexus-hover ${
        statusColors[subtask.status]
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="flex-shrink-0 mt-0.5"
        >
          {subtask.status === 'completed' ? (
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded border-2 border-nexus-muted" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium text-sm ${subtask.status === 'completed' ? 'line-through opacity-60' : ''}`}>
              {subtask.title}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              subtask.priority === 'high' ? 'bg-red-500/20 text-red-400' :
              subtask.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-blue-500/20 text-blue-400'
            }`}>
              {subtask.priority}
            </span>
          </div>
          {subtask.description && (
            <p className="text-xs text-nexus-muted mt-1">{subtask.description}</p>
          )}
          {subtask.linkedContext.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <Link2 className="w-3 h-3 text-nexus-muted" />
              <span className="text-xs text-nexus-muted">{subtask.linkedContext.length} linked contexts</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Message bubble
function MessageBubble({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-fade-in`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-primary-600' : 'bg-gradient-to-br from-purple-600 to-blue-600'
      }`}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
      </div>
      <div className={`max-w-[70%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-primary-600 text-white rounded-br-md'
            : 'bg-nexus-card border border-nexus-border rounded-bl-md'
        }`}>
          <div
            className={`text-sm leading-relaxed ${isUser ? '' : 'markdown'}`}
            dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }}
          />
        </div>
        {message.provider && (
          <div className={`flex items-center gap-1 mt-1 ${isUser ? 'justify-end' : ''}`}>
            {PROVIDER_ICONS[message.provider]}
            <span className="text-xs text-nexus-muted">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
        {!isUser && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 mt-2 text-xs text-nexus-muted hover:text-nexus-text transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  );
}

// Typing indicator
function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="bg-nexus-card border border-nexus-border rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-nexus-muted rounded-full typing-indicator" />
          <span className="w-2 h-2 bg-nexus-muted rounded-full typing-indicator" />
          <span className="w-2 h-2 bg-nexus-muted rounded-full typing-indicator" />
        </div>
      </div>
    </div>
  );
}

// Main App Component
export default function Nexus() {
  const [demoMode, setDemoMode] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [supabase] = useState(() => createClient());
  const [chats, setChats] = useState<Chat[]>([]);
  const [agents] = useState<AgentProfile[]>(DEMO_AGENTS);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentProfile | null>(null);
  const [provider, setProvider] = useState<Provider>('openai');
  const [model, setModel] = useState(MODELS.openai[0].id);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showContextPanel, setShowContextPanel] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSecurityScanner, setShowSecurityScanner] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeChat = chats.find(c => c.id === activeChatId);
  const activeSubtasks = activeChatId ? subtasks.filter(s => s.chatId === activeChatId) : [];
  const unpinnedChats = chats.filter(c => !c.pinned && c.folderId === undefined);
  const pinnedChats = chats.filter(c => c.pinned);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages, isTyping]);

  // Initialize with first chat if in demo mode
  useEffect(() => {
    if (demoMode && !activeChatId && chats.length > 0) {
      setActiveChatId(chats[0].id);
      const chat = chats[0];
      if (chat.agentId) {
        const agent = agents.find(a => a.id === chat.agentId);
        if (agent) {
          setSelectedAgent(agent);
          setProvider(agent.provider);
          setModel(agent.model);
        }
      }
    }
  }, [demoMode, chats, activeChatId, agents]);

  // Check authentication state
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Load user data from Supabase
        await loadUserData(user.id);
      } else {
        // No user - stay in demo mode
        setDemoMode(true);
      }
    };
    
    checkAuth();
    
    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setDemoMode(true);
        setChats([]);
        setFolders([]);
        setSubtasks([]);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [supabase]);

  // Load user data from Supabase
  const loadUserData = async (userId: string) => {
    try {
      // Load folders
      const { data: userFolders } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at');
      
      if (userFolders) {
        setFolders(userFolders.map(f => ({
          id: f.id,
          name: f.name,
          icon: f.icon || '📁',
          color: f.color || '#3b82f6',
          chatIds: [],
          createdAt: new Date(f.created_at).getTime(),
        })));
      }

      // Load chats
      const { data: userChats } = await supabase
        .from('chats')
        .select('*, messages(*)')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      
      if (userChats) {
        setChats(userChats.map(c => ({
          id: c.id,
          title: c.title,
          messages: c.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.created_at).getTime(),
            provider: m.provider,
            model: m.model,
          })),
          agentId: c.agent_id,
          provider: c.provider,
          model: c.model,
          folderId: c.folder_id,
          tags: c.tags || [],
          pinned: c.pinned,
          createdAt: new Date(c.created_at).getTime(),
          updatedAt: new Date(c.updated_at).getTime(),
        })));
      }

      // Load subtasks
      const { data: userSubtasks } = await supabase
        .from('subtasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at');
      
      if (userSubtasks) {
        setSubtasks(userSubtasks.map(s => ({
          id: s.id,
          chatId: s.chat_id,
          parentMessageId: s.parent_message_id,
          title: s.title,
          description: s.description,
          status: s.status,
          priority: s.priority,
          linkedContext: s.linked_context || [],
          dueDate: s.due_date ? new Date(s.due_date).getTime() : undefined,
          createdAt: new Date(s.created_at).getTime(),
          completedAt: s.completed_at ? new Date(s.completed_at).getTime() : undefined,
        })));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Handle sign in
  const handleSignIn = async (email: string, password: string) => {
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setShowSignIn(false);
    } catch (error: any) {
      alert('Sign in failed: ' + error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle sign up
  const handleSignUp = async (email: string, password: string) => {
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      alert('Check your email for the confirmation link!');
    } catch (error: any) {
      alert('Sign up failed: ' + error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setDemoMode(true);
    setChats([]);
    setFolders([]);
    setSubtasks([]);
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || (!activeChatId && !demoMode) || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
      provider,
      model,
    };

    if (demoMode) {
      // Demo mode - update local state only
      setChats(prev => {
        let newChats = [...prev];
        if (activeChatId) {
          newChats = newChats.map(chat => {
            if (chat.id === activeChatId) {
              return {
                ...chat,
                messages: [...chat.messages, userMessage],
                updatedAt: Date.now(),
              };
            }
            return chat;
          });
        } else {
          // Create new chat
          const newChat: Chat = {
            id: `chat-${Date.now()}`,
            title: input.trim().substring(0, 30) + '...',
            messages: [
              {
                id: `msg-${Date.now() - 1}`,
                role: 'system',
                content: selectedAgent?.systemPrompt || 'You are a helpful AI assistant.',
                timestamp: Date.now(),
              },
              userMessage,
            ],
            agentId: selectedAgent?.id,
            provider,
            model,
            tags: [],
            pinned: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          newChats = [newChat, ...newChats];
          setActiveChatId(newChat.id);
        }
        return newChats;
      });
    } else {
      // Production mode - save to Supabase
      let chatId = activeChatId;
      
      if (!chatId) {
        // Create new chat
        const { data: newChat, error } = await supabase
          .from('chats')
          .insert({
            user_id: user!.id,
            title: input.trim().substring(0, 30) + '...',
            agent_id: selectedAgent?.id,
            provider,
            model,
          })
          .select()
          .single();
        
        if (error) throw error;
        chatId = newChat.id;
        setActiveChatId(chatId);
        
        // Add to local state
        setChats(prev => [{
          id: newChat.id,
          title: newChat.title,
          messages: [
            {
              id: `msg-${Date.now() - 1}`,
              role: 'system',
              content: selectedAgent?.systemPrompt || 'You are a helpful AI assistant.',
              timestamp: Date.now(),
            },
            userMessage,
          ],
          agentId: selectedAgent?.id,
          provider,
          model,
          folderId: newChat.folder_id,
          tags: newChat.tags || [],
          pinned: newChat.pinned,
          createdAt: new Date(newChat.created_at).getTime(),
          updatedAt: new Date(newChat.updated_at).getTime(),
        }, ...prev]);
      } else {
        // Update existing chat
        await supabase
          .from('chats')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', chatId);
        
        // Update local state
        setChats(prev => prev.map(chat => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: [...chat.messages, userMessage],
              updatedAt: Date.now(),
            };
          }
          return chat;
        }));
      }

      // Save message to Supabase
      await supabase.from('messages').insert({
        chat_id: chatId,
        role: 'user',
        content: input.trim(),
        provider,
        model,
      });
    }

    setInput('');
    setIsLoading(true);
    setIsTyping(true);

    // Get all messages including system prompt
    const currentChat = chats.find(c => c.id === activeChatId) || 
      { messages: selectedAgent?.systemPrompt ? [{ role: 'system', content: selectedAgent.systemPrompt }] : [] };
    const allMessages = currentChat.messages || [];
    const messagesToSend = [
      ...allMessages,
      userMessage,
    ];

    try {
      // Call real AI API
      const response = await fetch('/api/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesToSend,
          provider,
          model,
          chatId: activeChatId,
        }),
      });

      if (!response.ok) {
        throw new Error('AI request failed');
      }

      const data = await response.json();

      const aiMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.content,
        timestamp: Date.now(),
        provider: data.provider,
        model: data.model,
      };

      if (demoMode) {
        // Demo mode - update local state only
        setChats(prev => prev.map(chat => {
          if (chat.id === activeChatId) {
            return {
              ...chat,
              messages: [...chat.messages, aiMessage],
              updatedAt: Date.now(),
            };
          }
          return chat;
        }));
      } else {
        // Production mode - save to Supabase
        await supabase.from('messages').insert({
          chat_id: activeChatId!,
          role: 'assistant',
          content: data.content,
          provider: data.provider,
          model: data.model,
        });

        // Update local state
        setChats(prev => prev.map(chat => {
          if (chat.id === activeChatId) {
            return {
              ...chat,
              messages: [...chat.messages, aiMessage],
              updatedAt: Date.now(),
            };
          }
          return chat;
        }));
      }
    } catch (error) {
      // Fallback to demo response on error
      console.error('AI request failed, using demo response:', error);
      const fallbackResponses = [
        "I apologize, but I'm having trouble connecting to the AI service right now. Please check your API configuration and try again.",
      ];
      
      const aiMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: fallbackResponses[0],
        timestamp: Date.now(),
        provider,
        model,
      };

      setChats(prev => prev.map(chat => {
        if (chat.id === activeChatId) {
          return {
            ...chat,
            messages: [...chat.messages, aiMessage],
            updatedAt: Date.now(),
          };
        }
        return chat;
      }));
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  }, [input, activeChatId, isLoading, provider, model, chats, demoMode, selectedAgent, user]);

  const handleNewChat = () => {
    const newChat: Chat = {
      id: `chat-${Date.now()}`,
      title: 'New Conversation',
      messages: [
        {
          id: `msg-${Date.now()}`,
          role: 'system',
          content: selectedAgent?.systemPrompt || 'You are a helpful AI assistant.',
          timestamp: Date.now(),
        },
      ],
      agentId: selectedAgent?.id,
      provider,
      model,
      tags: [],
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
  };

  const handleToggleSubtask = (subtaskId: string) => {
    setSubtasks(prev => prev.map(st => {
      if (st.id === subtaskId) {
        return {
          ...st,
          status: st.status === 'completed' ? 'pending' : 'completed',
          completedAt: st.status === 'completed' ? undefined : Date.now(),
        };
      }
      return st;
    }));
  };

  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    return chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           chat.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  // Demo mode data initialization
  useEffect(() => {
    if (demoMode) {
      setChats([
        {
          id: 'chat-1',
          title: 'Build SaaS Platform',
          messages: [
            { id: 'msg-1', role: 'user', content: 'I want to build a SaaS platform for project management.', timestamp: Date.now() - 86400000 * 2, provider: 'openai' as Provider, model: 'gpt-4-turbo-preview' },
            { id: 'msg-2', role: 'assistant', content: 'I will help you plan this SaaS platform...', timestamp: Date.now() - 86400000 * 2 + 1800000, provider: 'openai' as Provider, model: 'gpt-4-turbo-preview' },
          ],
          agentId: 'agent-architect',
          provider: 'openai',
          model: 'gpt-4-turbo-preview',
          folderId: 'folder-projects',
          tags: ['saas', 'planning'],
          pinned: true,
          createdAt: Date.now() - 86400000 * 2,
          updatedAt: Date.now() - 86400000 * 2 + 1800000,
        },
        {
          id: 'chat-2',
          title: 'React Component Help',
          messages: [
            { id: 'msg-3', role: 'user', content: "I'm building a custom select component in React...", timestamp: Date.now() - 86400000 * 3, provider: 'minimax' as Provider, model: 'abab6.5s-chat' },
            { id: 'msg-4', role: 'assistant', content: 'Great question! Your component has several accessibility issues...', timestamp: Date.now() - 86400000 * 3 + 3600000, provider: 'minimax' as Provider, model: 'abab6.5s-chat' },
          ],
          agentId: 'agent-coder',
          provider: 'minimax',
          model: 'abab6.5s-chat',
          tags: ['react'],
          pinned: false,
          createdAt: Date.now() - 86400000 * 3,
          updatedAt: Date.now() - 86400000 * 3 + 3600000,
        },
      ]);
      setFolders([
        { id: 'folder-projects', name: 'Projects', icon: '📁', color: '#3b82f6', chatIds: [], createdAt: Date.now() - 86400000 * 7 },
        { id: 'folder-learning', name: 'Learning', icon: '📚', color: '#10b981', chatIds: [], createdAt: Date.now() - 86400000 * 5 },
        { id: 'folder-ideas', name: 'Ideas', icon: '💡', color: '#f59e0b', chatIds: [], createdAt: Date.now() - 86400000 * 3 },
      ]);
      setSubtasks([
        { id: 'subtask-1', chatId: 'chat-1', parentMessageId: 'msg-1', title: 'Research competitor features', description: 'Analyze top 5 competitors', status: 'completed', priority: 'high', linkedContext: [], createdAt: Date.now() - 86400000 * 2, completedAt: Date.now() - 86400000 },
        { id: 'subtask-2', chatId: 'chat-1', parentMessageId: 'msg-1', title: 'Design system architecture', description: 'Create architecture diagrams', status: 'in_progress', priority: 'high', linkedContext: [], createdAt: Date.now() - 86400000 },
        { id: 'subtask-3', chatId: 'chat-1', parentMessageId: 'msg-1', title: 'Create MVP timeline', description: 'Draft 12-week roadmap', status: 'pending', priority: 'medium', linkedContext: [], createdAt: Date.now() },
      ]);
      setExpandedFolders(new Set(['folder-projects']));
    }
  }, [demoMode]);

  return (
    <div className="h-screen flex flex-col bg-nexus-darker">
      {demoMode && <DemoBanner onExit={() => setDemoMode(false)} />}
      
      {/* Header */}
      <header className="h-14 bg-nexus-card border-b border-nexus-border flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-nexus-hover rounded-lg transition-colors"
          >
            {sidebarCollapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg gradient-text">Nexus</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <AgentSelector
            agents={agents}
            selectedAgent={selectedAgent}
            onSelect={(agent) => {
              setSelectedAgent(agent);
              setProvider(agent.provider);
              setModel(agent.model);
            }}
            onCreateNew={() => {}}
          />
          <ProviderSelector
            provider={provider}
            model={model}
            onProviderChange={setProvider}
            onModelChange={setModel}
          />
          <button
            onClick={() => setShowSecurityScanner(!showSecurityScanner)}
            className={`p-2 rounded-lg transition-colors ${
              showSecurityScanner ? 'bg-red-600 text-white' : 'hover:bg-nexus-hover text-nexus-muted'
            }`}
          >
            <Shield className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowContextPanel(!showContextPanel)}
            className={`p-2 rounded-lg transition-colors ${
              showContextPanel ? 'bg-primary-600 text-white' : 'hover:bg-nexus-hover text-nexus-muted'
            }`}
          >
            <Layers className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowBilling(true)}
            className="p-2 hover:bg-nexus-hover rounded-lg transition-colors text-nexus-muted"
            title="Billing"
          >
            <CreditCard className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowAdmin(true)}
            className="p-2 hover:bg-nexus-hover rounded-lg transition-colors text-nexus-muted"
            title="Admin Dashboard"
          >
            <Crown className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-nexus-hover rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5 text-nexus-muted" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-nexus-dark border-r border-nexus-border flex flex-col transition-all duration-300 flex-shrink-0`}>
          <div className="p-3">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity font-medium"
            >
              <Plus className="w-5 h-5" />
              {!sidebarCollapsed && <span>New Chat</span>}
            </button>
          </div>

          {/* Search */}
          {!sidebarCollapsed && (
            <div className="px-3 pb-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-nexus-muted" />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-nexus-card border border-nexus-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          )}

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {/* Pinned Chats */}
            {pinnedChats.length > 0 && !sidebarCollapsed && (
              <div className="mb-2">
                {pinnedChats.map(chat => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={activeChatId === chat.id}
                    onClick={() => setActiveChatId(chat.id)}
                    onContextMenu={() => {}}
                  />
                ))}
              </div>
            )}

            {/* Folders */}
            {!sidebarCollapsed && folders.map(folder => (
              <FolderItem
                key={folder.id}
                folder={folder}
                isExpanded={expandedFolders.has(folder.id)}
                onToggle={() => toggleFolder(folder.id)}
                chats={filteredChats}
                activeChatId={activeChatId}
                onChatSelect={(chat) => setActiveChatId(chat.id)}
              />
            ))}

            {/* Unpinned Chats */}
            {!sidebarCollapsed && (
              <div>
                <div className="px-3 py-2 text-xs text-nexus-muted uppercase font-medium">
                  Recent
                </div>
                {filteredChats.filter(c => !c.pinned && !c.folderId).map(chat => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={activeChatId === chat.id}
                    onClick={() => setActiveChatId(chat.id)}
                    onContextMenu={() => {}}
                  />
                ))}
              </div>
            )}
          </div>

          {/* User Section */}
          {!sidebarCollapsed && (
            <div className="p-3 border-t border-nexus-border">
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-2 py-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{user.email}</div>
                      <div className="text-xs text-nexus-muted">Authenticated</div>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="p-1.5 hover:bg-nexus-hover rounded-lg transition-colors text-nexus-muted"
                      title="Sign out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-2 py-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Guest</div>
                      <div className="text-xs text-nexus-muted">Demo Mode</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSignIn(true)}
                    className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                  >
                    <User className="w-4 h-4" />
                    Sign In
                  </button>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {showSecurityScanner ? (
            <SecurityScanner onClose={() => setShowSecurityScanner(false)} />
          ) : activeChat ? (
            <>
              {/* Chat Header */}
              <div className="h-12 bg-nexus-card/50 border-b border-nexus-border flex items-center justify-between px-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-medium">{activeChat.title}</h2>
                  {activeChat.pinned && <Pin className="w-4 h-4 text-yellow-500" />}
                </div>
                <div className="flex items-center gap-2">
                  {activeChat.tags.map(tag => (
                    <span key={tag} className="text-xs bg-nexus-border px-2 py-0.5 rounded-full text-nexus-muted">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeChat.messages
                  .filter(m => m.role !== 'system')
                  .map(message => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                {isTyping && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-nexus-card/50 border-t border-nexus-border">
                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Message Nexus... (Shift+Enter for new line)"
                      className="w-full bg-nexus-card border border-nexus-border rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                      rows={3}
                      disabled={isLoading}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className={`absolute right-2 bottom-2 p-2 rounded-lg transition-colors ${
                        input.trim() && !isLoading
                          ? 'bg-primary-600 text-white hover:bg-primary-700'
                          : 'bg-nexus-border text-nexus-muted cursor-not-allowed'
                      }`}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2 text-xs text-nexus-muted">
                    <Sparkles className="w-4 h-4" />
                    AI can make mistakes. Review generated code.
                  </div>
                  <div className="text-xs text-nexus-muted">
                    {input.length > 0 ? `${input.length} chars` : ''}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Welcome to Nexus</h2>
                <p className="text-nexus-muted mb-6">
                  {user ? 'Start a new conversation' : 'Sign in to save your chats or try demo mode'}
                </p>
                <button
                  onClick={handleNewChat}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                  New Conversation
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Context Panel */}
        {showContextPanel && (
          <aside className="w-80 bg-nexus-dark border-l border-nexus-border flex flex-col animate-slide-in-right">
            <div className="p-4 border-b border-nexus-border">
              <h3 className="font-medium flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Context & Tasks
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Subtasks Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-nexus-muted uppercase tracking-wide">
                    Subtasks ({activeSubtasks.filter(s => s.status === 'completed').length}/{activeSubtasks.length})
                  </h4>
                  <button className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>
                {activeSubtasks.length > 0 ? (
                  <div className="space-y-2">
                    {activeSubtasks.map(subtask => (
                      <SubtaskItem
                        key={subtask.id}
                        subtask={subtask}
                        onToggle={() => handleToggleSubtask(subtask.id)}
                        onClick={() => {}}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-nexus-muted text-sm">
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No subtasks yet.
                    <br />
                    Ask the AI to break down complex tasks!
                  </div>
                )}
              </div>

              {/* Linked Context Section */}
              <div className="pt-4 border-t border-nexus-border">
                <h4 className="text-sm font-medium text-nexus-muted uppercase tracking-wide mb-2">
                  Linked Context
                </h4>
                <div className="space-y-2">
                  {activeSubtasks
                    .flatMap(s => s.linkedContext.map(c => ({ context: c, subtask: s.title })))
                    .slice(0, 5)
                    .map((item, i) => (
                      <div
                        key={i}
                        className="p-2 bg-nexus-card rounded-lg border border-nexus-border text-sm"
                      >
                        <div className="text-xs text-nexus-muted mb-1">{item.subtask}</div>
                        <p className="text-xs">{item.context}</p>
                      </div>
                    ))}
                </div>
              </div>

              {/* Agent Info */}
              {selectedAgent && (
                <div className="pt-4 border-t border-nexus-border">
                  <h4 className="text-sm font-medium text-nexus-muted uppercase tracking-wide mb-2">
                    Active Agent
                  </h4>
                  <div className="p-3 bg-nexus-card rounded-lg border border-nexus-border">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{selectedAgent.avatar}</span>
                      <div>
                        <div className="font-medium">{selectedAgent.name}</div>
                        <div className="text-xs text-nexus-muted">{selectedAgent.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-nexus-muted">
                      {PROVIDER_ICONS[selectedAgent.provider]}
                      <span className="capitalize">{selectedAgent.provider}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Sign In Modal */}
      {showSignIn && (
        <SignInModal
          onClose={() => setShowSignIn(false)}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
          loading={authLoading}
        />
      )}

      {/* Billing Dashboard Modal */}
      {showBilling && <BillingDashboard onClose={() => setShowBilling(false)} />}

      {/* Admin Dashboard Modal */}
      {showAdmin && <AdminDashboard onClose={() => setShowAdmin(false)} />}
    </div>
  );
}

// Sign In Modal Component
function SignInModal({ 
  onClose, 
  onSignIn, 
  onSignUp,
  loading 
}: { 
  onClose: () => void; 
  onSignIn: (email: string, password: string) => void;
  onSignUp: (email: string, password: string) => void;
  loading: boolean;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      onSignUp(email, password);
    } else {
      onSignIn(email, password);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-nexus-card border border-nexus-border rounded-xl w-full max-w-md p-6 animate-slide-in-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{isSignUp ? 'Create Account' : 'Sign In'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-nexus-hover rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-nexus-dark border border-nexus-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="you@example.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-nexus-dark border border-nexus-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
          
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-sm text-primary-400 hover:text-primary-300"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
          </button>
        </form>
      </div>
    </div>
  );
}
