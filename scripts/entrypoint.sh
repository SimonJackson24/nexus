#!/bin/sh
set -e

# Export environment variables for Next.js (required for standalone mode)
export NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"
export SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY}"
export DATABASE_URL="${DATABASE_URL}"
export OPENAI_API_KEY="${OPENAI_API_KEY}"
export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}"
export MINIMAX_API_KEY="${MINIMAX_API_KEY}"
export NEXUS_SECRET_KEY="${NEXUS_SECRET_KEY}"

echo "Environment variables exported for Next.js"

# Execute the original command
exec "$@"
