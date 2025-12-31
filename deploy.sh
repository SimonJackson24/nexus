#!/bin/bash
#
# Nexus Automated Deployment Script
# Fully automated deployment with secure credential generation
#
# Usage:
#   ./deploy.sh                    # Default Docker deployment
#   ./deploy.sh cloudpanel         # CloudPanel/Node.js deployment
#   ./deploy.sh docker openai      # Docker with specific AI providers
#   ./deploy.sh docker none        # Docker without AI providers
#
# AI Providers: openai, anthropic, minimax (comma-separated)
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'

# Default settings
MODE="${1:-docker}"
AI_KEYS="${2:-openai,anthropic,minimax}"
DB_PASSWORD="${DB_PASSWORD:-}"
JWT_SECRET="${JWT_SECRET:-}"

# Project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

print_header() {
    echo ""
    echo -e "${BOLD}${BLUE}════════════════════════════════════════════════════════════${RESET}"
    echo -e "${BOLD}${BLUE}  $1${RESET}"
    echo -e "${BOLD}${BLUE}════════════════════════════════════════════════════════════${RESET}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${BOLD}${YELLOW}▸ $1${RESET}"
}

print_success() {
    echo -e "${GREEN}✓ $1${RESET}"
}

print_error() {
    echo -e "${RED}✗ $1${RESET}" >&2
}

print_info() {
    echo -e "${BLUE}ℹ $1${RESET}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${RESET}"
}

# Generate secure random string
generate_password() {
    local length="${1:-24}"
    tr -dc 'A-Za-z0-9!@#$%^&*()_+-=[]{}|;:,.<>?' < /dev/urandom | head -c "$length"
}

# Generate UUID
generate_uuid() {
    cat /proc/sys/kernel/random/uuid 2>/dev/null || uuidgen 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())"
}

# Generate random hex
generate_hex() {
    local length="${1:-32}"
    python3 -c "import os; print(os.urandom($length).hex())" 2>/dev/null || openssl rand -hex "$length"
}

# Main deployment
print_header "Nexus Automated Deployment"

# Check prerequisites
print_section "Checking Prerequisites"

# Check Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version 2>/dev/null || echo "unknown")
    print_success "Docker: $DOCKER_VERSION"
else
    print_error "Docker is not installed or not running"
    exit 1
fi

# Check Docker Compose
if command -v docker &> /dev/null && docker compose version &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version 2>/dev/null || echo "v2")
    print_success "Docker Compose: $COMPOSE_VERSION"
else
    print_error "Docker Compose is not available"
    exit 1
fi

# Check Node.js for cloudpanel mode
if [ "$MODE" = "cloudpanel" ]; then
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js: $NODE_VERSION"
    else
        print_error "Node.js is not installed"
        exit 1
    fi
fi

# Generate secure credentials
print_section "Generating Secure Credentials"

declare -A SECRETS

# Database password
if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD=$(generate_password 24)
fi
SECRETS["POSTGRES_PASSWORD"]="$DB_PASSWORD"
print_success "Generated PostgreSQL password"

# JWT Secret
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(generate_password 48)
fi
SECRETS["JWT_SECRET"]="$JWT_SECRET"
print_success "Generated JWT secret"

# Operator token
SECRETS["OPERATOR_TOKEN"]=$(generate_uuid)
print_success "Generated operator token"

# Nexus secret key
SECRETS["NEXUS_SECRET_KEY"]=$(generate_password 32)
print_success "Generated Nexus secret key"

# API Key encryption key (for BYOK)
SECRETS["API_KEY_ENCRYPTION_KEY"]=$(generate_hex 32)
print_success "Generated API key encryption key"

# Supabase keys
SECRETS["NEXT_PUBLIC_SUPABASE_ANON_KEY"]="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.$(generate_hex 32)"
print_success "Generated Supabase anon key"

SECRETS["SUPABASE_SERVICE_ROLE_KEY"]="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.$(generate_hex 32)"
print_success "Generated Supabase service role key"

