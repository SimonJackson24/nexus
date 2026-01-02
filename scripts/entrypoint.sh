#!/bin/bash
set -e

# Create .env file from environment variables for Next.js
cat > /app/.env << EOF
NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
DATABASE_URL=${DATABASE_URL}
EOF

echo ".env file created with Supabase configuration"

# Execute the original command
exec "$@"
