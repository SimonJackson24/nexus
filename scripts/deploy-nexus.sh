#!/bin/bash
set -e

echo "=========================================="
echo "Nexus Deployment Started"
echo "Time: $(date)"
echo "=========================================="

cd /home/nexus/htdocs/nexus.simoncallaghan.dev/nexus

if [ ! -f .env ]; then
  echo "Creating .env file..."
  JWT_SECRET=$(openssl rand -base64 32)
  NEXUS_SECRET_KEY=$(openssl rand -base64 32)
  cat > .env << 'HEREDOC_END'
# Supabase Configuration
JWT_SECRET=${JWT_SECRET}
NEXT_PUBLIC_SUPABASE_URL=http://kong:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=change-me-after-first-run
SUPABASE_SERVICE_ROLE_KEY=change-me-after-first-run

# Database
POSTGRES_PASSWORD=postgres

# AI Provider API Keys
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
MINIMAX_API_KEY=

# Application
NEXUS_SECRET_KEY=${NEXUS_SECRET_KEY}

# Email (optional)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
HEREDOC_END
  echo "env file created"
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

if [ "$FIRST_DEPLOY" = true ]; then
  echo "Starting Supabase services..."
  docker compose up -d postgres gotrue
  
  echo "Waiting for PostgreSQL..."
  for i in {1..30}; do
    if docker exec nexus-postgres pg_isready -U postgres > /dev/null 2>&1; then
      echo "PostgreSQL ready"
      break
    fi
    sleep 2
  done
  
  echo "Waiting for GoTrue..."
  sleep 5
  
  echo "Initializing database..."
  docker exec -i nexus-postgres psql -U postgres < supabase/schema.sql 2>/dev/null || echo "Schema may exist"
  docker exec -i nexus-postgres psql -U postgres < supabase/schema-hybrid.sql 2>/dev/null || echo "Hybrid schema may exist"
  docker exec -i nexus-postgres psql -U postgres < supabase/schema-github.sql 2>/dev/null || echo "GitHub schema may exist"
  docker exec -i nexus-postgres psql -U postgres < supabase/schema-github-extended.sql 2>/dev/null || echo "GitHub extended may exist"
  
  echo "Database initialized"
fi

echo "Checking for schema changes..."
if git diff --name-only origin/main | grep -q "supabase/schema"; then
  echo "Running migrations..."
  docker exec -i nexus-postgres psql -U postgres < supabase/schema.sql || true
  docker exec -i nexus-postgres psql -U postgres < supabase/schema-hybrid.sql || true
  docker exec -i nexus-postgres psql -U postgres < supabase/schema-github.sql || true
  docker exec -i nexus-postgres psql -U postgres < supabase/schema-github-extended.sql || true
  echo "Migrations completed"
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
