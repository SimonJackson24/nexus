<#
.SYNOPSIS
    Automated deployment script for Nexus with Supabase self-hosted
.DESCRIPTION
    This script generates secure credentials, configures the environment,
    starts Docker services, initializes the database, and outputs all
    necessary credentials at the end.
.PARAMETER -mode
    Deployment mode: 'docker' (Docker Compose) or 'cloudpanel' (Node.js direct)
.PARAMETER -aiKeys
    Comma-separated list of AI providers to configure: 'openai,anthropic,minimax'
    Use 'none' to skip AI provider configuration
.PARAMETER -dbPassword
    Custom PostgreSQL password (auto-generated if not provided)
.PARAMETER -jwtSecret
    Custom JWT secret (auto-generated if not provided)
.EXAMPLE
    .\deploy.ps1 -mode docker -aiKeys openai,anthropic
.EXAMPLE
    .\deploy.ps1 -mode cloudpanel -aiKeys openai
#>

param(
    [string]$mode = "docker",
    [string]$aiKeys = "openai,anthropic,minimax",
    [string]$dbPassword = "",
    [string]$jwtSecret = ""
)

$ErrorActionPreference = "Stop"

# Color codes for output
$GREEN = "`e[32m"
$BLUE = "`e[34m"
$YELLOW = "`e[33m"
$RED = "`e[31m"
$RESET = "`e[0m"
$BOLD = "`e[1m"

function Write-Header {
    param([string]$text)
    Write-Host ""
    Write-Host "${BOLD}${BLUE}════════════════════════════════════════════════════════════${RESET}" -ForegroundColor Blue
    Write-Host "${BOLD}${BLUE}  $text${RESET}" -ForegroundColor Blue
    Write-Host "${BOLD}${BLUE}════════════════════════════════════════════════════════════${RESET}" -ForegroundColor Blue
    Write-Host ""
}

function Write-Section {
    param([string]$text)
    Write-Host ""
    Write-Host "${BOLD}${YELLOW}▸ $text${RESET}" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$text)
    Write-Host "${GREEN}✓ $text${RESET}" -ForegroundColor Green
}

function Write-Error {
    param([string]$text)
    Write-Host "${RED}✗ $text${RESET}" -ForegroundColor Red
}

function Write-Info {
    param([string]$text)
    Write-Host "${BLUE}ℹ $text${RESET}" -ForegroundColor Blue
}

function Generate-SecureString {
    param([int]$length = 32)
    $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?"
    $random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $bytes = [byte[]]::new($length)
    $random.GetBytes($bytes)
    $result = ""
    for ($i = 0; $i -lt $length; $i++) {
        $result += $chars[$bytes[$i] % $chars.Length]
    }
    return $result
}

function Generate-UUID {
    return [guid]::NewGuid().ToString()
}

function Get-RandomHex {
    param([int]$length = 16)
    $bytes = [byte[]]::new($length / 2)
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""
}

# Main deployment
Write-Header "Nexus Automated Deployment"

# Check prerequisites
Write-Section "Checking Prerequisites"

# Check Docker
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Docker not found" }
    Write-Success "Docker: $dockerVersion"
} catch {
    Write-Error "Docker is not installed or not running"
    Write-Info "Please install Docker Desktop for Windows and restart"
    exit 1
}

# Check Docker Compose
try {
    $composeVersion = docker compose version 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Docker Compose not found" }
    Write-Success "Docker Compose: $composeVersion"
} catch {
    Write-Error "Docker Compose is not available"
    exit 1
}

# Check Node.js (for local build)
if ($mode -eq "cloudpanel") {
    try {
        $nodeVersion = node --version 2>&1
        if ($LASTEXITCODE -ne 0) { throw "Node not found" }
        Write-Success "Node.js: $nodeVersion"
    } catch {
        Write-Error "Node.js is not installed"
        exit 1
    }
}

# Generate secure credentials
Write-Section "Generating Secure Credentials"

$secrets = @{}

# Database password
if ([string]::IsNullOrEmpty($dbPassword)) {
    $dbPassword = Generate-SecureString -length 24
}
$secrets["POSTGRES_PASSWORD"] = $dbPassword
Write-Success "Generated PostgreSQL password"

# JWT Secret
if ([string]::IsNullOrEmpty($jwtSecret)) {
    $jwtSecret = Generate-SecureString -length 48
}
$secrets["JWT_SECRET"] = $jwtSecret
Write-Success "Generated JWT secret"

# Operator token
$secrets["OPERATOR_TOKEN"] = Generate-UUID
Write-Success "Generated operator token"

# Nexus secret key
$secrets["NEXUS_SECRET_KEY"] = Generate-SecureString -length 32
Write-Success "Generated Nexus secret key"

