#!/bin/bash
# Create default admin user with forced password change on first login
# Usage: ./create-admin.sh [email] [password]

set -e

# Default credentials
ADMIN_EMAIL="${1:-admin@nexus.local}"
ADMIN_PASSWORD="${2:-$(openssl rand -base64 12)}"

SUPABASE_URL="${SUPABASE_URL:-http://localhost:54321}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY:-}"

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "Error: SUPABASE_SERVICE_KEY not set"
  echo "Usage: SUPABASE_SERVICE_KEY=<key> ./create-admin.sh [email] [password]"
  exit 1
fi

echo "Creating admin user: $ADMIN_EMAIL"

# Create user via Supabase Auth Admin API
RESPONSE=$(curl -s -X POST "$SUPABASE_URL/auth/v1/admin/users" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\",
    \"email_confirm\": true,
    \"user_metadata\": {
      \"is_admin\": true,
      \"force_password_change\": true
    }
  }")

USER_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
  echo "Error creating user. Response:"
  echo $RESPONSE
  exit 1
fi

echo "Admin user created successfully!"
echo ""
echo "=========================================="
echo "Admin Credentials (CHANGE PASSWORD ON FIRST LOGIN)"
echo "=========================================="
echo "Email: $ADMIN_EMAIL"
echo "Password: $ADMIN_PASSWORD"
echo "User ID: $USER_ID"
echo ""
echo "Save these credentials securely!"
echo "=========================================="
