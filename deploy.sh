#!/bin/bash
#
# Nexus Automated Deployment Script
# Deploys Docker image with pre-configured .env.nexus
#
# Usage:
#   ./deploy.sh                    # Default deployment
#   ./deploy.sh docker             # Docker deployment
#   ./deploy.sh docker init        # Docker with database initialization
#   ./deploy.sh docker init-admin  # Docker with init + admin creation
#
# Prerequisites:
#   1. Copy .env.nexus.example to .env.nexus and   2. edit values
# Ensure .env.nexus is in the same directory as this script
#   3. Or set NEXUS_CONFIG_PATH to point to your config file
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
ACTION="${2:-deploy}"

# Project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Config file path (default: .env.nexus in script directory)
NEXUS_CONFIG_PATH="${NEXUS_CONFIG_PATH:-$SCRIPT_DIR/.env.nexus}"

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

# Check for existing container
print_section "Checking Existing Deployment"

if docker ps -a --format '{{.Names}}' | grep -q '^nexus-app$'; then
    EXISTING_CONTAINER=true
    print_info "Existing Nexus container found"
    
    # Check if running
    if docker ps --format '{{.Names}}' | grep -q '^nexus-app$'; then
        print_info "Stopping existing container..."
        docker stop nexus-app > /dev/null 2>&1 || true
        print_success "Container stopped"
    fi
else
    EXISTING_CONTAINER=false
    print_info "No existing deployment found"
fi

# Pull latest image
print_section "Pulling Latest Image"

if [ -n "$GHCR_TOKEN" ] && [ -n "$USERNAME" ]; then
    echo "$GHCR_TOKEN" | docker login ghcr.io -u "$USERNAME" --password-stdin 2>/dev/null || true
fi

REGISTRY="${GHCR_REGISTRY:-ghcr.io/${USERNAME,,}}"
IMAGE_NAME="nexus"
IMAGE_REF="$REGISTRY/$IMAGE_NAME:latest"

print_info "Pulling $IMAGE_REF..."
if docker pull "$IMAGE_REF" 2>&1 | tail -3; then
    print_success "Image pulled successfully"
else
    print_error "Failed to pull image"
    exit 1
fi

# Run database initialization if requested
if [ "$ACTION" = "init" ] || [ "$ACTION" = "init-admin" ]; then
    print_section "Initializing Database"
    
    # Source the config file to get DATABASE_HOST and DATABASE_PASSWORD
    if [ -f "$NEXUS_CONFIG_PATH" ]; then
        set -a
        source "$NEXUS_CONFIG_PATH"
        set +a
    fi
    
    # Check PostgreSQL connection
    if [ -n "$DATABASE_HOST" ] && [ -n "$DATABASE_PASSWORD" ]; then
        print_info "Connecting to PostgreSQL at $DATABASE_HOST..."
        
        MAX_ATTEMPTS=30
        ATTEMPT=0
        while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
            if PGPASSWORD="$DATABASE_PASSWORD" psql -h "$DATABASE_HOST" -U "$DATABASE_USER" -d "$DATABASE_NAME" -c "SELECT 1" > /dev/null 2>&1; then
                break
            fi
            ATTEMPT=$((ATTEMPT + 1))
            print_info "  Attempt $ATTEMPT/$MAX_ATTEMPTS..."
            sleep 2
        done
        
        if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
            print_error "Failed to connect to PostgreSQL"
            exit 1
        fi
        print_success "PostgreSQL is ready"
        
        # Run schema initialization
        SCHEMA_DIR="$PROJECT_ROOT/nexus/supabase"
        
        for schema in schema-hybrid.sql schema-github.sql schema-github-extended.sql; do
            if [ -f "$SCHEMA_DIR/$schema" ]; then
                print_info "Running $schema..."
                if PGPASSWORD="$DATABASE_PASSWORD" psql -h "$DATABASE_HOST" -U "$DATABASE_USER" -d "$DATABASE_NAME" -f "$SCHEMA_DIR/$schema" 2>&1 | tail -3; then
                    print_success "$schema completed"
                else
                    print_warning "$schema may already exist or had issues"
                fi
            fi
        done
        
        # Run admin seed functions
        if [ -f "$SCHEMA_DIR/seed-admin.sql" ]; then
            print_info "Running seed functions..."
            PGPASSWORD="$DATABASE_PASSWORD" psql -h "$DATABASE_HOST" -U "$DATABASE_USER" -d "$DATABASE_NAME" -f "$SCHEMA_DIR/seed-admin.sql" 2>&1 | tail -3 || true
        fi
    else
        print_warning "DATABASE_HOST or DATABASE_PASSWORD not set - skipping database initialization"
        print_info "Run database initialization manually or use install wizard at /install"
    fi
