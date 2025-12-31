# Nexus Development Guide

## Overview

Nexus is a multi-tenant SaaS AI chat platform providing unified access to OpenAI, Anthropic, and MiniMax AI models. The platform operates on a **credit-based subscription model** where users pay monthly for credits that unlock different AI capabilities at different rates.

### Business Model

| Component | Description |
|-----------|-------------|
| **Subscription** | Monthly recurring revenue via Revolut |
| **Credits** | Purchased credits consumed per AI request |
| **Tiered Pricing** | Different models have different credit costs |
| **Profit Margin** | Markup on AI provider costs |

### Supported AI Providers & Credit Costs

| Provider | Model | Credits/1K tokens | Est. Cost/1M tokens |
|----------|-------|-------------------|---------------------|
| OpenAI | GPT-4 Turbo | 10 credits | $0.01 ($0.01 base) |
| OpenAI | GPT-4 | 20 credits | $0.03 ($0.03 base) |
| OpenAI | GPT-3.5 Turbo | 1 credits | $0.0005 ($0.0005 base) |
| Anthropic | Claude 3 Opus | 15 credits | $0.015 ($0.015 base) |
| Anthropic | Claude 3 Sonnet | 3 credits | $0.003 ($0.003 base) |
| Anthropic | Claude 3 Haiku | 1 credits | $0.00025 ($0.00025 base) |
| MiniMax | MiniMax 2.1 | 0.5 credits | TBD |

### Credit Packages

| Package | Credits | Price (GBP) | Cost per 1K credits |
|---------|---------|-------------|---------------------|
| Starter | 10,000 | £5.00 | £0.50 |
| Pro | 50,000 | £20.00 | £0.40 |
| Enterprise | 500,000 | £150.00 | £0.30 |

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Supabase (PostgreSQL + GoTrue)
- **Payments:** Revolut Merchant API (instant settlement)
- **AI Providers:** OpenAI, Anthropic, MiniMax
- **Deployment:** Docker Compose (self-hosted Supabase)

---

## Project Structure

```
nexus/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/              # Auth callback routes
│   │   │   ├── billing/           # Payment webhooks & management
│   │   │   ├── chat/              # Chat CRUD & completions
│   │   │   ├── credits/           # Credit balance & usage
│   │   │   ├── subscription/      # Subscription management
│   │   │   ├── folder/            # Folder management
│   │   │   ├── message/           # Message operations
│   │   │   └── subtask/           # Subtask management
│   │   ├── globals.css            # Global styles
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Main application
│   ├── components/
│   │   ├── BillingPanel.tsx       # Credit purchases & subscription
│   │   ├── SecurityScanner.tsx    # Security scanning UI
│   │   └── PricingTable.tsx       # Credit package selection
│   └── lib/
│       ├── billing/               # Payment processing (Revolut)
│       ├── credits/               # Credit calculation engine
│       ├── supabase/              # Supabase client utilities
│       ├── types.ts               # TypeScript definitions
│       └── demo-data.ts           # Demo mode data (fallback)
├── supabase/
│   ├── schema.sql                 # Database schema (updated for billing)
│   └── kong.yml                   # API gateway config
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

---

## Database Schema (Billing Extension)

### New Tables Required

```sql
-- ============================================
-- CREDIT SYSTEM TABLES
-- ============================================

-- Credit packages available for purchase
CREATE TABLE credit_packages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  credits INTEGER NOT NULL,
  price_gbp DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- User credit balances
