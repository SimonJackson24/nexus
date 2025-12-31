#!/bin/bash
# Deploy Self-Hosted Supabase Stack

set -e

SUPABASE_DIR="/opt/supabase"
NEXUS_DIR="/opt/nexus"

echo "=== Deploying Self-Hosted Supabase ==="

# Create supabase directory
mkdir -p $SUPABASE_DIR
cd $SUPABASE_DIR

# Generate random passwords if not set
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(openssl rand -base64 32)}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 32)}"

# Create docker-compose.yml
cat > docker-compose.yml << 'DOCKEREOF'
version: '3.8'

services:
  kong:
    image: kong:3.4
    ports:
      - "8000:8000"
      - "8443:8443"
    environment:
      KONG_DATABASE: postgres
      KONG_PG_HOST: postgres
      KONG_DECLARATIVE_CONFIG: /kong/kong.yml
      KONG_ADMIN_LISTEN: 0.0.0.0:8001
    volumes:
      - ./kong.yml:/kong/kong.yml:ro
    depends_on:
      - postgres
    healthcheck:
      test: ["CMD", "kong", "health"]
      interval: 10s
      timeout: 5s
      retries: 5

  postgres:
    image: supabase/postgres:15.1.0.118
    ports:
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_HOST_AUTH_METHOD: trust
    volumes:
      - ${SUPABASE_DIR}/data:/var/lib/postgresql/data
      - ${SUPABASE_DIR}/schema:/docker-entrypoint-initdb.d/schema
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  gotrue:
    image: supabase/gotrue:v2.149.0
    ports:
      - "9999:9999"
    environment:
      GOTRUE_API_HOST: 0.0.0.0
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: postgres://postgres:${POSTGRES_PASSWORD}@postgres:5432/postgres
      GOTRUE_SITE_URL: ${NEXUS_URL}
      GOTRUE_JWT_SECRET: ${JWT_SECRET}
      GOTRUE_EXTERNAL_EMAIL_ENABLED: true
    depends_on:
      - postgres
      - kong

  postgrest:
    image: postgrest/postgrest:12.0.2
    ports:
      - "3001:3000"
    environment:
      PGRST_DB_URI: postgres://postgres:${POSTGRES_PASSWORD}@postgres:5432/postgres
      PGRST_DB_SCHEMA: public, storage
      PGRST_DB_ANON_ROLE: anon
    depends_on:
      - postgres
      - kong

volumes:
  data:
DOCKEREOF

# Create Kong config
cat > kong.yml << 'KONGEOF'
_format_version: "3.0"
_transform: true

services:
  - name: gotrue
    url: http://gotrue:9999
    routes:
      - name: auth-route
        paths:
          - /auth/v1
        strip_path: false

  - name: postgrest
    url: http://postgrest:3001
    routes:
      - name: api-route
        paths:
          - /rest/v1
        strip_path: true

  - name: nexus
    url: http://nexus:3000
    routes:
      - name: nexus-route
        paths:
          - /api
        strip_path: true
KONGEOF

# Copy schema files
mkdir -p schema
cp ${NEXUS_DIR}/nexus/supabase/schema-hybrid.sql schema/schema.sql

# Also copy original for fallback
cp ${NEXUS_DIR}/nexus/supabase/schema.sql schema/schema-original.sql 2>/dev/null || true

# Start services
docker compose down || true
docker compose up -d

echo "Waiting for PostgreSQL to be ready..."
sleep 15
docker compose exec postgres pg_isready -U postgres || echo "PostgreSQL starting..."

echo "Supabase stack deployed successfully!"
echo "PostgreSQL: localhost:5432"
echo "Kong API: localhost:8000"
echo "Auth: localhost:9999"
echo "PostgREST: localhost:3001"
