#!/bin/bash
# Generate Supabase config file

mkdir -p supabase

cat > supabase/config.toml << 'EOF'
[api]
port = 54321
read_url = "http://localhost:8000"
write_url = "http://localhost:8000"
external_url = "${SUPABASE_EXTERNAL_URL}"

[db]
port = 5432

[studio]
port = 54323

[auth]
enabled = true
site_url = "${NEXUS_URL}"
api_url = "/auth/v1"
jwt_expiry = 3600
jwt_secret = "${JWT_SECRET}"
EOF

echo "Supabase config generated at supabase/config.toml"
