<#
.SYNOPSIS
    Initialize GitHub repository for Nexus with branch protection
#>

$ErrorActionPreference = "Stop"

# Colors
$GREEN = "`e[32m"
$BLUE = "`e[34m"
$YELLOW = "`e[33m"
$RED = "`e[31m"
$RESET = "`e[0m"
$BOLD = "`e[1m"

function Write-Header {
    param([string]$text)
    Write-Host ""
    Write-Host "${BOLD}${BLUE}════════════════════════════════════════════════════════════${RESET}"
    Write-Host "${BOLD}${BLUE}  $text${RESET}"
    Write-Host "${BOLD}${BLUE}════════════════════════════════════════════════════════════${RESET}"
    Write-Host ""
}

function Write-Section {
    param([string]$text)
    Write-Host ""
    Write-Host "${BOLD}${YELLOW}▸ $text${RESET}"
}

function Write-Success {
    param([string]$text)
    Write-Host "${GREEN}✓ $text${RESET}"
}

function Write-Error {
    param([string]$text)
    Write-Host "${RED}✗ $text${RESET}"
}

function Write-Info {
    param([string]$text)
    Write-Host "${BLUE}ℹ $text${RESET}"
}

function Write-Warning {
    param([string]$text)
    Write-Host "${YELLOW}⚠ $text${RESET}"
}

# Main
Write-Header "GitHub Repository Setup for Nexus"

# Check git
Write-Section "Checking Git Installation"
try {
    $gitVersion = git --version
    Write-Success "Git installed: $gitVersion"
} catch {
    Write-Error "Git is not installed. Please install Git first."
    exit 1
}

# Check GitHub CLI
Write-Section "Checking GitHub CLI"
$ghInstalled = $false
try {
    $ghVersion = gh --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        $ghInstalled = $true
        Write-Success "GitHub CLI installed: $ghVersion"
    }
} catch {
    Write-Info "GitHub CLI not found (optional)"
}

# Get GitHub username
Write-Section "GitHub Configuration"
$githubUsername = ""
if ($ghInstalled) {
    Write-Info "Fetching GitHub username..."
    $githubUsername = gh api user --jq .login 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Your GitHub username: $githubUsername"
    }
}

if ([string]::IsNullOrEmpty($githubUsername)) {
    $githubUsername = Read-Host "Enter your GitHub username"
}

# Project path
$projectPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Write-Section "Preparing Repository"

# Check if already a git repo
$isGitRepo = Test-Path (Join-Path $projectPath ".git")
if ($isGitRepo) {
    Write-Success "Git repository already exists"
    $currentRemote = git remote get-url origin 2>&1
    Write-Info "Current remote: $currentRemote"
} else {
    Write-Info "Initializing new git repository..."
    Set-Location $projectPath
    git init
    git add .
    git commit -m "feat: initial commit with Docker, Supabase, and CI/CD"
    Write-Success "Git repository initialized"
}

# Ask about GitHub repo creation
Write-Section "GitHub Repository"
$repoName = "nexus"
$repoDescription = "Multi-provider AI chat platform with Supabase self-hosted"

Write-Host "Repository will be: https://github.com/$githubUsername/$repoName" -ForegroundColor Cyan
$createRepo = Read-Host "Create new GitHub repository '$repoName'? (y/n)"

if ($createRepo.ToLower() -eq 'y') {
    if ($ghInstalled) {
        Write-Info "Creating repository on GitHub..."
        $repoCreateOutput = gh repo create $repoName --private --description "$repoDescription" --source=. --push 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Repository created and code pushed!"
            Write-Info "URL: https://github.com/$githubUsername/$repoName"
        } else {
            Write-Warning "Could not create repo automatically: $repoCreateOutput"
        }
    } else {
        Write-Info "Please create manually at: https://github.com/new"
        Write-Host "Repository name: $repoName" -ForegroundColor Yellow
        Write-Host "Description: $repoDescription" -ForegroundColor Yellow
    }
}

# Branch protection instructions
Write-Section "Branch Protection Setup"
Write-Host "1. Go to: https://github.com/$githubUsername/$repoName/settings/branches" -ForegroundColor Yellow
Write-Host "2. Click 'Add branch protection rule'" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Configure:" -ForegroundColor Yellow
Write-Host "   Branch name pattern: main" -ForegroundColor Gray
Write-Host "   ✅ Require pull request reviews before merging (1 reviewer)" -ForegroundColor Gray
Write-Host "   ✅ Require status checks to pass before merging" -ForegroundColor Gray
Write-Host "   ❌ Allow force pushes: DISABLED" -ForegroundColor Gray

$openBrowser = Read-Host "Open branch protection settings in browser? (y/n)"
if ($openBrowser.ToLower() -eq 'y') {
    Start-Process "https://github.com/$githubUsername/$repoName/settings/branches"
}

# Summary
Write-Header "Setup Complete!"
Write-Host ""
Write-Host "Repository URL: https://github.com/$githubUsername/$repoName" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Configure branch protection (link above)"
Write-Host "  2. Add GitHub secrets for CI/CD (see CONTRIBUTING.md)"
Write-Host "  3. Set up SSH keys on your server"
Write-Host ""
Write-Success "Your repository is ready!"
