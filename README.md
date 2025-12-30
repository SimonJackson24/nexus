# Nexus

**Nexus** is an advanced multi-provider AI chat platform that unifies MiniMax, OpenAI, and Anthropic APIs into a single, powerful interface with intelligent subtask management and customizable agent profiles.

## ✨ Features

### 🤖 Multi-Provider AI Support
- **OpenAI** - GPT-4, GPT-4 Turbo, GPT-3.5-Turbo
- **Anthropic** - Claude 3 Opus, Sonnet, Haiku
- **MiniMax** - High-performance Chinese language model

### 🎭 Multi-Agent Profiles
- Create custom agent personas with unique system prompts
- Assign different providers/models to different agents
- Switch between agents mid-conversation
- Pre-built profiles: Architect, Coder, Writer, Analyst

### 📋 Auto Subtask Linking
- AI automatically breaks complex tasks into subtasks
- Visual subtask tree showing task hierarchy
- Link subtasks to source conversation
- Track progress across linked subtasks

### 📁 Chat Organization
- Create folders to organize conversations
- Tag-based filtering and search
- Pin important chats
- Quick access to recent conversations

### 🎨 Premium UX
- Dark mode optimized interface
- Streaming responses with typing indicators
- Markdown code highlighting
- Copy-to-clipboard for code blocks

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- API keys for at least one provider (OpenAI, Anthropic, or MiniMax)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/nexus.git
cd nexus

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Add your API keys to .env.local

# Start development server
npm run dev
```

Visit `http://localhost:3000` to start chatting.

## 🏗️ Architecture

```
nexus/
├── src/
│   ├── app/                 # Next.js 14 App Router
│   │   ├── api/            # API routes for AI providers
│   │   ├── chat/           # Chat interface pages
│   │   └── layout.tsx      # Root layout
│   ├── components/         # React components
│   │   ├── chat/          # Chat-specific components
│   │   ├── sidebar/       # Sidebar navigation
│   │   ├── context/       # Subtask/context panel
│   │   └── agent/         # Agent profile components
│   ├── lib/               # Utilities and providers
│   │   ├── openai.ts      # OpenAI client
│   │   ├── anthropic.ts   # Anthropic client
│   │   ├── minimax.ts     # MiniMax client
│   │   └── types.ts       # TypeScript types
│   └── hooks/             # Custom React hooks
├── public/                # Static assets
└── docs/                  # Documentation
```

## 🎯 Agentic Workflow

Nexus demonstrates advanced agentic patterns:

1. **Multi-Agent Orchestration** - Coordinate different AI providers for optimal results
2. **Task Decomposition** - Automatically break complex tasks into subtasks
3. **Context Management** - Maintain conversation context across subtasks
4. **Human-in-the-Loop** - Review and approve subtask execution
5. **Provider Abstraction** - Unified interface across multiple AI providers

## 📝 Demo Mode

Nexus includes a full demo mode that works without API keys:

- Pre-loaded chat conversations
- Sample agent profiles
- Interactive subtask demonstrations
- All UI features functional

Toggle demo mode from the sidebar to explore Nexus features.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guide for details.

## 📄 License

MIT License - see LICENSE for details.

---

Built with ❤️ for the agentic coding portfolio
<!-- CI Test -->