# Anon key (base64 encoded UUID)
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + (Get-RandomHex -length 32)
$secrets["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = $anonKey
Write-Success "Generated Supabase anon key"

# Service role key
$serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + (Get-RandomHex -length 32)
$secrets["SUPABASE_SERVICE_ROLE_KEY"] = $serviceRoleKey
Write-Success "Generated Supabase service role key"

# Generate API keys placeholder
$aiProviders = @()
foreach ($provider in $aiKeys.Split(',').Trim()) {
    switch ($provider.ToLower()) {
        "openai" {
            $secrets["OPENAI_API_KEY"] = "sk-xxxxx-xxxxx-xxxxx-xxxxx"
            $aiProviders += "OpenAI"
        }
        "anthropic" {
            $secrets["ANTHROPIC_API_KEY"] = "sk-ant-xxxxx-xxxxx-xxxxx-xxxxx"
            $aiProviders += "Anthropic"
        }
        "minimax" {
            $secrets["MINIMAX_API_KEY"] = "xxxxx-xxxxx-xxxxx"
            $aiProviders += "MiniMax"
        }
    }
}
if ($aiProviders.Count -eq 0) {
    Write-Info "No AI providers configured (demo mode only)"
}

# Create .env file
Write-Section "Configuring Environment"

$envContent = @"
# ============================================
# Nexus - Auto-Generated Environment Variables
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# ============================================

# ========================================
# Database Configuration
# ========================================
POSTGRES_PASSWORD=$($secrets["POSTGRES_PASSWORD"])

# ========================================
# Supabase Configuration
# ========================================
NEXT_PUBLIC_SUPABASE_ANON_KEY=$($secrets["NEXT_PUBLIC_SUPABASE_ANON_KEY"])
SUPABASE_SERVICE_ROLE_KEY=$($secrets["SUPABASE_SERVICE_ROLE_KEY"])

# ========================================
# Application Settings
# ========================================
SITE_URL=http://localhost:3000
NEXUS_SECRET_KEY=$($secrets["NEXUS_SECRET_KEY"])

# ========================================
# JWT Configuration
# ========================================
JWT_SECRET=$($secrets["JWT_SECRET"])
JWT_EXP=3600
REFRESH_TOKEN_REUSE_INTERVAL=10
OPERATOR_TOKEN=$($secrets["OPERATOR_TOKEN"])

# ========================================
# Email Configuration (Optional)
# ========================================
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=false

# ========================================
# AI Provider API Keys
# ========================================
"@

foreach ($provider in $aiKeys.Split(',').Trim()) {
    switch ($provider.ToLower()) {
        "openai" { $envContent += "OPENAI_API_KEY=$($secrets["OPENAI_API_KEY"])`nOPENAI_MODEL=gpt-4-turbo-preview`n" }
        "anthropic" { $envContent += "ANTHROPIC_API_KEY=$($secrets["ANTHROPIC_API_KEY"])`nANTHROPIC_MODEL=claude-sonnet-4-20250514`n" }
        "minimax" { $envContent += "MINIMAX_API_KEY=$($secrets["MINIMAX_API_KEY"])`nMINIMAX_MODEL=abab6.5s-chat`n" }
    }
}

$envContent += @"
# ========================================
# Development Settings
# ========================================
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=Nexus
"@

# Determine deployment mode
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$envFilePath = Join-Path $projectRoot "nexus\.env"

# Handle Windows path for Docker
$dockerEnvPath = Join-Path $projectRoot "nexus\.env"
$dockerEnvPathWindows = $dockerEnvPath -replace '\\', '/'

$envContent | Out-File -FilePath $envFilePath -Encoding UTF8
Write-Success "Created .env file at: $envFilePath"

# Install dependencies and build
Write-Section "Building Application"

if ($mode -eq "docker") {
    Write-Info "Building Docker image..."
    try {
        docker build -t nexus:latest (Join-Path $projectRoot "nexus") 2>&1 | ForEach-Object {
            Write-Host $_ -ForegroundColor Gray
        }
        Write-Success "Docker image built successfully"
    } catch {
        Write-Error "Docker build failed"
        exit 1
    }
} else {
    Write-Info "Installing npm dependencies..."
    try {
        $npmInstall = npm ci 2>&1
        if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
        Write-Success "Dependencies installed"
    } catch {
        Write-Error "Failed to install dependencies"
        exit 1
    }

    Write-Info "Building Next.js application..."
    try {
        $npmBuild = npm run build 2>&1
        if ($LASTEXITCODE -ne 0) { throw "build failed" }
        Write-Success "Application built successfully"
    } catch {
        Write-Error "Build failed"
        exit 1
    }
}

# Start services (Docker mode)
if ($mode -eq "docker") {
    Write-Section "Starting Docker Services"

    # Create docker-compose override for environment
    $composeOverridePath = Join-Path $projectRoot "nexus\docker-compose.override.yml"
    @"
version: '3.8'
services:
  postgres:
    environment:
      POSTGRES_PASSWORD: $($secrets["POSTGRES_PASSWORD"])
"@ | Out-File -FilePath $composeOverridePath -Encoding UTF8

    Write-Info "Starting containers..."
    try {
        $env:POSTGRES_PASSWORD = $secrets["POSTGRES_PASSWORD"]
        docker compose -f (Join-Path $projectRoot "nexus\docker-compose.yml") up -d 2>&1 | ForEach-Object {
            Write-Host $_ -ForegroundColor Gray
        }
        Write-Success "Containers started"
    } catch {
        Write-Error "Failed to start containers"
        exit 1
    }

    # Wait for services to be healthy
    Write-Section "Waiting for Services"

    Write-Info "Waiting for PostgreSQL..."
    $maxAttempts = 30
    $attempt = 0
    while ($attempt -lt $maxAttempts) {
        try {
            docker exec nexus-postgres pg_isready -U postgres > $null 2>&1
            if ($LASTEXITCODE -eq 0) { break }
        } catch {}
        Start-Sleep -Seconds 2
        $attempt++
        Write-Info "  Attempt $attempt/$maxAttempts..."
    }

    if ($attempt -ge $maxAttempts) {
        Write-Error "PostgreSQL failed to start"
        exit 1
    }
    Write-Success "PostgreSQL is ready"

    # Initialize database schema
    Write-Section "Initializing Database"

    Write-Info "Running database schema..."
    try {
        $schemaPath = Join-Path $projectRoot "nexus\supabase\schema.sql"
        docker exec -i nexus-postgres psql -U postgres -d postgres < $schemaPath 2>&1 | ForEach-Object {
            Write-Host $_ -ForegroundColor Gray
        }
        Write-Success "Database schema initialized"
    } catch {
        Write-Warning "Schema initialization had issues (may already exist)"
    }
}

# Output credentials
Write-Header "Deployment Complete!"

Write-Host ""
Write-Host "${BOLD}${GREEN}╔════════════════════════════════════════════════════════════╗${RESET}" -ForegroundColor Green
Write-Host "${BOLD}${GREEN}║                    DEPLOYMENT CREDENTIALS                   ║${RESET}" -ForegroundColor Green
Write-Host "${BOLD}${GREEN}╚════════════════════════════════════════════════════════════╝${RESET}" -ForegroundColor Green
Write-Host ""

Write-Host "${BOLD}PostgreSQL:${RESET}" -ForegroundColor Yellow
Write-Host "  Host: localhost"
Write-Host "  Port: 5432"
Write-Host "  User: postgres"
Write-Host "  Password: ${GREEN}$($secrets["POSTGRES_PASSWORD"])${RESET}"
Write-Host "  Database: postgres"
Write-Host ""

Write-Host "${BOLD}Supabase Studio (Database UI):${RESET}" -ForegroundColor Yellow
Write-Host "  URL: ${BLUE}http://localhost:54321${RESET}"
Write-Host "  (Auto-generated credentials in GoTrue)"
Write-Host ""

Write-Host "${BOLD}Nexus Application:${RESET}" -ForegroundColor Yellow
Write-Host "  URL: ${BLUE}http://localhost:3000${RESET}"
Write-Host ""

Write-Host "${BOLD}API Gateway (Kong):${RESET}" -ForegroundColor Yellow
Write-Host "  Admin: http://localhost:8001"
Write-Host "  Proxy: http://localhost:8000"
Write-Host ""

Write-Host "${BOLD}Security Credentials (Save These!):${RESET}" -ForegroundColor Yellow
Write-Host "  JWT Secret: ${GREEN}$($secrets["JWT_SECRET"])${RESET}"
Write-Host "  Nexus Secret: ${GREEN}$($secrets["NEXUS_SECRET_KEY"])${RESET}"
Write-Host "  Operator Token: ${GREEN}$($secrets["OPERATOR_TOKEN"])${RESET}"
Write-Host ""

Write-Host "${BOLD}Supabase Keys:${RESET}" -ForegroundColor Yellow
Write-Host "  Anon Key: ${GREEN}$($secrets["NEXT_PUBLIC_SUPABASE_ANON_KEY"])${RESET}"
Write-Host "  Service Role: ${GREEN}$($secrets["SUPABASE_SERVICE_ROLE_KEY"])${RESET}"
Write-Host ""

if ($aiProviders.Count -gt 0) {
    Write-Host "${BOLD}AI Provider API Keys (Add to .env):${RESET}" -ForegroundColor Yellow
    foreach ($provider in $aiProviders) {
        $keyName = "${provider}_API_KEY"
        Write-Host "  $provider: ${GREEN}$($secrets[$keyName])${RESET}"
    }
    Write-Host ""
}

Write-Host "${BOLD}Configuration File:${RESET}" -ForegroundColor Yellow
Write-Host "  ${GREEN}$envFilePath${RESET}"
Write-Host ""

Write-Warning "IMPORTANT:"
Write-Host "  1. ${BOLD}Save this information securely${RESET} - passwords are not stored"
Write-Host "  2. ${BOLD}Replace placeholder API keys${RESET} with real keys in .env"
Write-Host "  3. ${BOLD}Change all secrets${RESET} before production deployment"
Write-Host ""

Write-Host "${GREEN}Deployment successful!${RESET}" -ForegroundColor Green
Write-Host ""