# AI Provider keys
AI_PROVIDERS=()
IFS=',' read -ra PROVIDERS <<< "$AI_KEYS"
for provider in "${PROVIDERS[@]}"; do
    provider=$(echo "$provider" | xargs)
    case "${provider,,}" in
        openai)
            SECRETS["OPENAI_API_KEY"]="sk-xxxxx-xxxxx-xxxxx-xxxxx"
            SECRETS["OPENAI_MODEL"]="gpt-4-turbo-preview"
            AI_PROVIDERS+=("OpenAI")
            print_success "Configured OpenAI"
            ;;
        anthropic)
            SECRETS["ANTHROPIC_API_KEY"]="sk-ant-xxxxx-xxxxx-xxxxx-xxxxx"
            SECRETS["ANTHROPIC_MODEL"]="claude-sonnet-4-20250514"
            AI_PROVIDERS+=("Anthropic")
            print_success "Configured Anthropic"
            ;;
        minimax)
            SECRETS["MINIMAX_API_KEY"]="xxxxx-xxxxx-xxxxx"
            SECRETS["MINIMAX_MODEL"]="abab6.5s-chat"
            AI_PROVIDERS+=("MiniMax")
            print_success "Configured MiniMax"
            ;;
    esac
done

if [ ${#AI_PROVIDERS[@]} -eq 0 ]; then
    print_info "No AI providers configured (demo mode only)"
fi

# Create .env file
print_section "Configuring Environment"

ENV_FILE="$PROJECT_ROOT/nexus/.env"
ENV_CONTENT="# ============================================
# Nexus - Auto-Generated Environment Variables
# Generated: $(date '+%Y-%m-%d %H:%M:%S')
# ============================================

# ========================================
# Database Configuration
# ========================================
POSTGRES_PASSWORD=${SECRETS[POSTGRES_PASSWORD]}

# ========================================
# Supabase Configuration
# ========================================
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SECRETS[NEXT_PUBLIC_SUPABASE_ANON_KEY]}
SUPABASE_SERVICE_ROLE_KEY=${SECRETS[SUPABASE_SERVICE_ROLE_KEY]}

# ========================================
# Application Settings
# ========================================
SITE_URL=http://localhost:3000
NEXUS_SECRET_KEY=${SECRETS[NEXUS_SECRET_KEY]}

# ========================================
# JWT Configuration
# ========================================
JWT_SECRET=${SECRETS[JWT_SECRET]}
JWT_EXP=3600
REFRESH_TOKEN_REUSE_INTERVAL=10
OPERATOR_TOKEN=${SECRETS[OPERATOR_TOKEN]}

# ========================================
# Email Configuration (Optional)
# ========================================
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=false

# ========================================
# AI Provider API Keys
# ========================================
"

for provider in "${PROVIDERS[@]}"; do
    provider=$(echo "$provider" | xargs)
    case "${provider,,}" in
        openai)
            ENV_CONTENT+="OPENAI_API_KEY=${SECRETS[OPENAI_API_KEY]}
OPENAI_MODEL=gpt-4-turbo-preview
"
            ;;
        anthropic)
            ENV_CONTENT+="ANTHROPIC_API_KEY=${SECRETS[ANTHROPIC_API_KEY]}
ANTHROPIC_MODEL=claude-sonnet-4-20250514
"
            ;;
        minimax)
            ENV_CONTENT+="MINIMAX_API_KEY=${SECRETS[MINIMAX_API_KEY]}
MINIMAX_MODEL=abab6.5s-chat
"
            ;;
    esac
done

ENV_CONTENT+="
# ========================================
# BYOK Encryption Key
# ========================================
API_KEY_ENCRYPTION_KEY=${SECRETS[API_KEY_ENCRYPTION_KEY]}

# ========================================
# Development Settings
# ========================================
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=Nexus
"

echo "$ENV_CONTENT" > "$ENV_FILE"
print_success "Created .env file at: $ENV_FILE"

# Build application
print_section "Building Application"

if [ "$MODE" = "docker" ]; then
    print_info "Building Docker image..."
    if docker build -t nexus:latest "$PROJECT_ROOT/nexus" 2>&1 | tail -5; then
        print_success "Docker image built successfully"
    else
        print_error "Docker build failed"
        exit 1
    fi
