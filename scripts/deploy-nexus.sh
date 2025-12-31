#!/bin/bash
# Deploy Nexus Application

set -e

NEXUS_DIR="/opt/nexus-app"

echo "=== Deploying Nexus ==="

# Create nexus directory
mkdir -p $NEXUS_DIR

# Copy nexus files from current location
cp -r /opt/nexus/nexus/* $NEXUS_DIR/

# Create .env file from example if it doesn't exist
if [ ! -f $NEXUS_DIR/.env ]; then
  echo "Creating .env file from .env.example..."
  cp $NEXUS_DIR/.env.example $NEXUS_DIR/.env
  echo "⚠️  IMPORTANT: Edit $NEXUS_DIR/.env with your actual API keys!"
fi

# Create docker-compose.yml
cat > $NEXUS_DIR/docker-compose.yml << 'EOF'
version: '3.8'

services:
  nexus:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      - kong
    networks:
      - supabase

networks:
  supabase:
    external: true
EOF

# Create Dockerfile
cat > $NEXUS_DIR/Dockerfile << 'EOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
EOF

# Build and start
cd $NEXUS_DIR

# Get Supabase keys from running container
if docker ps | grep -q "supabase-db"; then
  echo "🔑 Extracting Supabase keys from running container..."
  SUPABASE_ANON_KEY=$(docker exec supabase-db env 2>/dev/null | grep ANON_KEY | cut -d'=' -f2 || echo "")
  SUPABASE_SERVICE_ROLE=$(docker exec supabase-db env 2>/dev/null | grep SERVICE_ROLE_KEY | cut -d'=' -f2 || echo "")
else
  echo "⚠️  Supabase container not found, using environment variables..."
  SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY:-anon-key}
  SUPABASE_SERVICE_ROLE=${SUPABASE_SERVICE_ROLE_KEY:-service-role-key}
fi

# Create .env file
cat > $NEXUS_DIR/.env << ENVEOF
NEXT_PUBLIC_SUPABASE_URL=http://kong:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE}
NEXUS_SECRET_KEY=${NEXUS_SECRET_KEY:-nexus-secret-key-change-me}
OPENAI_API_KEY=${OPENAI_API_KEY:-sk-placeholder}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-sk-placeholder}
MINIMAX_API_KEY=${MINIMAX_API_KEY:-placeholder}
ENVEOF

echo "✅ .env file created"

docker compose down || true
docker compose build
docker compose up -d

echo "Nexus deployed successfully!"
echo "Nexus App: http://localhost:3000"
