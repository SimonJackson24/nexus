#!/bin/bash
# Deploy Nexus Application

set -e

NEXUS_DIR="/opt/nexus-app"

echo "=== Deploying Nexus ==="

# Create nexus directory
mkdir -p $NEXUS_DIR

# Copy nexus files from current location
cp -r /opt/nexus/nexus/* $NEXUS_DIR/

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
    environment:
      NEXT_PUBLIC_SUPABASE_URL: http://kong:8000
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anon-key
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      MINIMAX_API_KEY: ${MINIMAX_API_KEY}
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
docker compose down || true
docker compose build
docker compose up -d

echo "Nexus deployed successfully!"
echo "Nexus App: http://localhost:3000"