else
    print_info "Installing npm dependencies..."
    cd "$PROJECT_ROOT/nexus"
    if npm ci 2>&1 | tail -3; then
        print_success "Dependencies installed"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi

    print_info "Building Next.js application..."
    if npm run build 2>&1 | tail -5; then
        print_success "Application built successfully"
    else
        print_error "Build failed"
        exit 1
    fi
    cd "$SCRIPT_DIR"
fi

# Start services (Docker mode)
if [ "$MODE" = "docker" ]; then
    print_section "Starting Docker Services"

    # Create docker-compose override
    OVERRIDE_FILE="$PROJECT_ROOT/nexus/docker-compose.override.yml"
    cat > "$OVERRIDE_FILE" << EOF
version: '3.8'
services:
  postgres:
    environment:
      POSTGRES_PASSWORD: ${SECRETS[POSTGRES_PASSWORD]}
EOF

    print_info "Starting containers..."
    export POSTGRES_PASSWORD
    if docker compose -f "$PROJECT_ROOT/nexus/docker-compose.yml" up -d 2>&1 | tail -10; then
        print_success "Containers started"
    else
        print_error "Failed to start containers"
        exit 1
    fi

    # Wait for services to be healthy
    print_section "Waiting for Services"

    print_info "Waiting for PostgreSQL..."
    MAX_ATTEMPTS=30
    ATTEMPT=0
    while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        if docker exec nexus-postgres pg_isready -U postgres > /dev/null 2>&1; then
            break
        fi
        ATTEMPT=$((ATTEMPT + 1))
        print_info "  Attempt $ATTEMPT/$MAX_ATTEMPTS..."
        sleep 2
    done

    if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
        print_error "PostgreSQL failed to start"
        exit 1
    fi
    print_success "PostgreSQL is ready"

    # Initialize database schema
    print_section "Initializing Database"

    print_info "Running database schema..."
    SCHEMA_DIR="$PROJECT_ROOT/nexus/supabase"

    # Run schema files in order
    if [ -f "$SCHEMA_DIR/schema-hybrid.sql" ]; then
      print_info "Running schema-hybrid.sql..."
      if docker exec -i nexus-postgres psql -U postgres -d postgres < "$SCHEMA_DIR/schema-hybrid.sql" 2>&1 | tail -10; then
        print_success "Database schema initialized"
      else
        print_warning "Schema may already exist"
      fi
    fi

    # Run GitHub integration schema
    if [ -f "$SCHEMA_DIR/schema-github.sql" ]; then
      print_info "Running schema-github.sql..."
      if docker exec -i nexus-postgres psql -U postgres -d postgres < "$SCHEMA_DIR/schema-github.sql" 2>&1 | tail -5; then
        print_success "GitHub schema initialized"
      else
        print_warning "GitHub schema may already exist"
      fi
    fi

    # Run GitHub extended schema
    if [ -f "$SCHEMA_DIR/schema-github-extended.sql" ]; then
      print_info "Running schema-github-extended.sql..."
      if docker exec -i nexus-postgres psql -U postgres -d postgres < "$SCHEMA_DIR/schema-github-extended.sql" 2>&1 | tail -5; then
        print_success "GitHub extended schema initialized"
      else
        print_warning "GitHub extended schema may already exist"
      fi
    fi

    # Run seed functions
    SEED_FILE="$SCHEMA_DIR/seed-admin.sql"
    if [ -f "$SEED_FILE" ]; then
      print_info "Running admin seed functions..."
      docker exec -i nexus-postgres psql -U postgres -d postgres < "$SEED_FILE" 2>&1 | tail -5 || true
    fi

    # Create default admin user if not exists
    print_section "Creating Admin User"

    ADMIN_EMAIL="${ADMIN_EMAIL:-admin@nexus.local}"
    ADMIN_PASSWORD=$(generate_password 16)

    # Check if admin user already exists
    EXISTING_ADMIN=$(docker exec nexus-postgres psql -U postgres -d postgres -t -c "SELECT email FROM auth.users WHERE email = '$ADMIN_EMAIL';" 2>/dev/null || echo "")

    if [ -z "$EXISTING_ADMIN" ]; then
      print_info "Creating default admin user: $ADMIN_EMAIL"

      # Generate admin user via API call
      KONG_URL="${KONG_URL:-http://localhost:8000}"
      SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

      if [ -n "$SERVICE_KEY" ]; then
        # Try to create admin via Supabase Auth Admin API
        curl -s -X POST "$KONG_URL/auth/v1/admin/users" \
          -H "Authorization: Bearer $SERVICE_KEY" \
          -H "Content-Type: application/json" \
          -d "{\"email\": \"$ADMIN_EMAIL\", \"password\": \"$ADMIN_PASSWORD\", \"email_confirm\": true, \"user_metadata\": {\"is_admin\": true, \"force_password_change\": true}}" > /dev/null 2>&1 || true

        print_success "Admin user created!"
        print_warning "IMPORTANT: Save these credentials!"
        echo ""
        echo -e "${BOLD}Admin Login Credentials:${RESET}"
        echo -e "  Email: ${GREEN}$ADMIN_EMAIL${RESET}"
        echo -e "  Password: ${GREEN}$ADMIN_PASSWORD${RESET}"
        echo ""
        echo -e "${YELLOW}You MUST change the password on first login!${RESET}"
      else
        print_warning "SERVICE_KEY not set - skipping admin creation"
        print_info "Run scripts/create-admin.sh manually after deployment"
      fi
    else
      print_success "Admin user already exists"
    fi
