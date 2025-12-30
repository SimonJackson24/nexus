#!/bin/bash
#
# SSH Setup Script for GitHub Actions Deployment
# Run this on your CloudPanel server to generate SSH keys
#

set -e

echo "========================================"
echo "GitHub Actions SSH Key Setup"
echo "========================================"

# Generate SSH key
echo ""
echo "Generating SSH key pair..."
ssh-keygen -t ed25519 -C "github-actions-$(date +%Y%m%d)" -f ~/.ssh/github-actions -N ""

echo ""
echo "✅ SSH key generated at: ~/.ssh/github-actions"
echo ""

# Display public key
echo "========================================"
echo "PUBLIC KEY (add to authorized_keys):"
echo "========================================"
cat ~/.ssh/github-actions.pub
echo ""

# Display private key warning
echo "========================================"
echo "⚠️  IMPORTANT: PRIVATE KEY"
echo "========================================"
echo "The private key below must be added to GitHub as a secret."
echo "NEVER share this key or commit it to version control."
echo ""
echo "Private key content:"
echo "------------------------------------------"
cat ~/.ssh/github-actions
echo ""
echo "------------------------------------------"
echo ""

# Instructions for GitHub
echo "========================================"
echo "GITHUB SETUP INSTRUCTIONS:"
echo "========================================"
echo "1. Go to your GitHub repository"
echo "2. Navigate to Settings → Secrets and variables → Actions"
echo "3. Add the following secrets:"
echo ""
echo "   Secret Name: SSH_PRIVATE_KEY"
echo "   Value: [paste the private key above]"
echo ""
echo "   Secret Name: SERVER_HOST"
echo "   Value: your-server-ip-address"
echo ""
echo "   Secret Name: SERVER_USER"
echo "   Value: $(whoami)"
echo ""
echo "   Secret Name: SERVER_PORT"
echo "   Value: 22"
echo ""
echo "   Secret Name: GHCR_TOKEN"
echo "   Value: [GitHub Personal Access Token with read:packages, write:packages]"
echo ""
echo "========================================"
echo "SERVER SETUP COMPLETE!"
echo "========================================"
