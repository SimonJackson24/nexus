# Contributing to Nexus

Thank you for your interest in contributing to Nexus! This document outlines the process for contributing to the project.

## Development Workflow

### 1. Create a Feature Branch

Never commit directly to `main`. Always create a feature branch:

```bash
# Make sure you're on main and up to date
git checkout main
git pull origin main

# Create a new feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

### 2. Make Changes

Make your changes following the coding standards:

- **TypeScript:** Strict mode enabled, use proper types
- **ESLint:** Follow configured rules
- **Formatting:** Prettier handles formatting automatically
- **Commits:** Use conventional commit messages

```bash
# Format code
npm run format

# Lint code
npm run lint
```

### 3. Test Your Changes

Run the CI checks locally before pushing:

```bash
# Run linter
npm run lint

# Type check
npx tsc --noEmit

# Build locally
npm run build
```

### 4. Create a Pull Request

1. Push your branch to GitHub:
   ```bash
   git push -u origin feature/your-feature-name
   ```

2. Open a Pull Request:
   - Go to the repository on GitHub
   - Click "Compare & pull request"
   - Fill in the PR template
   - Link any related issues

3. Address Review Feedback:
   - CI must pass all checks
   - At least one approval required
   - Resolve all conversations

4. Merge:
   - Squash commits if requested
   - Delete branch after merge

## Branch Protection Rules

The `main` branch is protected:

- ✅ Pull requests required
- ✅ CI must pass
- ✅ At least 1 reviewer approval
- ❌ Force push not allowed
- ❌ Direct commits not allowed

## GitHub Actions CI/CD

### CI Pipeline (on every PR)

| Job | Description | Required |
|-----|-------------|----------|
| lint | ESLint + TypeScript checks | ✅ |
| build | Docker image build | ✅ |
| security-scan | Trivy vulnerability scan | ✅ |
| test | Container health check | ✅ |

### CD Pipeline (on merge to main)

When code is merged to `main`:
1. Build Docker image
2. Push to GitHub Container Registry
3. Deploy to production server via SSH
4. Health check verification

## Coding Standards

### TypeScript

```typescript
// ✅ Good - explicit types
async function getChat(id: string): Promise<Chat | null> {
  const chat = await db.query('SELECT * FROM chats WHERE id = ?', [id]);
  return chat || null;
}

// ❌ Bad - implicit any
async function getChat(id) {
  const chat = await db.query('SELECT * FROM chats WHERE id = ?', [id]);
  return chat;
}
```

### React Components

```typescript
// ✅ Good - proper typing and hooks
interface ChatListProps {
  chats: Chat[];
  onSelect: (chat: Chat) => void;
}

export function ChatList({ chats, onSelect }: ChatListProps) {
  const [filter, setFilter] = useState('');
  // ...
}

// ❌ Bad - missing types
export function ChatList({ chats, onSelect }) {
  // ...
}
```

### Git Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new chat notification system
fix: resolve message ordering issue in chat view
docs: update API documentation
refactor: extract common utility functions
chore: update dependencies
```

## Setting Up SSH for Deployment

### Generate SSH Key (on server)

```bash
# Connect to your CloudPanel server
ssh your-user@your-server-ip

# Generate SSH key pair
ssh-keygen -t ed25519 -C "github-actions"

# Add to authorized_keys
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys

# View private key (copy this for GitHub)
cat ~/.ssh/id_ed25519
```

### Add Secrets to GitHub

Go to Repository Settings → Secrets and add:

| Secret | Description |
|--------|-------------|
| `SERVER_HOST` | Server IP address or hostname |
| `SERVER_USER` | SSH username (e.g., `nexus`) |
| `SSH_PRIVATE_KEY` | Private SSH key content |
| `SERVER_PORT` | SSH port (default: 22) |
| `GHCR_TOKEN` | GitHub Container Registry token |

### GitHub Container Registry Token

1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic) with `read:packages`, `write:packages` scopes
3. Add as `GHCR_TOKEN` secret

## Deployment Process

### Automatic Deployment

On merge to `main`:
1. CI pipeline runs
2. If all checks pass → CD pipeline triggers
3. Docker image built and pushed to GHCR
4. Server pulls image and restarts containers
5. Health check confirms deployment

### Manual Deployment

If needed, you can trigger deployment manually:

1. Go to Actions → CD workflow
2. Click "Run workflow"
3. Select environment (production/staging)
4. Click "Run workflow"

### Rollback

If deployment fails:

1. Go to Actions → CD workflow
2. Find previous successful run
3. Re-run that workflow

Or manually on server:

```bash
cd /home/nexus/current/nexus
git checkout <previous-commit>
docker compose up -d --force-recreate
```

## Getting Help

- **Issues:** Open a GitHub issue
- **Discussions:** Use GitHub Discussions
- **Security:** Email security concerns privately

## Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/).

---

Thank you for contributing! 🎉