CREATE TABLE user_credits (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  balance INTEGER DEFAULT 0 NOT NULL,
  lifetime_credits INTEGER DEFAULT 0 NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Credit transactions (purchases + usage)
CREATE TABLE credit_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'refund', 'bonus')),
  amount INTEGER NOT NULL,
  credit_package_id UUID REFERENCES credit_packages(id),
  transaction_id TEXT,  -- Revolut transaction ID
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Credit usage per AI request (for analytics)
CREATE TABLE credit_usage (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  credits_consumed INTEGER NOT NULL,
  cost_usd DECIMAL(10,6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- SUBSCRIPTION TABLES
-- ============================================

-- Subscription plans
CREATE TABLE subscription_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  monthly_credits INTEGER NOT NULL,
  monthly_price_gbp DECIMAL(10,2) NOT NULL,
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- User subscriptions
CREATE TABLE user_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES subscription_plans(id) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'past_due')),
  revolut_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_credit_usage_user_id ON credit_usage(user_id);
CREATE INDEX idx_credit_usage_created_at ON credit_usage(created_at DESC);
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
```

---

## Payment Integration (Revolut)

### Setup Requirements

1. **Revolut Merchant Account** (UK business account)
2. **Revolut API Access** via Developer Portal
3. **Webhook Endpoint** for instant payment notifications

### Environment Variables

```env
# Revolut Merchant API
REVOLUT_API_KEY=sk_live_xxxxxxxxxxxxxxxxxxxx
REVOLUT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----
REVOLUT_MERCHANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
REVOLUT_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx

# Payment Callbacks
NEXT_PUBLIC_APP_URL=https://nexus.simoncallaghan.dev
WEBHOOK_BASE_URL=https://nexus.simoncallaghan.dev/api/billing/webhook
```

### Payment Flow

```
1. User selects credit package
2. User redirected to Revolut Checkout
3. Payment processed (instant settlement)
4. Revolut sends webhook to /api/billing/webhook
5. Webhook validates signature
6. Credits added to user balance
7. Transaction recorded in credit_transactions
```

### Webhook Handler

```typescript
// src/app/api/billing/webhook/route.ts
export async function POST(request: Request) {
  const payload = await request.json();
  const signature = request.headers.get('Revolut-Signature');

  // Verify webhook signature
  const isValid = verifyRevolutSignature(payload, signature);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Process based on event type
  switch (payload.event) {
    case 'payment.completed':
      await handlePaymentCompleted(payload);
      break;
    case 'payment.failed':
      await handlePaymentFailed(payload);
      break;
    case 'subscription.created':
      await handleSubscriptionCreated(payload);
      break;
    case 'subscription.cancelled':
      await handleSubscriptionCancelled(payload);
      break;
  }

  return NextResponse.json({ received: true });
}
```

---

## Credit Calculation Engine

### Token-to-Credit Conversion

```typescript
// src/lib/credits/calculator.ts

interface TokenUsage {
  provider: 'openai' | 'anthropic' | 'minimax';
  model: string;
  inputTokens: number;
  outputTokens: number;
}

interface CreditCost {
  credits: number;
  costUSD: number;
}

const CREDIT_RATES = {
  openai: {
    'gpt-4-turbo-preview': { per1KInput: 10, per1KOutput: 10 },
    'gpt-4': { per1KInput: 20, per1KOutput: 60 },
    'gpt-3.5-turbo': { per1KInput: 1, per1KOutput: 2 },
  },
  anthropic: {
    'claude-opus-4-20240307': { per1KInput: 15, per1KOutput: 75 },
    'claude-sonnet-4-20250514': { per1KInput: 3, per1KOutput: 15 },
    'claude-haiku-3-20250514': { per1KInput: 1, per1KOutput: 5 },
  },
  minimax: {
    'abab6.5s-chat': { per1KInput: 0.5, per1KOutput: 0.5 },
    'abab6.5-chat': { per1KInput: 0.5, per1KOutput: 0.5 },
  },
};

export function calculateCredits(usage: TokenUsage): CreditCost {
  const rate = CREDIT_RATES[usage.provider][usage.model];
  if (!rate) {
    throw new Error(`Unknown model: ${usage.provider}/${usage.model}`);
  }

  const inputCredits = (usage.inputTokens / 1000) * rate.per1KInput;
  const outputCredits = (usage.outputTokens / 1000) * rate.per1KOutput;
  
  // Convert to USD for cost tracking (hardcoded for now, would use pricing API)
  const totalCredits = inputCredits + outputCredits;
  const costUSD = totalCredits * 0.001; // Simplified conversion

  return {
    credits: Math.ceil(totalCredits),
    costUSD,
  };
}

