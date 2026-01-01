#!/bin/bash
set -e

echo "=========================================="
echo "Nexus Deployment Started"
echo "Time: $(date)"
echo "=========================================="

cd /home/nexus/htdocs/nexus.simoncallaghan.dev/nexus

# Create .env file with Supabase configuration from environment variables
echo "Creating .env file..."
NEXUS_SECRET_KEY=${NEXUS_SECRET_KEY:-$(openssl rand -base64 32)}

# Use EOF (not quoted) to expand variables
cat > .env << EOF
# ================================================
# Nexus Environment Variables
# ================================================

# Supabase Configuration (from environment/GitHub Secrets)
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_KEY}

# Database URL (from environment/GitHub Secrets)
DATABASE_URL=${DATABASE_URL}

# Application Secret
NEXUS_SECRET_KEY=${NEXUS_SECRET_KEY}

# AI Provider API Keys
OPENAI_API_KEY=${OPENAI_API_KEY}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
MINIMAX_API_KEY=${MINIMAX_API_KEY}

# Email (optional)
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=${SMTP_PORT}
SMTP_USER=${SMTP_USER}
SMTP_PASS=${SMTP_PASS}
EOF

echo ".env file created"

FIRST_DEPLOY=false
if [ ! -f .deployed ]; then
  FIRST_DEPLOY=true
  echo "First deployment detected"
fi

echo "Pulling latest code..."
git fetch origin main
git checkout main
git pull origin main

echo "Starting services..."
docker compose --env-file .env pull
docker compose --env-file .env up -d --build --remove-orphans

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
