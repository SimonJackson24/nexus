#!/bin/bash
set -e

echo "=========================================="
echo "Nexus Deployment Started"
echo "Time: $(date)"
echo "=========================================="

cd /home/nexus/htdocs/nexus.simoncallaghan.dev/nexus

# Check if .env exists, create with VM Supabase settings if not
if [ ! -f .env ]; then
  echo "Creating .env file with VM Supabase configuration..."
  NEXUS_SECRET_KEY=$(openssl rand -base64 32)
  cat > .env << 'HEREDOC_END'
# ================================================
# Nexus Environment Variables
# ================================================
# NOTE: Supabase is running on a dedicated VM
# Get values from the Supabase VM: ~/supabase-simple/.env

# Supabase Configuration (from dedicated VM)
NEXT_PUBLIC_SUPABASE_URL=http://your-supabase-vm-ip:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-vm-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-vm-supabase-service-key

# Application Secret
NEXUS_SECRET_KEY=${NEXUS_SECRET_KEY}

# AI Provider API Keys (get from respective dashboards)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
MINIMAX_API_KEY=

# Email (optional)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
HEREDOC_END
  echo ".env file created with placeholder values - update with VM Supabase keys"
fi

echo "Logging into container registry..."
echo "$GHCR_TOKEN" | docker login ghcr.io -u $USERNAME --password-stdin

FIRST_DEPLOY=false
if [ ! -f .deployed ]; then
  FIRST_DEPLOY=true
  echo "First deployment detected"
fi

echo "Pulling latest code..."
git fetch origin main
git checkout main
git pull origin main

# NOTE: Supabase is now on a dedicated VM
# No need to start local Supabase containers
# Database migrations should be run on the VM directly if needed

echo "Checking for schema changes..."
if git diff --name-only origin/main | grep -q "supabase/schema"; then
  echo "Schema changes detected - these should be applied to the VM Supabase:"
  echo "  1. SSH into the Supabase VM"
  echo "  2. Run: docker exec -i supabase-db psql -U postgres < path/to/schema.sql"
  echo "  3. Or use Supabase Studio at http://vm-ip:8000"
fi

echo "Starting services..."
docker compose pull
docker compose up -d --build

echo "Waiting for healthy..."
sleep 30

HEALTH=$(curl -s http://localhost:3011/api/health || echo "failed")
if echo "$HEALTH" | grep -q "healthy"; then
  echo "Deployment successful!"
  touch .deployed
else
  echo "Health check: $HEALTH"
  docker compose logs --tail=50 nexus
  sleep 20
  HEALTH2=$(curl -s http://localhost:3011/api/health || echo "failed")
  if echo "$HEALTH2" | grep -q "healthy"; then
    echo "Deployment successful on retry!"
    touch .deployed
  else
    echo "Health check failed"
    docker compose logs --tail=30 nexus
    exit 1
  fi
fi

echo "Cleaning up..."
docker image prune -f

echo "Logging..."
echo "$(date +%Y-%m-%d-%H-%M-%S) - $COMMIT_SHA" >> deployment.log

echo "=========================================="
echo "Deployment completed"
echo "=========================================="