export async function deductCredits(
  userId: string,
  credits: number
): Promise<boolean> {
  const supabase = createClient();
  
  // Check balance
  const { data: balance } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_id', userId)
    .single();

  if (!balance || balance.balance < credits) {
    throw new Error('Insufficient credits');
  }

  // Deduct credits
  const { error } = await supabase.rpc('deduct_user_credits', {
    p_user_id: userId,
    p_amount: credits,
  });

  if (error) {
    throw new Error(error.message);
  }

  return true;
}
```

---

## Docker Deployment

### Prerequisites

- Docker Engine 24.0+
- Docker Compose V2
- 4GB+ RAM available
- 20GB+ disk space

### Quick Start

```bash
cd nexus

# 1. Copy environment file
cp .env.example .env

# 2. Edit environment variables
nano .env

# 3. Start all services
docker compose up -d

# 4. Initialize database schema (includes billing tables)
docker compose exec postgres psql -U postgres -d postgres -f /supabase/schema.sql
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| Nexus App | 3011 | Main application (CloudPanel reverse proxy) |
| PostgreSQL | 5435 | Database (external port for migrations) |
| Kong API | 8100 | API Gateway |
| GoTrue Auth | 9999 | Authentication |
| PostgREST | 3001 | REST API |
| Redis | 6381 | Caching |

### Environment Variables

```env
# Database
POSTGRES_PASSWORD=secure_password_change_this

# Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT
JWT_SECRET=your-jwt-secret-min-32-chars
OPERATOR_TOKEN=your-operator-token

# AI Providers
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
MINIMAX_API_KEY=your-minimax-key

# Payments (Revolut)
REVOLUT_API_KEY=sk_live_xxxxxxxx
REVOLUT_MERCHANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
REVOLUT_WEBHOOK_SECRET=whsec_xxxxxxxx

# Application
SITE_URL=https://nexus.simoncallaghan.dev
NEXUS_SECRET_KEY=your-nexus-secret-key-min-32-chars
NEXT_PUBLIC_APP_URL=https://nexus.simoncallaghan.dev
```

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

When running without billing configuration, Nexus uses demo mode with simulated responses and fake credits for testing the UI.

### API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | GET/POST | Chat operations |
| `/api/chat/completions` | POST | AI completions (with credit check) |
| `/api/credits/balance` | GET | Get user credit balance |
| `/api/credits/purchase` | POST | Initiate credit purchase |
| `/api/billing/webhook` | POST | Revolut payment webhook |
| `/api/subscription` | GET/POST | Subscription management |

---

## Production Checklist

- [ ] Configure SSL certificates (CloudPanel Let's Encrypt)
- [ ] Set up database backups (daily PostgreSQL dumps)
- [ ] Enable rate limiting on API endpoints
- [ ] Configure Revolut webhook retries
- [ ] Set up error tracking (Sentry)
- [ ] Configure allowed upload sizes
- [ ] Set up monitoring (UptimeRobot, etc.)
- [ ] Test payment flow in sandbox first
- [ ] Verify credit calculation accuracy

---

## Billing Flow Diagrams

### Credit Purchase Flow

```
User → Selects Package → Revolut Checkout → Payment → Webhook → Credits Added
                                                           ↓
                                                    Transaction Recorded
```

### AI Request Flow

```
User → Send Message → Check Credits → Deduct Credits → AI API Call → Record Usage
                   ↓ insufficient    ↓
               Show Upgrade UI
```

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Submit pull request

---

## License

MIT License

---

Built with ❤️ for the agentic coding portfolio