fi

# Create admin user if requested
if [ "$ACTION" = "init-admin" ]; then
    print_section "Creating Admin User"
    
    if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
        print_info "Creating admin user: $ADMIN_EMAIL"
        
        # Create user via API
        curl -s -X POST "http://localhost:3000/api/install/create-admin" \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" > /dev/null 2>&1 || true
        
        print_success "Admin user creation initiated"
    else
        print_warning "ADMIN_EMAIL or ADMIN_PASSWORD not set - skipping admin creation"
    fi
fi

# Start container
print_section "Starting Nexus"

# Check for config file
if [ -f "$NEXUS_CONFIG_PATH" ]; then
    print_success "Using config: $NEXUS_CONFIG_PATH"
    CONFIG_VOLUME="$NEXUS_CONFIG_PATH:/app/.env.nexus:ro"
else
    print_warning "Config file not found: $NEXUS_CONFIG_PATH"
    print_info "Create this file from .env.nexus.example or set NEXUS_CONFIG_PATH"
    CONFIG_VOLUME=""
fi

# Create docker-compose override
OVERRIDE_FILE="$PROJECT_ROOT/nexus/docker-compose.override.yml"
cat > "$OVERRIDE_FILE" << EOF
version: '3.8'
services:
  nexus:
    image: $IMAGE_REF
    container_name: nexus-app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXUS_CONFIG_PATH=/app/.env.nexus
    volumes:
      - nexus-data:/app/.next
      - nexus-uploads:/app/public/uploads
      ${CONFIG_VOLUME}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  nexus-data:
  nexus-uploads:
EOF

print_info "Starting container..."
if docker compose -f "$PROJECT_ROOT/nexus/docker-compose.yml" up -d 2>&1 | tail -5; then
    print_success "Container started"
else
    print_error "Failed to start container"
    exit 1
fi

# Wait for container to be healthy
print_section "Verifying Deployment"

MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if docker ps --format '{{.Names}}' | grep -q '^nexus-app$' && \
       docker inspect --format='{{.State.Health.Status}}' nexus-app 2>/dev/null | grep -q 'healthy'; then
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    print_info "  Attempt $ATTEMPT/$MAX_ATTEMPTS..."
    sleep 2
done

if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
    print_warning "Container may not be fully healthy - checking status..."
    docker ps
else
    print_success "Container is healthy"
fi

# Output deployment info
print_header "Deployment Complete!"

echo ""
echo -e "${BOLD}${GREEN}╔════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║                    DEPLOYMENT SUCCESS                       ║${RESET}"
echo -e "${BOLD}${GREEN}╚════════════════════════════════════════════════════════════╝${RESET}"
echo ""

echo -e "${BOLD}Nexus Application:${RESET}"
echo -e "  URL: ${BLUE}http://localhost:3000${RESET}"
echo ""

if [ -f "$NEXUS_CONFIG_PATH" ]; then
    echo -e "${BOLD}Configuration:${RESET}"
    echo -e "  File: ${GREEN}$NEXUS_CONFIG_PATH${RESET}"
    echo ""
else
    echo -e "${BOLD}Configuration Required:${RESET}"
    echo -e "  Copy ${YELLOW}.env.nexus.example${RESET} to ${YELLOW}.env.nexus${RESET} and edit"
    echo -e "  Then restart the container"
    echo ""
fi

echo -e "${BOLD}Installation Wizard:${RESET}"
if [ "$ACTION" = "init" ] || [ "$ACTION" = "init-admin" ]; then
    echo -e "  Database: ${GREEN}Initialized${RESET}"
else
    echo -e "  URL: ${BLUE}http://localhost:3000/install${RESET}"
    echo "  Complete setup to configure database and create admin user"
fi

if [ "$ACTION" = "init-admin" ] && [ -n "$ADMIN_EMAIL" ]; then
    echo ""
    echo -e "${BOLD}Admin User:${RESET}"
    echo -e "  Email: ${GREEN}$ADMIN_EMAIL${RESET}"
    if [ -n "$ADMIN_PASSWORD" ]; then
        echo -e "  Password: ${GREEN}$ADMIN_PASSWORD${RESET}"
    fi
    echo -e "${YELLOW}Change password on first login!${RESET}"
fi

echo ""
echo -e "${YELLOW}Next Steps:${RESET}"
echo "  1. Visit http://localhost:3000"
echo "  2. If not pre-configured, complete the installation wizard"
echo "  3. Configure AI provider API keys in settings"
echo ""

print_success "Deployment successful!"