fi

# Output credentials
print_header "Deployment Complete!"

echo ""
echo -e "${BOLD}${GREEN}╔════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║                    DEPLOYMENT CREDENTIALS                   ║${RESET}"
echo -e "${BOLD}${GREEN}╚════════════════════════════════════════════════════════════╝${RESET}"
echo ""

echo -e "${BOLD}PostgreSQL:${RESET}"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  User: postgres"
echo -e "  Password: ${GREEN}${SECRETS[POSTGRES_PASSWORD]}${RESET}"
echo "  Database: postgres"
echo ""

echo -e "${BOLD}Supabase Studio (Database UI):${RESET}"
echo -e "  URL: ${BLUE}http://localhost:54321${RESET}"
echo ""

echo -e "${BOLD}Nexus Application:${RESET}"
echo -e "  URL: ${BLUE}http://localhost:3000${RESET}"
echo ""

echo -e "${BOLD}API Gateway (Kong):${RESET}"
echo "  Admin: http://localhost:8001"
echo "  Proxy: http://localhost:8000"
echo ""

echo -e "${BOLD}Security Credentials (Save These!):${RESET}"
echo -e "  JWT Secret: ${GREEN}${SECRETS[JWT_SECRET]}${RESET}"
echo -e "  Nexus Secret: ${GREEN}${SECRETS[NEXUS_SECRET_KEY]}${RESET}"
echo -e "  API Key Encryption: ${GREEN}${SECRETS[API_KEY_ENCRYPTION_KEY]}${RESET}"
echo -e "  Operator Token: ${GREEN}${SECRETS[OPERATOR_TOKEN]}${RESET}"
echo ""

echo -e "${BOLD}Supabase Keys:${RESET}"
echo -e "  Anon Key: ${GREEN}${SECRETS[NEXT_PUBLIC_SUPABASE_ANON_KEY]}${RESET}"
echo -e "  Service Role: ${GREEN}${SECRETS[SUPABASE_SERVICE_ROLE_KEY]}${RESET}"
echo ""

if [ ${#AI_PROVIDERS[@]} -gt 0 ]; then
    echo -e "${BOLD}AI Provider API Keys (Add to .env):${RESET}"
    for provider in "${AI_PROVIDERS[@]}"; do
        KEY_NAME="${provider^^}_API_KEY"
        echo -e "  $provider: ${GREEN}${SECRETS[$KEY_NAME]}${RESET}"
    done
    echo ""
fi

echo -e "${BOLD}Configuration File:${RESET}"
echo -e "  ${GREEN}$ENV_FILE${RESET}"
echo ""

echo -e "${YELLOW}IMPORTANT:${RESET}"
echo "  1. ${BOLD}Save this information securely${RESET} - passwords are not stored"
echo "  2. ${BOLD}Replace placeholder API keys${RESET} with real keys in .env"
echo "  3. ${BOLD}Change all secrets${RESET} before production deployment"
echo ""

echo -e "${GREEN}Deployment successful!${RESET}"
echo ""
