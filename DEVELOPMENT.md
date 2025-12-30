# Nexus Development Guide

## Overview

Nexus is an advanced multi-provider AI chat platform built with Next.js 14, TypeScript, and Tailwind CSS. It provides a unified interface for interacting with OpenAI, Anthropic, and MiniMax AI models, featuring intelligent subtask management, customizable agent profiles, and a premium dark-mode UI.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL (via Supabase self-hosted)
- **Auth:** Supabase GoTrue
- **Icons:** Lucide React
- **AI Providers:** OpenAI, Anthropic, MiniMax
- **Deployment:** Docker / Docker Compose

## Project Structure

```
nexus/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/           # Auth callback routes
│   │   │   ├── chat/           # Chat CRUD & completions
│   │   │   ├── folder/         # Folder management
│   │   │   ├── message/        # Message operations
│   │   │   └── subtask/        # Subtask management
│   │   ├── globals.css         # Global styles
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Main application
│   ├── components/
│   │   └── SecurityScanner.tsx # Security scanning UI
│   └── lib/
│       ├── supabase/           # Supabase client utilities
│       ├── types.ts            # TypeScript definitions
│       └── demo-data.ts        # Demo mode data
├── supabase/
│   ├── schema.sql              # Database schema
│   └── kong.yml                # API gateway config
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
└── README.md
```

## Key Features

### 1. Multi-Provider AI Support
- **OpenAI:** GPT-4 Turbo, GPT-4, GPT-3.5 Turbo
- **Anthropic:** Claude 3 Opus, Sonnet, Haiku
- **MiniMax:** MiniMax 2.1, MiniMax 2.1 Standard

### 2. Agent Profiles
- Pre-built agent personas: Architect, Coder, Writer, Analyst, Polyglot, Reasoner, Code Skeptic, Document Specialist
- Custom user-created agents
- Provider/model assignment per agent

### 3. Chat Organization
- Folder-based organization
- Tag system for categorization
- Pin important chats
- Search across conversations

### 4. Subtask Management
- AI-generated subtasks from complex requests
- Visual subtask tracking
- Priority levels (low, medium, high)
- Linked context for each subtask

---

## Docker Deployment (Recommended)

### Prerequisites

- Docker Engine 24.0+
- Docker Compose V2
- 4GB+ RAM available
- 10GB+ disk space

### Quick Start

```bash
cd nexus

# 1. Copy environment file
cp .env.example .env

# 2. Edit environment variables (see below)
nano .env

# 3. Start all services
docker compose up -d

# 4. Initialize database schema
# Run the SQL from supabase/schema.sql in Supabase Studio (http://localhost:54321)
# Or apply via psql:
# psql -h localhost -U postgres -d postgres -f supabase/schema.sql

# 5. Access Nexus at http://localhost:3000
# Access Supabase Studio at http://localhost:54321
```

### Environment Variables

Create a `.env` file with:

```env
# Database
POSTGRES_PASSWORD=secure_password_change_this

# Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT (generate secure keys)
JWT_SECRET=your-jwt-secret-min-32-chars
OPERATOR_TOKEN=your-operator-token

# AI Providers (optional for demo mode)
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
MINIMAX_API_KEY=your-minimax-key

# Site URL
SITE_URL=http://localhost:3000
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| Nexus App | 3000 | Main Next.js application |
| PostgreSQL | 5432 | Database (internal only) |
| Supabase Studio | 54321 | Database UI & management |
| Kong API | 8000 | API Gateway (internal) |
| GoTrue Auth | 9999 | Auth service (internal) |
| PostgREST | 3001 | REST API (internal) |
| Redis | 6379 | Caching (optional) |

### Managing Containers

```bash
# View logs
docker compose logs -f nexus

# Restart services
docker compose restart nexus

# Stop all services
docker compose down

# Stop and remove volumes (WARNING: deletes all data)
docker compose down -v
```

---

## CloudPanel Deployment

### 1. Server Setup

1. Install CloudPanel on your server (Ubuntu 20.04/22.04)
2. Create a new site in CloudPanel:
   - Site Type: Node.js
   - Node.js Version: 20.x
   - App User: nexus
   - App Path: /home/nexus/current

### 2. Application Setup

```bash
# SSH into your server
ssh your-user@your-server-ip

# Navigate to app directory
cd /home/nexus/current

# Copy application files
# (Upload nexus folder contents to this directory)

# Install dependencies
npm ci

# Build application
npm run build
```

### 3. Database Setup

1. Install PostgreSQL via CloudPanel or use external PostgreSQL
2. Create a new database: `nexus`
3. Apply the schema:
   ```bash
   psql -h localhost -U postgres -d nexus -f supabase/schema.sql
   ```

### 4. Environment Configuration

Create `.env` file in `/home/nexus/current/.env`:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/nexus

# Supabase (if using external)
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-instance.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Providers
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
MINIMAX_API_KEY=your-minimax-key

# App
NODE_ENV=production
NEXUS_SECRET_KEY=your-secret-key
```

### 5. Process Manager

Use PM2 or CloudPanel's Node.js process manager:

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start npm --name "nexus" -- run start

# Configure PM2 to start on boot
pm2 startup
pm2 save
```

### 6. SSL/HTTPS

1. In CloudPanel, add a domain to your site
2. Enable Let's Encrypt SSL
3. Configure Nginx reverse proxy if needed

---

## Database Schema

The database schema includes:

- **profiles** - User profiles (extends auth.users)
- **agent_profiles** - Custom user agents
- **folders** - Chat organization folders
- **chats** - Chat conversations
- **messages** - Chat messages
- **subtasks** - Task breakdowns
- **chat_shares** - Shared chat links

Run `supabase/schema.sql` to initialize the database.

---

## Development

### Local Development

```bash
cd nexus
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo Mode

When running without database configuration, Nexus defaults to demo mode with:
- Pre-loaded sample chats
- Sample agent profiles
- Simulated AI responses
- No data persistence

### API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | GET | List user's chats |
| `/api/chat` | POST | Create new chat |
| `/api/chat/[id]` | GET/PATCH/DELETE | Chat operations |
| `/api/chat/completions` | POST | AI chat completions |
| `/api/message` | GET/POST | Message operations |
| `/api/folder` | GET/POST/PATCH/DELETE | Folder management |
| `/api/subtask` | GET/POST/PATCH/DELETE | Subtask management |
| `/api/auth/callback` | GET | Auth callback handler |

---

## Production Checklist

- [ ] Change all default passwords
- [ ] Configure SSL certificates
- [ ] Set up database backups
- [ ] Configure rate limiting
- [ ] Set up logging/monitoring
- [ ] Enable CORS restrictions
- [ ] Configure allowed upload sizes
- [ ] Set up error tracking (Sentry, etc.)

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## License

MIT License

---

Built with ❤️ for the agentic coding portfolio
